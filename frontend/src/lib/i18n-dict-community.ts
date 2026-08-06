/** 커뮤니티·개인정보 화면 사전 — 공지·Q&A·FAQ·가이드·개인정보보호. lib/i18n.tsx 의 DICT 로 합쳐진다. */
import type { Entry } from './i18n'

export const COMMUNITY_DICT: Record<string, Entry> = {
  // ── 공지사항 ──────────────────────────────────────────────────────
  'notice.write': { ko: '공지 작성', en: 'Write notice' },
  'notice.searchPh': { ko: '제목 검색...', en: 'Search titles...' },
  'notice.pinned': { ko: '고정 공지', en: 'Pinned' },
  'notice.titlePh': { ko: '공지 제목', en: 'Notice title' },
  'notice.bodyPh': { ko: '공지 내용을 입력하세요', en: 'Write the notice' },
  'notice.submit': { ko: '등록', en: 'Post' },
  'notice.submitting': { ko: '등록 중…', en: 'Posting…' },

  // ── Q&A ──────────────────────────────────────────────────────────
  'qna.ask': { ko: '질문하기', en: 'Ask a question' },
  'qna.searchPh': { ko: '질문 검색...', en: 'Search questions...' },
  'qna.tab.waiting': { ko: '답변 대기', en: 'Awaiting reply' },
  'qna.tab.answered': { ko: '답변 완료', en: 'Answered' },
  'qna.answers': { ko: '답변 {n}', en: '{n} replies' },
  'qna.answerPh': { ko: '답변을 입력하세요 (운영진)', en: 'Write a reply (staff)' },
  'qna.answerSubmit': { ko: '답변 등록', en: 'Post reply' },
  'qna.titlePh': { ko: '무엇이 궁금한가요?', en: 'What would you like to ask?' },
  'qna.bodyPh': {
    ko: '상황을 구체적으로 적을수록 답이 빨라집니다 — 화면·시각·메시지',
    en: 'More detail means a faster answer — screen, time, message',
  },
  'qna.submit': { ko: '등록', en: 'Post' },
  'qna.submitting': { ko: '등록 중…', en: 'Posting…' },

  // ── FAQ ──────────────────────────────────────────────────────────
  'faq.add': { ko: 'FAQ 추가', en: 'Add FAQ' },
  'faq.searchPh': { ko: '질문·답변 검색...', en: 'Search questions & answers...' },
  'faq.helpful': { ko: '도움됨', en: 'Helpful' },
  'faq.qPh': {
    ko: '사용자 말로 적습니다 — 예: 로그인이 안 됩니다',
    en: "In the user's words — e.g. I can't sign in",
  },
  'faq.aPh': {
    ko: '해결 순서대로 — 어디를 눌러 무엇을 하는지',
    en: 'Step by step — what to click and what to do',
  },
  'faq.adding': { ko: '추가 중…', en: 'Adding…' },

  // ── 사용자 가이드 (목차 버튼 — guide.toc.<section.id>) ─────────────
  'guide.toc.whatsnew': { ko: '새 기능', en: "What's new" },
  'guide.toc.start': { ko: '시작하기', en: 'Getting started' },
  'guide.toc.roles': { ko: '역할과 권한', en: 'Roles & permissions' },
  'guide.toc.spec-flow': { ko: '사양서 작업 흐름', en: 'Spec workflow' },
  'guide.toc.approval': { ko: '승인과 배포', en: 'Approval & deploy' },
  'guide.toc.validation': { ko: '검증엔진', en: 'Validation engine' },
  'guide.toc.more': { ko: '더 묻기', en: 'Ask more' },
  'guide.feedback': {
    ko: '이 가이드에서 부족한 부분 알려 주기',
    en: 'Tell us what this guide is missing',
  },

  // ── 개인정보보호 ──────────────────────────────────────────────────
  'privacy.viewPolicy': { ko: '처리방침 전문 보기', en: 'View full policy' },
  'privacy.days.90': { ko: '90일', en: '90 days' },
  'privacy.days.180': { ko: '180일', en: '180 days' },
  'privacy.days.365': { ko: '365일', en: '365 days' },
}
