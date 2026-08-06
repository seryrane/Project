"""테스트 DB 분리 — app 모듈이 import 되기 전에 경로를 바꿔야 한다."""

import os
import tempfile
from pathlib import Path

# app.db 의 DB_PATH 는 import 시점에 읽힌다 — conftest 가 가장 먼저 실행되는 것을 이용
os.environ["HMG_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")
