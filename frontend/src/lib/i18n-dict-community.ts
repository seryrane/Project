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
  'notice.views': { ko: '조회 {n}', en: '{n} views' },
  'notice.sectionTitle': { ko: '전체 공지 ({n}건)', en: 'All notices ({n})' },
  'notice.empty': {
    ko: '조건에 맞는 공지가 없습니다 — 검색어나 카테고리를 바꿔 보세요.',
    en: 'No notices match — try a different search or category.',
  },
  'notice.drawerTitle': { ko: '공지 — {id}', en: 'Notice — {id}' },
  'notice.label.title': { ko: '제목', en: 'Title' },
  'notice.label.category': { ko: '카테고리', en: 'Category' },
  'notice.label.body': { ko: '본문', en: 'Body' },
  'notice.label.pinToTop': { ko: '상단 고정', en: 'Pin to top' },
  'notice.pinToTopDesc': { ko: '목록 위 고정 카드로 노출됩니다', en: 'Shown as a pinned card above the list' },
  'notice.toast.posted': {
    ko: '공지를 등록했습니다 — 전체 알림으로도 발송됩니다',
    en: 'Notice posted — also sent as a broadcast notification',
  },

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
  'qna.sectionTitle': { ko: '질문 목록 ({n}건)', en: 'Questions ({n})' },
  'qna.empty': { ko: '조건에 맞는 질문이 없습니다.', en: 'No questions match.' },
  'qna.drawerTitle': { ko: '질문 — {id}', en: 'Question — {id}' },
  'qna.answersHeading': { ko: '답변', en: 'Replies' },
  'qna.noAnswersYet': {
    ko: '아직 답변이 없습니다 — 운영진에게 알림이 가 있습니다.',
    en: 'No replies yet — staff have been notified.',
  },
  'qna.toast.answered': {
    ko: '답변을 등록했습니다 — 질문자에게 알림이 갑니다',
    en: 'Reply posted — the asker will be notified',
  },
  'qna.label.title': { ko: '제목', en: 'Title' },
  'qna.label.category': { ko: '카테고리', en: 'Category' },
  'qna.label.body': { ko: '내용', en: 'Details' },
  'qna.faqHint': {
    ko: '비슷한 질문이 FAQ 에 있을 수 있습니다 — 등록 전에 FAQ 를 한 번 확인해 보세요.',
    en: 'A similar question may already be in the FAQ — check there before posting.',
  },
  'qna.toast.posted': {
    ko: '질문을 등록했습니다 — 답변이 달리면 알림으로 알려 드립니다',
    en: 'Question posted — you will be notified when it gets a reply',
  },

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
  'faq.helpfulQuestion': { ko: '도움이 되었나요?', en: 'Was this helpful?' },
  'faq.toast.helpful': {
    ko: '의견 감사합니다 — 도움됨으로 기록했습니다',
    en: 'Thanks for the feedback — marked as helpful',
  },
  'faq.empty': { ko: '검색 결과가 없습니다 —', en: 'No results —' },
  'faq.emptyCta': { ko: 'Q&A 에 질문을 남겨 주세요', en: 'leave a question in Q&A' },
  'faq.label.category': { ko: '카테고리', en: 'Category' },
  'faq.label.q': { ko: '질문', en: 'Question' },
  'faq.label.a': { ko: '답변', en: 'Answer' },
  'faq.toast.added': { ko: 'FAQ 를 추가했습니다', en: 'FAQ added' },

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
  // 번호 붙은 섹션 제목 — {title} 은 guide.toc.<id> 를 재사용한다 (본문은 번역 대상 밖)
  'guide.heading': { ko: '{n}. {title}', en: '{n}. {title}' },
  'guide.newBadgeHint': {
    ko: '최근 배포 순 — 여기를 열면 배지가 내려갑니다',
    en: 'Newest first — opening this clears the badge',
  },
  'guide.toast.feedback': {
    ko: '가이드 개선 의견을 접수했습니다 — 감사합니다',
    en: 'Feedback received — thank you',
  },

  // ── 개인정보보호 ──────────────────────────────────────────────────
  'privacy.viewPolicy': { ko: '처리방침 전문 보기', en: 'View full policy' },
  'privacy.days.90': { ko: '90일', en: '90 days' },
  'privacy.days.180': { ko: '180일', en: '180 days' },
  'privacy.days.365': { ko: '365일', en: '365 days' },
  // 현황 타일 — 상수 배열의 label/value/sub 는 그대로 두고 렌더 자리에서 id 로 입힌다
  'privacy.tile.policyVersion.label': { ko: '현행 처리방침', en: 'Current policy' },
  'privacy.tile.policyVersion.sub': { ko: '2026.08.01 시행', en: 'Effective 2026.08.01' },
  'privacy.tile.exports30d.label': { ko: '반출(다운로드) · 30일', en: 'Exports (downloads) · 30 days' },
  'privacy.tile.exports30d.value': { ko: '{n}건', en: '{n}' },
  'privacy.tile.exports30d.sub': { ko: '전 건 사유 기록됨', en: 'All logged with a reason' },
  'privacy.tile.pendingAccess.label': { ko: '열람 요청 대기', en: 'Access requests pending' },
  'privacy.tile.pendingAccess.value': { ko: '{n}건', en: '{n}' },
  'privacy.tile.pendingAccess.sub': { ko: '기한 10일 — 8/12 까지', en: 'Due in 10 days — by 8/12' },
  'privacy.tile.purgeScheduled.label': { ko: '파기 예정 계정', en: 'Accounts scheduled for purge' },
  'privacy.tile.purgeScheduled.value': { ko: '{n}건', en: '{n}' },
  'privacy.tile.purgeScheduled.sub': { ko: '비활성 90일 경과', en: 'Inactive 90+ days' },
  // 감사 로그 — 표 헤더만 번역, 로그 내용(사용자·액션·대상·사유 값)은 그대로
  'privacy.auditLogTitle': { ko: '접속·반출 감사 로그', en: 'Access & export audit log' },
  'privacy.auditLogHint': {
    ko: '다운로드·마스킹 해제는 사유가 필수로 남습니다',
    en: 'A reason is required for downloads and unmasking',
  },
  'privacy.label.reason': { ko: '사유', en: 'Reason' },
  'privacy.th.at': { ko: '시각', en: 'Time' },
  'privacy.th.user': { ko: '사용자', en: 'User' },
  'privacy.th.action': { ko: '액션', en: 'Action' },
  'privacy.th.target': { ko: '대상', en: 'Target' },
  'privacy.retentionNote': {
    ko: '로그는 {retention} 보존 후 자동 파기됩니다 — 보존 기간은 우측 정책에서 바꿉니다.',
    en: 'Logs are purged after {retention} — change the retention period on the right.',
  },
  // 마스킹·보존 정책
  'privacy.maskPolicyTitle': { ko: '마스킹 · 보존 정책', en: 'Masking & retention policy' },
  'privacy.label.maskPhone': { ko: '연락처 마스킹', en: 'Phone masking' },
  'privacy.maskPhoneDesc': { ko: '010-****-5678 로 표시', en: 'Shown as 010-****-5678' },
  'privacy.label.maskEmail': { ko: '이메일 마스킹', en: 'Email masking' },
  'privacy.maskEmailDesc': { ko: 'hy****@hmg.com 로 표시', en: 'Shown as hy****@hmg.com' },
  'privacy.toast.maskToggle': {
    ko: '{field}을 {state} — 같은 토글로 되돌립니다',
    en: '{field} {state} — flip the same toggle to undo',
  },
  'privacy.state.on': { ko: '켰습니다', en: 'turned on' },
  'privacy.state.off': { ko: '껐습니다', en: 'turned off' },
  'privacy.label.retention': { ko: '접속기록 보존 기간', en: 'Access log retention period' },
  'privacy.toast.retentionSaved': {
    ko: '보존 기간을 {retention}로 저장했습니다',
    en: 'Saved retention period as {retention}',
  },
  'privacy.retentionPolicyNote': {
    ko: '처리방침 v3.2 는 365일을 기준으로 합니다 — 줄이면 방침 개정이 함께 필요합니다.',
    en: 'Policy v3.2 is based on 365 days — shortening it requires a policy revision too.',
  },
  'privacy.auditFootnote': {
    ko: '마스킹을 해제한 화면 조회는 전 건 감사 로그에 남습니다. 정책 변경 이력도 감사 대상입니다.',
    en: 'Unmasked views are fully logged. Policy changes are audited too.',
  },
  // 처리방침 전문 서랍 — 전문 본문(POLICY_BODY)은 번역 대상 밖
  'privacy.policyDrawerTitle': { ko: '개인정보 처리방침 v3.2', en: 'Privacy policy v3.2' },
  'privacy.policyMeta': {
    ko: '시행 {date} · 승인 {approver} · 문서 {doc}',
    en: 'Effective {date} · Approved by {approver} · Doc {doc}',
  },

  // ── 로그인 (i18n.tsx CORE_DICT 의 기존 login.* 키와 겹치지 않는 이름만) ──
  'login.error.generic': { ko: '로그인하지 못했습니다.', en: 'Could not sign in.' },
  'login.pwShow': { ko: '비밀번호 표시', en: 'Show password' },
  'login.pwHide': { ko: '비밀번호 숨기기', en: 'Hide password' },
  'login.error.fido': {
    ko: 'FIDO 인증에 실패했습니다 — 다시 로그인해 주세요.',
    en: 'FIDO verification failed — please sign in again.',
  },
  'login.forgotTitle': { ko: '비밀번호 찾기', en: 'Forgot password' },
  'login.forgotDesc': {
    ko: '가입한 이메일을 입력하면 재설정 안내를 보냅니다.',
    en: 'Enter your registered email and we will send reset instructions.',
  },
  'login.forgotEmail': { ko: '이메일', en: 'Email' },
  'login.forgotSending': { ko: '보내는 중…', en: 'Sending…' },
  'login.forgotSubmit': { ko: '재설정 메일 보내기', en: 'Send reset email' },
  'login.forgotSent': {
    ko: '가입된 이메일이라면 재설정 안내를 보냈습니다.',
    en: 'If that email is registered, reset instructions were sent.',
  },

  // ── 가입 신청 ────────────────────────────────────────────────────
  'signup.intro': {
    ko: '협력사·외부 계정용입니다 (HMG 임직원은 SSO 로 바로 로그인).',
    en: 'For partner and external accounts (HMG staff sign in directly via SSO).',
  },
  'signup.startAs': { ko: '관리자 승인 후', en: 'After admin approval, starts as' },
  'signup.viewerGrade': { ko: 'Viewer 등급', en: 'Viewer grade' },
  'signup.startAsTail': {
    ko: '으로 시작합니다 — 필요한 권한은 승인 뒤 요청하세요.',
    en: ' — request more access once approved.',
  },
  'signup.error': { ko: '가입 신청에 실패했습니다.', en: 'Could not submit the request.' },
  'signup.toast.submitted': {
    ko: '가입 신청을 접수했습니다 — 관리자 승인 후 안내됩니다.',
    en: 'Request submitted — you will be notified after admin approval.',
  },
}
