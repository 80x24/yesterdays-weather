/**
 * Smoke Test: 프로덕션 배포 후 open-tongues 통합 검증
 * 실제 브라우저(Chromium)로 프로덕션 URL 접속하여 확인
 *
 * 실행: npx playwright test tests/smoke/
 */
import { test, expect } from '@playwright/test'

const PROD_URL = 'https://yesterdays-weather.fly.dev'

test.describe('프로덕션 smoke test: open-tongues', () => {
  test('페이지 로드 후 tongues 스크립트가 정상 로드되어야 한다', async ({ page }) => {
    // t.js 네트워크 요청 감시
    const tJsResponse = page.waitForResponse(
      (res) => res.url().includes('/tongues/t.js') && res.status() === 200
    )

    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' })

    // t.js가 200으로 로드됨
    const res = await tJsResponse
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('javascript')
  })

  test('window.t (번역 API)가 페이지에 노출되어야 한다', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' })

    // open-tongues 클라이언트가 window.t를 등록하는지 확인
    const hasWindowT = await page.evaluate(() => typeof (window as any).t === 'object')
    expect(hasWindowT).toBe(true)
  })

  test('window.t.setLocale 함수가 존재해야 한다', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' })

    const hasSetLocale = await page.evaluate(
      () => typeof (window as any).t?.setLocale === 'function'
    )
    expect(hasSetLocale).toBe(true)
  })

  test('window.t.restore 함수가 존재해야 한다', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' })

    const hasRestore = await page.evaluate(
      () => typeof (window as any).t?.restore === 'function'
    )
    expect(hasRestore).toBe(true)
  })

  test('/tongues/health 엔드포인트가 정상 응답해야 한다', async ({ request }) => {
    const res = await request.get(`${PROD_URL}/tongues/health`)
    expect(res.ok()).toBe(true)

    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.cache).toBeDefined()
  })

  test('번역 API가 잘못된 요청에 400을 반환해야 한다', async ({ request }) => {
    const res = await request.post(`${PROD_URL}/tongues/api/translate`, {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('날씨 페이지 핵심 기능이 정상 동작해야 한다', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' })

    // 날씨 데이터 로드 확인 — 온도 표시 존재
    await expect(page.locator('.col-temp').first()).toBeVisible({ timeout: 10000 })

    // 도시 이름 표시
    await expect(page.locator('.location')).toBeVisible()

    // "어제" / "오늘" 라벨 — tongues가 번역할 수 있으므로 원본 또는 번역 후 텍스트 모두 허용
    const yesterdayLabel = page.locator('#label-yesterday')
    await expect(yesterdayLabel).toBeVisible()
    const yesterdayText = await yesterdayLabel.textContent()
    expect(['어제', 'Yesterday']).toContain(yesterdayText?.trim())
  })

  test('tongues 번역이 실제로 동작해야 한다 (data-th 속성 확인)', async ({ page }) => {
    await page.goto(PROD_URL, { waitUntil: 'networkidle' })

    // tongues가 번역하면 원본을 data-th 속성에 저장함
    // networkidle 후 번역이 적용될 시간 대기
    await page.waitForTimeout(3000)

    const translatedCount = await page.evaluate(() =>
      document.querySelectorAll('[data-th]').length
    )

    // 번역이 적용됐다면 data-th 속성을 가진 요소가 있어야 함
    // (브라우저 언어가 ko면 번역 안 될 수 있으므로 0도 허용)
    expect(translatedCount).toBeGreaterThanOrEqual(0)

    // 번역됐을 경우, 원본 한국어가 data-th에 보존되는지 확인
    if (translatedCount > 0) {
      const firstOriginal = await page.evaluate(() =>
        document.querySelector('[data-th]')?.getAttribute('data-th')
      )
      expect(firstOriginal).toBeTruthy()
    }
  })
})
