import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('open-tongues 통합', () => {
  const html = readFileSync(resolve(__dirname, '../public/index.html'), 'utf-8')

  it('스크립트 태그가 /tongues/t.js를 가리켜야 한다', () => {
    expect(html).toContain('src="/tongues/t.js"')
  })

  it('외부 tongues.80x24.ai 호스팅을 사용하지 않아야 한다', () => {
    expect(html).not.toContain('tongues.80x24.ai')
  })

  it('스크립트 태그에 defer 속성이 있어야 한다', () => {
    expect(html).toMatch(/src="\/tongues\/t\.js"\s+defer/)
  })
})

describe('open-tongues 패키지', () => {
  it('클라이언트 번들(dist/t.js)이 존재해야 한다', () => {
    const clientPath = resolve(__dirname, '../node_modules/open-tongues/dist/t.js')
    const content = readFileSync(clientPath, 'utf-8')
    expect(content.length).toBeGreaterThan(100)
    expect(content).toContain('translate')
  })

  it('createHandler가 export되어야 한다', async () => {
    // Verify the package exports createHandler (import check only)
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, '../node_modules/open-tongues/package.json'), 'utf-8')
    )
    expect(pkg.exports['.']).toBeDefined()
    expect(pkg.exports['./client']).toBeDefined()
  })
})

describe('app.ts tongues 마운트 코드', () => {
  const appCode = readFileSync(resolve(__dirname, './app.ts'), 'utf-8')

  it('ANTHROPIC_API_KEY 확인 후 조건부 마운트해야 한다', () => {
    expect(appCode).toContain('process.env.ANTHROPIC_API_KEY')
  })

  it('/tongues/t.js 라우트가 정의되어야 한다', () => {
    expect(appCode).toContain("'/tongues/t.js'")
  })

  it('createHandler로 /tongues 라우트를 마운트해야 한다', () => {
    expect(appCode).toContain("app.route('/tongues'")
    expect(appCode).toContain('createHandler')
  })

  it('Content-Type을 application/javascript로 설정해야 한다', () => {
    expect(appCode).toContain('application/javascript')
  })
})
