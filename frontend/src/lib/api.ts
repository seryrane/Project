/**
 * API 관문 — 서버 호출은 반드시 여기를 지난다.
 *
 * 프로토타입 모드: 서버(백엔드 :8080)가 없으면 **mock 으로 조용히 돌아간다** —
 * 터널 시연이 백엔드 유무에 흔들리면 안 되기 때문이다.
 * ⚠ 본개발에서는 규약 21절대로 바꾼다 — 연결 실패를 사람 말로 알리고(fallback 제거),
 *   401 은 로그인으로 보낸다. 이 관문 한 곳만 고치면 된다.
 */
import { useCallback, useEffect, useState } from 'react'

const TOKEN_KEY = 'auth.token'

/** 약식 세션 토큰 (SSO·JWT 정책 확정 전) — 관문만 알고, 화면은 모른다 */
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`/api${path}`, { headers: authHeaders() })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function apiSend(
  method: 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<boolean> {
  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

/** 본문이 필요한 호출 — 로그인처럼 실패 메시지를 그 자리에 보여야 하는 곳(규약 21절 예외) */
export async function apiPost<T>(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: T | null; detail: string }> {
  try {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as (T & { detail?: string }) | null
    return {
      ok: res.ok,
      status: res.status,
      data: res.ok ? data : null,
      detail: (data && 'detail' in (data as object) ? String((data as { detail?: string }).detail) : '') || '',
    }
  } catch {
    // 연결 실패에 사람의 말을 준다 (규약 21절)
    return { ok: false, status: 0, data: null, detail: '서버에 연결하지 못했습니다 — 네트워크를 확인해 주세요.' }
  }
}

/**
 * 조회 훅 — 서버가 답하면 그 값, 아니면 mock(fallback).
 * SSR·첫 렌더는 항상 fallback 이라 수화 불일치가 없다.
 */
export function useApi<T>(path: string, fallback: T): {
  data: T
  /** 서버 정본을 보고 있는가 — false 면 mock (시연 모드) */
  live: boolean
  reload: () => void
} {
  const [data, setData] = useState<T>(fallback)
  const [live, setLive] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    void apiGet<T>(path).then((fresh) => {
      if (cancelled || fresh === null) return
      setData(fresh)
      setLive(true)
    })
    return () => {
      cancelled = true
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, live, reload }
}
