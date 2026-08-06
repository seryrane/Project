"""SQLite 저장소 — 프로토타입 공통 기능의 정본.

정본 문서(역할·메뉴·FAQ 등)는 kv 표에 JSON 통째로 저장한다 — 부분 갱신 API 를
두면 중간에 실패했을 때 반쯤 바뀐 정본이 남고, 그 상태는 화면에서 안 보인다
(acrofuture 역할 저장에서 실증된 병 — docs/RBAC_설계노트.md).
행 데이터(공지·질문·감사 로그·상신 접수)는 각자 표를 가진다.
"""

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

# 테스트는 HMG_DB_PATH 로 임시 파일을 준다 — 개발 DB 를 오염시키면 화면에
# "테스트 공지"가 뜬다 (실제로 한 번 겪고 분리함)
DB_PATH = Path(os.environ.get("HMG_DB_PATH") or Path(__file__).resolve().parent.parent / "data" / "app.db")


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS kv (
              name TEXT PRIMARY KEY,
              json TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS notices (
              id TEXT PRIMARY KEY,
              json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS questions (
              id TEXT PRIMARY KEY,
              json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit_log (
              seq INTEGER PRIMARY KEY AUTOINCREMENT,
              json TEXT NOT NULL
            );
            -- 상신 접수함 — 결재 엔진은 미확정이라 "접수 사실"만 정직하게 남긴다
            CREATE TABLE IF NOT EXISTS submissions (
              seq INTEGER PRIMARY KEY AUTOINCREMENT,
              kind TEXT NOT NULL,
              json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            """
        )


def kv_get(name: str) -> Any | None:
    with connect() as conn:
        row = conn.execute("SELECT json FROM kv WHERE name = ?", (name,)).fetchone()
    return json.loads(row["json"]) if row else None


def kv_put(name: str, value: Any) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO kv(name, json) VALUES(?, ?) "
            "ON CONFLICT(name) DO UPDATE SET json = excluded.json",
            (name, json.dumps(value, ensure_ascii=False)),
        )
