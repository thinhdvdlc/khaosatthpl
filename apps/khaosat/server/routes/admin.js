import { Router } from 'express'
import { prisma } from '../app.js'
import { layCayCauHoi, trangThaiKhaoSat } from '../lib/khaoSat.js'
import { taoKhaoSat, taoCauHois, chuanHoaThamChieu } from '../lib/nhapKhaoSat.js'
import { xuatCsv } from '../lib/exportCsv.js'

const router = Router()

const xuLy = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

const layAdminKey = () => process.env.ADMIN_KEY || 'khaosat-admin'

// Các trường meta được phép cập nhật trực tiếp
const TRUONG_META = [
  'tieuDe', 'header', 'footer', 'logo', 'background',
  'isActive', 'isViewKQ',
  'isNhapThongTin', 'isNhapThongTinRequired',
  'isTen', 'isEmail', 'isDienThoai', 'isNamSinh', 'isDiaChi', 'isGioiTinh',
]

// Đăng nhập quản trị — nằm TRƯỚC middleware kiểm tra khóa
router.post('/login', (req, res) => {
  if ((req.body?.key ?? '') === layAdminKey()) return res.json({ ok: true })
  res.status(401).json({ message: 'Khóa quản trị không đúng' })
})

// Mọi route quản trị còn lại yêu cầu header x-admin-key
router.use((req, res, next) => {
  if (req.headers['x-admin-key'] === layAdminKey()) return next()
  res.status(401).json({ message: 'Khóa quản trị không đúng' })
})

// Danh sách khảo sát (kèm số phiếu)
router.get(
  '/khaosats',
  xuLy(async (req, res) => {
    const ds = await prisma.khaoSat.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { ketQuas: true } } },
    })
    res.json({
      data: ds.map((k) => ({
        id: k.id,
        tieuDe: k.tieuDe,
        isActive: k.isActive,
        isViewKQ: k.isViewKQ,
        thoiGianBatDau: k.thoiGianBatDau,
        thoiGianKetThuc: k.thoiGianKetThuc,
        createdAt: k.createdAt,
        trangThai: trangThaiKhaoSat(k),
        soPhieu: k._count.ketQuas,
      })),
    })
  })
)

// Tạo khảo sát từ payload builder
router.post(
  '/khaosats',
  xuLy(async (req, res) => {
    const body = req.body || {}
    if (typeof body.tieuDe !== 'string' || !body.tieuDe.trim()) {
      return res.status(400).json({ message: 'Tiêu đề khảo sát là bắt buộc' })
    }
    if (body.cauHois !== undefined && !Array.isArray(body.cauHois)) {
      return res.status(400).json({ message: 'cauHois phải là một mảng' })
    }
    const id = await taoKhaoSat(prisma, { ...body, cauHois: body.cauHois || [] })
    res.json({ data: { id } })
  })
)

// Nhập khảo sát từ JSON hệ thống tham chiếu
router.post(
  '/khaosats/import',
  xuLy(async (req, res) => {
    const payload = chuanHoaThamChieu(req.body)
    if (typeof payload.tieuDe !== 'string' || !payload.tieuDe.trim()) {
      return res.status(400).json({ message: 'Dữ liệu nhập không hợp lệ: thiếu tiêu đề khảo sát' })
    }
    let giuId = true
    if (payload.id) {
      const daCo = await prisma.khaoSat.findUnique({ where: { id: payload.id } })
      if (daCo) {
        // Id gốc đã tồn tại → bỏ toàn bộ id, tạo bản ghi mới với id mới
        delete payload.id
        giuId = false
      }
    }
    const id = await taoKhaoSat(prisma, payload, { giuId })
    res.json({ data: { id } })
  })
)

// Cập nhật khảo sát (meta + tuỳ chọn thay toàn bộ câu hỏi)
router.put(
  '/khaosats/:id',
  xuLy(async (req, res) => {
    const body = req.body || {}
    const khaoSat = await prisma.khaoSat.findUnique({ where: { id: req.params.id } })
    if (!khaoSat) return res.status(404).json({ message: 'Không tìm thấy khảo sát' })

    if (body.tieuDe !== undefined && (typeof body.tieuDe !== 'string' || !body.tieuDe.trim())) {
      return res.status(400).json({ message: 'Tiêu đề khảo sát không hợp lệ' })
    }
    if (body.cauHois !== undefined && !Array.isArray(body.cauHois)) {
      return res.status(400).json({ message: 'cauHois phải là một mảng' })
    }

    if (body.cauHois !== undefined) {
      const soPhieu = await prisma.ketQua.count({ where: { khaoSatId: khaoSat.id } })
      if (soPhieu > 0) {
        return res.status(409).json({ message: 'Khảo sát đã có phiếu trả lời, không thể thay đổi câu hỏi' })
      }
    }

    const data = {}
    for (const k of TRUONG_META) if (body[k] !== undefined) data[k] = body[k]
    if (body.thoiGianBatDau !== undefined) data.thoiGianBatDau = body.thoiGianBatDau ? new Date(body.thoiGianBatDau) : null
    if (body.thoiGianKetThuc !== undefined) data.thoiGianKetThuc = body.thoiGianKetThuc ? new Date(body.thoiGianKetThuc) : null

    await prisma.$transaction(
      async (tx) => {
        if (Object.keys(data).length) await tx.khaoSat.update({ where: { id: khaoSat.id }, data })
        if (body.cauHois !== undefined) {
          await tx.cauHoi.deleteMany({ where: { khaoSatId: khaoSat.id } })
          await taoCauHois(tx, khaoSat.id, body.cauHois)
        }
      },
      { timeout: 30000 }
    )
    res.json({ data: { id: khaoSat.id } })
  })
)

// Bật/tắt nhanh
router.patch(
  '/khaosats/:id',
  xuLy(async (req, res) => {
    const khaoSat = await prisma.khaoSat.findUnique({ where: { id: req.params.id } })
    if (!khaoSat) return res.status(404).json({ message: 'Không tìm thấy khảo sát' })
    const data = {}
    if (typeof req.body?.isActive === 'boolean') data.isActive = req.body.isActive
    if (typeof req.body?.isViewKQ === 'boolean') data.isViewKQ = req.body.isViewKQ
    if (Object.keys(data).length) await prisma.khaoSat.update({ where: { id: khaoSat.id }, data })
    res.json({ data: { id: khaoSat.id } })
  })
)

// Không cho xoá khảo sát — chỉ cho phép khoá/mở (PATCH isActive).
router.delete(
  '/khaosats/:id',
  xuLy(async (req, res) => {
    res.status(403).json({ message: 'Không hỗ trợ xoá khảo sát. Vui lòng dùng chức năng Khóa.' })
  })
)

// Danh sách phiếu trả lời (phân trang)
router.get(
  '/khaosats/:id/ketquas',
  xuLy(async (req, res) => {
    const khaoSat = await prisma.khaoSat.findUnique({ where: { id: req.params.id } })
    if (!khaoSat) return res.status(404).json({ message: 'Không tìm thấy khảo sát' })
    const skip = Math.max(0, parseInt(req.query.skip, 10) || 0)
    const take = Math.min(100, Math.max(1, parseInt(req.query.take, 10) || 20))
    const [tong, items] = await Promise.all([
      prisma.ketQua.count({ where: { khaoSatId: khaoSat.id } }),
      prisma.ketQua.findMany({
        where: { khaoSatId: khaoSat.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, createdAt: true, nguoiKhaoSat: true },
      }),
    ])
    res.json({
      data: {
        tong,
        items: items.map((kq) => {
          let nguoiKhaoSat = null
          try {
            nguoiKhaoSat = kq.nguoiKhaoSat ? JSON.parse(kq.nguoiKhaoSat) : null
          } catch {
            nguoiKhaoSat = null
          }
          return { id: kq.id, createdAt: kq.createdAt, nguoiKhaoSat }
        }),
      },
    })
  })
)

// Xuất CSV toàn bộ phiếu trả lời
router.get(
  '/khaosats/:id/export.csv',
  xuLy(async (req, res) => {
    const khaoSat = await prisma.khaoSat.findUnique({ where: { id: req.params.id } })
    if (!khaoSat) return res.status(404).json({ message: 'Không tìm thấy khảo sát' })
    const cay = await layCayCauHoi(prisma, khaoSat.id)
    const csv = await xuatCsv(prisma, khaoSat, cay)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="ket-qua-khao-sat.csv"')
    res.send(csv)
  })
)

export default router
