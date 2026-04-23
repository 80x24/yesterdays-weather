import { Hono } from 'hono'
import { Resvg } from '@resvg/resvg-js'
import { validateCoords, isValidationError, fetchWithTimeout } from './validation'

const FETCH_TIMEOUT_MS = 10000

const app = new Hono()

// open-tongues: 클라이언트 번들 서빙 + 번역 API 마운트 (Bun 전용)
const tonguesApiKey = process.env.ANTHROPIC_API_KEY
if (tonguesApiKey && typeof Bun !== 'undefined') {
  const { createHandler } = await import('open-tongues')
  const { resolve, dirname } = await import('path')
  const { fileURLToPath } = await import('url')

  const __dirname = dirname(fileURLToPath(import.meta.url))
  const clientPath = resolve(__dirname, '../node_modules/open-tongues/dist/t.js')
  let clientBundle: string | null = null

  app.get('/tongues/t.js', async (c) => {
    if (!clientBundle) {
      clientBundle = await Bun.file(clientPath).text()
    }
    c.header('Content-Type', 'application/javascript')
    c.header('Cache-Control', 'public, max-age=300')
    return c.body(clientBundle)
  })

  app.route('/tongues', createHandler({
    apiKey: tonguesApiKey,
    dbPath: './tongues.db',
  }))
}

// 어제 날씨 API (legacy, backward compatible)
app.get('/api/yesterday', async (c) => {
  const lat = c.req.query('lat')
  const lon = c.req.query('lon')

  const coords = validateCoords(lat, lon)
  if (isValidationError(coords)) {
    return c.json({ error: coords.error }, 400)
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]

  try {
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_mean,weathercode&timezone=auto`
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
    const data = await res.json()

    if (!data.daily) {
      return c.json({ error: 'No data available' }, 404)
    }

    const tempC = Math.round(data.daily.temperature_2m_mean[0])
    const tempF = Math.round(tempC * 9/5 + 32)
    const weatherCode = data.daily.weathercode[0]
    const weatherType = getWeatherType(weatherCode)

    return c.json({ date: dateStr, tempC, tempF, weatherType, weatherCode, timezone: data.timezone })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return c.json({ error: 'External API timeout' }, 504)
    }
    return c.json({ error: 'Failed to fetch weather data' }, 500)
  }
})

// 오늘 + 어제 날씨 API (새 엔드포인트)
app.get('/api/weather', async (c) => {
  const lat = c.req.query('lat')
  const lon = c.req.query('lon')

  const coords = validateCoords(lat, lon)
  if (isValidationError(coords)) {
    return c.json({ error: coords.error }, 400)
  }

  try {
    // Forecast API with past_days=1: yesterday(actual) + today(forecast+current)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&past_days=1&forecast_days=1&timezone=auto&current_weather=true`
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
    const data = await res.json()

    if (!data.daily || !data.current_weather) {
      return c.json({ error: 'No data available' }, 404)
    }

    const daily = data.daily
    // weather_code or weathercode (API version compat)
    const codes = daily.weather_code || daily.weathercode || []

    // daily[0] = yesterday, daily[1] = today
    const yHigh = Math.round(daily.temperature_2m_max[0])
    const yLow = Math.round(daily.temperature_2m_min[0])
    const yMean = Math.round((yHigh + yLow) / 2)

    const tHigh = Math.round(daily.temperature_2m_max[1])
    const tLow = Math.round(daily.temperature_2m_min[1])
    const currentTemp = Math.round(data.current_weather.temperature)
    const currentCode = data.current_weather.weathercode ?? data.current_weather.weather_code ?? 0

    return c.json({
      today: {
        tempC: currentTemp,
        tempF: Math.round(currentTemp * 9/5 + 32),
        high: tHigh,
        highF: Math.round(tHigh * 9/5 + 32),
        low: tLow,
        lowF: Math.round(tLow * 9/5 + 32),
        weatherType: getWeatherType(currentCode),
        weatherCode: currentCode,
      },
      yesterday: {
        tempC: yMean,
        tempF: Math.round(yMean * 9/5 + 32),
        high: yHigh,
        highF: Math.round(yHigh * 9/5 + 32),
        low: yLow,
        lowF: Math.round(yLow * 9/5 + 32),
        weatherType: getWeatherType(codes[0] ?? 0),
        weatherCode: codes[0] ?? 0,
      },
      currentTime: data.current_weather.time,
      timezone: data.timezone,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return c.json({ error: 'External API timeout' }, 504)
    }
    return c.json({ error: 'Failed to fetch weather data' }, 500)
  }
})

// 동적 OG 이미지 (SVG)
app.get('/og', async (c) => {
  const lat = c.req.query('lat') || '37.5665'
  const lon = c.req.query('lon') || '126.978'

  // Validate if params were explicitly provided
  if (c.req.query('lat') || c.req.query('lon')) {
    const coords = validateCoords(lat, lon)
    if (isValidationError(coords)) {
      return c.json({ error: coords.error }, 400)
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&past_days=1&forecast_days=1&timezone=auto&current_weather=true`
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
    const data = await res.json()

    const daily = data.daily
    const yHigh = Math.round(daily.temperature_2m_max[0])
    const yLow = Math.round(daily.temperature_2m_min[0])
    const yMean = Math.round((yHigh + yLow) / 2)
    const currentTemp = Math.round(data.current_weather.temperature)
    const diff = currentTemp - yMean
    const diffText = diff === 0 ? 'same' : diff > 0 ? `${diff}° higher` : `${Math.abs(diff)}° lower`

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a1a2e"/>
          <stop offset="100%" stop-color="#0a0a15"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <text x="300" y="200" font-family="system-ui,sans-serif" font-size="42" fill="rgba(255,255,255,0.4)" font-weight="300" text-anchor="middle" letter-spacing="4">YESTERDAY</text>
      <text x="300" y="340" font-family="system-ui,sans-serif" font-size="160" fill="rgba(255,255,255,0.5)" font-weight="700" text-anchor="middle" letter-spacing="-4">${yMean}°</text>
      <text x="900" y="200" font-family="system-ui,sans-serif" font-size="42" fill="rgba(255,255,255,0.4)" font-weight="300" text-anchor="middle" letter-spacing="4">TODAY</text>
      <text x="900" y="340" font-family="system-ui,sans-serif" font-size="160" fill="#fff" font-weight="700" text-anchor="middle" letter-spacing="-4">${currentTemp}°</text>
      <circle cx="600" cy="280" r="4" fill="rgba(255,255,255,0.2)"/>
      <text x="600" y="460" font-family="system-ui,sans-serif" font-size="32" fill="rgba(255,255,255,0.5)" font-weight="400" text-anchor="middle">${diffText} than yesterday</text>
      <text x="600" y="570" font-family="system-ui,sans-serif" font-size="22" fill="rgba(255,255,255,0.15)" font-weight="300" text-anchor="middle" letter-spacing="6">Yesterday's Weather</text>
    </svg>`

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    const png = resvg.render().asPng()

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=1800',
      }
    })
  } catch {
    // Fallback static OG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <rect width="1200" height="630" fill="#1a1a2e"/>
      <text x="600" y="300" font-family="system-ui,sans-serif" font-size="64" fill="#fff" font-weight="700" text-anchor="middle">어제의 날씨</text>
      <text x="600" y="380" font-family="system-ui,sans-serif" font-size="28" fill="rgba(255,255,255,0.5)" font-weight="300" text-anchor="middle" letter-spacing="6">Yesterday's Weather</text>
    </svg>`
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    const png = resvg.render().asPng()
    return new Response(png, { headers: { 'Content-Type': 'image/png' } })
  }
})

// WMO Weather Code → 날씨 타입 매핑
function getWeatherType(code: number): string {
  if (code === 0) return 'clear'
  if (code <= 3) return 'cloudy'
  if (code <= 49) return 'fog'
  if (code <= 69) return 'rain'
  if (code <= 79) return 'snow'
  if (code <= 99) return 'storm'
  return 'cloudy'
}

export default app
