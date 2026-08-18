/**
 * 사양서 필드 정의 mock — 엑셀(시트 여러 개 × 넓은 열)을 화면으로 옮긴 모델.
 * 엑셀 하단 시트 = 카테고리. 프로토타입에서는 모든 사양서가 같은 필드 세트를 쓴다.
 */

export type FieldType = 'string' | 'number' | 'select' | 'text' | 'boolean' | 'date'
export type FieldStatus = '완료' | '진행중' | '검토중' | '미완료'

export const FIELD_CATEGORIES = ['기본정보', '기술사양', '운영정보', '연계정보', '보안/감사'] as const
export type FieldCategory = (typeof FIELD_CATEGORIES)[number]

export interface FieldDef {
  no: number
  category: FieldCategory
  sub: string
  name: string
  type: FieldType
  required: boolean
  maxLen: number | null
  desc: string
  /** 유효성 규칙(정규식) — 없으면 null */
  rule: string | null
  owner: string
  status: FieldStatus
}

const F = (
  no: number,
  category: FieldCategory,
  sub: string,
  name: string,
  type: FieldType,
  required: boolean,
  maxLen: number | null,
  desc: string,
  rule: string | null,
  owner: string,
  status: FieldStatus,
): FieldDef => ({ no, category, sub, name, type, required, maxLen, desc, rule, owner, status })

/* 기본정보 8 · 기술사양 10 · 운영정보 7 · 연계정보 4 · 보안/감사 3 = 32
   상태 분포: 완료 17 · 진행중 5 · 검토중 4 · 미완료 6 (화면이 세는 값이 정본) */
export const specFieldDefs: Array<FieldDef> = [
  F(1, '기본정보', '식별자', '항목코드', 'string', true, 20, '고유 항목 식별 코드 (형식: 영대문자 2 + 숫자 4)', '^[A-Z]{2}\\d{4}$', '정상협', '완료'),
  F(2, '기본정보', '식별자', '항목명(한)', 'string', true, 100, '한국어 항목명', null, '정상협', '완료'),
  F(3, '기본정보', '식별자', '항목명(영)', 'string', false, 100, '영어 항목명', null, '김민준', '진행중'),
  F(4, '기본정보', '식별자', '항목약어', 'string', false, 30, '항목 약어 표기 (영문)', null, '김민준', '미완료'),
  F(5, '기본정보', '분류', '대분류', 'select', true, null, '항목 대분류 코드', null, '정상협', '완료'),
  F(6, '기본정보', '분류', '중분류', 'select', true, null, '항목 중분류 코드', null, '정상협', '완료'),
  F(7, '기본정보', '분류', '소분류', 'select', false, null, '항목 소분류 코드', null, '이서연', '검토중'),
  F(8, '기본정보', '분류', '항목설명', 'text', true, 500, '항목에 대한 상세 설명', null, '정상협', '완료'),
  F(9, '기술사양', '데이터타입', '데이터유형', 'select', true, null, 'DB 저장 데이터 타입 (STRING/NUMBER/DATE/BOOLEAN)', null, '박지훈', '완료'),
  F(10, '기술사양', '데이터타입', '최대길이', 'number', false, null, '문자열 타입의 최대 허용 길이 (바이트)', null, '박지훈', '완료'),
  F(11, '기술사양', '데이터타입', '소수점자리수', 'number', false, null, '숫자 타입의 소수점 이하 자리수', null, '박지훈', '완료'),
  F(12, '기술사양', '데이터타입', '허용값목록', 'text', false, 1000, '콤마(,) 구분 허용 값 목록', null, '최유나', '검토중'),
  F(13, '기술사양', '데이터타입', '기본값', 'string', false, 200, '입력 미입력 시 적용되는 기본값', null, '최유나', '미완료'),
  F(14, '기술사양', '제약조건', '필수여부', 'boolean', true, null, '필수 입력 여부 (Y/N)', null, '박지훈', '완료'),
  F(15, '기술사양', '제약조건', '단위', 'string', false, 20, '값의 단위 (km, kWh 등)', null, '박지훈', '완료'),
  F(16, '기술사양', '제약조건', '값범위', 'string', false, 50, '허용 최소~최대 범위 (형식: min~max)', '^-?\\d+(\\.\\d+)?~-?\\d+(\\.\\d+)?$', '최유나', '진행중'),
  F(17, '기술사양', '제약조건', '코드매핑', 'text', false, 500, '표준 코드 체계와의 매핑 규칙', null, '최유나', '미완료'),
  F(18, '기술사양', '제약조건', '정밀도', 'number', false, null, '측정값 정밀도 (유효 자릿수)', null, '박지훈', '완료'),
  F(19, '운영정보', '수집', '수집주기', 'select', true, null, '데이터 수집 주기 (실시간/시간/일/주)', null, '오세훈', '완료'),
  F(20, '운영정보', '수집', '데이터원천', 'string', true, 100, '데이터를 생성하는 원천 시스템·장치', null, '오세훈', '완료'),
  F(21, '운영정보', '수집', '갱신방식', 'select', false, null, '전체 갱신 / 증분 갱신', null, '오세훈', '진행중'),
  F(22, '운영정보', '보존', '보존기간', 'number', true, null, '데이터 보존 기간 (개월)', null, '한지민', '완료'),
  F(23, '운영정보', '보존', '품질점검주기', 'select', false, null, '데이터 품질 점검 주기', null, '한지민', '검토중'),
  F(24, '운영정보', '담당', '담당부서', 'string', true, 60, '항목 관리 책임 부서', null, '한지민', '완료'),
  F(25, '운영정보', '담당', '장애연락처', 'string', false, 60, '수집 장애 시 연락 채널', null, '한지민', '미완료'),
  F(26, '연계정보', '인터페이스', '연계시스템', 'string', true, 60, '이 항목을 소비·제공하는 연계 시스템', null, '류현진', '완료'),
  F(27, '연계정보', '인터페이스', '인터페이스ID', 'string', true, 30, '연계 인터페이스 식별자', '^IF-\\d{4}$', '류현진', '진행중'),
  F(28, '연계정보', '인터페이스', '전송방식', 'select', false, null, 'Kafka / SFTP / API', null, '류현진', '미완료'),
  F(29, '연계정보', '인터페이스', '연계주기', 'select', false, null, '연계 전송 주기', null, '류현진', '검토중'),
  F(30, '보안/감사', '보안', '개인정보여부', 'boolean', true, null, '개인정보 포함 여부 — 포함 시 마스킹 대상', null, '박선우', '완료'),
  F(31, '보안/감사', '보안', '암호화방식', 'select', false, null, '저장 시 암호화 방식 (AES256 등)', null, '박선우', '진행중'),
  F(32, '보안/감사', '보안', '접근등급', 'select', true, null, '조회 가능 최소 권한 등급', null, '박선우', '미완료'),
]

/* 배포 워크플로우 — 레퍼런스 기획을 그대로 채택 */
export const WORKFLOW_STEPS = [
  '초안',
  '수정중',
  '임시저장',
  '최종완료',
  '승인요청',
  '배포승인',
  '배포완료',
] as const

/** 사양서 상태 → 워크플로우 현재 단계 index */
export function workflowIndex(status: string): number {
  switch (status) {
    case '초안':
      return 0
    case '검토 중':
      return 1
    case '승인 대기':
      return 4
    case '승인 완료':
      return 5
    case '배포 완료':
      return 6
    default:
      return 0
  }
}

export const FIELD_STATUS_CLS: Record<FieldStatus, string> = {
  완료: 'bg-deployed-bg text-deployed-ink',
  진행중: 'bg-draft-bg text-draft-ink',
  검토중: 'bg-review-bg text-review-ink',
  미완료: 'bg-danger-bg text-danger-ink',
}
