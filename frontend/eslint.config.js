//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // dist-offline 은 전달본 빌드 산출물(한 파일로 접기 전의 번들) — 소스가 아니다
    ignores: ['eslint.config.js', 'prettier.config.js', 'dist-offline/'],
  },
]
