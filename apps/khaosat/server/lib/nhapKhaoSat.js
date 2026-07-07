import { randomUUID } from 'node:crypto'
import { LOAI, maLoai } from './loaiCauHoi.js'

// Chuyển giá trị ngày (string ISO hoặc Date) về Date | null
function veNgay(v) {
  if (!v) return null
  return v instanceof Date ? v : new Date(v)
}

// Làm phẳng cây câu hỏi thành các "tầng" (theo độ sâu) + danh sách phương án,
// gán sẵn id để tạo bằng createMany (không cần transaction tương tác dài — hợp Prisma Postgres).
// Trả về { tang: [[cấp0], [cấp1], ...], cauTraLoi: [...] }.
function lamPhang(cauHois, khaoSatId, giuId, rootChaId = null) {
  const tang = []
  const cauTraLoi = []

  function duyet(ds, chaId, doSau) {
    if (!tang[doSau]) tang[doSau] = []
    ds.forEach((ch, i) => {
      const ma = maLoai(ch)
      const id = giuId && ch.id ? ch.id : randomUUID()
      tang[doSau].push({
        id,
        khaoSatId,
        cauHoiChaId: chaId,
        noiDung: ch.noiDung,
        maLoaiCauHoi: ma,
        isBatBuoc: ch.isBatBuoc ?? false,
        isLyDoKhac: ch.isLyDoKhac ?? false,
        thuTu: ch.thuTu ?? i + 1,
        soLuongTraLoiMin: ch.soLuongTraLoiMin ?? null,
        soLuongTraLoiMax: ch.soLuongTraLoiMax ?? null,
        maxLength: ch.maxLength ?? null,
      })

      let pa = (ch.cauTraLoi || []).map((a, j) =>
        typeof a === 'string'
          ? { noiDung: a, thuTu: j + 1 }
          : { id: giuId && a.id ? a.id : undefined, noiDung: a.noiDung, thuTu: a.thuTu ?? j + 1 }
      )
      // YES_NO không khai báo phương án → tự tạo Có / Không
      if (ma === LOAI.YES_NO && pa.length === 0) {
        pa = [
          { noiDung: 'Có', thuTu: 1 },
          { noiDung: 'Không', thuTu: 2 },
        ]
      }
      for (const a of pa) {
        cauTraLoi.push({
          ...(a.id ? { id: a.id } : { id: randomUUID() }),
          cauHoiId: id,
          noiDung: a.noiDung,
          thuTu: a.thuTu,
        })
      }

      if (ch.cauHoiCon?.length) duyet(ch.cauHoiCon, id, doSau + 1)
    })
  }

  duyet(cauHois || [], rootChaId, 0)
  return { tang: tang.filter((t) => t && t.length), cauTraLoi }
}

// Tạo danh sách câu hỏi (dùng cho admin PUT — client có thể là tx hoặc prisma).
// Chạy createMany theo từng tầng để thoả ràng buộc khoá ngoại cha–con.
export async function taoCauHois(client, khaoSatId, cauHois, cauHoiChaId = null, giuId = false) {
  const { tang, cauTraLoi } = lamPhang(cauHois, khaoSatId, giuId, cauHoiChaId)
  for (const cap of tang) await client.cauHoi.createMany({ data: cap })
  if (cauTraLoi.length) await client.cauTraLoi.createMany({ data: cauTraLoi })
}

// Tạo khảo sát từ payload dạng builder — trả về id khảo sát.
// Dùng transaction DẠNG MẢNG (batched) thay vì callback: nhanh, ít round-trip,
// không vướng giới hạn transaction tương tác của Prisma Postgres/serverless.
export async function taoKhaoSat(prisma, payload, { giuId = false } = {}) {
  const ksId = giuId && payload.id ? payload.id : randomUUID()
  const { tang, cauTraLoi } = lamPhang(payload.cauHois || [], ksId, giuId)

  const ops = [
    prisma.khaoSat.create({
      data: {
        id: ksId,
        tieuDe: payload.tieuDe,
        header: payload.header ?? null,
        footer: payload.footer ?? null,
        logo: payload.logo ?? null,
        ...(payload.background != null ? { background: payload.background } : {}),
        thoiGianBatDau: veNgay(payload.thoiGianBatDau),
        thoiGianKetThuc: veNgay(payload.thoiGianKetThuc),
        isActive: payload.isActive ?? true,
        isViewKQ: payload.isViewKQ ?? false,
        isNhapThongTin: payload.isNhapThongTin ?? false,
        isNhapThongTinRequired: payload.isNhapThongTinRequired ?? false,
        isTen: payload.isTen ?? false,
        isEmail: payload.isEmail ?? false,
        isDienThoai: payload.isDienThoai ?? false,
        isNamSinh: payload.isNamSinh ?? false,
        isDiaChi: payload.isDiaChi ?? false,
        isGioiTinh: payload.isGioiTinh ?? false,
      },
    }),
  ]
  for (const cap of tang) ops.push(prisma.cauHoi.createMany({ data: cap }))
  if (cauTraLoi.length) ops.push(prisma.cauTraLoi.createMany({ data: cauTraLoi }))

  await prisma.$transaction(ops)
  return ksId
}

// Chuẩn hoá đệ quy câu hỏi của JSON hệ thống tham chiếu — bỏ câu hỏi isActive === false
function chuanHoaCauHois(ds) {
  return (ds || [])
    .filter((c) => c.isActive !== false)
    .map((c) => ({
      id: c.id,
      noiDung: c.noiDung,
      maLoaiCauHoi: maLoai(c),
      isBatBuoc: c.isBatBuoc ?? false,
      isLyDoKhac: c.isLyDoKhac ?? false,
      thuTu: c.thuTu,
      soLuongTraLoiMin: c.soLuongTraLoiMin ?? null,
      soLuongTraLoiMax: c.soLuongTraLoiMax ?? null,
      maxLength: c.maxLength ?? null,
      cauTraLoi: (c.cauTraLoi || []).map((a) => ({ id: a.id, noiDung: a.noiDung, thuTu: a.thuTu })),
      cauHoiCon: chuanHoaCauHois(c.cauHoiCon),
    }))
}

// Nhận JSON format hệ thống tham chiếu ({data:{...}} hoặc {...}) → payload cho taoKhaoSat
export function chuanHoaThamChieu(json) {
  const d = json?.data ?? json ?? {}
  return {
    id: d.id,
    tieuDe: d.phieuKhaoSatTieuDe,
    header: d.phieuKhaoSatHeader,
    footer: d.phieuKhaoSatFooter,
    logo: d.phieuKhaoSatLogo,
    background: d.phieuKhaoSatBackground,
    thoiGianBatDau: d.thoiGianBatDau ? new Date(d.thoiGianBatDau) : null,
    thoiGianKetThuc: d.thoiGianKetThuc ? new Date(d.thoiGianKetThuc) : null,
    isActive: d.isActive ?? true,
    isViewKQ: d.isViewKQ ?? false,
    isNhapThongTin: d.isNhapThongTin ?? false,
    isNhapThongTinRequired: d.isNhapThongTinRequired ?? false,
    isTen: d.isTen ?? false,
    isEmail: d.isEmail ?? false,
    isDienThoai: d.isDienThoai ?? false,
    isNamSinh: d.isNamSinh ?? false,
    isDiaChi: d.isDiaChi ?? false,
    isGioiTinh: d.isGioiTinh ?? false,
    cauHois: chuanHoaCauHois(d.cauHois),
  }
}
