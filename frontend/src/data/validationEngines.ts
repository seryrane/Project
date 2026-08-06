/** 검증엔진 관리 mock — Python 함수 기반 Rule 엔진 (레퍼런스 기획 이식). */

export type EngineResult = '성공' | '부분성공' | '실패'

export interface ValidationEngine {
  id: string
  name: string
  active: boolean
  lastResult: EngineResult
  desc: string
  targetTable: string
  targetFields: string
  runs: number
  lastRun: string
  schedules: number
  code: string
}

export const validationEngines: Array<ValidationEngine> = [
  {
    id: 'ENG-001',
    name: 'NULL 값 검증 엔진',
    active: true,
    lastResult: '성공',
    desc: '사양서 필수 필드의 NULL 값 및 빈 값을 검증합니다',
    targetTable: 'spec_fields',
    targetFields: 'item_code, item_name, category',
    runs: 142,
    lastRun: '2026.08.05 06:00',
    schedules: 2,
    code: `def validate_null_check(records):
    """필수 필드 NULL 값 검증"""
    errors = []
    required_fields = ['item_code', 'item_name', 'category']
    for rec in records:
        for field in required_fields:
            if rec.get(field) is None or rec.get(field) == '':
                errors.append({
                    'record_id': rec.get('id'),
                    'field': field,
                    'error_type': 'NULL_VALUE',
                    'message': f'{field} 필드에 NULL 값이 존재합니다.'
                })
    return errors`,
  },
  {
    id: 'ENG-002',
    name: '형식 유효성 검증 엔진',
    active: true,
    lastResult: '부분성공',
    desc: '코드 형식, 날짜 형식 등 패턴 기반 유효성을 검증합니다',
    targetTable: 'spec_fields',
    targetFields: 'item_code, created_at',
    runs: 98,
    lastRun: '2026.08.05 06:05',
    schedules: 1,
    code: `import re

def validate_format(records):
    """패턴 기반 형식 검증"""
    errors = []
    code_pattern = re.compile(r'^[A-Z]{2}\\d{4}$')
    for rec in records:
        code = rec.get('item_code') or ''
        if code and not code_pattern.match(code):
            errors.append({
                'record_id': rec.get('id'),
                'field': 'item_code',
                'error_type': 'FORMAT',
                'message': f'{code} 는 형식(^[A-Z]{{2}}\\d{{4}}$)에 맞지 않습니다.'
            })
    return errors`,
  },
  {
    id: 'ENG-003',
    name: '범위/허용값 검증 엔진',
    active: false,
    lastResult: '실패',
    desc: '숫자 범위와 허용값 목록을 벗어난 값을 검증합니다',
    targetTable: 'spec_fields',
    targetFields: 'max_length, charge_power',
    runs: 41,
    lastRun: '2026.08.02 06:00',
    schedules: 1,
    code: `def validate_range(records):
    """값 범위 검증 — 허용 범위는 필드 정의(min~max)를 따른다"""
    errors = []
    for rec in records:
        value = rec.get('charge_power')
        if value is not None and not (0 <= value <= 400):
            errors.append({
                'record_id': rec.get('id'),
                'field': 'charge_power',
                'error_type': 'RANGE',
                'message': f'{value} 는 허용 범위(0~400)를 벗어났습니다.'
            })
    return errors`,
  },
]

export interface EngineSchedule {
  id: string
  freq: '일간' | '주간' | '시간'
  time: string
  next: string
  last: string
  active: boolean
}

export const engineSchedules: Record<string, Array<EngineSchedule>> = {
  'ENG-001': [
    { id: 'SCH-11', freq: '일간', time: '매일 06:00', next: '2026.08.06 06:00', last: '2026.08.05 06:00', active: true },
    { id: 'SCH-12', freq: '시간', time: '매시 정각 (업무시간)', next: '2026.08.05 15:00', last: '2026.08.05 14:00', active: true },
  ],
  'ENG-002': [
    { id: 'SCH-21', freq: '일간', time: '매일 06:05', next: '2026.08.06 06:05', last: '2026.08.05 06:05', active: true },
  ],
  'ENG-003': [
    { id: 'SCH-31', freq: '일간', time: '매일 06:10', next: '— (비활성)', last: '2026.08.02 06:10', active: false },
  ],
}

/** 새 엔진 등록 템플릿 — 함수 시그니처 규칙을 코드로 보여 준다 */
export const ENGINE_TEMPLATE = `def validate_custom(records):
    """커스텀 검증 함수
    Args:
        records: list of dict - 검증 대상 레코드 목록
    Returns:
        list of dict - 오류 목록 (빈 리스트면 오류 없음)
    """
    errors = []
    for rec in records:
        # 여기에 검증 로직을 작성하세요
        pass
    return errors`

export const RESULT_CLS: Record<EngineResult, string> = {
  성공: 'text-deployed-ink',
  부분성공: 'text-review-ink',
  실패: 'text-danger-ink',
}
