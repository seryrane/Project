/** 커뮤니티 mock — 공지·Q&A·FAQ. 최소 메뉴라 모든 역할이 본다(메뉴 관리 minimal).
 *  쓰기(작성·답변)는 권한 관리의 커뮤니티 액션이 가른다 — 보이는 것과 되는 것 분리. */

export const NOTICE_CATEGORIES = ['시스템', '배포', '정책', '교육'] as const
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number]

export interface Notice {
  id: string
  title: string
  category: NoticeCategory
  author: string
  date: string
  views: number
  pinned?: boolean
  /** 문단 배열 — 본문은 상세에서만 읽는다 */
  body: Array<string>
}

export const notices: Array<Notice> = [
  {
    id: 'N-021',
    title: '8월 정기 점검 안내 — 8/9(토) 02:00~06:00 서비스 일시 중단',
    category: '시스템',
    author: '박준혁',
    date: '2026.08.04',
    views: 182,
    pinned: true,
    body: [
      '8월 정기 점검으로 아래 시간 동안 포털 접속이 중단됩니다.',
      '점검 시간: 2026-08-09(토) 02:00 ~ 06:00 (4시간)',
      '대상: 통합 관리자 포털 전체 (사양서 조회 API 포함)',
      '점검 중 상신된 승인 건은 점검 종료 후 순차 처리됩니다. 급한 배포는 8/8(금) 18:00 까지 승인 요청을 완료해 주세요.',
    ],
  },
  {
    id: 'N-020',
    title: '사양서 v2 양식 전환 — 9/1 부터 구양식 등록 마감',
    category: '정책',
    author: '김현대',
    date: '2026.08.03',
    views: 240,
    pinned: true,
    body: [
      '9/1 부터 신규 사양서는 v2 양식으로만 등록됩니다.',
      '기존 v1 사양서는 조회·배포는 그대로 가능하며, 수정 시 v2 로 자동 변환됩니다.',
      '변환 중 필드 누락이 발견되면 검증엔진 리포트로 통보됩니다.',
    ],
  },
  {
    id: 'N-019',
    title: 'VN7 엔진 사양서 v2.3 배포 완료',
    category: '배포',
    author: '박준혁',
    date: '2026.08.01',
    views: 95,
    body: [
      'VN7 엔진 사양서 v2.3 이 Production 에 배포되었습니다.',
      '주요 변경: 필드 3종 추가(항목약어·소수점자리수·허용값목록), 유효성 규칙 2건 강화.',
    ],
  },
  {
    id: 'N-018',
    title: '검증엔진 스케줄 정책 변경 — 야간 일괄 실행 02:00 통일',
    category: '시스템',
    author: '이수진',
    date: '2026.07.28',
    views: 67,
    body: [
      '야간 일괄 검증 시각이 엔진별 상이했던 것을 02:00 로 통일합니다.',
      '개별 스케줄이 필요한 엔진은 검증엔진 관리에서 조정하세요.',
    ],
  },
  {
    id: 'N-017',
    title: '신규 입사자 포털 교육 — 8/14(목) 14:00 온라인',
    category: '교육',
    author: '정다은',
    date: '2026.07.25',
    views: 41,
    body: [
      '신규 입사자 대상 포털 사용 교육을 진행합니다.',
      '주제: 사양서 작성 → 승인 → 배포 흐름, 검증 결과 읽는 법.',
      '참석 링크는 교육 전날 메일로 발송됩니다.',
    ],
  },
  {
    id: 'N-016',
    title: '개인정보 처리방침 v3.2 시행 안내',
    category: '정책',
    author: '한동현',
    date: '2026.07.21',
    views: 58,
    body: [
      '개인정보 처리방침 v3.2 가 8/1 부터 시행됩니다.',
      '주요 변경: 접속기록 보존 기간 180일 → 365일, 다운로드 사유 입력 의무화.',
    ],
  },
]

export const QNA_CATEGORIES = ['사양서', '승인·배포', '검증엔진', '계정·권한', '기타'] as const
export type QnaCategory = (typeof QNA_CATEGORIES)[number]

export interface QnaAnswer {
  author: string
  role: string
  date: string
  body: string
}

export interface Question {
  id: string
  title: string
  category: QnaCategory
  author: string
  date: string
  body: string
  answers: Array<QnaAnswer>
  /** 내 질문 탭 — 현재 사용자(김현대) 기준 */
  mine?: boolean
}

export const questions: Array<Question> = [
  {
    id: 'Q-108',
    title: '사양서 버전 비교에서 삭제된 필드는 어디서 확인하나요?',
    category: '사양서',
    author: '이서연',
    date: '2026.08.05',
    body: '버전 비교 모달에서 추가·변경 필드는 보이는데, 이전 버전에 있다가 삭제된 필드 목록은 어디서 볼 수 있나요?',
    answers: [],
  },
  {
    id: 'Q-107',
    title: '승인 반려 시 의견이 필수인 이유가 궁금합니다',
    category: '승인·배포',
    author: '김민준',
    date: '2026.08.04',
    body: '반려할 때마다 사유를 적어야 해서 번거로운데, 정책인가요?',
    answers: [
      {
        author: '박준혁',
        role: 'Admin',
        date: '2026.08.04',
        body: '정책입니다. 사유 없는 반려는 기안자가 무엇을 고쳐야 할지 알 수 없어 같은 상신이 반복됩니다 — 반려 의견이 다음 상신의 수정 지침이 됩니다.',
      },
    ],
  },
  {
    id: 'Q-106',
    title: '검증 리포트를 팀 외부에 공유해도 되나요?',
    category: '검증엔진',
    author: '정다은',
    date: '2026.08.02',
    body: '협력사에 검증 결과 요약을 보내야 하는데 리포트 다운로드 파일을 그대로 전달해도 되는지요.',
    answers: [
      {
        author: '한동현',
        role: 'Viewer',
        date: '2026.08.03',
        body: '보안팀 검토가 필요합니다. 다운로드 파일에는 내부 테이블명이 포함되어 있어 외부 공유 전 마스킹 처리를 요청하세요.',
      },
      {
        author: '김현대',
        role: 'Super Admin',
        date: '2026.08.03',
        body: '8월 중 외부 공유용 리포트 양식(내부 식별자 제외)을 추가할 예정입니다. 그 전까지는 보안팀 검토 후 공유해 주세요.',
      },
    ],
  },
  {
    id: 'Q-105',
    title: '대시보드 위젯 배치가 초기화됐습니다',
    category: '기타',
    author: '오지원',
    date: '2026.08.01',
    body: '어제 편집한 위젯 배치가 오늘 로그인하니 기본으로 돌아갔습니다.',
    answers: [
      {
        author: '이수진',
        role: 'Admin',
        date: '2026.08.01',
        body: '배치는 브라우저에 저장됩니다 — 다른 PC 나 시크릿 창에서는 기본 배치로 보입니다. 계정 단위 저장은 로드맵에 있습니다.',
      },
    ],
  },
  {
    id: 'Q-104',
    title: 'Editor 인데 배포 관리 화면이 조회만 됩니다',
    category: '계정·권한',
    author: '김민준',
    date: '2026.07.30',
    mine: false,
    body: '배포 요청 버튼이 비활성입니다. 권한을 어떻게 요청하나요?',
    answers: [
      {
        author: '김현대',
        role: 'Super Admin',
        date: '2026.07.30',
        body: 'Editor 는 배포 조회(우리 팀)까지입니다. 배포 요청이 필요하면 회원 관리 → 권한 탭에서 예외(허용)를 상신하거나 Admin 등급을 요청하세요. 내 권한은 우측 상단 아바타 → [내가 할 수 있는 것]에서 확인됩니다.',
      },
    ],
  },
]

export const FAQ_CATEGORIES = ['계정·권한', '사양서', '승인·배포', '검증엔진'] as const
export type FaqCategory = (typeof FAQ_CATEGORIES)[number]

export interface Faq {
  id: string
  category: FaqCategory
  q: string
  a: string
  helpful: number
}

export const faqs: Array<Faq> = [
  {
    id: 'F-01',
    category: '계정·권한',
    q: '로그인이 안 됩니다 / 계정이 잠겼습니다',
    a: '비밀번호 5회 오류 시 계정이 잠깁니다. HMG-SSO 포털에서 비밀번호를 재설정하거나, 관리자에게 잠금 해제를 요청하세요. 잠금 해제는 회원 관리 화면에서 즉시 처리됩니다.',
    helpful: 34,
  },
  {
    id: 'F-02',
    category: '계정·권한',
    q: '메뉴가 안 보여요 — 권한이 없는 건가요?',
    a: '메뉴는 권한의 파생물이라 권한이 없으면 아예 보이지 않습니다. 내가 가진 권한은 우측 상단 아바타 → [내가 할 수 있는 것]에서 사람 말로 확인할 수 있습니다. 필요한 권한은 소속 관리자에게 요청하세요.',
    helpful: 28,
  },
  {
    id: 'F-03',
    category: '사양서',
    q: '작성 중이던 사양서가 사라졌어요',
    a: '편집 중 이탈하면 임시저장본이 남습니다. 사양서 상세에 다시 들어가면 [이어서 작업] 배너가 뜹니다 — 자동 복원하지 않고 묻는 방식이라, 배너에서 선택하기 전까지는 정본이 바뀌지 않습니다.',
    helpful: 21,
  },
  {
    id: 'F-04',
    category: '사양서',
    q: '엑셀로 관리하던 사양서를 옮길 수 있나요?',
    a: '사양서 상세 → [엑셀 업로드]로 기존 시트를 올리면 카테고리 탭 구조로 변환됩니다. 업로드 권한이 필요하며, 변환 결과는 저장 전 미리보기로 확인합니다.',
    helpful: 17,
  },
  {
    id: 'F-05',
    category: '승인·배포',
    q: '승인이 됐는데 배포가 안 됐어요',
    a: '승인과 배포는 별개 단계입니다. 승인 완료 건은 배포 관리의 [승인 대기] 배너에 모이고, 배포 담당(Admin)이 배포 요청을 실행해야 반영됩니다.',
    helpful: 19,
  },
  {
    id: 'F-06',
    category: '검증엔진',
    q: '검증 실패 알림이 왔는데 어디부터 봐야 하나요',
    a: '검증 결과 조회에서 해당 실행을 열면 오류 상세(레코드·필드·규칙)가 보입니다. 반복 실패는 검증 리포트에서 유형별로 묶어 확인하세요.',
    helpful: 12,
  },
]
