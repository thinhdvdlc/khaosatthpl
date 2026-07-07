// Điểm vào serverless cho Vercel — tái sử dụng Express app.
// Vercel chỉ định tuyến /api/* và /health tới hàm này; phần phục vụ static/SPA
// trong app.js không được dùng (Vercel CDN lo phần tĩnh).
import app from '../server/app.js'

export default app
