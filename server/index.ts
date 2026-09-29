import 'dotenv/config'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'

const app = express()
const port = Number(process.env.PORT) || 5000
const origins = process.env.ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean)

app.use(cors({ origin: origins?.length ? origins : true }))
app.use(express.json())
app.use((request, _response, next) => {
  console.info(`[api] ${request.method} ${request.path}`)
  next()
})

app.get('/api/health', (_request, response) => {
  response.json({ success: true, service: 'real-estate-api' })
})

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error('[api] Unhandled error:', error)
  response.status(500).json({ success: false, error: 'Internal server error' })
}
app.use(errorHandler)

app.listen(port, () => console.info(`[api] real-estate-api listening on port ${port}`))
