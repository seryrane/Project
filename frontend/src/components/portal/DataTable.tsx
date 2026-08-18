/**
 * 목록 표의 **관문** — 규약 §9 "표는 한 곳에서만 그린다".
 *
 * ⚠⚠ 규약은 이 관문을 오래전부터 약속해 놓고 코드에는 없었다(2026-08-13 실측: 표 열셋,
 * 관문 0개). 그래서 §9 가 요구하는 것들이 표마다 제각각이었다 —
 *
 *     숫자 열 우측 정렬       열셋 중 넷만
 *     가장자리 그림자         열셋 중 다섯만 (`table-scroll`)
 *     빈 상태 행              목록형 다섯 중 넷만 (지표 관리에는 없었다)
 *     머리줄 고정             **한 곳도 없음**
 *
 * ⚠ 그리고 §9 는 "성격이 다른 것을 억지로 관문에 넣으면 관문에 화면별 예외가 붙어
 * '한 곳에서만 그린다'가 이름만 남는다"고 함께 경고한다. 그래서 **목록형만** 받는다.
 * 안 받는 것과 이유는 아래 `안 받는 표` 주석에 적는다.
 */

export interface Column<T> {
  /** 열 이름 — 이미 번역된 말이 온다(관문은 사전을 모른다) */
  header: string
  /**
   * 숫자 열인가. §9: "숫자 열은 오른쪽 정렬 + `tabular-nums`. 끝을 맞춰야 눈이 자릿수를
   * 센다. **머리글도 그 열을 따른다**" — 그래서 정렬을 셀과 머리글에 함께 건다.
   */
  numeric?: boolean
  /** 이 열의 셀에 더 붙일 것 (폭 제한·줄바꿈 금지 등) */
  cellClassName?: string
  /**
   * ⚠ `index` 는 **부른 쪽이 준 `rows` 안의 자리**다 — 쪽을 넘겨도 원본 자리다(§9).
   * 걸러진 뒤의 자리를 주면 편집 표에서 엉뚱한 줄이 고쳐진다.
   */
  cell: (row: T, index: number) => React.ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowTone,
  minWidth,
  empty,
  className = '',
}: {
  columns: Array<Column<T>>
  /** ⚠ 읽기만 한다 — `as const` 로 굳힌 mock 도 그대로 받는다(감사 로그가 그렇다) */
  rows: ReadonlyArray<T>
  rowKey: (row: T, index: number) => string
  onRowClick?: (row: T) => void
  /**
   * 줄이 스스로 상태를 말할 자리 — 되돌아온 클래스가 그 줄에 붙는다.
   *
   * ⚠ **면 색은 반투명으로만** 준다. 불투명 배경을 깔면 가장자리 그림자를 덮어서
   * "오른쪽에 열이 더 있다"는 신호가 사라진다(styles.css `.table-scroll` 주석).
   * ⚠ 그리고 이건 **색만으로 말하지 않는다**(규약 §16) — 줄 색은 훑기용 보조이고,
   *   무엇이 위험한지는 셀 안 칩·글자가 따로 말해야 한다.
   */
  rowTone?: (row: T) => string | undefined
  /** 열이 눌리지 않는 최소 폭 — 이보다 좁으면 가로로 굴린다 */
  minWidth: number
  /** ⚠ "없다"와 "못 불러왔다"를 가른다 (§3·§9) — 부른 쪽이 어느 쪽인지 안다 */
  empty: { title: string; hint?: string }
  className?: string
}) {
  const num = (c: Column<T>) => (c.numeric ? 'text-right tabular-nums' : '')
  return (
    <div className={className}>
      {/* 가장자리 그림자가 "오른쪽에 열이 더 있다"고 말한다 (규약 §8).
          ⚠ 세로로도 굴릴 수 있게 해 둔다 — 머리줄을 고정하려면(§9) 붙어 있을 상자가
          필요하다. 지금 화면들은 스무 줄을 안 넘어 `max-h` 에 닿지 않지만, 닿는 날
          머리줄이 따라다니는 것이 관문 안에서 이미 정해져 있다. */}
      <div className="table-scroll max-h-[70vh]">
        <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
          <thead className="sticky top-0 z-[1]">
            <tr className="border-b border-hairline bg-canvas text-left text-xs text-ink-subtle">
              {columns.map((c) => (
                <th key={c.header} className={`whitespace-nowrap px-3 py-2.5 font-medium first:pl-4 ${num(c)}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                /* 누를 수 있으면 커서와 호버로 말한다 (§9) — 못 누르는 표에는 안 건다 */
                /* 누를 수 있으면 커서와 호버로 말한다 (§9) — 못 누르는 표에는 안 건다.
                   ⚠ 감사 로그는 못 누르는데 호버가 걸려 있었다: 눌러 보고 아무 일도 안
                   일어나야 "아, 못 누르는구나"를 알게 되는 화면이었다. */
                className={`border-b border-divider transition-colors last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-chip' : ''
                } ${rowTone?.(row) ?? ''}`}
              >
                {columns.map((c) => (
                  <td key={c.header} className={`px-3 py-2.5 first:pl-4 ${num(c)} ${c.cellClassName ?? ''}`}>
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="text-sm text-ink-muted">{empty.title}</div>
                  {empty.hint && <div className="mt-1 text-xs text-ink-subtle">{empty.hint}</div>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/*
 * ⚠⚠ **이 관문은 발을 그리지 않는다.** 발은 `ListFoot` 이 따로 진다(둘 다 관문이라
 * "한 곳에서만 그린다"는 이미 지켜진다). 처음엔 표가 발까지 품게 만들었는데, 알림
 * 화면에서 바로 어긋났다 — 거기서는 **좁은 화면 카드 목록과 넓은 화면 표가 발 하나를
 * 함께 쓴다.** 표가 발을 품으면 그 화면만 예외를 달게 되고, 그게 §9 가 경고한
 * "관문에 화면별 예외가 붙어 이름만 남는" 길이다. 표는 표만 그린다.
 *
 * ⚠ 발은 반드시 **스크롤 상자 밖**에 둔다. 안에 두면 가로로 굴릴 때 세는 말이 함께
 * 밀려 나간다(회원·검증 결과가 그랬다).
 */

/**
 * **안 받는 표** — 왜 안 받는지 여기 적어 둔다(적어 두지 않으면 다음 사람이 "빠뜨렸다"고
 * 읽고 억지로 밀어 넣는다).
 *
 * - 권한 매트릭스 넷(`roles` 셋 · `members` 서랍 하나) — 행이 엔티티가 아니라 **메뉴 축**,
 *   열이 **액션 축**이다. 셀이 값이 아니라 조작(토글·3분할 세그먼트)이고, 마지막 열은
 *   다른 셀 상태에 따라 꺼진다. 정렬·페이지·행 클릭·빈 상태가 전부 뜻이 없다.
 * - 모달 안 부속표 둘(`approvals` 변경 항목 · `validation-reports` 오류 유형) — 목록이
 *   아니라 **고른 하나의 하위 배열**을 펴는 표다. 쪽도 빈 상태도 없고 폭이 420~480px 라
 *   목록 규격(min-w·가장자리 그림자)을 씌우면 장식만 는다.
 * - `guide` 역할 등급 설명 — 정적 문서 2열 표. 관문에 넣을 실익이 없다.
 *
 * ⚠ 감사 로그(`privacy`)는 한때 "행 틴트가 가장자리 그림자를 덮는다"는 이유로 뺐는데,
 *   **재 보니 틴트가 알파 0.2 라 안 덮었다** — 걱정만으로 미룬 것이었다. `rowTone` 을
 *   두고 옮겼다. 미룰 때는 재 보고 미룬다.
 */
