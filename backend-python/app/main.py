from fastapi import FastAPI

from app.api import hello

app = FastAPI(title="backend-python", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.include_router(hello.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
