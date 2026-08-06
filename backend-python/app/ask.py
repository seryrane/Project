"""표준 질의 챗봇 — 파싱·기간 해석·답 조립. 순수 함수만 둔다(DB·요청 객체를 모른다).

정본: docs/챗봇_표준질의_설계.md. 이 파일이 하는 일은 그 문서의 0절 그림 그대로다.
  ① 질의 명세로 바꾼다 (parse)         — 무엇을 · 언제
  ② 숫자는 호출자가 건넨 시드로 센다   — app/api/ask.py 가 권한 필터링 후 데이터를 준다
  ③ 답을 정해진 칸에 채운다 (answer)   — envelope() 가 계약의 칸을 고정한다

⚠ 여기서 DB·HTTP 를 만지면 tests/test_ask.py 가 DB 없이 못 돈다 — 절대 import 하지 않는다.
⚠ "지표를 찾았는지" · "기간을 찾았는지" 는 문자열을 뒤져 판정하지 않고 항상 불리언(metric_found·
  period.found)으로 나른다 — 문구를 다듬다가 그 판정까지 조용히 죽는 사고를 자매 프로젝트가
  이미 겪었다(설계 문서 3절).
⚠ 데이터 값(사양서/사람 이름·상태값)은 로케일이 en 이어도 번역하지 않는다(설계 문서 5절) —
  그래서 아래 헤드라인 영문 템플릿 안에도 "초안"·"승인 대기" 같은 한글 토큰이 그대로 박혀 있다.
  못 보고 지나치기 쉬운 부분이라 여기 다시 적는다.
"""

from __future__ import annotations

import re
from typing import Any

# ── 표준 질의 정의 (설계 문서 3절 표 그대로) ──────────────────────────────
METRICS: dict[str, dict[str, Any]] = {
    "spec.status": {"requires": "사양서 관리", "period_eligible": False},
    "approval.pending": {"requires": "승인 관리", "period_eligible": False},
    "validation.volume": {"requires": "검증엔진", "period_eligible": True},
    "validation.error": {"requires": "검증엔진", "period_eligible": True},
    "kpi.status": {"requires": "통계 & 분석", "period_eligible": False},
    "my.todo": {"requires": None, "period_eligible": False},
    "howto": {"requires": None, "period_eligible": False},
}

# 지표 낱말 — howto 는 별도 규칙(아래 _is_howto)으로 먼저 본다.
# ⚠ 기간 낱말("이번 주"·"최근" 등)을 여기 절대 넣지 않는다 — 넣는 순간
#   "이번 주 검증"이 그 낱말 때문에 엉뚱한 지표로 잡힐 수 있다(설계 문서 3절 경고).
METRIC_KEYWORDS: dict[str, list[str]] = {
    "spec.status": ["사양서 현황", "사양서 상태", "사양서 통계", "specification status", "spec status"],
    "approval.pending": ["승인 대기", "결재 대기", "결재 현황", "pending approval", "approval queue"],
    "validation.volume": ["검증 처리량", "처리량", "검증 건수", "검증 통계", "validation volume", "processing volume"],
    "validation.error": ["검증 오류", "오류 유형", "오류 건수", "validation error", "error type"],
    "kpi.status": ["지표 승인", "지표 현황", "지표 상태", "kpi 현황", "kpi 승인", "kpi status", "kpi approval"],
    "my.todo": ["내 할 일", "오늘 할 일", "할 일", "지연 건", "내가 볼", "my todo", "today's tasks", "my tasks", "delayed items"],
}

# "어디서 등록해?" 처럼 위치를 묻는 낱말 — 있으면 그 자체로 howto (설계 문서 3절: 기능 찾기를 먼저 본다)
HOWTO_WHERE_WORDS = ["어디서", "어디에", "어느 메뉴", "어느 화면", "어디", "where is", "where can i", "where do i"]
# "어떻게" 는 단독으로 쓰지 않는다 — 뒤에 동작이 붙어야 기능 찾기로 본다
HOWTO_HOW_TRIGGERS = ["어떻게", "how do i", "how to"]
HOWTO_VERBS = ["등록", "올려", "올리", "업로드", "작성", "만들", "찾", "설정", "신청",
               "register", "upload", "create", "find", "set up"]

# 기능 찾기 낱말 → LNB 메뉴 키 (app/seeds.py 의 NAV 와 1:1). en 낱말도 최소한 섞어 둔다.
HOWTO_ALIASES: dict[str, list[str]] = {
    "specs": ["사양서", "spec", "specification"],
    "approvals": ["승인 대기", "승인 관리", "결재", "approval"],
    "deploys": ["배포", "deploy"],
    "engine": ["검증엔진", "검증 엔진", "validation engine"],
    "results": ["검증 결과", "validation result"],
    "reports": ["검증 리포트", "검증 보고서", "validation report"],
    "analytics": ["센터 kpi", "통계 & 분석", "통계", "analytics"],
    "kpi-metrics": ["지표 관리", "kpi 지표", "kpi metric"],
    "kpi-ivi": ["ivi kpi", "인포 ivi", "ivi"],
    "members": ["회원", "member"],
    "roles": ["권한 관리", "권한", "role"],
    "menus": ["메뉴 관리", "menu management"],
    "notice": ["공지", "notice"],
    "qna": ["q&a", "질문 게시판", "qna"],
    "faq": ["faq"],
    "guide": ["사용자 가이드", "가이드", "guide"],
    "privacy": ["개인정보", "privacy"],
    "dashboard": ["대시보드", "dashboard"],
}

# 오류 유형 분포 — frontend errorTypeDistribution 스냅샷 비율(설계 문서 6절: 유형별 실측 없음).
# 기간 합계를 이 비율로 나눈다 — AI 가 아니라 코드가 정해진 가중치로 나누는 것도 "센다"에 든다.
ERROR_TYPE_WEIGHTS: list[tuple[str, int]] = [
    ("NULL_VALUE", 342), ("FORMAT_ERROR", 218), ("INVALID_VALUE", 164), ("RANGE_ERROR", 138),
]

CONTRACT_KEYS = ["understood", "notes", "unit", "total", "points", "items",
                  "headline", "evidence", "anomalies", "nextStep", "nextMenuKey", "followUps"]


def envelope(**kw: Any) -> dict[str, Any]:
    """답의 칸을 고정한다(설계 문서 4절) — 여기 없는 칸은 응답에 나가지 않는다."""
    base: dict[str, Any] = {
        "understood": "", "notes": [], "unit": "", "total": 0, "points": [], "items": [],
        "headline": "", "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": [],
    }
    base.update(kw)
    return base


# ── 기간 계산 유틸 ─────────────────────────────────────────────────────
def _add_months(y: int, m: int, delta: int) -> tuple[int, int]:
    total = y * 12 + (m - 1) + delta
    return total // 12, total % 12 + 1


def _ym(y: int, m: int) -> str:
    return f"{y:04d}-{m:02d}"


def expected_months(start: str, end: str) -> list[str]:
    sy, sm = int(start[:4]), int(start[5:7])
    ey, em = int(end[:4]), int(end[5:7])
    months = []
    y, m = sy, sm
    while (y, m) <= (ey, em):
        months.append(_ym(y, m))
        y, m = _add_months(y, m, 1)
    return months


def default_period(now: tuple[int, int]) -> dict[str, Any]:
    """못 알아들었을 때의 기본값 — 최근 12개월(설계 문서 3절)."""
    y, m = now
    sy, sm = _add_months(y, m, -11)
    return {"found": False, "start": _ym(sy, sm), "end": _ym(y, m)}


def parse_period(text: str, now: tuple[int, int]) -> dict[str, Any]:
    """기간 낱말 해석. 못 찾으면 found=False 로 표시하고 최근 12개월을 기본값으로 준다.

    ⚠ 찾았는지 여부는 반드시 이 결과의 found 로만 본다 — 문자열을 다시 뒤지지 않는다.
    """
    y0, m0 = now

    # 1) 상반기 / 하반기 (ko) — 앞의 "YYYY년" 은 선택
    m = re.search(r"(\d{4})\s*년\s*(상반기|하반기)|(상반기|하반기)", text)
    if m:
        year = int(m.group(1)) if m.group(1) else y0
        half = m.group(2) or m.group(3)
        return ({"found": True, "start": _ym(year, 1), "end": _ym(year, 6)} if half == "상반기"
                else {"found": True, "start": _ym(year, 7), "end": _ym(year, 12)})
    m = re.search(r"(\d{4})?\s*\b(h1|h2|first half|second half)\b", text, re.IGNORECASE)
    if m:
        year = int(m.group(1)) if m.group(1) else y0
        tag = m.group(2).lower()
        return ({"found": True, "start": _ym(year, 1), "end": _ym(year, 6)} if tag in ("h1", "first half")
                else {"found": True, "start": _ym(year, 7), "end": _ym(year, 12)})

    # 2) N분기 (ko/en)
    m = re.search(r"(\d{4})?\s*년?\s*([1-4])\s*분기", text)
    if m:
        year = int(m.group(1)) if m.group(1) else y0
        q = int(m.group(2))
        start_month = (q - 1) * 3 + 1
        return {"found": True, "start": _ym(year, start_month), "end": _ym(year, start_month + 2)}
    m = re.search(r"\bq([1-4])\b\s*(\d{4})?", text, re.IGNORECASE)
    if m:
        q = int(m.group(1))
        year = int(m.group(2)) if m.group(2) else y0
        start_month = (q - 1) * 3 + 1
        return {"found": True, "start": _ym(year, start_month), "end": _ym(year, start_month + 2)}

    # 3) 최근 N개월 / last N months
    m = re.search(r"최근\s*(\d+)\s*개월", text) or re.search(r"last\s*(\d+)\s*months?", text, re.IGNORECASE)
    if m:
        n = max(1, int(m.group(1)))
        sy, sm = _add_months(y0, m0, -(n - 1))
        return {"found": True, "start": _ym(sy, sm), "end": _ym(y0, m0)}

    # 4) YYYY년 / 바른 4자리 연도
    m = re.search(r"(\d{4})\s*년", text)
    if m:
        return {"found": True, "start": _ym(int(m.group(1)), 1), "end": _ym(int(m.group(1)), 12)}
    m = re.search(r"\b(19|20)\d{2}\b", text)
    if m:
        return {"found": True, "start": _ym(int(m.group(0)), 1), "end": _ym(int(m.group(0)), 12)}

    # 5) 작년 / 올해
    if "작년" in text or re.search(r"\blast year\b", text, re.IGNORECASE):
        return {"found": True, "start": _ym(y0 - 1, 1), "end": _ym(y0 - 1, 12)}
    if "올해" in text or re.search(r"\bthis year\b", text, re.IGNORECASE):
        return {"found": True, "start": _ym(y0, 1), "end": _ym(y0, 12)}

    # 6) 이번 달 / 지난달 / 다음 달
    if re.search(r"다음\s*달", text) or re.search(r"\bnext month\b", text, re.IGNORECASE):
        sy, sm = _add_months(y0, m0, 1)
        return {"found": True, "start": _ym(sy, sm), "end": _ym(sy, sm)}
    if re.search(r"지난\s*달", text) or re.search(r"\blast month\b", text, re.IGNORECASE):
        sy, sm = _add_months(y0, m0, -1)
        return {"found": True, "start": _ym(sy, sm), "end": _ym(sy, sm)}
    if re.search(r"이번\s*달", text) or re.search(r"\bthis month\b", text, re.IGNORECASE):
        return {"found": True, "start": _ym(y0, m0), "end": _ym(y0, m0)}

    return default_period(now)


_EN_MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def period_label(start: str, end: str, locale: str) -> str:
    sy, sm = int(start[:4]), int(start[5:7])
    ey, em = int(end[:4]), int(end[5:7])
    if locale == "en":
        if start == end:
            return f"{_EN_MONTHS[sm]} {sy}"
        if sy == ey:
            return f"{_EN_MONTHS[sm]}–{_EN_MONTHS[em]} {sy}"
        return f"{_EN_MONTHS[sm]} {sy} – {_EN_MONTHS[em]} {ey}"
    if start == end:
        return f"{sy}년 {sm}월"
    if sy == ey:
        return f"{sy}년 {sm}월 ~ {em}월"
    return f"{sy}년 {sm}월 ~ {ey}년 {em}월"


def format_count(n: int) -> str:
    """3800000 → "3.8M", 634000 → "634K" — 설계 문서 4절 예시 표기와 같은 자리수 표기."""
    if n >= 1_000_000:
        s = f"{n / 1_000_000:.1f}".rstrip("0").rstrip(".")
        return f"{s}M"
    if n >= 1_000:
        return f"{round(n / 1000)}K"
    return str(n)


def _half_compare_pct(values: list[int]) -> float | None:
    n = len(values)
    if n < 2:
        return None
    half = n // 2
    first, second = values[:half], values[-half:]
    s1, s2 = sum(first), sum(second)
    if s1 == 0:
        return None
    return (s2 - s1) / s1 * 100


# ── 낱말 인식 ──────────────────────────────────────────────────────────
def _is_howto(q: str) -> bool:
    ql = q.lower()
    if any(w in q or w in ql for w in HOWTO_WHERE_WORDS):
        return True
    has_how = any(t in q or t in ql for t in HOWTO_HOW_TRIGGERS)
    return has_how and any(v in q or v in ql for v in HOWTO_VERBS)


def _best_metric(q: str) -> str | None:
    """지표 낱말을 순서대로 본다 — 질문 안에서 가장 먼저 나오는 낱말의 지표가 이긴다."""
    ql = q.lower()
    best_key: str | None = None
    best_idx: int | None = None
    for key, kws in METRIC_KEYWORDS.items():
        for kw in kws:
            idx = q.find(kw)
            if idx == -1:
                idx = ql.find(kw.lower())
            if idx != -1 and (best_idx is None or idx < best_idx):
                best_idx, best_key = idx, key
    return best_key


def parse(question: str, now: tuple[int, int]) -> dict[str, Any]:
    """질문 → 질의 명세. metric_found 는 항상 불리언 — 문자열로 다시 판정하지 않는다."""
    q = (question or "").strip()
    if not q:
        return {"metric": "my.todo", "metric_found": False, "question": q, "period": None}
    if _is_howto(q):
        return {"metric": "howto", "metric_found": True, "question": q, "period": None}
    key = _best_metric(q)
    if key is None:
        return {"metric": "my.todo", "metric_found": False, "question": q, "period": None}
    period = parse_period(q, now) if METRICS[key]["period_eligible"] else None
    return {"metric": key, "metric_found": True, "question": q, "period": period}


def has_permission(matrix: dict[str, list[str]], metric_key: str) -> bool:
    requires = METRICS[metric_key]["requires"]
    if requires is None:
        return True
    return "조회" in (matrix.get(requires) or [])


# ── 문장 조립 (템플릿 + 값 — 통짜 문자열을 언어마다 손으로 적지 않는다) ─────
def _understood_text(metric_key: str, parsed: dict[str, Any], locale: str) -> str:
    ko = locale != "en"
    if metric_key == "validation.volume":
        label = period_label(parsed["period"]["start"], parsed["period"]["end"], locale)
        return f"{label} 검증 처리량" if ko else f"{label} validation volume"
    if metric_key == "validation.error":
        label = period_label(parsed["period"]["start"], parsed["period"]["end"], locale)
        return f"{label} 검증 오류" if ko else f"{label} validation errors"
    if metric_key == "spec.status":
        return "사양서 현황" if ko else "Specification status"
    if metric_key == "approval.pending":
        return "승인 대기 현황" if ko else "Pending approvals"
    if metric_key == "kpi.status":
        return "지표 승인 현황" if ko else "KPI approval status"
    if metric_key == "my.todo":
        return "내 할 일" if ko else "My tasks"
    return f"'{parsed['question']}' 기능 찾기" if ko else f"Finding a feature for '{parsed['question']}'"


def _spec_status(specs: list[dict[str, Any]], locale: str) -> dict[str, Any]:
    order = ["초안", "검토 중", "승인 대기", "배포 완료"]  # 상태값은 데이터 — en 에서도 번역하지 않는다
    counts = {s: 0 for s in order}
    for sp in specs:
        if sp.get("status") in counts:
            counts[sp["status"]] += 1
    points = [{"label": s, "value": counts[s]} for s in order]
    total = sum(counts.values())
    ko = locale != "en"
    if total == 0:
        headline = "사양서 자료가 아직 채워지지 않았습니다." if ko else "No specification data has been loaded yet."
        return {"unit": "건", "total": 0, "points": points, "items": [], "headline": headline,
                "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": []}
    max_status = max(order, key=lambda s: counts[s])
    tie = sum(1 for s in order if counts[s] == counts[max_status]) > 1
    if ko:
        headline = (f"총 {total}건 — 초안 {counts['초안']} · 검토 중 {counts['검토 중']} · "
                     f"승인 대기 {counts['승인 대기']} · 배포 완료 {counts['배포 완료']}.")
        evidence = [] if tie else [f"가장 많은 상태는 {max_status} ({counts[max_status]}건)입니다."]
        next_step, follow = "승인 대기 건은 승인 관리에서 처리하세요.", ["승인 대기 목록", "검증 처리량"]
    else:
        headline = (f"Total {total} — 초안 {counts['초안']} · 검토 중 {counts['검토 중']} · "
                     f"승인 대기 {counts['승인 대기']} · 배포 완료 {counts['배포 완료']}.")
        evidence = [] if tie else [f"The largest group is {max_status} ({counts[max_status]})."]
        next_step, follow = "Handle pending items in Approvals.", ["Pending approvals", "Validation volume"]
    return {"unit": "건", "total": total, "points": points, "items": [], "headline": headline,
            "evidence": evidence, "anomalies": [], "nextStep": next_step, "nextMenuKey": "specs", "followUps": follow}


def _approval_pending(approvals: list[dict[str, Any]], locale: str) -> dict[str, Any]:
    ko = locale != "en"
    items = []
    for a in approvals:
        if a.get("specId"):
            context = f"{a['specId']} · {a.get('version', '')}"
        else:
            context = "결재 대기" if ko else "Pending"
        hint = f"{a['waitingDays']}일 경과" if ko else f"{a['waitingDays']} days"
        items.append({"title": a["title"], "context": context, "hint": hint})
    total = len(items)
    if total == 0:
        headline = "결재 대기 건이 없습니다." if ko else "There are no pending approvals."
        return {"unit": "건", "total": 0, "points": [], "items": [], "headline": headline,
                "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": []}
    max_wait = max(a["waitingDays"] for a in approvals)
    if ko:
        headline = f"결재 대기 {total}건 · 가장 오래 기다린 건은 {max_wait}일째입니다."
        next_step, follow = "승인 관리에서 처리하세요.", ["사양서 현황", "검증 처리량"]
    else:
        headline = f"{total} pending · the longest has waited {max_wait} days."
        next_step, follow = "Handle these in Approvals.", ["Specification status", "Validation volume"]
    return {"unit": "건", "total": total, "points": [], "items": items, "headline": headline,
            "evidence": [], "anomalies": [], "nextStep": next_step, "nextMenuKey": "approvals", "followUps": follow}


def _validation_volume(monthly: list[dict[str, Any]], period: dict[str, Any], locale: str) -> dict[str, Any]:
    ko = locale != "en"
    monthly_map = {m["month"]: m for m in monthly}
    months = expected_months(period["start"], period["end"])
    points = [{"label": mo, "value": monthly_map[mo]["volume"]} for mo in months if mo in monthly_map]
    total = sum(p["value"] for p in points)
    if not points or total == 0:
        headline = "해당 기간의 검증 처리량 자료가 없습니다." if ko else "No validation volume data for this period."
        return {"unit": "건", "total": 0, "points": points, "items": [], "headline": headline,
                "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": []}
    avg = total / len(points)
    mx = max(points, key=lambda p: p["value"])
    evidence = []
    if ko:
        evidence.append(f"가장 많은 달은 {mx['label']} ({format_count(mx['value'])}건)")
    else:
        evidence.append(f"The highest month is {mx['label']} ({format_count(mx['value'])})")
    pct = _half_compare_pct([p["value"] for p in points])
    if pct is not None:
        if ko:
            evidence.append(f"뒤 절반이 앞 절반보다 {abs(pct):.0f}% {'많습니다' if pct >= 0 else '적습니다'}")
        else:
            evidence.append(f"The second half is {abs(pct):.0f}% {'more' if pct >= 0 else 'less'} than the first half")
    anomalies = []
    for p in points:
        if p["value"] < avg * 0.5:
            anomalies.append(f"{p['label']} 이 평균의 절반 아래입니다" if ko else f"{p['label']} is below half the average")
    if ko:
        headline = f"합계 {format_count(total)}건 · 월 평균 {format_count(round(avg))}건 ({len(points)}개월)."
        next_step, follow = "오류가 몰린 달을 검증 결과 조회에서 열어 보세요.", ["검증 오류", "사양서 현황"]
    else:
        headline = f"Total {format_count(total)} · monthly average {format_count(round(avg))} ({len(points)} months)."
        next_step, follow = "Open the affected months in Validation Results.", ["Validation errors", "Specification status"]
    return {"unit": "건", "total": total, "points": points, "items": [], "headline": headline,
            "evidence": evidence, "anomalies": anomalies, "nextStep": next_step,
            "nextMenuKey": "results", "followUps": follow}


def _validation_error(monthly: list[dict[str, Any]], period: dict[str, Any], locale: str) -> dict[str, Any]:
    ko = locale != "en"
    monthly_map = {m["month"]: m for m in monthly}
    months = expected_months(period["start"], period["end"])
    relevant = [monthly_map[mo] for mo in months if mo in monthly_map]
    total = sum(r["errors"] for r in relevant)
    if not relevant or total == 0:
        headline = "해당 기간의 검증 오류 자료가 없습니다." if ko else "No validation error data for this period."
        return {"unit": "건", "total": 0, "points": [], "items": [], "headline": headline,
                "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": []}
    weight_total = sum(w for _, w in ERROR_TYPE_WEIGHTS)
    points = [{"label": label, "value": round(total * w / weight_total)} for label, w in ERROR_TYPE_WEIGHTS]
    mx = max(points, key=lambda p: p["value"])
    if ko:
        headline = f"합계 {format_count(total)}건 · 가장 많은 유형은 {mx['label']} ({format_count(mx['value'])}건)."
        next_step, follow = "검증 리포트에서 유형별 상세를 확인하세요.", ["검증 처리량", "사양서 현황"]
    else:
        headline = f"Total {format_count(total)} · the most common type is {mx['label']} ({format_count(mx['value'])})."
        next_step, follow = "Check the breakdown in Validation Reports.", ["Validation volume", "Specification status"]
    return {"unit": "건", "total": total, "points": points, "items": [], "headline": headline,
            "evidence": [], "anomalies": [], "nextStep": next_step, "nextMenuKey": "reports", "followUps": follow}


def _kpi_status(kpi: list[dict[str, Any]], locale: str) -> dict[str, Any]:
    ko = locale != "en"
    order = ["승인", "검토 중", "초안"]
    counts = {s: 0 for s in order}
    for k in kpi:
        if k.get("status") in counts:
            counts[k["status"]] += 1
    items = [{"title": f"{k['name']} ({k['id']})", "context": k["area"], "hint": k["status"]} for k in kpi]
    total = len(kpi)
    if total == 0:
        headline = "지표 자료가 아직 채워지지 않았습니다." if ko else "No KPI data has been loaded yet."
        return {"unit": "건", "total": 0, "points": [], "items": [], "headline": headline,
                "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": []}
    if ko:
        headline = f"총 {total}건 — 승인 {counts['승인']} · 검토 중 {counts['검토 중']} · 초안 {counts['초안']}."
        next_step, follow = "검토 중 지표를 지표 관리에서 승인 처리하세요.", ["사양서 현황", "검증 처리량"]
    else:
        headline = f"Total {total} — 승인 {counts['승인']} · 검토 중 {counts['검토 중']} · 초안 {counts['초안']}."
        next_step, follow = "Approve pending items in KPI Metrics.", ["Specification status", "Validation volume"]
    return {"unit": "건", "total": total, "points": [], "items": items, "headline": headline,
            "evidence": [], "anomalies": [], "nextStep": next_step, "nextMenuKey": "kpi-metrics", "followUps": follow}


def _my_todo(todo: list[dict[str, Any]], locale: str) -> dict[str, Any]:
    ko = locale != "en"
    items = [{"title": t.get("title", ""), "context": t.get("context", ""), "hint": t.get("hint", "")} for t in todo]
    total = len(items)
    if total == 0:
        headline = "오늘 할 일이 없습니다." if ko else "You have no tasks today."
    else:
        headline = f"오늘 할 일 {total}건입니다." if ko else f"You have {total} tasks today."
    follow = ["기능 찾기", "사양서 현황"] if ko else ["Find a feature", "Specification status"]
    return {"unit": "건", "total": total, "points": [], "items": items, "headline": headline,
            "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": follow}


def _howto(nav: list[dict[str, Any]], question: str, locale: str) -> dict[str, Any]:
    ko = locale != "en"
    q, ql = question, question.lower()
    matched_keys = [key for key, aliases in HOWTO_ALIASES.items() if any(a in q or a in ql for a in aliases)]
    flat = [(section.get("title") or section.get("id"), item)
            for section in nav for item in section.get("items", [])]
    found = []
    for key in matched_keys:
        hit = next((pair for pair in flat if pair[1]["key"] == key), None)
        if hit:
            found.append(hit)
    found = found[:3]
    if not found:
        headline = "어떤 기능인지 찾지 못했습니다 — 다른 낱말로 다시 물어보세요." if ko else "Could not find that feature — try different words."
        follow = ["내 할 일"] if ko else ["My tasks"]
        return {"unit": "건", "total": 0, "points": [], "items": [], "headline": headline,
                "evidence": [], "anomalies": [], "nextStep": "", "nextMenuKey": None, "followUps": follow}
    items = []
    for section_title, item in found:
        label = item["label"] if ko else (item.get("labelEn") or item["label"])
        items.append({"title": label, "context": section_title or "", "hint": item.get("to", "")})
    first_label = items[0]["title"]
    headline = f"{first_label} 화면에서 할 수 있습니다." if ko else f"You can do this in {first_label}."
    next_step = f"{first_label} 화면을 열어 보세요." if ko else f"Open {first_label}."
    follow = ["내 할 일"] if ko else ["My tasks"]
    return {"unit": "건", "total": len(items), "points": [], "items": items, "headline": headline,
            "evidence": [], "anomalies": [], "nextStep": next_step, "nextMenuKey": found[0][1]["key"], "followUps": follow}


def answer(parsed: dict[str, Any], data: dict[str, Any], locale: str) -> dict[str, Any]:
    """숫자를 채운 최종 답 — 호출자(app/api/ask.py)가 권한 확인 후에만 부른다."""
    ko = locale != "en"
    metric_key = parsed["metric"]
    notes: list[str] = []
    if not parsed["metric_found"]:
        notes.append("질문을 정확히 알아듣지 못해 '내 할 일'로 답합니다" if ko
                      else "Could not tell what you meant — answering with My tasks")
    period = parsed.get("period")
    if period and not period["found"]:
        notes.append("기간을 못 찾아 최근 12개월로 봤습니다" if ko else "Could not find a time range — used the last 12 months")

    if metric_key == "spec.status":
        core = _spec_status(data["specs"], locale)
    elif metric_key == "approval.pending":
        core = _approval_pending(data["approvals"], locale)
    elif metric_key == "validation.volume":
        core = _validation_volume(data["monthly"], period, locale)
    elif metric_key == "validation.error":
        core = _validation_error(data["monthly"], period, locale)
    elif metric_key == "kpi.status":
        core = _kpi_status(data["kpi"], locale)
    elif metric_key == "my.todo":
        core = _my_todo(data["todo"], locale)
    else:
        core = _howto(data["nav"], parsed["question"], locale)

    return envelope(understood=_understood_text(metric_key, parsed, locale), notes=notes, **core)


def decline(parsed: dict[str, Any], locale: str) -> dict[str, Any]:
    """권한 없는 질의 — 403 이 아니라 200 으로, 답의 칸에 그 사실을 적는다(설계 문서 1절)."""
    ko = locale != "en"
    metric_key = parsed["metric"]
    requires = METRICS[metric_key]["requires"]
    headline = (f"이 질문은 [{requires}] 조회 권한이 있어야 답할 수 있습니다."
                if ko else f"This question needs view access to [{requires}].")
    return envelope(understood=_understood_text(metric_key, parsed, locale), headline=headline)


# ── 카탈로그 (GET /api/ask/catalog) ───────────────────────────────────
CATEGORY_DEFS: list[dict[str, Any]] = [
    {"key": "mine", "requires": [],
     "label": {"ko": "내 업무", "en": "My Tasks"},
     "questions": {"ko": ["오늘 할 일", "내가 볼 지연 건"], "en": ["Today's tasks", "Delayed items I own"]}},
    {"key": "howto", "requires": [],
     "label": {"ko": "기능 찾기", "en": "Find a Feature"},
     "questions": {"ko": ["사양서 어디서 등록해?", "검증 결과는 어디서 보나요?"],
                   "en": ["Where do I register a spec?", "Where can I see validation results?"]}},
    {"key": "specs", "requires": ["사양서 관리", "승인 관리"],
     "label": {"ko": "사양서·승인", "en": "Specs & Approvals"},
     "questions": {"ko": ["사양서 현황", "승인 대기 목록"], "en": ["Specification status", "Pending approvals"]}},
    {"key": "validation", "requires": ["검증엔진"],
     "label": {"ko": "검증", "en": "Validation"},
     "questions": {"ko": ["최근 6개월 검증 처리량", "이번 달 검증 오류"],
                   "en": ["Validation volume, last 6 months", "Validation errors this month"]}},
    {"key": "kpi", "requires": ["통계 & 분석"],
     "label": {"ko": "KPI", "en": "KPI"},
     "questions": {"ko": ["지표 승인 현황"], "en": ["KPI approval status"]}},
]


def catalog(matrix: dict[str, list[str]], locale: str) -> dict[str, Any]:
    """그 사람 권한으로 걸러서 준다 — 권한 없는 카테고리는 아예 안 내려간다."""
    loc = locale if locale in ("ko", "en") else "ko"
    cats = []
    for c in CATEGORY_DEFS:
        if c["requires"] and not any("조회" in (matrix.get(m) or []) for m in c["requires"]):
            continue
        cats.append({"key": c["key"], "label": c["label"][loc], "questions": c["questions"][loc]})
    return {"categories": cats}
