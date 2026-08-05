# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monolithic full-stack platform project for HMG (Hyundai Motor Group): a unified portal hosting ICDAP (KPI/data visualization) and IDMS (IBD spec management). Requirements are still being finalized — see `docs/PROJECT_CONTEXT.md` for the full integrated project context and `docs/MEETING_CHECKLIST.md` for open questions. Read `docs/PROJECT_CONTEXT.md` before doing feature work.

- `frontend/` — React 19 + TanStack Start (file-based routing via TanStack Router), Vite 8, TypeScript, Tailwind CSS 4. Scaffolded with `@tanstack/cli`. React matches the customer standard.
- `backend/` — Spring Boot 4.1 on Java 21, built with Gradle 9 (wrapper committed). Spring MVC (`spring-boot-starter-webmvc` — note: Boot 4 deprecated `spring-boot-starter-web`), Spring Data JPA with in-memory H2, Bean Validation, Actuator.
- `backend-python/` — FastAPI candidate scaffold (venv + `pip install -e ".[dev]"`, pytest, ruff).

IMPORTANT: The backend framework is NOT yet decided (customer requirement says "B/E: 협의"; signals lean FastAPI). Both backend scaffolds exist in parallel — do not build business logic into either until the decision is confirmed, then delete the losing one and update this file and CI.

The frontend dev server (port 3000) proxies `/api/*` to the backend (port 8080) — see `frontend/vite.config.ts`. All backend REST endpoints live under the `/api` prefix (`backend/src/main/java/com/example/backend/api/`).

## Commands

Frontend (run from `frontend/`):
- `npm install` — install dependencies
- `npm run dev` — dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run check` / `npm run format` — Prettier check / write
- `npm run generate-routes` — regenerate `src/routeTree.gen.ts` after adding routes (the Vite plugin also does this automatically during dev)

Backend (run from `backend/`):
- `./gradlew build` — compile + tests
- `./gradlew test` — tests only
- `./gradlew bootRun` — run the app on port 8080

Backend candidate (run from `backend-python/`, after `python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"`):
- `.venv/bin/pytest` — tests
- `.venv/bin/ruff check .` — lint
- `.venv/bin/uvicorn app.main:app --reload --port 8080` — run (same port as Spring Boot so the frontend proxy works with either)

## Conventions

- Backend dependency versions come from the `spring-boot-dependencies` platform BOM declared in `backend/build.gradle`; the BOM must be applied to each configuration that needs it (it is applied to both `implementation` and `developmentOnly`).
- New backend REST controllers go in the `com.example.backend.api` package under the `/api` path prefix so the dev proxy picks them up.
- Frontend routes are file-based under `frontend/src/routes/`; `src/routeTree.gen.ts` is generated — never edit it by hand.
- H2 is dev-only; `spring.jpa.hibernate.ddl-auto=update` is a local convenience and a real database/migration story is still to be decided.
