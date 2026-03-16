import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let html: string

beforeAll(() => {
  html = readFileSync(resolve(__dirname, 'index.html'), 'utf-8')
})

describe('접근성 (A11y) — ARIA 속성', () => {
  it('GPS 버튼에 aria-label이 있어야 한다', () => {
    expect(html).toMatch(/class="gps-btn"[^>]*aria-label=/)
  })

  it('GPS 버튼의 SVG에 aria-hidden="true"가 있어야 한다', () => {
    // SVG inside gps-btn should have aria-hidden
    const gpsBtnMatch = html.match(/class="gps-btn"[^>]*>[\s\S]*?<\/button>/)
    expect(gpsBtnMatch).not.toBeNull()
    expect(gpsBtnMatch![0]).toContain('aria-hidden="true"')
  })

  it('로딩 오버레이에 role="status"와 aria-live가 있어야 한다', () => {
    expect(html).toMatch(/class="loading-overlay"[^>]*role="status"/)
    expect(html).toMatch(/class="loading-overlay"[^>]*aria-live=/)
  })

  it('로딩 상태에 스크린리더용 텍스트가 있어야 한다', () => {
    expect(html).toContain('sr-only')
    expect(html).toMatch(/날씨 정보를 불러오는 중입니다/)
  })

  it('에러 메시지에 role="alert"가 있어야 한다', () => {
    expect(html).toMatch(/class="error"[^>]*role="alert"/)
  })

  it('separator에 aria-hidden="true"가 있어야 한다', () => {
    expect(html).toMatch(/class="separator"[^>]*aria-hidden="true"/)
  })

  it('pull-spinner에 aria-hidden="true"가 있어야 한다', () => {
    // pull-spinner line may have Alpine :class before aria-hidden
    const pullSpinnerLine = html.split('\n').find(line => line.includes('pull-spinner') && line.includes('<div'))
    expect(pullSpinnerLine).toBeDefined()
    expect(pullSpinnerLine).toContain('aria-hidden="true"')
  })

  it('공유 토스트에 role="status"가 있어야 한다', () => {
    expect(html).toMatch(/class="share-toast"[^>]*role="status"/)
  })
})

describe('접근성 (A11y) — 시맨틱 HTML', () => {
  it('main 요소가 존재해야 한다', () => {
    expect(html).toMatch(/<main[\s>]/)
  })

  it('h1 요소가 존재해야 한다', () => {
    expect(html).toMatch(/<h1[\s>]/)
  })

  it('도시 선택이 button 요소여야 한다', () => {
    expect(html).toMatch(/<button[^>]*class="location"/)
  })

  it('날씨 비교 영역이 section이어야 한다', () => {
    expect(html).toMatch(/<section[^>]*class="weather-row"/)
  })
})

describe('접근성 (A11y) — 모달 대화 상자', () => {
  it('모달에 role="dialog"가 있어야 한다', () => {
    expect(html).toMatch(/class="modal-overlay"[^>]*role="dialog"/)
  })

  it('모달에 aria-modal="true"가 있어야 한다', () => {
    expect(html).toMatch(/class="modal-overlay"[^>]*aria-modal="true"/)
  })

  it('모달에 aria-label이 있어야 한다', () => {
    expect(html).toMatch(/class="modal-overlay"[^>]*aria-label=/)
  })

  it('검색 입력에 label이 있어야 한다', () => {
    expect(html).toMatch(/for="city-search"/)
    expect(html).toMatch(/id="city-search"/)
  })

  it('도시 목록에 role="listbox"가 있어야 한다', () => {
    expect(html).toMatch(/class="modal-body"[^>]*role="listbox"/)
  })

  it('도시 항목에 role="option"이 있어야 한다', () => {
    expect(html).toMatch(/class="city-item"[^>]*role="option"/)
  })
})

describe('접근성 (A11y) — 키보드 내비게이션', () => {
  it('인터랙티브 요소에 tabindex가 있어야 한다', () => {
    // weather-row, temp-diff, branding should have tabindex
    expect(html).toMatch(/class="weather-row"[^>]*tabindex="0"/)
    expect(html).toMatch(/class="temp-diff"[^>]*tabindex="0"/)
    expect(html).toMatch(/class="branding"[^>]*tabindex="0"/)
  })

  it('키보드 이벤트 핸들러가 있어야 한다', () => {
    expect(html).toMatch(/@keydown\.enter="toggleUnit\(\)"/)
    expect(html).toMatch(/@keydown\.space\.prevent="toggleUnit\(\)"/)
    expect(html).toMatch(/@keydown\.enter="shareWeather\(\)"/)
  })

  it('focus-visible 스타일이 정의되어 있어야 한다', () => {
    expect(html).toContain(':focus-visible')
  })
})

describe('접근성 (A11y) — sr-only 클래스', () => {
  it('sr-only CSS 클래스가 정의되어 있어야 한다', () => {
    expect(html).toMatch(/\.sr-only\s*\{/)
  })

  it('sr-only가 position: absolute를 사용해야 한다', () => {
    const srOnlyMatch = html.match(/\.sr-only\s*\{[^}]+\}/)
    expect(srOnlyMatch).not.toBeNull()
    expect(srOnlyMatch![0]).toContain('position: absolute')
  })
})
