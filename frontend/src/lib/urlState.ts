/**
 * 목록 화면이 **보고 있는 상태**(검색어·필터·탭)를 주소에 둔다.
 *
 * ⚠⚠ 2026-08-11 이전에는 전부 `useState` 였다. 그래서 새로고침·뒤로가기·링크 공유에서
 * 화면이 통째로 초기화됐다 — 관리자끼리 "이 화면 좀 봐"가 안 되고, 상세를 보고 뒤로
 * 오면 방금 걸어 둔 필터가 사라져 처음부터 다시 골라야 했다.
 *
 * 규칙 셋
 *  ① **기본값은 주소에 쓰지 않는다** — `?status=전체 상태` 같은 군더더기가 남으면
 *     사람이 링크를 못 읽는다. 기본값이면 `undefined` 를 넣어 키째 지운다.
 *  ② **모르는 값은 기본값으로 떨어진다** — 손으로 고친 주소·옛 링크가 화면을 깨지 않는다.
 *  ③ **글자 입력은 replace, 고르는 것(칩·탭)은 push** — 타자 한 글자마다 뒤로가기
 *     한 칸이 쌓이면 뒤로가기가 못 쓰게 되고, 반대로 필터를 골랐는데 뒤로 못 가면
 *     "방금 화면"으로 돌아갈 길이 없다.
 *
 * 값은 한국어 원문 그대로 둔다(규약 §4-4 — 내부 값은 데이터 어휘). 주소창에서는
 * 퍼센트 인코딩되지만 브라우저가 사람 글자로 되돌려 보여 준다.
 */

/** 허용 목록에 있는 값만 통과 — 없으면 undefined(=기본값) */
export function pickOne<T extends string>(value: unknown, allowed: ReadonlyArray<T>): T | undefined {
  return typeof value === 'string' && (allowed as ReadonlyArray<string>).includes(value)
    ? (value as T)
    : undefined
}

/** 빈 문자열은 주소에서 지운다 — `?q=` 만 남는 링크를 만들지 않는다 */
export function pickText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

/** 기본값이면 주소에서 지우고, 아니면 그대로 — 화면 쪽 `set(...)` 호출부를 짧게 만든다 */
export function orNone<T extends string>(value: T, fallback: T): T | undefined {
  return value === fallback ? undefined : value
}
