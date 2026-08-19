# -*- coding: utf-8 -*-
"""FR-115 e2e 표본 만들기 — **실물을 닮은** 원본 사양서 엑셀.
   시트 = 사양서 · 위쪽 제목 줄 · 목차 시트 섞임 (docs/엑셀_마이그레이션_설계.md §1-1)
   고칠 일이 생기면 이 파일을 고쳐 다시 돌린다: python make_fixture.py"""
import zipfile
from xml.sax.saxutils import escape

SHEETS = [
    ("목차", [["번호", "사양서"], ["1", "VN9 하이브리드 사양서"], ["2", "전기차 배터리 규격서"]]),
    ("VN9 하이브리드 사양서", [
        ["VN9 하이브리드 파워트레인 사양서 (2026년 개정)"],   # 위쪽 제목 줄 — 머리 행이 1행이 아니다
        [],
        ["항목코드", "항목명", "타입", "필수", "최대길이"],
        ["ENG001", "엔진 형식", "string", "Y", "20"],
        ["ENG002", "최대 출력", "string", "Y", "20"],
        ["ENG003", "복합 연비", "number", "N", "10"],
    ]),
    ("전기차 배터리 규격서", [
        ["배터리코드", "항목명", "단위"],
        ["BAT001", "정격 용량", "kWh"],
        ["BAT002", "충전 시간", "분"],
    ]),
]

def col(n):
    s = ""
    while n >= 0:
        s = chr(65 + n % 26) + s
        n = n // 26 - 1
    return s

def sheet_xml(rows):
    out = ['<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
    for r, row in enumerate(rows, start=1):
        if not row:
            continue
        out.append('<row r="%d">' % r)
        for c, val in enumerate(row):
            if val == "":
                continue
            out.append('<c r="%s%d" t="inlineStr"><is><t>%s</t></is></c>' % (col(c), r, escape(val)))
        out.append("</row>")
    out.append("</sheetData></worksheet>")
    return "".join(out)

def build(path, sheets):
    wb = ['<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>']
    rels = ['<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">']
    for i, (name, _) in enumerate(sheets, start=1):
        wb.append('<sheet name="%s" sheetId="%d" r:id="rId%d"/>' % (escape(name), i, i))
        rels.append('<Relationship Id="rId%d" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet%d.xml"/>' % (i, i))
    wb.append("</sheets></workbook>")
    rels.append("</Relationships>")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
                   '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   + "".join('<Override PartName="/xl/worksheets/sheet%d.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' % i for i in range(1, len(sheets) + 1))
                   + "</Types>")
        z.writestr("_rels/.rels",
                   '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr("xl/workbook.xml", "".join(wb))
        z.writestr("xl/_rels/workbook.xml.rels", "".join(rels))
        for i, (_, rows) in enumerate(sheets, start=1):
            z.writestr("xl/worksheets/sheet%d.xml" % i, sheet_xml(rows))
    print(path)


build("사양서_원본_샘플.xlsx", SHEETS)

# ⚠ 실물은 **열이 수백, 행이 수만**일 수 있다(2026-08-19 사용자) — 화면이 버티는지 좌표로 지킨다
WIDE_COLS = 150
WIDE_ROWS = 1000
wide = [["항목%03d" % (c + 1) for c in range(WIDE_COLS)]]
wide += [["값%d-%d" % (r + 1, c + 1) for c in range(WIDE_COLS)] for r in range(WIDE_ROWS)]
build("사양서_대용량_샘플.xlsx", [("대형 통합 사양서", wide)])
