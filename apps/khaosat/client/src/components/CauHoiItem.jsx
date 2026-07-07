import { LOAI, TINH_THANH, dsNam } from '../constants.js'
import PhuongAnChon from './PhuongAnChon.jsx'
import BangMaTran from './BangMaTran.jsx'

// Ghi chú hiển thị dưới đề bài theo loại câu hỏi
function ghiChuLoai(cauHoi) {
  const ma = cauHoi.maLoaiCauHoi
  if (ma === LOAI.CHON_NHIEU) {
    const min = cauHoi.soLuongTraLoiMin || 0
    const max = cauHoi.soLuongTraLoiMax || 0
    if (min > 0 && max > 0) return `(Chọn tối thiểu ${min} / tối đa ${max} phương án)`
    if (min > 0) return `(Chọn tối thiểu ${min} phương án)`
    if (max > 0) return `(Chọn tối đa ${max} phương án)`
    return ''
  }
  if (ma === LOAI.MA_TRAN_MOT) return '(chọn một ô mỗi hàng)'
  if (ma === LOAI.MA_TRAN_NHIEU) return '(có thể chọn nhiều ô mỗi hàng)'
  return ''
}

// Render MỘT câu hỏi theo maLoaiCauHoi; đệ quy cho nhóm (loại 7)
// - traLoi: map cauHoiId → giá trị; capNhat(id, giaTri); loi: map cauHoiId → thông báo lỗi
// - so: số hiển thị ("1" hoặc "1.1" với câu con); laCauCon: render kiểu câu con trong nhóm
// - tienTo: tiền tố trước số ("Câu " cho phần khảo sát, "" cho phần thông tin chung)
export default function CauHoiItem({ cauHoi, so, laCauCon = false, tienTo = 'Câu ', traLoi, capNhat, loi }) {
  const ma = cauHoi.maLoaiCauHoi
  const giaTri = traLoi[cauHoi.id]
  const thongBaoLoi = loi[cauHoi.id]
  const ghiChu = ghiChuLoai(cauHoi)

  function renderThan() {
    switch (ma) {
      case LOAI.CHON_MOT:
      case LOAI.YES_NO:
        return (
          <PhuongAnChon
            cauHoi={cauHoi}
            kieu="radio"
            giaTri={giaTri}
            onChange={(v) => capNhat(cauHoi.id, v)}
          />
        )
      case LOAI.CHON_NHIEU:
        return (
          <PhuongAnChon
            cauHoi={cauHoi}
            kieu="checkbox"
            giaTri={giaTri}
            onChange={(v) => capNhat(cauHoi.id, v)}
          />
        )
      case LOAI.NHAP_TEXT: {
        const v = giaTri || ''
        const coMax = (cauHoi.maxLength || 0) > 0
        return (
          <>
            <textarea
              className="vung-nhap"
              value={v}
              maxLength={coMax ? cauHoi.maxLength : undefined}
              placeholder="Nhập ý kiến của Ông (bà)…"
              onChange={(e) => capNhat(cauHoi.id, e.target.value)}
            />
            {coMax && (
              <div className="ghi-chu">
                {v.length}/{cauHoi.maxLength} ký tự
              </div>
            )}
          </>
        )
      }
      case LOAI.NHAP_SO:
        return (
          <input
            type="number"
            className="o-nhap"
            value={giaTri || ''}
            placeholder="Nhập số"
            onChange={(e) => capNhat(cauHoi.id, e.target.value)}
          />
        )
      case LOAI.CHON_NAM:
        return (
          <select
            className="o-chon"
            value={giaTri || ''}
            onChange={(e) => capNhat(cauHoi.id, e.target.value)}
          >
            <option value="">-- Chọn năm --</option>
            {dsNam().map((nam) => (
              <option key={nam} value={nam}>
                {nam}
              </option>
            ))}
          </select>
        )
      case LOAI.CHON_THANH_PHO:
        return (
          <select
            className="o-chon"
            value={giaTri || ''}
            onChange={(e) => capNhat(cauHoi.id, e.target.value)}
          >
            <option value="">-- Chọn tỉnh/thành phố --</option>
            {TINH_THANH.map((tinh) => (
              <option key={tinh} value={tinh}>
                {tinh}
              </option>
            ))}
          </select>
        )
      case LOAI.CHON_NGAY:
        return (
          <input
            type="date"
            className="o-chon"
            value={giaTri || ''}
            onChange={(e) => capNhat(cauHoi.id, e.target.value)}
          />
        )
      case LOAI.NHOM:
        return (
          <div className="nhom-con">
            {(cauHoi.cauHoiCon || []).map((con, i) => (
              <CauHoiItem
                key={con.id}
                cauHoi={con}
                so={`${so}.${i + 1}`}
                laCauCon
                traLoi={traLoi}
                capNhat={capNhat}
                loi={loi}
              />
            ))}
          </div>
        )
      case LOAI.MA_TRAN_MOT:
      case LOAI.MA_TRAN_NHIEU:
        return (
          <BangMaTran
            cauHoi={cauHoi}
            laNhieu={ma === LOAI.MA_TRAN_NHIEU}
            traLoi={traLoi}
            capNhat={capNhat}
          />
        )
      default:
        return <div className="ghi-chu">Loại câu hỏi chưa được hỗ trợ</div>
    }
  }

  const noiDung = (
    <>
      <div className={laCauCon ? 'de-cau-con' : 'de-cau'}>
        <span className="so-cau">{laCauCon ? `${so}.` : `${tienTo}${so}.`}</span>
        {cauHoi.noiDung}
        {cauHoi.isBatBuoc && <span className="bat-buoc">*</span>}
        {ghiChu && <div className="ghi-chu">{ghiChu}</div>}
      </div>
      {renderThan()}
      {thongBaoLoi && <div className="loi-nhan">{thongBaoLoi}</div>}
    </>
  )

  return laCauCon ? <div className="cau-con">{noiDung}</div> : noiDung
}
