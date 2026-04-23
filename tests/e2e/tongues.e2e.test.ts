/**
 * E2E: open-tongues 통합 테스트
 * 실제 Bun 서버를 띄우고 HTTP 요청으로 검증
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'child_process'

const PORT = 13579
const BASE = `http://localhost:${PORT}`
let server: ChildProcess

async function waitForServer(url: string, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`Server did not start within ${timeout}ms`)
}

beforeAll(async () => {
  server = spawn('bun', ['run', 'src/index.ts'], {
    cwd: new URL('../../', import.meta.url).pathname,
    env: {
      ...process.env,
      PORT: String(PORT),
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'test-key-for-e2e',
    },
    stdio: 'pipe',
  })

  await waitForServer(`${BASE}/tongues/health`)
}, 15000)

afterAll(() => {
  server?.kill('SIGTERM')
})

describe('E2E: /tongues/t.js 클라이언트 번들', () => {
  it('200 응답을 반환해야 한다', async () => {
    const res = await fetch(`${BASE}/tongues/t.js`)
    expect(res.status).toBe(200)
  })

  it('Content-Type이 application/javascript여야 한다', async () => {
    const res = await fetch(`${BASE}/tongues/t.js`)
    expect(res.headers.get('content-type')).toContain('application/javascript')
  })

  it('Cache-Control 헤더가 설정되어야 한다', async () => {
    const res = await fetch(`${BASE}/tongues/t.js`)
    expect(res.headers.get('cache-control')).toContain('max-age=300')
  })

  it('유효한 JavaScript 번들을 반환해야 한다', async () => {
    const res = await fetch(`${BASE}/tongues/t.js`)
    const body = await res.text()
    expect(body.length).toBeGreaterThan(100)
    // open-tongues 클라이언트는 __tongues 싱글톤 가드를 포함
    expect(body).toContain('__tongues')
  })
})

describe('E2E: /tongues/health 번역 API 상태', () => {
  it('200 응답과 status: ok를 반환해야 한다', async () => {
    const res = await fetch(`${BASE}/tongues/health`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
  })
})

describe('E2E: /tongues/api/translate 엔드포인트', () => {
  it('잘못된 요청에 400 또는 에러를 반환해야 한다', async () => {
    const res = await fetch(`${BASE}/tongues/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    // 유효하지 않은 body → 400
    expect(res.status).toBe(400)
  })

  it('CORS 헤더가 설정되어야 한다', async () => {
    const res = await fetch(`${BASE}/tongues/api/translate`, {
      method: 'OPTIONS',
    })
    const allow = res.headers.get('access-control-allow-origin')
    expect(allow).toBe('*')
  })
})

describe('E2E: 메인 페이지에서 tongues 스크립트 참조', () => {
  it('HTML에 /tongues/t.js 스크립트 태그가 포함되어야 한다', async () => {
    const res = await fetch(BASE)
    const html = await res.text()
    expect(html).toContain('src="/tongues/t.js"')
    expect(html).not.toContain('tongues.80x24.ai')
  })
})
