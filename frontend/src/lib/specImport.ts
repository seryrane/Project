/**
 * 엑셀(CSV) 사양서 이관 — **파싱·검증의 정본** (FR-115, `docs/엑셀_마이그레이션_설계.md`).
 *
 * 화면은 걸음만 그리고 판단은 전부 여기서 한다. 규칙이 화면에 흩어지면 "왜 이 행이
 * 오류인지"가 화면마다 달라진다(규약 §10).
 *
 * ⚠ 값은 **한국어 정본 문자열**로 받는다 — 카테고리·상태를 영문으로 받지 않는다.
 * 화면이 표시만 사전으로 옮긴다(`specCategory.*`). 영문 헤더까지 받으면 매핑이 두 벌이 된다.
 *
 * ⚠ xlsx 는 브라우저에서 공짜가 아니다. 지금은 **CSV 만** 읽고 xlsx 는 안내로 돌려보낸다
 * (설계 문서 §3). 본개발에서 서버 파싱으로 옮기면 이 파일의 `parseCsv` 만 대체된다.
 */
import { FIELD_CATEGORIES } from '#/data/specFields'
import type { FieldDef } from '#/data/specFields'
import { SPEC_CATEGORIES } from '#/data/specs'
import type { SpecField } from '#/data/specs'
import type { SheetGrid } from '#/lib/xlsx'
import type { SheetOut } from '#/lib/xlsxWrite'

export type ImportKind = 'catalog' | 'fields'

/** 템플릿 정본 — 필수열(★)이 하나라도 없으면 **한 행도 읽지 않는다**(설계 §3) */
export const TEMPLATE: Record<ImportKind, { required: Array<string>; optional: Array<string> }> = {
  catalog: {
    required: ['사양서명', '카테고리'],
    optional: ['설명', '태그', '담당자', '버전'],
  },
  fields: {
    required: ['사양서명', '필드명', '타입'],
    optional: ['카테고리(대/중/소)', '필수', '최대길이', '유효성', '상태'],
  },
}

export const FIELD_TYPES = ['string', 'number', 'select', 'text', 'boolean', 'date'] as const
export const FIELD_STATES = ['완료', '진행중', '검토중', '미완료'] as const

/** 파일을 아예 안 읽고 돌려보내는 사유 — 사람이 고칠 수 있게 **무엇이** 문제인지 적는다 */
export interface RejectReason {
  code: 'ext' | 'size' | 'header' | 'empty'
  message: string
}

export interface RowIssue {
  row: number // 사람이 세는 번호(머리 행 다음이 1)
  column: string
  message: string
  level: '오류' | '경고'
}

export interface ParsedRow {
  row: number
  values: Record<string, string>
  /** 이 행에 걸린 것들 — 오류가 하나라도 있으면 반영에서 빠진다 */
  issues: Array<RowIssue>
}

export interface ImportReport {
  kind: ImportKind
  headers: Array<string>
  rows: Array<ParsedRow>
  get ok(): number
}

export const MAX_BYTES = 10 * 1024 * 1024
const EXTS = ['.csv', '.xlsx', '.xls']

/** 파일을 열기 전에 막는 자리 (설계 §3 · AC ①) */
export function rejectFile(file: File): RejectReason | null {
  const lower = file.name.toLowerCase()
  if (!EXTS.some((e) => lower.endsWith(e))) {
    return { code: 'ext', message: `엑셀·CSV 파일만 올릴 수 있습니다 (받은 파일: ${file.name})` }
  }
  if (file.size > MAX_BYTES) {
    return {
      code: 'size',
      message: `파일이 ${(file.size / 1024 / 1024).toFixed(1)}MB 입니다 — 10MB 이하로 나눠 올려 주세요`,
    }
  }
  return null
}

/** CSV 한 줄 — 따옴표 안의 쉼표·줄바꿈을 지킨다(엑셀이 그렇게 내보낸다) */
function splitCsv(text: string): Array<Array<string>> {
  const rows: Array<Array<string>> = []
  let cell = ''
  let row: Array<string> = []
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
      continue
    }
    if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (c !== '\r') cell += c
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''))
}

export interface ParseResult {
  reject?: RejectReason
  report?: ImportReport
}

/**
 * 파싱 + 검증. **읽은 것과 판단한 것을 한 번에** 돌려준다 —
 * 화면이 두 번 훑으면 "몇 건이 정상인가"가 두 곳에서 세어진다.
 */
export function parseCsv(kind: ImportKind, text: string, known: KnownData): ParseResult {
  return parseGrid(kind, splitCsv(text), known)
}

/** 격자 → 검증. CSV 든 xlsx 시트든 **여기 하나로 모인다** — 통로가 둘이면 규칙도 둘이 된다. */
export function parseGrid(kind: ImportKind, gridIn: Array<Array<string>>, known: KnownData): ParseResult {
  const grid = gridIn.filter((r) => r.some((v) => v.trim() !== ''))
  if (grid.length === 0) return { reject: { code: 'empty', message: '빈 파일입니다' } }

  // ⚠ 엑셀이 저장한 CSV 는 첫 열 이름 앞에 BOM 이 붙는다 — 안 떼면 '사양서명' 을 못 찾는다
  const headers = grid[0].map((h) => h.trim().replace(/^/, ''))
  // ⚠ 사양서가 이미 정해진 화면(상세)에서는 `사양서명` 열을 요구하지 않는다 — 그 화면이 곧 사양서다
  const required = TEMPLATE[kind].required.filter((r) => !(r === '사양서명' && known.lockToSpec != null))
  const missing = required.filter((r) => !headers.includes(r))
  if (missing.length > 0) {
    return {
      reject: {
        code: 'header',
        // ⚠ "형식이 다릅니다"로 끝내지 않는다 — **어느 열이 없는지 이름으로** 말한다
        message: `필수 열이 없습니다: ${missing.join(', ')} (첫 줄이 머리글인지 확인해 주세요)`,
      },
    }
  }
  if (grid.length === 1) return { reject: { code: 'empty', message: '머리글만 있고 자료 행이 없습니다' } }

  const rows: Array<ParsedRow> = []
  const seenNames = new Map<string, number>()
  for (let r = 1; r < grid.length; r++) {
    const values: Record<string, string> = {}
    headers.forEach((h, i) => (values[h] = (grid[r][i] ?? '').trim()))
    const issues = validateRow(kind, values, r, seenNames, known)
    rows.push({ row: r, values, issues })
  }

  return {
    report: {
      kind,
      headers,
      rows,
      get ok() {
        return rows.filter((x) => !x.issues.some((i) => i.level === '오류')).length
      },
    },
  }
}

/** 검증에 필요한 **바깥 사실** — 이미 있는 사양서·회원 이름 */
export interface KnownData {
  specNames: Array<string>
  memberNames: Array<string>
  /** 결재 중이라 **본문을 고칠 수 없는** 사양서 (API 설계 §1: 서버도 409 로 막는다).
   *  ⚠ 이 축이 없으면 엑셀 한 장이 승인자가 본 문서를 몰래 바꾼다 — 이력이 못 믿을 것이 된다. */
  lockedSpecNames?: Array<string>
  /** 상세 화면에서 올릴 때처럼 **사양서가 이미 정해진** 경우 — 사양서명 열이 없어도 된다 */
  lockToSpec?: string
}

function validateRow(
  kind: ImportKind,
  v: Record<string, string>,
  row: number,
  seen: Map<string, number>,
  known: KnownData,
): Array<RowIssue> {
  const out: Array<RowIssue> = []
  const err = (column: string, message: string) => out.push({ row, column, message, level: '오류' })
  const warn = (column: string, message: string) => out.push({ row, column, message, level: '경고' })

  const name = (v['사양서명'] ?? '') || (kind === 'fields' ? (known.lockToSpec ?? '') : '')
  if (name === '') err('사양서명', '비어 있습니다')

  if (kind === 'catalog') {
    if (name.length > 200) err('사양서명', '200자를 넘습니다')
    const dup = seen.get(name)
    if (name !== '' && dup != null) err('사양서명', `파일 안에서 중복됩니다 (행 ${dup} 과 같음)`)
    else if (name !== '') seen.set(name, row)
    // ⚠ 이미 있는 이름은 **오류가 아니라 경고**다 — 같은 파일을 다시 올려도 안전해야 한다(설계 §5)
    if (name !== '' && known.specNames.includes(name)) warn('사양서명', '이미 있는 사양서라 건너뜁니다')

    const cat = v['카테고리'] ?? ''
    if (cat === '') err('카테고리', '비어 있습니다')
    else if (!(SPEC_CATEGORIES as ReadonlyArray<string>).includes(cat))
      err('카테고리', `정본에 없는 값입니다: '${cat}' (허용: ${SPEC_CATEGORIES.join(', ')})`)

    if ((v['설명'] ?? '').length > 1000) err('설명', '1000자를 넘습니다')
    const owner = v['담당자'] ?? ''
    if (owner !== '' && !known.memberNames.includes(owner))
      warn('담당자', `회원 명단에 없습니다: '${owner}' — 비워서 올립니다`)
    const ver = v['버전'] ?? ''
    if (ver !== '' && !/^v\d+\.\d+$/.test(ver)) warn('버전', `형식이 v0.1 이 아닙니다: '${ver}' — v0.1 로 넣습니다`)
    return out
  }

  // fields
  if (known.lockToSpec != null && name !== '' && name !== known.lockToSpec)
    err('사양서명', `이 화면은 '${known.lockToSpec}' 의 필드만 받습니다 (파일에는 '${name}')`)
  else if (name !== '' && !known.specNames.includes(name))
    err('사양서명', `대장에 없는 사양서입니다: '${name}' (대장을 먼저 올려 주세요)`)
  // ⚠ 결재 중에는 본문을 고칠 수 없다 — 승인자가 본 문서가 그대로 승인되어야 한다
  if (name !== '' && (known.lockedSpecNames ?? []).includes(name))
    err('사양서명', `결재 중이라 필드를 고칠 수 없습니다: '${name}' (반려·승인 뒤에 올려 주세요)`)
  const key = `${name}::${v['필드명'] ?? ''}`
  if ((v['필드명'] ?? '') === '') err('필드명', '비어 있습니다')
  else {
    const dup = seen.get(key)
    if (dup != null) err('필드명', `같은 사양서 안에서 중복됩니다 (행 ${dup} 과 같음)`)
    else seen.set(key, row)
  }
  const type = v['타입'] ?? ''
  if (type === '') err('타입', '비어 있습니다')
  else if (!(FIELD_TYPES as ReadonlyArray<string>).includes(type))
    err('타입', `허용되지 않는 타입입니다: '${type}' (허용: ${FIELD_TYPES.join(', ')})`)
  const req = v['필수'] ?? ''
  if (req !== '' && !['Y', 'N'].includes(req.toUpperCase())) err('필수', `Y 또는 N 이어야 합니다: '${req}'`)
  const len = v['최대길이'] ?? ''
  if (len !== '' && !/^\d+$/.test(len)) err('최대길이', `정수가 아닙니다: '${len}'`)
  else if (len !== '' && ['number', 'date', 'boolean'].includes(type))
    warn('최대길이', `${type} 타입에는 쓰이지 않습니다 — 무시합니다`)
  const rule = v['유효성'] ?? ''
  if (rule !== '') {
    try {
      new RegExp(rule)
    } catch {
      err('유효성', `정규식을 해석할 수 없습니다: '${rule}'`)
    }
  }
  const cat = (v['카테고리(대/중/소)'] ?? '').trim()
  if (cat !== '') {
    const major = cat.split(/[·/|>]/)[0].trim()
    if (!(FIELD_CATEGORIES as ReadonlyArray<string>).includes(major))
      err('카테고리(대/중/소)', `대분류가 정본에 없습니다: '${major}' (허용: ${FIELD_CATEGORIES.join(', ')})`)
  }
  const st = v['상태'] ?? ''
  if (st !== '' && !(FIELD_STATES as ReadonlyArray<string>).includes(st))
    err('상태', `허용되지 않는 상태입니다: '${st}' (허용: ${FIELD_STATES.join(', ')})`)
  return out
}

/**
 * 검증을 통과한 '필드 정의' 한 행 → 화면이 쓰는 필드 모양.
 *
 * ⚠ 이 변환이 화면에 있으면 "엑셀의 Y 가 무엇이 되는가"가 화면마다 달라진다 —
 * 판단은 전부 이 파일에 모은다(규약 §10). `no`(표의 자리 번호)는 붙일 때 다시 매긴다.
 */
export function rowToFieldDef(v: Record<string, string>, owner: string): Omit<FieldDef, 'no'> {
  const cat = (v['카테고리(대/중/소)'] ?? '').trim()
  const parts = cat.split(/[·/|>]/).map((x) => x.trim())
  const major = (FIELD_CATEGORIES as ReadonlyArray<string>).includes(parts[0])
    ? (parts[0] as FieldDef['category'])
    : '기본정보'
  const len = (v['최대길이'] ?? '').trim()
  return {
    category: major,
    sub: parts.slice(1).join(' · '),
    name: (v['필드명'] ?? '').trim(),
    type: (v['타입'] ?? 'string').trim() as FieldType,
    required: (v['필수'] ?? '').trim().toUpperCase() === 'Y',
    // ⚠ 빈 칸과 0 은 다르다 — 안 적은 것은 null(제한 없음)이지 0 이 아니다
    maxLen: /^\d+$/.test(len) ? Number(len) : null,
    desc: (v['설명'] ?? '').trim(),
    rule: (v['유효성'] ?? '').trim() || null,
    owner,
    status: ((v['상태'] ?? '').trim() || '미완료') as FieldDef['status'],
  }
}

/** 오류 리포트 CSV — 엑셀로 고칠 사람에게는 **파일**이 필요하다 (설계 §4) */
export function issuesToCsv(issues: Array<RowIssue>): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s)
  return [
    '행,열,수준,사유',
    ...issues.map((i) => [i.row, i.column, i.level, i.message].map((x) => esc(String(x))).join(',')),
  ].join('\n')
}

/**
 * **우리 표준 양식(초안)** — 실물 엑셀을 받기 전에 우리가 먼저 그린다
 * (2026-08-19 사용자: "지금은 초안만 우리가 먼저 작성하는 형태로").
 *
 * ⚠ 양식이 없으면 회의가 말로만 돈다. 초안이 있으면 "이 열은 우리 쪽에 없다 / 이건
 * 두 칸으로 나뉜다" 같은 **구체적인 반론**이 나온다 — 그게 실물을 당기는 가장 빠른 길이다.
 * ⚠ 열 정의의 정본은 위 `TEMPLATE` 하나다. 이 함수는 그것을 엑셀로 옮겨 적을 뿐이라
 * 열을 고치면 화면 검증과 내려받는 양식이 **함께** 바뀐다(두 벌이 되면 반드시 어긋난다).
 * ⚠ 첫 시트는 표가 아니라 **읽어보기**다 — 받는 사람은 설명서를 따로 안 읽는다.
 */
export function templateWorkbook(): Array<SheetOut> {
  const guide: Array<Array<string>> = [
    ['HMG 사양서 이관 표준 양식 (초안)'],
    [''],
    ['이 파일은 아직 초안입니다 — 실제 쓰시는 엑셀을 주시면 그 모양에 맞춰 고칩니다.'],
    ['★ 표시된 열은 반드시 채워야 하고, 나머지는 비워도 됩니다.'],
    [''],
    ['시트', '한 행이 무엇인가', '필수 열'],
    ['사양서 대장', '사양서 한 건', TEMPLATE.catalog.required.join(', ')],
    ['필드 정의', '사양서의 필드 하나', TEMPLATE.fields.required.join(', ')],
    [''],
    ['정해진 값만 쓰는 열'],
    ['카테고리', SPEC_CATEGORIES.join(' / ')],
    ['타입', FIELD_TYPES.join(' / ')],
    ['상태', FIELD_STATES.join(' / ')],
    ['필수', 'Y / N'],
    [''],
    ['이 양식을 꼭 쓰셔야 하는 것은 아닙니다.'],
    ['지금 쓰시는 엑셀을 그대로 올리셔도 됩니다 — 그때는 시트 이름이 사양서 명이 되고,'],
    ['맨 위 행이 컬럼명(필드)이 되며, 화면에서 시트·머리 행·열을 짚어 맞출 수 있습니다.'],
    [''],
    ['올릴 때 지켜지는 규칙'],
    ['오류가 있는 행/시트만 빠지고 나머지는 반영됩니다 (전부 아니면 전무가 아닙니다).'],
    ['오류는 행·열·사유가 적힌 리포트로 받으실 수 있습니다.'],
    ['이미 있는 사양서 이름은 건너뜁니다 — 고친 파일을 통째로 다시 올리셔도 안전합니다.'],
  ]

  const catalogCols = [...TEMPLATE.catalog.required, ...TEMPLATE.catalog.optional]
  const fieldCols = [...TEMPLATE.fields.required, ...TEMPLATE.fields.optional]
  const star = (cols: Array<string>, required: Array<string>) =>
    cols.map((c) => (required.includes(c) ? `${c} ★` : c))

  return [
    { name: '읽어보기', rows: guide, widths: [30, 26, 40] },
    {
      name: '사양서 대장',
      rows: [
        star(catalogCols, TEMPLATE.catalog.required),
        ['VN9 하이브리드 파워트레인 사양서', '파워트레인', '출력·연비 규격', '하이브리드,VN9', '김민준', 'v0.1'],
        ['', '', '', '', '', ''],
      ],
      widths: [34, 14, 30, 20, 12, 10],
    },
    {
      name: '필드 정의',
      rows: [
        star(fieldCols, TEMPLATE.fields.required),
        ['VN9 하이브리드 파워트레인 사양서', '항목코드', 'string', '기본정보 · 식별자', 'Y', '20', '^[A-Z]{2}\\d{4}$', '완료'],
        ['VN9 하이브리드 파워트레인 사양서', '최대 출력', 'number', '성능', 'Y', '10', '', '진행중'],
        ['', '', '', '', '', '', '', ''],
      ],
      widths: [34, 16, 10, 22, 8, 10, 20, 10],
    },
  ]
}


/* ════════════════════════════════════════════════════════════════════
   원본 엑셀 길 — **시트 = 사양서 · 머리 행 = 컬럼명 · 나머지 행 = 자료**
   (2026-08-19 사용자, 설계 §1-1)

   ⚠ 템플릿을 강요하면 사람이 시트마다 손으로 옮겨 적어야 한다. 그래서 파일을 그대로
   받고 **화면에서 매핑**한다. 여기 있는 것은 전부 *제안*이다 — 사람이 고친 뒤 넘어간다.
   ══════════════════════════════════════════════════════════════════ */

export type FieldType = (typeof FIELD_TYPES)[number]

export interface ColumnPlan {
  index: number
  /** 엑셀에 적혀 있던 열 이름 — 사람이 "어느 열이었는지" 알아보는 자리 */
  source: string
  /** 사양서에 들어갈 필드명 (고칠 수 있다) */
  field: string
  type: FieldType
  include: boolean
}

export interface SheetPlan {
  sheet: string
  include: boolean
  /** 0부터 세는 격자 자리. 화면은 +1 해서 "3행"이라고 말한다 */
  headerRow: number
  specName: string
  category: string
  columns: Array<ColumnPlan>
  /** 시트에 있던 자료 행 수(전체) — 격자는 앞쪽만 담고 있어도 셈은 파일 전체다 */
  dataRows: number
  /** 앞쪽만 읽었나 — 타입 제안이 **표본 기준**임을 화면이 밝힐 근거 */
  sampled: boolean
}

export interface PlanIssue {
  sheet: string
  column: string
  message: string
  level: '오류' | '경고'
}

/** 사양서가 아닌 시트 — 기본으로 빼 둔다(사람이 다시 켤 수 있다) */
const NOT_SPEC_SHEET = /^(목차|차례|index|contents|변경\s*이력|revision|history|readme|안내|표지|cover)$/i

/**
 * 머리 행 **추정**. 위쪽에 제목·설명이 몇 줄 붙어 있는 파일이 흔하다.
 * ⚠ 맞히는 것이 목적이 아니라 **처음 화면을 그럴듯하게 채우는 것**이 목적이다 — 사람이 고친다.
 */
export function guessHeaderRow(rows: Array<Array<string>>): number {
  const filled = (r: Array<string>) => r.filter((v) => v.trim() !== '').length
  const scan = Math.min(rows.length, 10)
  let best = 0
  let bestScore = -1
  for (let i = 0; i < scan; i++) {
    const n = filled(rows[i] ?? [])
    if (n < 2) continue
    // 아래쪽 행들과 폭이 맞는 줄이 머리 행이다 (제목 한 칸짜리 줄은 폭이 안 맞는다)
    const below = rows.slice(i + 1, i + 6).map(filled)
    const avg = below.length > 0 ? below.reduce((a, b) => a + b, 0) / below.length : n
    const score = n - Math.abs(n - avg)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/** 값에서 타입을 **제안**한다 (설계 §1-1: 추론은 제안이지 판단이 아니다) */
export function inferType(values: Array<string>): FieldType {
  const vals = values.map((v) => v.trim()).filter((v) => v !== '')
  if (vals.length === 0) return 'string'
  const all = (re: RegExp) => vals.every((v) => re.test(v))
  if (all(/^(Y|N|예|아니오|true|false|O|X)$/i)) return 'boolean'
  if (all(/^-?[\d,]+(\.\d+)?$/)) return 'number'
  if (all(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/)) return 'date'
  const uniq = new Set(vals)
  if (uniq.size <= 6 && vals.length >= 5) return 'select'
  if (vals.some((v) => v.length > 50)) return 'text'
  return 'string'
}

/** 한 시트를 읽는 계획 — 머리 행이 바뀌면 열도 다시 잡는다 */
export function planSheet(grid: SheetGrid, headerRow: number, prev?: SheetPlan): SheetPlan {
  const header = grid.rows[headerRow] ?? []
  // ⚠ 격자는 **앞쪽 몇 행만** 담고 있다(xlsx.ts KEEP_ROWS) — 이름·타입 제안에는 그것으로 충분하고,
  //    "자료 몇 행"은 파일 전체를 센 값(`totalRows`)으로 말한다. 두 숫자를 섞으면 화면이 거짓말을 한다.
  const body = grid.rows.slice(headerRow + 1).filter((r) => r.some((v) => v.trim() !== ''))
  const width = Math.max(header.length, ...body.map((r) => r.length), 0)
  const columns: Array<ColumnPlan> = []
  for (let i = 0; i < width; i++) {
    const source = (header[i] ?? '').trim()
    const sample = body.slice(0, 50).map((r) => r[i] ?? '')
    const empty = source === '' && sample.every((v) => v.trim() === '')
    columns.push({
      index: i,
      source,
      // ⚠ 이름 없는 열에 빈 필드명을 주면 검증이 오류로 막는다 — 자리 이름을 주고 **제외**로 둔다
      field: source === '' ? `열 ${i + 1}` : source,
      type: inferType(sample),
      include: !empty,
    })
  }
  return {
    sheet: grid.name,
    include: prev?.include ?? !NOT_SPEC_SHEET.test(grid.name.trim()),
    headerRow,
    specName: prev?.specName ?? grid.name.trim(),
    category: prev?.category ?? '',
    columns,
    dataRows: Math.max(grid.totalRows - (headerRow + 1), body.length),
    sampled: grid.truncated,
  }
}

export function planWorkbook(sheets: Array<SheetGrid>): Array<SheetPlan> {
  return sheets.map((g) => planSheet(g, guessHeaderRow(g.rows)))
}

/**
 * 계획 검증 — **시트 단위**로 본다(원본 길에서는 행이 아니라 시트가 사양서다).
 * 오류가 붙은 시트는 반영에서 빠지고, 나머지 시트는 그대로 들어간다(AC ③).
 */
export function validatePlans(plans: Array<SheetPlan>, known: KnownData): Array<PlanIssue> {
  const out: Array<PlanIssue> = []
  const err = (sheet: string, column: string, message: string) =>
    out.push({ sheet, column, message, level: '오류' })
  const warn = (sheet: string, column: string, message: string) =>
    out.push({ sheet, column, message, level: '경고' })
  const seen = new Map<string, string>()

  for (const p of plans.filter((x) => x.include)) {
    const name = p.specName.trim()
    if (name === '') err(p.sheet, '사양서명', '비어 있습니다 (시트 이름이 비었으면 직접 적어 주세요)')
    else if (name.length > 200) err(p.sheet, '사양서명', '200자를 넘습니다')
    else {
      const dup = seen.get(name)
      if (dup != null) err(p.sheet, '사양서명', `'${dup}' 시트와 이름이 같습니다`)
      else seen.set(name, p.sheet)
      // 이미 있는 이름은 **오류가 아니라 경고** — 같은 파일을 다시 올려도 안전해야 한다(설계 §5)
      if (known.specNames.includes(name)) warn(p.sheet, '사양서명', '이미 있는 사양서라 건너뜁니다')
    }

    if (p.category === '') err(p.sheet, '카테고리', '카테고리를 골라 주세요 (엑셀에는 없는 값입니다)')
    else if (!(SPEC_CATEGORIES as ReadonlyArray<string>).includes(p.category))
      err(p.sheet, '카테고리', `정본에 없는 값입니다: '${p.category}'`)

    const cols = p.columns.filter((c) => c.include)
    if (cols.length === 0) err(p.sheet, '열', '가져올 열이 하나도 없습니다')
    const fieldSeen = new Set<string>()
    for (const c of cols) {
      const f = c.field.trim()
      if (f === '') err(p.sheet, `${c.index + 1}번째 열`, '필드명이 비어 있습니다')
      else if (fieldSeen.has(f)) err(p.sheet, f, '같은 시트 안에서 필드명이 중복됩니다')
      else fieldSeen.add(f)
      if (c.source === '') warn(p.sheet, f, '엑셀에 열 이름이 없어 자리 이름을 붙였습니다')
    }
    if (p.dataRows === 0) warn(p.sheet, '자료', '자료 행이 없습니다 — 필드 정의만 들어갑니다')
    // ⚠ 열이 수백 개인 시트가 실제로 온다 — 다 가져가는 것이 기본이지만 **말은 해 준다**
    if (cols.length > 100)
      warn(p.sheet, '열', `가져올 열이 ${cols.length}개입니다 — 필요 없는 열은 꺼 주세요`)
    if (p.sampled)
      warn(
        p.sheet,
        '자료',
        `자료가 ${p.dataRows.toLocaleString()}행이라 앞부분만 읽었습니다 — 타입 제안은 표본 기준입니다`,
      )
  }
  return out
}

export interface PlannedSpec {
  sheet: string
  name: string
  category: string
  fields: Array<SpecField>
  dataRows: number
}

/**
 * 반영할 것으로 굳힌다. 오류가 붙은 시트는 여기서 빠진다 — 화면이 세는 숫자와 실제로
 * 들어가는 것이 **같은 함수**에서 나와야 "39건 반영"이 거짓말이 되지 않는다(규약 §10).
 *
 * ⚠ 값은 **첫 자료 행**을 예시로 담는다. 자료 전체를 어디에 적재할지는 아직 안 정했다
 * (설계 §7) — 지금 넣어 두면 그 자리가 곧 규칙이 된다.
 */
export function plansToSpecs(
  plans: Array<SheetPlan>,
  sheets: Array<SheetGrid>,
  issues: Array<PlanIssue>,
): Array<PlannedSpec> {
  const bad = new Set(issues.filter((i) => i.level === '오류').map((i) => i.sheet))
  const out: Array<PlannedSpec> = []
  for (const p of plans) {
    if (!p.include || bad.has(p.sheet)) continue
    const grid = sheets.find((g) => g.name === p.sheet)
    const first = grid?.rows.slice(p.headerRow + 1).find((r) => r.some((v) => v.trim() !== ''))
    out.push({
      sheet: p.sheet,
      name: p.specName.trim(),
      category: p.category,
      fields: p.columns
        .filter((c) => c.include)
        .map((c) => ({ label: c.field.trim(), value: (first?.[c.index] ?? '').trim() })),
      dataRows: p.dataRows,
    })
  }
  return out
}

/** 오류 리포트 CSV — 시트 단위 (설계 §4) */
export function planIssuesToCsv(issues: Array<PlanIssue>): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s)
  return ['시트,열,수준,사유', ...issues.map((i) => [i.sheet, i.column, i.level, i.message].map(esc).join(','))].join(
    '\n',
  )
}
