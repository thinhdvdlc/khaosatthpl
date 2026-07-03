// Seed các khảo sát mẫu:
//  - khao-sat-nq57.json     : định dạng hệ thống tham chiếu (chuanHoaThamChieu)
//  - attp-cbcc.json         : định dạng builder (nạp thẳng) — Phiếu ATTP số 01 (CBCC)
//  - attp-nguoi-dan.json    : định dạng builder (nạp thẳng) — Phiếu ATTP số 02 (Người dân)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { taoKhaoSat, chuanHoaThamChieu } from '../server/lib/nhapKhaoSat.js'

const prisma = new PrismaClient()
const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data')

function doc(ten) {
  return JSON.parse(fs.readFileSync(path.join(DATA, ten), 'utf8'))
}

// Nạp 1 khảo sát nếu chưa tồn tại (idempotent theo id). Trả về true nếu vừa tạo.
async function seedMot(payload, nhan) {
  if (payload.id) {
    const daCo = await prisma.khaoSat.findUnique({ where: { id: payload.id } })
    if (daCo) {
      console.log(`• ${nhan}: đã có, bỏ qua`)
      return false
    }
  }
  const id = await taoKhaoSat(prisma, payload, { giuId: true })
  console.log(`• ${nhan}: đã tạo /khao-sat/${id}`)
  return true
}

async function main() {
  // 1) Khảo sát tham chiếu NQ57
  const nq57 = chuanHoaThamChieu(doc('khao-sat-nq57.json'))
  nq57.isActive = true
  nq57.isViewKQ = true
  nq57.thoiGianKetThuc = new Date('2030-12-31T23:59:59')
  await seedMot(nq57, 'NQ57 (tham chiếu)')

  // 2) + 3) Hai phiếu An toàn thực phẩm (builder-format, đã có sẵn thời gian mở)
  for (const [ten, nhan] of [
    ['attp-cbcc.json', 'ATTP 01 — CBCC'],
    ['attp-nguoi-dan.json', 'ATTP 02 — Người dân'],
  ]) {
    const p = doc(ten)
    p.thoiGianKetThuc = p.thoiGianKetThuc || new Date('2030-12-31T23:59:59')
    await seedMot(p, nhan)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
