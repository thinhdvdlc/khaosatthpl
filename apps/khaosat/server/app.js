import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import publicRoutes from './routes/public.js'
import adminRoutes from './routes/admin.js'

// PrismaClient dùng chung cho toàn server (routes import từ đây).
// Cache trên globalThis để trên môi trường serverless (Vercel) không mở quá nhiều kết nối.
const globalForPrisma = globalThis
export const prisma = globalForPrisma.__khaosatPrisma ?? new PrismaClient()
if (!globalForPrisma.__khaosatPrisma) globalForPrisma.__khaosatPrisma = prisma

const app = express()
app.use(express.json({ limit: '2mb' }))

// Kiểm tra sức khỏe: thử truy vấn CSDL
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'error' })
  }
})

app.use('/api/v1', publicRoutes)
app.use('/api/v1/admin', adminRoutes)

// Serve client đã build (client/dist) + SPA fallback
const thuMucDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client/dist')
if (fs.existsSync(thuMucDist)) {
  app.use(express.static(thuMucDist))
}
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Không tìm thấy đường dẫn' })
  }
  const indexHtml = path.join(thuMucDist, 'index.html')
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml)
  res.type('text/plain').send('Chưa build client — chạy npm run build')
})

// Bắt lỗi cuối cùng
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Có lỗi xảy ra' })
})

export default app
