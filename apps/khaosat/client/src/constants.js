// Mã loại câu hỏi — khớp server/lib/loaiCauHoi.js
export const LOAI = {
  CHON_NHIEU: 2,
  CHON_MOT: 3,
  NHAP_TEXT: 4,
  MA_TRAN_NHIEU: 5,
  MA_TRAN_MOT: 6,
  NHOM: 7,
  NHAP_SO: 8,
  YES_NO: 9,
  CHON_NAM: 10,
  CHON_THANH_PHO: 11,
  CHON_NGAY: 12,
}

export const TEN_LOAI = {
  [LOAI.CHON_NHIEU]: 'Chọn nhiều phương án',
  [LOAI.CHON_MOT]: 'Chọn một phương án',
  [LOAI.NHAP_TEXT]: 'Nhập ý kiến (văn bản)',
  [LOAI.MA_TRAN_NHIEU]: 'Ma trận — chọn nhiều',
  [LOAI.MA_TRAN_MOT]: 'Ma trận — chọn một',
  [LOAI.NHOM]: 'Nhóm câu hỏi',
  [LOAI.NHAP_SO]: 'Nhập số',
  [LOAI.YES_NO]: 'Có / Không',
  [LOAI.CHON_NAM]: 'Chọn năm',
  [LOAI.CHON_THANH_PHO]: 'Chọn tỉnh/thành phố',
  [LOAI.CHON_NGAY]: 'Chọn ngày',
}

// 34 tỉnh/thành phố (sau sắp xếp đơn vị hành chính 2025)
export const TINH_THANH = [
  'Thành phố Hà Nội',
  'Thành phố Hải Phòng',
  'Thành phố Huế',
  'Thành phố Đà Nẵng',
  'Thành phố Hồ Chí Minh',
  'Thành phố Cần Thơ',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Điện Biên',
  'Đắk Lắk',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
]

export const GIOI_TINH = ['Nam', 'Nữ', 'Khác']

export function dsNam(tu = 1930, den = new Date().getFullYear()) {
  const ds = []
  for (let n = den; n >= tu; n--) ds.push(n)
  return ds
}

export function dinhDangThoiGian(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (x) => String(x).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())} ngày ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ===== Thương hiệu cơ quan chủ quản (theo phiếu khảo sát Sở Tư pháp Đắk Lắk) =====
export const CO_QUAN = {
  ten: 'SỞ TƯ PHÁP TỈNH ĐẮK LẮK',
  diaChi: 'Địa chỉ: 04 Trường Chinh, phường Buôn Ma Thuột, tỉnh Đắk Lắk',
}

// ===== Nội dung cuộc khảo sát (trang chủ) — theo mẫu "Linh khảo sát" =====
export const CHIEN_DICH = {
  tieuDe:
    'KHẢO SÁT TÌNH HÌNH THI HÀNH VĂN BẢN QUY PHẠM PHÁP LUẬT LĨNH VỰC AN TOÀN THỰC PHẨM TRÊN ĐỊA BÀN TỈNH',
  gioiThieu:
    'Nhằm thu thập thông tin, ý kiến phản ánh phục vụ việc đánh giá tình hình thi hành văn bản quy phạm pháp luật trong lĩnh vực an toàn thực phẩm trên địa bàn tỉnh, trọng tâm là công tác quản lý thực phẩm chức năng, kiểm nghiệm thực phẩm và quản lý các cơ sở không thuộc diện cấp Giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm, đề nghị ông/bà căn cứ vào đối tượng tham gia khảo sát để lựa chọn và trả lời một trong các phiếu sau:',
  baoMat:
    'Đề nghị ông/bà vui lòng trả lời các câu hỏi bằng cách chọn phương án phù hợp. Mọi thông tin do ông/bà cung cấp chỉ được sử dụng cho mục đích tổng hợp, đánh giá thực trạng thi hành pháp luật và hoàn thiện chính sách, pháp luật về an toàn thực phẩm; đồng thời được bảo đảm tính bảo mật theo quy định.',
}

// Suy ra "phiếu số" + đối tượng từ tiêu đề khảo sát để hiển thị nhãn.
export function thongTinPhieu(tieuDe = '') {
  const m = tieuDe.match(/số\s*0?(\d+)/i)
  const so = m ? Number(m[1]) : null
  let doiTuong = ''
  if (/cán bộ|công chức|viên chức/i.test(tieuDe))
    doiTuong =
      'Dành cho cán bộ, công chức, viên chức làm nhiệm vụ quản lý nhà nước về an toàn thực phẩm trên địa bàn tỉnh'
  else if (/người (dân|tiêu dùng)|hộ (gia đình|kinh doanh)|nhỏ lẻ/i.test(tieuDe))
    doiTuong = 'Dành cho người tiêu dùng, hộ gia đình, cơ sở sản xuất, kinh doanh thực phẩm nhỏ lẻ'
  return { so, doiTuong }
}
