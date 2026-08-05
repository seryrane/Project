"""시드 정본 — 프런트 mock(data/*.ts)과 같은 내용을 서버가 정본으로 넘겨받는다.

⚠ 비어 있을 때만 채운다 — 매번 덮으면 화면에서 바꾼 것이 재기동 때마다 되돌아간다
(acrofuture RoleBootstrap 의 규칙 그대로 — docs/RBAC_설계노트.md 4절).
"""

from datetime import UTC, datetime

from app import db

# ── RBAC 정본 (frontend/src/data/roles.ts 와 동일) ──────────────────────
ACTIONS = ["조회", "생성", "수정", "삭제", "업로드", "다운로드", "승인"]

ROLES = [
    {
        "key": "super",
        "name": "Super Admin",
        "desc": "전체 시스템 관리 권한 — 회원·권한·메뉴 관리 포함",
        "system": True,
        "assigned": 2,
        "matrix": {
            "대시보드": ["조회"],
            "통계 & 분석": ["조회", "다운로드"],
            "회원 관리": ["조회", "생성", "수정", "삭제"],
            "권한 관리": ["조회", "생성", "수정", "삭제"],
            "메뉴 관리": ["조회", "생성", "수정", "삭제"],
            "사양서 관리": ACTIONS,
            "승인 관리": ["조회", "승인"],
            "배포 관리": ["조회", "생성", "승인"],
            "검증엔진": ["조회", "생성", "수정", "삭제"],
            "커뮤니티": ["조회", "생성", "수정", "삭제"],
        },
        "scope": {},
        "holders": [
            {"name": "김현대", "scopeLabel": "전체"},
            {"name": "박서준", "scopeLabel": "전체"},
        ],
        # 대시보드 프리셋 파생용 기능 키 (frontend dashboardLayout ROLE_DEFS 대응)
        "features": [
            "dashboard.read", "validation.stats", "spec.read", "validation.history",
            "approval.read", "validation.errors", "activity.read", "monitoring.read",
            "pipeline.read", "member.read", "community.read",
        ],
    },
    {
        "key": "admin",
        "name": "Admin",
        "desc": "서비스 운영 및 모니터링 권한 — 배포·검증 운영",
        "system": True,
        "assigned": 5,
        "matrix": {
            "대시보드": ["조회"],
            "통계 & 분석": ["조회", "다운로드"],
            "회원 관리": ["조회"],
            "권한 관리": ["조회"],
            "메뉴 관리": ["조회"],
            "사양서 관리": ["조회", "생성", "수정", "업로드", "다운로드"],
            "승인 관리": ["조회", "승인"],
            "배포 관리": ["조회", "생성", "승인"],
            "검증엔진": ["조회", "생성", "수정"],
            "커뮤니티": ["조회", "생성"],
        },
        "scope": {},
        "holders": [
            {"name": "박준혁", "scopeLabel": "플랫폼운영팀"},
            {"name": "이수진", "scopeLabel": "전동화기술팀"},
            {"name": "정민호", "scopeLabel": "IT 전략팀"},
        ],
        "features": [
            "dashboard.read", "approval.read", "spec.read", "activity.read",
            "validation.stats", "community.read",
        ],
    },
    {
        "key": "editor",
        "name": "Editor",
        "desc": "사양서 작성·수정 권한, 승인 요청 가능",
        "system": True,
        "assigned": 18,
        "matrix": {
            "대시보드": ["조회"],
            "통계 & 분석": ["조회"],
            "사양서 관리": ["조회", "생성", "수정", "업로드", "다운로드"],
            "승인 관리": ["조회"],
            "배포 관리": ["조회"],
            "검증엔진": ["조회"],
            "커뮤니티": ["조회", "생성"],
        },
        "scope": {
            "통계 & 분석": "team",
            "사양서 관리": "team",
            "승인 관리": "own",
            "배포 관리": "team",
            "검증엔진": "team",
        },
        "holders": [
            {"name": "김민준", "scopeLabel": "IT 전략팀"},
            {"name": "이서연", "scopeLabel": "전동화기술팀"},
        ],
        "features": [
            "dashboard.read", "validation.stats", "validation.errors",
            "validation.history", "monitoring.read", "pipeline.read", "community.read",
        ],
    },
    {
        "key": "viewer",
        "name": "Viewer",
        "desc": "사양서·지표 조회 전용 권한",
        "system": True,
        "assigned": 41,
        "matrix": {
            "대시보드": ["조회"],
            "통계 & 분석": ["조회"],
            "사양서 관리": ["조회", "다운로드"],
            "커뮤니티": ["조회"],
        },
        "scope": {"통계 & 분석": "team", "사양서 관리": "team"},
        "holders": [
            {"name": "한동현", "scopeLabel": "법무팀"},
            {"name": "최수진", "scopeLabel": "마케팅팀"},
        ],
        "features": [
            "dashboard.read", "validation.stats", "spec.read", "activity.read",
            "community.read",
        ],
    },
]

# ── LNB 정본 (frontend/src/data/nav.ts 와 같은 모양) ─────────────────────
NAV = [
    {"id": "main", "items": [
        {"key": "dashboard", "label": "대시보드", "icon": "dashboard", "to": "/dashboard"},
        {"key": "analytics", "label": "통계 & 분석", "icon": "stats", "to": "/analytics"},
    ]},
    {"id": "admin", "title": "관리", "items": [
        {"key": "members", "label": "회원 관리", "icon": "users", "to": "/members"},
        {"key": "roles", "label": "권한 관리", "icon": "shield", "to": "/roles"},
        {"key": "menus", "label": "메뉴 관리", "icon": "menu", "to": "/menus"},
    ]},
    {"id": "idms", "title": "사양 (IDMS)", "items": [
        {"key": "specs", "label": "사양서 관리", "icon": "doc", "to": "/specs"},
        {"key": "approvals", "label": "승인 관리", "icon": "approve", "badge": 3, "to": "/approvals"},
        {"key": "deploys", "label": "배포 관리", "icon": "deploy", "to": "/deploys"},
    ]},
    {"id": "validation", "title": "검증엔진", "items": [
        {"key": "engine", "label": "검증엔진 관리", "icon": "engine", "to": "/validation-engine"},
        {"key": "results", "label": "검증 결과 조회", "icon": "search", "to": "/validation-results"},
        {"key": "reports", "label": "검증 리포트", "icon": "report", "to": "/validation-reports"},
    ]},
    {"id": "community", "title": "커뮤니티", "items": [
        {"key": "notice", "label": "공지사항", "icon": "bell", "to": "/notice"},
        {"key": "qna", "label": "Q&A", "icon": "message", "to": "/qna"},
        {"key": "faq", "label": "FAQ", "icon": "help", "to": "/faq"},
        {"key": "guide", "label": "사용자 가이드", "icon": "book", "to": "/guide"},
    ]},
    {"id": "system", "title": "시스템", "items": [
        {"key": "alerts", "label": "시스템 알림", "icon": "bell", "badge": 3},
        {"key": "privacy", "label": "개인정보보호", "icon": "lock", "to": "/privacy"},
    ]},
]

# LNB 항목 키 → 필요한 메뉴 권한(매트릭스 낱말). 없으면 최소 메뉴(모두에게).
NAV_REQUIRES = {
    "dashboard": "대시보드", "analytics": "통계 & 분석",
    "members": "회원 관리", "roles": "권한 관리", "menus": "메뉴 관리",
    "specs": "사양서 관리", "approvals": "승인 관리", "deploys": "배포 관리",
    "engine": "검증엔진", "results": "검증엔진", "reports": "검증엔진",
    # 커뮤니티·가이드·알림은 최소 메뉴 — 권한으로 가리면 LNB 가 텅 빈다
    "privacy": "권한 관리",
}

# ── 커뮤니티 (frontend/src/data/community.ts 요약 이관) ──────────────────
NOTICES = [
    {"id": "N-021", "title": "8월 정기 점검 안내 — 8/9(토) 02:00~06:00 서비스 일시 중단",
     "category": "시스템", "author": "박준혁", "date": "2026.08.04", "views": 182, "pinned": True,
     "body": ["8월 정기 점검으로 아래 시간 동안 포털 접속이 중단됩니다.",
               "점검 시간: 2026-08-09(토) 02:00 ~ 06:00 (4시간)",
               "대상: 통합 관리자 포털 전체 (사양서 조회 API 포함)",
               "점검 중 상신된 승인 건은 점검 종료 후 순차 처리됩니다."]},
    {"id": "N-020", "title": "사양서 v2 양식 전환 — 9/1 부터 구양식 등록 마감",
     "category": "정책", "author": "김현대", "date": "2026.08.03", "views": 240, "pinned": True,
     "body": ["9/1 부터 신규 사양서는 v2 양식으로만 등록됩니다.",
               "기존 v1 사양서는 조회·배포는 그대로 가능하며, 수정 시 v2 로 자동 변환됩니다."]},
    {"id": "N-019", "title": "VN7 엔진 사양서 v2.3 배포 완료",
     "category": "배포", "author": "박준혁", "date": "2026.08.01", "views": 95,
     "body": ["VN7 엔진 사양서 v2.3 이 Production 에 배포되었습니다."]},
    {"id": "N-018", "title": "검증엔진 스케줄 정책 변경 — 야간 일괄 실행 02:00 통일",
     "category": "시스템", "author": "이수진", "date": "2026.07.28", "views": 67,
     "body": ["야간 일괄 검증 시각을 02:00 로 통일합니다."]},
    {"id": "N-017", "title": "신규 입사자 포털 교육 — 8/14(목) 14:00 온라인",
     "category": "교육", "author": "정다은", "date": "2026.07.25", "views": 41,
     "body": ["신규 입사자 대상 포털 사용 교육을 진행합니다."]},
    {"id": "N-016", "title": "개인정보 처리방침 v3.2 시행 안내",
     "category": "정책", "author": "한동현", "date": "2026.07.21", "views": 58,
     "body": ["개인정보 처리방침 v3.2 가 8/1 부터 시행됩니다."]},
]

QUESTIONS = [
    {"id": "Q-108", "title": "사양서 버전 비교에서 삭제된 필드는 어디서 확인하나요?",
     "category": "사양서", "author": "이서연", "date": "2026.08.05",
     "body": "버전 비교 모달에서 삭제된 필드 목록은 어디서 볼 수 있나요?", "answers": []},
    {"id": "Q-107", "title": "승인 반려 시 의견이 필수인 이유가 궁금합니다",
     "category": "승인·배포", "author": "김민준", "date": "2026.08.04",
     "body": "반려할 때마다 사유를 적어야 해서 번거로운데, 정책인가요?",
     "answers": [{"author": "박준혁", "role": "Admin", "date": "2026.08.04",
                   "body": "정책입니다. 반려 의견이 다음 상신의 수정 지침이 됩니다."}]},
    {"id": "Q-106", "title": "검증 리포트를 팀 외부에 공유해도 되나요?",
     "category": "검증엔진", "author": "정다은", "date": "2026.08.02",
     "body": "협력사에 검증 결과 요약을 보내야 하는데 그대로 전달해도 되는지요.",
     "answers": [{"author": "한동현", "role": "Viewer", "date": "2026.08.03",
                   "body": "보안팀 검토가 필요합니다. 외부 공유 전 마스킹 처리를 요청하세요."},
                  {"author": "김현대", "role": "Super Admin", "date": "2026.08.03",
                   "body": "8월 중 외부 공유용 리포트 양식을 추가할 예정입니다."}]},
    {"id": "Q-105", "title": "대시보드 위젯 배치가 초기화됐습니다",
     "category": "기타", "author": "오지원", "date": "2026.08.01",
     "body": "어제 편집한 위젯 배치가 오늘 로그인하니 기본으로 돌아갔습니다.",
     "answers": [{"author": "이수진", "role": "Admin", "date": "2026.08.01",
                   "body": "이제 배치는 계정 단위로 서버에 저장됩니다."}]},
]

FAQS = [
    {"id": "F-01", "category": "계정·권한", "q": "로그인이 안 됩니다 / 계정이 잠겼습니다",
     "a": "비밀번호 5회 오류 시 계정이 잠깁니다. HMG-SSO 포털에서 재설정하거나 관리자에게 잠금 해제를 요청하세요.",
     "helpful": 34},
    {"id": "F-02", "category": "계정·권한", "q": "메뉴가 안 보여요 — 권한이 없는 건가요?",
     "a": "메뉴는 권한의 파생물이라 권한이 없으면 아예 보이지 않습니다. 아바타 → [내가 할 수 있는 것]에서 확인하세요.",
     "helpful": 28},
    {"id": "F-03", "category": "사양서", "q": "작성 중이던 사양서가 사라졌어요",
     "a": "임시저장본이 남습니다. 다시 들어가면 [이어서 작업] 배너가 뜹니다.", "helpful": 21},
    {"id": "F-04", "category": "사양서", "q": "엑셀로 관리하던 사양서를 옮길 수 있나요?",
     "a": "사양서 상세 → [엑셀 업로드]로 기존 시트를 올리면 변환됩니다.", "helpful": 17},
    {"id": "F-05", "category": "승인·배포", "q": "승인이 됐는데 배포가 안 됐어요",
     "a": "승인과 배포는 별개 단계입니다. 배포 담당이 배포 요청을 실행해야 반영됩니다.", "helpful": 19},
    {"id": "F-06", "category": "검증엔진", "q": "검증 실패 알림이 왔는데 어디부터 봐야 하나요",
     "a": "검증 결과 조회에서 해당 실행을 열면 오류 상세가 보입니다.", "helpful": 12},
]

MEMBERS = [
    {"id": "u-01", "name": "김현대", "email": "hyundae.kim@hmg.com", "dept": "IT 전략팀",
     "grade": "Super Admin", "roles": ["KPI_ADMIN", "IBD_ADMIN"], "status": "활성",
     "fido": True, "lastLogin": "2026.08.05 09:23"},
    {"id": "u-02", "name": "김민준", "email": "minjun.kim@hmg.com", "dept": "IT 전략팀",
     "grade": "Editor", "roles": ["IBD_EDITOR"], "status": "활성",
     "fido": True, "lastLogin": "2026.08.05 09:10"},
    {"id": "u-03", "name": "이서연", "email": "seoyeon.lee@hmg.com", "dept": "전동화기술팀",
     "grade": "Editor", "roles": ["IBD_EDITOR", "KPI_EDITOR"], "status": "활성",
     "fido": False, "lastLogin": "2026.08.05 08:45"},
    {"id": "u-04", "name": "박준혁", "email": "junhyuk.park@hmg.com", "dept": "플랫폼운영팀",
     "grade": "Admin", "roles": ["DEPLOY_MANAGER"], "status": "활성",
     "fido": True, "lastLogin": "2026.08.04 17:32"},
    {"id": "u-05", "name": "한동현", "email": "donghyun.han@hmg.com", "dept": "법무팀",
     "grade": "Viewer", "roles": ["IBD_APPROVER"], "status": "활성",
     "fido": True, "lastLogin": "2026.08.05 07:58"},
    {"id": "u-06", "name": "최수진", "email": "sujin.choi@hmg.com", "dept": "마케팅팀",
     "grade": "Viewer", "roles": [], "status": "비활성",
     "fido": False, "lastLogin": "2026.06.20 14:11"},
    {"id": "u-07", "name": "정다은", "email": "daeun.jung@hmg.com", "dept": "연구개발팀",
     "grade": "Viewer", "roles": [], "status": "활성",
     "fido": False, "lastLogin": "2026.08.05 10:05"},
    {"id": "u-08", "name": "오지원", "email": "jiwon.oh@hmg.com", "dept": "디자인팀",
     "grade": "Viewer", "roles": [], "status": "잠금",
     "fido": False, "lastLogin": "2026.07.10 16:45"},
    {"id": "u-09", "name": "윤성민", "email": "seongmin.yun@hmg.com", "dept": "플랫폼운영팀",
     "grade": "Admin", "roles": ["DEPLOY_MANAGER"], "status": "활성",
     "fido": True, "lastLogin": "2026.08.04 15:30"},
    {"id": "u-10", "name": "박서준", "email": "seojun.park@hmg.com", "dept": "IT 전략팀",
     "grade": "Super Admin", "roles": ["KPI_ADMIN"], "status": "활성",
     "fido": True, "lastLogin": "2026.08.05 08:12"},
]

AUDIT = [
    {"at": "2026.08.05 09:41", "user": "김현대", "action": "다운로드",
     "target": "회원 목록 (엑셀, 10건)", "reason": "월간 계정 감사"},
    {"at": "2026.08.05 09:12", "user": "박준혁", "action": "열람",
     "target": "오지원 회원 상세", "reason": "잠금 해제 처리"},
    {"at": "2026.08.04 17:55", "user": "이수진", "action": "마스킹 해제",
     "target": "한동현 연락처", "reason": "긴급 배포 연락"},
    {"at": "2026.08.04 14:20", "user": "김현대", "action": "다운로드",
     "target": "검증 리포트 7월호", "reason": "경영 보고 첨부"},
    {"at": "2026.08.03 11:02", "user": "정민호", "action": "열람",
     "target": "김민준 회원 상세", "reason": "권한 예외 검토"},
    {"at": "2026.08.02 16:44", "user": "박준혁", "action": "열람",
     "target": "최수진 회원 상세", "reason": "비활성 계정 정리"},
]

WHATSNEW = [
    {"date": "2026.08.05", "title": "커뮤니티가 열렸습니다 — 공지·Q&A·FAQ",
     "desc": "모든 역할이 볼 수 있습니다. 막히면 FAQ 먼저, 없으면 Q&A 에 질문을 남기세요.",
     "to": "/notice", "toLabel": "공지사항 열기"},
    {"date": "2026.08.05", "title": "내 권한을 사람 말로 — [내가 할 수 있는 것]",
     "desc": "우측 상단 아바타 메뉴에서 내가 지금 무엇을 할 수 있는지 확인합니다.",
     "to": "/guide", "toLabel": "역할과 권한 안내"},
    {"date": "2026.08.04", "title": "권한에 조회 범위가 생겼습니다",
     "desc": "같은 조회 권한이라도 내 것만 · 우리 팀 · 전체가 갈립니다.",
     "to": "/roles", "toLabel": "권한 관리 열기"},
    {"date": "2026.08.03", "title": "메뉴에 화면 템플릿 — 추가할 화면을 그림으로 고릅니다",
     "desc": "새 메뉴를 만들 때 와이어프레임으로 UI 를 미리 구상합니다.",
     "to": "/menus", "toLabel": "메뉴 관리 열기"},
    {"date": "2026.08.02", "title": "대시보드 위젯을 역할 프리셋으로",
     "desc": "역할에 기능이 붙거나 떨어지면 추천 배치가 따라 바뀝니다.",
     "to": "/dashboard", "toLabel": "대시보드 열기"},
]


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def seed_if_empty() -> None:
    """비어 있을 때만 채운다 — 화면에서 바꾼 것을 재기동이 되돌리면 안 된다."""
    if db.kv_get("roles") is None:
        db.kv_put("roles", ROLES)
    if db.kv_get("nav") is None:
        db.kv_put("nav", NAV)
    if db.kv_get("nav_requires") is None:
        db.kv_put("nav_requires", NAV_REQUIRES)
    if db.kv_get("faqs") is None:
        db.kv_put("faqs", FAQS)
    if db.kv_get("members") is None:
        db.kv_put("members", MEMBERS)
    if db.kv_get("whatsnew") is None:
        db.kv_put("whatsnew", WHATSNEW)

    with db.connect() as conn:
        if conn.execute("SELECT COUNT(*) c FROM notices").fetchone()["c"] == 0:
            import json as _json
            for n in NOTICES:
                conn.execute(
                    "INSERT INTO notices(id, json, created_at) VALUES(?,?,?)",
                    (n["id"], _json.dumps(n, ensure_ascii=False), now_iso()),
                )
        if conn.execute("SELECT COUNT(*) c FROM questions").fetchone()["c"] == 0:
            import json as _json
            for q in QUESTIONS:
                conn.execute(
                    "INSERT INTO questions(id, json, created_at) VALUES(?,?,?)",
                    (q["id"], _json.dumps(q, ensure_ascii=False), now_iso()),
                )
        if conn.execute("SELECT COUNT(*) c FROM audit_log").fetchone()["c"] == 0:
            import json as _json
            for a in AUDIT:
                conn.execute(
                    "INSERT INTO audit_log(json) VALUES(?)",
                    (_json.dumps(a, ensure_ascii=False),),
                )
