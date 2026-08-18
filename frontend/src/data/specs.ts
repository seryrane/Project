/* ⚠ '승인 완료'는 2026-08-18 에 늘렸다 — 없던 동안 결재가 **올라가기만 하고 내려오지
   않았다**: 승인 관리에서 [승인]을 눌러도 사양서는 '승인 대기' 그대로였다(승인자가
   처리한 화면과 사양서 화면이 다른 말을 했다). 승인은 끝이 아니라 배포 앞의 자리다. */
export type SpecStatus = '초안' | '검토 중' | '승인 대기' | '승인 완료' | '배포 완료'

export interface SpecField {
  label: string
  value: string
}

export interface SpecVersion {
  version: string
  status: SpecStatus
  date: string
  summary: string
  author: string
  fields: Array<SpecField>
  /** 반려당한 자국 — 누가·왜·언제. 되돌아온 문서는 **이유를 안고 온다**(규약 §17):
   *  이것이 없으면 결재에서 밀려난 문서가 그냥 '초안'으로 돌아와, 요청자는 무엇을
   *  고쳐야 하는지 모른 채 다시 올린다(2026-08-18 FR-114 판에서 신설). */
  rejection?: { reason: string; by: string; at: string }
}

export interface Spec {
  id: string
  name: string
  category: string
  description: string
  tags: Array<string>
  author: string
  updated: string
  history: Array<SpecVersion>
}

export function currentVersion(spec: Spec): SpecVersion {
  return spec.history[0]
}

const vn7Fields = (power: string, fuel: string): Array<SpecField> => [
  { label: '엔진 형식', value: '2.5L 터보 GDI' },
  { label: '최대 출력', value: power },
  { label: '최대 토크', value: '422 Nm @ 1,450~4,000 rpm' },
  { label: '배기량', value: '2,497 cc' },
  { label: '복합 연비', value: fuel },
  { label: '배출가스 등급', value: 'Euro 6d' },
  { label: '변속기', value: '8단 자동 (습식 DCT)' },
  { label: '구동 방식', value: 'AWD' },
  { label: '압축비', value: '10.0:1' },
  { label: '연료 분사', value: '직분사 + 포트분사 (CVVD)' },
]

export const specs: Array<Spec> = [
  {
    id: 'SP-001',
    name: 'VN7 엔진 사양서',
    category: '파워트레인',
    description:
      'VN7 시리즈 엔진 성능 및 규격에 관한 공식 사양서입니다. 배기량, 출력, 토크, 연비 등 핵심 성능 지표를 포함합니다.',
    tags: ['엔진', '파워트레인', 'VN7', '가솔린'],
    author: '김민준',
    updated: '2026.07.15',
    history: [
      {
        version: 'v2.3',
        status: '승인 대기',
        date: '2026.07.15',
        summary: '최대 출력 5hp 상향, 연비 개선',
        author: '김민준',
        fields: vn7Fields('290 hp @ 5,800 rpm', '11.2 km/L'),
      },
      {
        version: 'v2.2',
        status: '배포 완료',
        date: '2026.05.20',
        summary: '소음 진동 수치 업데이트',
        author: '이서연',
        fields: vn7Fields('285 hp @ 5,800 rpm', '10.8 km/L'),
      },
      {
        version: 'v2.1',
        status: '배포 완료',
        date: '2026.03.08',
        summary: '초기 배출가스 기준 반영',
        author: '박준혁',
        fields: vn7Fields('285 hp @ 5,800 rpm', '10.6 km/L'),
      },
      {
        version: 'v2.0',
        status: '배포 완료',
        date: '2026.01.05',
        summary: '2세대 엔진 설계 적용',
        author: '김민준',
        fields: vn7Fields('280 hp @ 5,800 rpm', '10.6 km/L'),
      },
    ],
  },
  {
    id: 'SP-002',
    name: '전기차 배터리 규격서',
    category: '전동화',
    description:
      '현대자동차 전기차 플랫폼(E-GMP) 배터리 시스템 사양 및 안전 규격 문서입니다.',
    tags: ['배터리', '전기차', 'E-GMP', 'BMS'],
    author: '이서연',
    updated: '2026.07.14',
    history: [
      {
        version: 'v1.5',
        /* ⚠ 결재함(approvals.ts APR-2026-0113)에 이 사양서가 **올라가 있다** — 그런데 여기는
           '검토 중'이라, 승인/반려를 눌러도 사양서가 꿈쩍 않았다(2026-08-18 화면에서 잡음).
           결재 중인 문서의 상태는 '승인 대기'다. 시드끼리 어긋나면 흐름이 조용히 죽는다. */
        status: '승인 대기',
        date: '2026.07.14',
        summary: '급속 충전 프로파일 개정',
        author: '이서연',
        fields: [
          { label: '배터리 용량', value: '102 kWh (usable: 99 kWh)' },
          { label: '배터리 형식', value: '리튬이온 파우치 셀' },
          { label: '공칭 전압', value: '697V (800V 아키텍처)' },
          { label: '최대 충전 전력', value: '350 kW (급속)' },
        ],
      },
      {
        version: 'v1.4',
        status: '배포 완료',
        date: '2026.04.02',
        summary: '셀 공급사 이원화 반영',
        author: '이서연',
        fields: [
          { label: '배터리 용량', value: '100 kWh (usable: 97 kWh)' },
          { label: '배터리 형식', value: '리튬이온 파우치 셀' },
          { label: '공칭 전압', value: '697V (800V 아키텍처)' },
          { label: '최대 충전 전력', value: '320 kW (급속)' },
        ],
      },
    ],
  },
  {
    id: 'SP-003',
    name: '자율주행 센서 통합 규격',
    category: '자율주행',
    description:
      'Level 3 자율주행을 위한 센서 퓨전 시스템 규격 및 성능 요구사항 문서입니다.',
    tags: ['자율주행', '센서', 'LiDAR', '카메라', '레이더'],
    author: '박준혁',
    updated: '2026.07.10',
    history: [
      {
        version: 'v3.1',
        status: '배포 완료',
        date: '2026.07.10',
        summary: '측방 레이더 채널 수 확정',
        author: '박준혁',
        fields: [
          { label: '전방 카메라', value: '8MP, 120° FoV, 200m 탐지' },
          { label: '전방 LiDAR', value: '64채널, 200m 범위, 10Hz' },
          { label: '전방 레이더', value: '77GHz, 250m 범위' },
          { label: '측방 레이더', value: '77GHz, 80m 범위 × 4' },
        ],
      },
      {
        version: 'v3.0',
        status: '배포 완료',
        date: '2026.05.28',
        summary: 'Level 3 요구사항 기준 개편',
        author: '박준혁',
        fields: [
          { label: '전방 카메라', value: '8MP, 120° FoV, 180m 탐지' },
          { label: '전방 LiDAR', value: '32채널, 200m 범위, 10Hz' },
          { label: '전방 레이더', value: '77GHz, 250m 범위' },
          { label: '측방 레이더', value: '77GHz, 80m 범위 × 2' },
        ],
      },
    ],
  },
  {
    id: 'SP-004',
    name: '차체 구조 안전 기준서',
    category: '차체/안전',
    description:
      '글로벌 충돌 안전 기준 및 차체 강성 요구사항을 정의한 규격서입니다.',
    tags: ['차체', '안전', '충돌', 'NCAP'],
    author: '최수진',
    updated: '2026.07.12',
    history: [
      {
        version: 'v4.0',
        status: '초안',
        date: '2026.07.12',
        summary: 'EURO NCAP 2026 기준 반영 초안',
        author: '최수진',
        fields: [
          { label: '전면 충돌 기준', value: 'EURO NCAP 2026 Full Width' },
          { label: '측면 충돌 기준', value: 'EURO NCAP Pole Test' },
          { label: '차체 강성 목표', value: 'Torsional: 35,000 Nm/° 이상' },
          { label: '고강도강 비율', value: '전체 차체 중 78% 이상' },
        ],
      },
      {
        version: 'v3.2',
        status: '배포 완료',
        date: '2026.02.18',
        summary: '고강도강 적용 비율 상향',
        author: '최수진',
        fields: [
          { label: '전면 충돌 기준', value: 'EURO NCAP 2025 Full Width' },
          { label: '측면 충돌 기준', value: 'EURO NCAP Pole Test' },
          { label: '차체 강성 목표', value: 'Torsional: 33,000 Nm/° 이상' },
          { label: '고강도강 비율', value: '전체 차체 중 74% 이상' },
        ],
      },
    ],
  },
]
