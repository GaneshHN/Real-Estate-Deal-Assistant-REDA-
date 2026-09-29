import 'dotenv/config'
import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { getRole, requireAuth, requireRole, type AuthenticatedRequest } from './auth'

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

app.get('/api/auth/me', requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ success: true, user: request.user, role: request.role || getRole(request.user!) })
})

app.get('/api/protected', requireAuth, (request: AuthenticatedRequest, response) => {
  response.json({ success: true, message: 'Protected resource', userId: request.user!.id, role: request.role })
})

app.get('/api/admin', requireAuth, requireRole('admin'), (_request, response) => {
  response.json({ success: true, message: 'Admin resource' })
})

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error('[api] Unhandled error:', error)
  response.status(500).json({ success: false, error: 'Internal server error' })
}
app.use(errorHandler)

app.listen(port, () => console.info(`[api] real-estate-api listening on port ${port}`))
