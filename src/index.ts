import { serveStatic } from 'hono/bun'
import app from './app'

// 정적 파일 서빙 (Bun runtime only)
app.use('/*', serveStatic({ root: './public' }))

export default {
  port: 3000,
  fetch: app.fetch
}
