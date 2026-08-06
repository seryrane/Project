"""시드 정본(app/seeds.py)을 스프링 벌의 리소스로 덤프한다 — 손 복사는 어긋난다."""

import json
from pathlib import Path

from app import seeds

OUT = Path(__file__).resolve().parent.parent / "backend" / "src" / "main" / "resources" / "seed"
OUT.mkdir(parents=True, exist_ok=True)

DATA = {
    "roles": seeds.ROLES,
    "nav": seeds.NAV,
    "nav_requires": seeds.NAV_REQUIRES,
    "notices": seeds.NOTICES,
    "questions": seeds.QUESTIONS,
    "faqs": seeds.FAQS,
    "members": seeds.MEMBERS,
    "audit": seeds.AUDIT,
    "whatsnew": seeds.WHATSNEW,
}

for name, value in DATA.items():
    (OUT / f"{name}.json").write_text(
        json.dumps(value, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"seed/{name}.json ({len(value)})")
