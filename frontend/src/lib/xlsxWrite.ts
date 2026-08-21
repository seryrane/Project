/**
 * 최소 xlsx **쓰기** — 우리 표준 양식(초안)을 엑셀 파일로 내려준다 (FR-115).
 *
 * ⚠ 왜 CSV 가 아니라 xlsx 인가. 받는 쪽은 엑셀로 일한다 — CSV 를 주면 열어서 다시
 * 저장하는 걸음이 하나 더 붙고, 그 걸음에서 인코딩·서식이 깨진다. 그리고 우리 양식은
 * **대장과 필드 정의 두 층**이라(설계 §1) 시트가 둘 필요한데 CSV 에는 시트가 없다.
 *
 * ⚠ 라이브러리를 안 쓴다. zip 을 **압축 없이(stored)** 쌓는다 — 압축을 붙이면
 * `CompressionStream` 비동기가 끼어 코드가 배로 커지는데, 양식은 몇 KB 라 얻을 것이 없다.
 * ⚠ 서식(굵게·색)은 안 넣는다. styles.xml 을 들이면 이 파일이 두 배가 된다 —
 * 대신 첫 시트에 **읽어보기**를 넣어 규칙을 글로 적는다(파일 자체가 설명서가 된다).
 */

export interface SheetOut {
  name: string
  rows: Array<Array<string>>
  /** 열 너비(글자 수) — 안 주면 20. 사람이 열자마자 읽히는 것이 양식의 일이다 */
  widths?: Array<number>
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function colName(n: number): string {
  let s = ''
  let i = n
  while (i >= 0) {
    s = String.fromCharCode(65 + (i % 26)) + s
    i = Math.floor(i / 26) - 1
  }
  return s
}

function sheetXml(sheet: SheetOut): string {
  const width = Math.max(...sheet.rows.map((r) => r.length), 1)
  const cols = Array.from(
    { length: width },
    (_, i) => `<col min="${i + 1}" max="${i + 1}" width="${sheet.widths?.[i] ?? 20}" customWidth="1"/>`,
  ).join('')
  const rows = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((v, c) =>
          v === '' ? '' : `<c r="${colName(c)}${r + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`,
        )
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  return `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`
}

/* ── zip (stored) ────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface Part {
  name: string
  data: Uint8Array
}

export function zipStore(parts: Array<Part>): Blob {
  const enc = new TextEncoder()
  const chunks: Array<Uint8Array> = []
  const central: Array<Uint8Array> = []
  let offset = 0

  for (const part of parts) {
    const name = enc.encode(part.name)
    const crc = crc32(part.data)
    const local = new Uint8Array(30 + name.length)
    const dv = new DataView(local.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(4, 20, true) // 필요한 버전
    dv.setUint16(6, 0x0800, true) // 이름은 UTF-8 이다 — 한글 시트 이름이 깨지지 않게
    dv.setUint16(8, 0, true) // 압축 없음(stored)
    dv.setUint32(14, crc, true)
    dv.setUint32(18, part.data.length, true)
    dv.setUint32(22, part.data.length, true)
    dv.setUint16(26, name.length, true)
    local.set(name, 30)
    chunks.push(local, part.data)

    const dir = new Uint8Array(46 + name.length)
    const cv = new DataView(dir.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, part.data.length, true)
    cv.setUint32(24, part.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    dir.set(name, 46)
    central.push(dir)
    offset += local.length + part.data.length
  }

  const dirSize = central.reduce((n, d) => n + d.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, parts.length, true)
  ev.setUint16(10, parts.length, true)
  ev.setUint32(12, dirSize, true)
  ev.setUint32(16, offset, true)
  return new Blob([...chunks, ...central, end] as Array<BlobPart>, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** 시트들을 통합문서 한 개로 묶는다 */
export function buildXlsx(sheets: Array<SheetOut>): Blob {
  const enc = new TextEncoder()
  const types = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}</Types>`
  const rootRels = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const wb = `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
    .map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')}</sheets></workbook>`
  const wbRels = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('')}</Relationships>`

  return zipStore([
    { name: '[Content_Types].xml', data: enc.encode(types) },
    { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'xl/workbook.xml', data: enc.encode(wb) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(s)) })),
  ])
}
