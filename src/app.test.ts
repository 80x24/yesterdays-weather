import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from './app'

// Mock fetch globally to avoid real external API calls
const mockWeatherData = {
  daily: {
    temperature_2m_max: [10, 15],
    temperature_2m_min: [2, 5],
    weather_code: [0, 3],
  },
  current_weather: {
    temperature: 12,
    weathercode: 1,
    time: '2026-03-16T12:00',
  },
  timezone: 'Asia/Seoul',
}

const mockArchiveData = {
  daily: {
    temperature_2m_mean: [8],
    weathercode: [0],
  },
  timezone: 'Asia/Seoul',
}

function mockFetchSuccess(data: unknown) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(data), { status: 200 })
  )
}

// Helper: make request to app
async function request(path: string) {
  return app.fetch(new Request(`http://localhost${path}`))
}

describe('GET /api/weather', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for missing lat/lon', async () => {
    const res = await request('/api/weather')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 for invalid lat', async () => {
    const res = await request('/api/weather?lat=999&lon=126')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('lat')
  })

  it('returns 400 for invalid lon', async () => {
    const res = await request('/api/weather?lat=37&lon=999')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('lon')
  })

  it('returns 400 for non-numeric lat', async () => {
    const res = await request('/api/weather?lat=abc&lon=126')
    expect(res.status).toBe(400)
  })

  it('returns 200 for valid coords', async () => {
    mockFetchSuccess(mockWeatherData)
    const res = await request('/api/weather?lat=37.5665&lon=126.978')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.today).toBeDefined()
    expect(json.yesterday).toBeDefined()
  })

  it('returns 504 on external API timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      () => new Promise((_resolve, reject) => {
        setTimeout(() => reject(new DOMException('The operation was aborted.', 'AbortError')), 10)
      })
    )
    const res = await request('/api/weather?lat=37&lon=126')
    expect(res.status).toBe(504)
    const json = await res.json()
    expect(json.error).toContain('timeout')
  })
})

describe('GET /api/yesterday', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for missing params', async () => {
    const res = await request('/api/yesterday')
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid lat range', async () => {
    const res = await request('/api/yesterday?lat=-91&lon=126')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('lat')
  })

  it('returns 400 for invalid lon range', async () => {
    const res = await request('/api/yesterday?lat=37&lon=181')
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('lon')
  })

  it('returns 200 for valid params', async () => {
    mockFetchSuccess(mockArchiveData)
    const res = await request('/api/yesterday?lat=37.5665&lon=126.978')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.tempC).toBeDefined()
  })
})

describe('GET /og', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for invalid lat on /og', async () => {
    const res = await request('/og?lat=abc&lon=126')
    expect(res.status).toBe(400)
  })

  it('returns 400 for out-of-range lon on /og', async () => {
    const res = await request('/og?lat=37&lon=999')
    expect(res.status).toBe(400)
  })
})
