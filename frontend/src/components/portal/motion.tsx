/**
 * 모션 관문 — motion(구 framer-motion)은 반드시 여기를 지나 쓴다.
 *
 * 역할 분담 (DESIGN.md 모션 시스템과 정합):
 *   CSS 토큰(anim-*)   등장·퇴장·호버 — 한 번 일어나고 끝나는 것
 *   motion             자리가 바뀌는 것(layout) · 목록 스태거 · 드래그 후 미끄러짐
 *                      — CSS 로는 못 하거나 부자연스러운 것에만 쓴다
 *
 * ⚠ LazyMotion(domAnimation) + m 만 쓴다 — 전체 번들(motion.div) 을 import 하면
 *   ~34kb, 이 조합이면 ~15kb(gzip). 새 기능이 필요해도 features 를 여기서만 올린다.
 * ⚠ reducedMotion="user" — OS 의 "동작 줄이기"를 켠 사람에게는 이동 애니메이션이
 *   자동으로 꺼진다(규약: prefers-reduced-motion 에서 전부 비활성).
 */
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'

export { AnimatePresence, m } from 'motion/react'

/** 페이지(셸) 한 곳에서 감싼다 — 화면마다 감싸면 설정이 갈린다 */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/** 자리 이동 공통 스프링 — 위젯·행 재정렬이 같은 손맛을 낸다 */
export const layoutSpring = { type: 'spring', stiffness: 420, damping: 34 } as const
