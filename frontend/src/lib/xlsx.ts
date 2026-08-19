/**
 * 최소 xlsx 리더 — **시트 이름과 셀 값만** 읽는다 (FR-115, `docs/엑셀_마이그레이션_설계.md` §3).
 *
 * ⚠ 왜 직접 읽나. 실물 사양서 엑셀은 **시트 하나가 사양서 하나**이고 첫 행이 컬럼명이다
 * (2026-08-19 사용자). CSV 에는 시트가 없어서 그 구조를 표현할 방법이 아예 없다 —
 * "CSV 로 저장해 오세요"로 돌려보내면 사람이 시트마다 파일을 쪼개 옮겨 적어야 한다.
 *
 * ⚠ 라이브러리를 안 쓴다. xlsx 는 zip 이고 그 안의 XML 몇 개면 값이 나온다. 브라우저가
 * 이미 가진 것으로 푼다 — `DecompressionStream('deflate-raw')` + `DOMParser`.
 *
 * ⚠ **값만** 본다: 수식은 마지막 계산값, 서식·병합·숨김은 안 본다. 날짜는 엑셀이 숫자로
 * 저장하므로 **일련번호(45000 같은)로 보일 수 있다** — 화면이 매핑 단계에서 사람에게
 * 보여 주는 이유다(추론은 제안이지 판단이 아니다).
 * ⚠ 구형 `.xls`(이진 포맷)는 zip 이 아니라 못 읽는다 — 안내로 돌려보낸다.
 */

export interface SheetGrid {
  name: string
  /** 시트 격자 — 빈 행도 자리를 지킨다(머리 행 번호를 사람이 세는 것과 맞춘다).
   *  ⚠ **앞쪽 일부만** 담는다(`KEEP_ROWS`) — 아래 큰 파일 항목 참고 */
  rows: Array<Array<string>>
  /** 시트에 실제로 있던 행 수 — 화면이 "자료 12,480행"이라고 말할 근거 */
  totalRows: number
  /** 격자를 자른 자리 — 화면이 "앞 200행만 보고 있다"고 밝힐 근거 */
  truncated: boolean
}

/**
 * ⚠ **큰 파일·많은 열** (2026-08-19 사용자).
 * 사양서 엑셀은 열이 수백 개, 행이 수만 개일 수 있다. 격자를 통째로 안고 있으면
 * 브라우저가 멈춘다 — 그런데 이관에 **정작 필요한 것은 머리 행과 앞쪽 몇 행뿐**이다
 * (필드 이름·타입 제안·예시 값). 그래서 앞 `KEEP_ROWS` 행만 담고 **행 수는 세기만** 한다.
 * 자료 자체의 적재는 아직 안 정했다(설계 §7) — 정해지면 서버 파싱으로 간다.
 */
export const KEEP_ROWS = 200

/**
 * 시트 XML(압축 푼 크기)의 합이 이보다 크면 **브라우저에서 읽지 않는다** — 서버 파싱으로 보낸다.
 * ⚠ 셀 수로 재지 않는 이유: 셀 수는 다 읽어 봐야 안다. zip 목록에 적힌 크기는 **읽기 전에** 안다.
 * 대략 셀 200만 개 즈음이다(설계 §3-1).
 */
export const MAX_SHEET_BYTES = 120 * 1024 * 1024

/* ── zip ─────────────────────────────────────────────────────────── */

interface ZipEntry {
  method: number
  offset: number
  size: number
  /** 압축을 푼 크기 — 읽기 전에 "너무 큰가"를 재는 자 */
  raw: number
}

function readZipIndex(dv: DataView): Map<string, ZipEntry> {
  const out = new Map<string, ZipEntry>()
  // 꼬리에서 EOCD(끝 표식)를 거꾸로 찾는다 — 주석이 붙어 있을 수 있어 길이가 고정이 아니다
  let eocd = -1
  for (let i = dv.byteLength - 22; i >= 0 && i > dv.byteLength - 66_000; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) return out
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)
  const dec = new TextDecoder()
  for (let n = 0; n < count && p + 46 <= dv.byteLength; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const method = dv.getUint16(p + 10, true)
    const size = dv.getUint32(p + 20, true)
    const raw = dv.getUint32(p + 24, true)
    const nameLen = dv.getUint16(p + 28, true)
    const extraLen = dv.getUint16(p + 30, true)
    const commentLen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen))
    // 자료 시작 자리는 **지역 헤더**가 안다(중앙 목록의 여분 길이와 다를 수 있다)
    const lNameLen = dv.getUint16(local + 26, true)
    const lExtraLen = dv.getUint16(local + 28, true)
    out.set(name, { method, offset: local + 30 + lNameLen + lExtraLen, size, raw })
    p += 46 + nameLen + extraLen + commentLen
  }
  return out
}

async function readEntry(bytes: Uint8Array, e: ZipEntry): Promise<string> {
  const raw = bytes.subarray(e.offset, e.offset + e.size)
  if (e.method === 0) return new TextDecoder().decode(raw)
  const stream = new Blob([raw as unknown as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return await new Response(stream).text()
}

/* ── xml ─────────────────────────────────────────────────────────── */

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

function colIndex(ref: string): number {
  let n = 0
  for (const ch of ref) {
    const c = ch.charCodeAt(0)
    if (c < 65 || c > 90) break
    n = n * 26 + (c - 64)
  }
  return n - 1
}

/** 셀 하나의 **보이는 값** */
function cellText(c: Element, shared: Array<string>): string {
  const t = c.getAttribute('t')
  if (t === 'inlineStr') return c.getElementsByTagName('t').item(0)?.textContent ?? ''
  const v = c.getElementsByTagName('v').item(0)?.textContent ?? ''
  // ⚠ 공유 문자열 번호가 범위를 벗어나도 화면이 죽으면 안 된다 — 빈 칸으로 본다
  if (t === 's') return shared.at(Number(v)) ?? ''
  return v
}

export class XlsxError extends Error {}

/**
 * 통합문서를 시트 격자들로 읽는다. 못 읽으면 **왜인지 말하는** 오류를 던진다 —
 * "파일을 읽을 수 없습니다"만 남기면 사람이 다음에 무엇을 할지 모른다.
 */
export async function readWorkbook(file: File, keepRows = KEEP_ROWS): Promise<Array<SheetGrid>> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const dv = new DataView(buf)
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new XlsxError(
      '이 파일은 xlsx 가 아닙니다 — 구형 .xls 라면 엑셀에서 [다른 이름으로 저장 → Excel 통합 문서(.xlsx)] 로 한 번 저장해 주세요',
    )
  }
  const index = readZipIndex(dv)
  const wbXml = index.get('xl/workbook.xml')
  if (!wbXml) throw new XlsxError('엑셀 통합문서 구조를 찾지 못했습니다 (xl/workbook.xml 없음)')

  const wb = parseXml(await readEntry(bytes, wbXml))
  const relsEntry = index.get('xl/_rels/workbook.xml.rels')
  const rels = new Map<string, string>()
  if (relsEntry) {
    for (const r of parseXml(await readEntry(bytes, relsEntry)).getElementsByTagName('Relationship')) {
      rels.set(r.getAttribute('Id') ?? '', r.getAttribute('Target') ?? '')
    }
  }

  // ⚠ 읽기 전에 크기를 잰다 — 다 읽고 나서 "너무 큽니다"라고 하면 이미 탭이 멈춘 뒤다
  let bulk = 0
  for (const [name, e] of index) if (name.startsWith('xl/worksheets/') || name.endsWith('sharedStrings.xml')) bulk += e.raw
  if (bulk > MAX_SHEET_BYTES) {
    throw new XlsxError(
      `표가 너무 큽니다 (${Math.round(bulk / 1024 / 1024)}MB 분량) — 시트를 나눠 올리거나 본개발의 서버 업로드를 기다려 주세요`,
    )
  }

  const sharedEntry = index.get('xl/sharedStrings.xml')
  const shared: Array<string> = []
  if (sharedEntry) {
    for (const si of parseXml(await readEntry(bytes, sharedEntry)).getElementsByTagName('si')) {
      // 서식이 섞인 칸은 조각(t)이 여럿이다 — 이어 붙여야 한 문장이 된다
      let s = ''
      for (const t of si.getElementsByTagName('t')) s += t.textContent
      shared.push(s)
    }
  }

  const out: Array<SheetGrid> = []
  for (const sheet of wb.getElementsByTagName('sheet')) {
    const name = sheet.getAttribute('name') ?? ''
    const rid = sheet.getAttribute('r:id') ?? ''
    const target = (rels.get(rid) ?? '').replace(/^\/?xl\//, '')
    const entry = index.get(`xl/${target}`)
    if (!entry) continue
    const doc = parseXml(await readEntry(bytes, entry))
    const rows: Array<Array<string>> = []
    const rowEls = doc.getElementsByTagName('row')
    let total = 0
    for (const row of rowEls) {
      // ⚠ 행 번호를 지킨다 — 빈 행을 접어 버리면 "머리 행이 3행"이라는 사람의 말과 어긋난다
      const rIdx = Number(row.getAttribute('r') ?? '0') - 1
      const at = rIdx >= 0 ? rIdx : total
      total = Math.max(total, at + 1)
      // ⚠ 큰 파일에서 **셈은 끝까지, 담기는 앞쪽만** — 이 갈래가 없으면 5만 행에서 탭이 멈춘다
      if (at >= keepRows) continue
      // ⚠ 엑셀은 빈 칸을 아예 안 적는다 — 격자에 구멍이 생기므로 undefined 를 안고 간다
      const cells: Array<string | undefined> = []
      for (const c of row.getElementsByTagName('c')) {
        const i = colIndex(c.getAttribute('r') ?? '')
        cells[i >= 0 ? i : cells.length] = cellText(c, shared)
      }
      while (rows.length < at) rows.push([])
      rows[at] = Array.from(cells, (v) => (v ?? '').trim())
    }
    while (rows.length > 0 && rows[rows.length - 1].every((v) => v === '')) rows.pop()
    out.push({ name, rows, totalRows: total, truncated: total > rows.length })
  }
  if (out.length === 0) throw new XlsxError('시트를 하나도 찾지 못했습니다')
  return out
}
