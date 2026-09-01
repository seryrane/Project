/**
 * 오프라인 전달본 포장 — 빌드 결과(dist-offline/)를 **HTML 파일 하나**로 접는다.
 *
 * 왜 별도의 포장 단계가 필요한가: vite 는 index.html + app.js + styles.css 로 내놓는데,
 * `file://` 에서는 그 옆 파일을 불러오는 것 자체가 막힌다(로컬 파일은 출처가 없어
 * 브라우저가 교차 출처로 본다). 그래서 **참조를 없애고 본문을 그 자리에 붙인다**.
 *
 * ⚠ 스크립트 본문에 `</script>` 문자열이 있으면 HTML 파서가 거기서 끊는다 — 반드시 깬다.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(here, '../dist-offline')
const outArg = process.argv[2]

const html = readFileSync(join(distDir, 'index.html'), 'utf8')

const assets = readdirSync(distDir).filter((f) => statSync(join(distDir, f)).isFile())
const jsFile = assets.find((f) => f.endsWith('.js'))
if (!jsFile) throw new Error('dist-offline 에서 app.js 를 찾지 못했습니다 — 빌드가 먼저입니다')

/* ⚠ CSS 가 **두 개** 나온다: 화면이 쓰는 진짜 묶음과, __root.tsx 의 `styles.css?url`
   (서버 렌더용 링크)이 남기는 쓰지 않는 벌. 이름으로 고르면 언젠가 뒤바뀐다 —
   **유틸리티가 들어 있는 쪽**이 진짜다(글자만 세로로 흐르는 화면의 원인이 이 선택이었다). */
const cssFiles = assets.filter((f) => f.endsWith('.css'))
const cssFile = cssFiles.find((f) => readFileSync(join(distDir, f), 'utf8').includes('.flex{'))
if (!cssFile) {
  throw new Error(
    `유틸리티가 든 CSS 를 못 찾았습니다(후보: ${cssFiles.join(', ') || '없음'}) — ` +
      'offline/styles.offline.css 의 `@source` 를 확인하세요',
  )
}

const js = readFileSync(join(distDir, jsFile), 'utf8').replaceAll('</script', '<\/script')
const css = readFileSync(join(distDir, cssFile), 'utf8')

let out = html
  // 모듈 프리로드는 파일이 하나가 되면 가리킬 곳이 없다
  .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
  // 스타일시트 링크 → 본문
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, '')
  // 모듈 스크립트 → 고전 스크립트(모듈은 file:// 에서 막힌다)
  .replace(/\s*<script type="module"[^>]*><\/script>/g, '')

/* ⚠ iife 로 뽑으면 vite 가 스타일시트 링크를 안 넣어 준다(모듈 전제의 주입 경로다) —
   링크를 지우는 것으로 끝내면 **글꼴도 색도 없는 흰 화면**이 나간다. 직접 붙인다. */
/* ⚠⚠ 치환은 **반드시 함수로** 한다. 문자열로 넘기면 JS 가 본문 속의 `$&`·`$'` 를
   치환 지시로 읽어 붙여 넣을 때마다 문서를 통째로 다시 끼워 넣는다 —
   5MB 로 나와야 할 파일이 131MB 로 부푼 자리가 여기다(2026-09-01 실측). */
out = out.replace('</head>', () => `  <style>
${css}
    </style>
  </head>`)
out = out.replace('</body>', () => `  <script>
${js}
    </script>
  </body>`)

/* 남은 바깥 참조 검사 — 인라인된 JS 본문에 'type="module"' 같은 낱말이 섞여 있을 수 있으므로
   **태그의 src/href 속성**만 본다(문자열 포함 검사로 하면 늘 걸린다). */
const dangling = out.match(/<(?:script|link)[^>]*\s(?:src|href)="\.?\/[^"]*"/g)
if (dangling) {
  throw new Error(`바깥 파일 참조가 남았습니다 — file:// 에서 깨집니다: ${dangling.join(', ')}`)
}

const target = outArg ? resolve(outArg) : join(distDir, 'HMG_포털_시안.html')
mkdirSync(dirname(target), { recursive: true })
writeFileSync(target, out, 'utf8')

const mb = (Buffer.byteLength(out, 'utf8') / 1024 / 1024).toFixed(1)
console.log(`packed → ${target}  (${mb} MB)`)
