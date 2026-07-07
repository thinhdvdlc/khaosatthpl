import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { GIOI_TINH, LOAI, dinhDangThoiGian, dsNam, thongTinPhieu } from '../constants.js'
import CauHoiItem from '../components/CauHoiItem.jsx'
import Masthead from '../components/Masthead.jsx'

// Gom id của câu hỏi và toàn bộ câu con (đệ quy) — dùng tìm thẻ gốc chứa lỗi
function gomId(cauHoi) {
  const ds = [cauHoi.id]
  for (const con of cauHoi.cauHoiCon || []) ds.push(...gomId(con))
  return ds
}

// Trang điền phiếu khảo sát công khai
export default function KhaoSat() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [khaoSat, setKhaoSat] = useState(null)
  const [dangTai, setDangTai] = useState(true)
  const [loiTai, setLoiTai] = useState(null) // {status, message}

  // map cauHoiId → giá trị trả lời (hàng ma trận dùng id CÂU CON làm key)
  const [traLoi, setTraLoi] = useState({})
  const [nguoiKhaoSat, setNguoiKhaoSat] = useState({
    ten: '',
    email: '',
    dienThoai: '',
    namSinh: '',
    diaChi: '',
    gioiTinh: '',
  })
  const [loi, setLoi] = useState({}) // map cauHoiId → thông báo lỗi
  const [loiThongTin, setLoiThongTin] = useState('')
  const [loiChung, setLoiChung] = useState('')
  const [dangGui, setDangGui] = useState(false)

  useEffect(() => {
    let huy = false
    setDangTai(true)
    setLoiTai(null)
    setKhaoSat(null)
    api(`/api/v1/khaosats/${id}/public`)
      .then((body) => {
        if (!huy) setKhaoSat(body?.data || null)
      })
      .catch((e) => {
        if (!huy) setLoiTai({ status: e.status, message: e.message })
      })
      .finally(() => {
        if (!huy) setDangTai(false)
      })
    return () => {
      huy = true
    }
  }, [id])

  useEffect(() => {
    if (khaoSat?.tieuDe) document.title = khaoSat.tieuDe
  }, [khaoSat])

  // id hàng ma trận → id câu CHA (để gắn lỗi vào câu cha)
  const chaCuaHang = useMemo(() => {
    const map = {}
    function duyet(ds) {
      for (const ch of ds || []) {
        if (ch.maLoaiCauHoi === LOAI.MA_TRAN_MOT || ch.maLoaiCauHoi === LOAI.MA_TRAN_NHIEU) {
          for (const hang of ch.cauHoiCon || []) map[hang.id] = ch.id
        } else {
          duyet(ch.cauHoiCon)
        }
      }
    }
    duyet(khaoSat?.cauHois)
    return map
  }, [khaoSat])

  // Danh sách hiển thị: nhóm cấp cao → "mục" (A. THÔNG TIN CHUNG / B. PHẦN KHẢO SÁT);
  // câu con của mục khảo sát đánh "Câu 1..N", mục thông tin đánh "1., 2.".
  const dsHienThi = useMemo(() => {
    const ds = []
    for (const item of khaoSat?.cauHois || []) {
      if (item.maLoaiCauHoi === LOAI.NHOM) {
        const laKhaoSat = /KHẢO SÁT/i.test(item.noiDung || '')
        ds.push({ kind: 'muc', id: item.id, title: item.noiDung })
        ;(item.cauHoiCon || []).forEach((con, i) =>
          ds.push({ kind: 'cau', cauHoi: con, so: String(i + 1), tienTo: laKhaoSat ? 'Câu ' : '' })
        )
      } else {
        const soCau = ds.filter((m) => m.kind === 'cau' && m.tienTo === 'Câu ').length + 1
        ds.push({ kind: 'cau', cauHoi: item, so: String(soCau), tienTo: 'Câu ' })
      }
    }
    return ds
  }, [khaoSat])

  function capNhat(idCau, giaTri) {
    setTraLoi((t) => ({ ...t, [idCau]: giaTri }))
    // xoá lỗi của câu (và câu cha ma trận nếu có) khi người dùng sửa
    setLoi((l) => {
      const idCha = chaCuaHang[idCau]
      if (!l[idCau] && !(idCha && l[idCha])) return l
      const moi = { ...l }
      delete moi[idCau]
      if (idCha) delete moi[idCha]
      return moi
    })
  }

  function capNhatThongTin(truong, giaTri) {
    setNguoiKhaoSat((tt) => ({ ...tt, [truong]: giaTri }))
    if (loiThongTin) setLoiThongTin('')
  }

  // ----- Kiểm tra dữ liệu trước khi gửi (mirror server) -----
  function kiemTraCauHoi(cauHoi, loiMoi) {
    const ma = cauHoi.maLoaiCauHoi
    const gt = traLoi[cauHoi.id]

    if (ma === LOAI.NHOM) {
      // nhóm: kiểm tra từng câu con theo isBatBuoc của chính nó
      for (const con of cauHoi.cauHoiCon || []) kiemTraCauHoi(con, loiMoi)
      return
    }

    if (ma === LOAI.MA_TRAN_MOT || ma === LOAI.MA_TRAN_NHIEU) {
      // ma trận: khi CHA bắt buộc, mọi hàng phải có trả lời; lỗi gắn vào câu CHA
      if (!cauHoi.isBatBuoc) return
      const hangThieu = []
      ;(cauHoi.cauHoiCon || []).forEach((hang, i) => {
        const gh = traLoi[hang.id]
        const coTraLoi =
          ma === LOAI.MA_TRAN_NHIEU ? Array.isArray(gh) && gh.length > 0 : !!gh?.cauTraLoiId
        if (!coTraLoi) hangThieu.push(i + 1)
      })
      if (hangThieu.length) {
        loiMoi[cauHoi.id] = `Vui lòng trả lời đầy đủ các hàng trong bảng (thiếu hàng: ${hangThieu.join(', ')})`
      }
      return
    }

    if (ma === LOAI.CHON_MOT || ma === LOAI.YES_NO) {
      if (cauHoi.isBatBuoc && !gt) {
        loiMoi[cauHoi.id] = 'Câu hỏi bắt buộc, vui lòng chọn một phương án'
        return
      }
      if (gt?.isKhac && !(gt.noiDung || '').trim()) {
        loiMoi[cauHoi.id] = 'Vui lòng nhập nội dung cho phương án "Ý kiến khác"'
      }
      return
    }

    if (ma === LOAI.CHON_NHIEU) {
      const ds = Array.isArray(gt) ? gt : []
      const min = cauHoi.soLuongTraLoiMin || 0
      const max = cauHoi.soLuongTraLoiMax || 0
      if (cauHoi.isBatBuoc && ds.length === 0) {
        loiMoi[cauHoi.id] = 'Câu hỏi bắt buộc, vui lòng chọn ít nhất một phương án'
        return
      }
      if (ds.length > 0 && min > 0 && ds.length < min) {
        loiMoi[cauHoi.id] = `Vui lòng chọn tối thiểu ${min} phương án`
        return
      }
      if (max > 0 && ds.length > max) {
        loiMoi[cauHoi.id] = `Chỉ được chọn tối đa ${max} phương án`
        return
      }
      const khac = ds.find((x) => x.isKhac)
      if (khac && !(khac.noiDung || '').trim()) {
        loiMoi[cauHoi.id] = 'Vui lòng nhập nội dung cho phương án "Ý kiến khác"'
      }
      return
    }

    if (ma === LOAI.NHAP_SO) {
      const v = (gt ?? '').toString().trim()
      if (cauHoi.isBatBuoc && !v) {
        loiMoi[cauHoi.id] = 'Câu hỏi bắt buộc, vui lòng nhập giá trị'
      } else if (v && isNaN(Number(v))) {
        loiMoi[cauHoi.id] = 'Giá trị nhập vào phải là số'
      }
      return
    }

    // 4 / 10 / 11 / 12: giá trị chuỗi
    const v = (gt ?? '').toString().trim()
    if (cauHoi.isBatBuoc && !v) {
      loiMoi[cauHoi.id] = 'Câu hỏi bắt buộc, vui lòng trả lời'
    }
  }

  function cuonToiLoiDau(loiMoi, coLoiThongTin) {
    if (coLoiThongTin) {
      document
        .getElementById('thong-tin-nguoi-tra-loi')
        ?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    for (const card of dsHienThi.filter((m) => m.kind === 'cau')) {
      if (gomId(card.cauHoi).some((x) => loiMoi[x])) {
        document.getElementById('cau-' + card.cauHoi.id)?.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
  }

  // ----- Dựng chiTietKetQuas từ state trả lời -----
  function themChiTiet(cauHoi, ds) {
    const ma = cauHoi.maLoaiCauHoi
    const gt = traLoi[cauHoi.id]

    if (ma === LOAI.NHOM) {
      for (const con of cauHoi.cauHoiCon || []) themChiTiet(con, ds)
      return
    }
    if (ma === LOAI.MA_TRAN_MOT) {
      for (const hang of cauHoi.cauHoiCon || []) {
        const gh = traLoi[hang.id]
        if (gh?.cauTraLoiId) ds.push({ cauHoiId: hang.id, cauTraLoiId: gh.cauTraLoiId })
      }
      return
    }
    if (ma === LOAI.MA_TRAN_NHIEU) {
      for (const hang of cauHoi.cauHoiCon || []) {
        const gh = Array.isArray(traLoi[hang.id]) ? traLoi[hang.id] : []
        for (const x of gh) {
          if (x.cauTraLoiId) ds.push({ cauHoiId: hang.id, cauTraLoiId: x.cauTraLoiId })
        }
      }
      return
    }
    if (ma === LOAI.CHON_MOT || ma === LOAI.YES_NO) {
      if (gt?.isKhac) {
        ds.push({ cauHoiId: cauHoi.id, isKhac: true, noiDung: (gt.noiDung || '').trim() })
      } else if (gt?.cauTraLoiId) {
        ds.push({ cauHoiId: cauHoi.id, cauTraLoiId: gt.cauTraLoiId })
      }
      return
    }
    if (ma === LOAI.CHON_NHIEU) {
      for (const x of Array.isArray(gt) ? gt : []) {
        if (x.isKhac) {
          ds.push({ cauHoiId: cauHoi.id, isKhac: true, noiDung: (x.noiDung || '').trim() })
        } else if (x.cauTraLoiId) {
          ds.push({ cauHoiId: cauHoi.id, cauTraLoiId: x.cauTraLoiId })
        }
      }
      return
    }
    // 4 / 8 / 10 / 11 / 12
    const v = (gt ?? '').toString().trim()
    if (v) ds.push({ cauHoiId: cauHoi.id, noiDung: v })
  }

  async function guiPhieu() {
    const chiTietKetQuas = []
    for (const cauHoi of khaoSat.cauHois || []) themChiTiet(cauHoi, chiTietKetQuas)

    const payload = { khaoSatId: khaoSat.id, chiTietKetQuas }
    if (khaoSat.isNhapThongTin) {
      const tt = {}
      if (khaoSat.isTen && nguoiKhaoSat.ten.trim()) tt.ten = nguoiKhaoSat.ten.trim()
      if (khaoSat.isEmail && nguoiKhaoSat.email.trim()) tt.email = nguoiKhaoSat.email.trim()
      if (khaoSat.isDienThoai && nguoiKhaoSat.dienThoai.trim())
        tt.dienThoai = nguoiKhaoSat.dienThoai.trim()
      if (khaoSat.isNamSinh && nguoiKhaoSat.namSinh) tt.namSinh = Number(nguoiKhaoSat.namSinh)
      if (khaoSat.isDiaChi && nguoiKhaoSat.diaChi.trim()) tt.diaChi = nguoiKhaoSat.diaChi.trim()
      if (khaoSat.isGioiTinh && nguoiKhaoSat.gioiTinh) tt.gioiTinh = nguoiKhaoSat.gioiTinh
      if (Object.keys(tt).length) payload.nguoiKhaoSat = tt
    }

    setDangGui(true)
    setLoiChung('')
    try {
      await api('/api/v1/ketquakhaosats/public', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      navigate(`/khao-sat/${id}/hoan-thanh`, {
        state: { isViewKQ: !!khaoSat.isViewKQ, background: khaoSat.background || '' },
      })
    } catch (e) {
      if (e.status === 400 && Array.isArray(e.errors) && e.errors.length) {
        // map lỗi server về từng câu hỏi (hàng ma trận → câu cha)
        const loiMoi = {}
        for (const l of e.errors) {
          const idCau = chaCuaHang[l.cauHoiId] || l.cauHoiId
          loiMoi[idCau] = l.message || 'Câu trả lời chưa hợp lệ'
        }
        setLoi(loiMoi)
        setLoiChung(e.message || 'Phiếu trả lời chưa hợp lệ, vui lòng kiểm tra lại.')
        cuonToiLoiDau(loiMoi, false)
      } else {
        setLoiChung(e.message || 'Không gửi được phiếu khảo sát, vui lòng thử lại.')
      }
    } finally {
      setDangGui(false)
    }
  }

  function xuLyGui() {
    if (!khaoSat || dangGui) return

    const loiMoi = {}
    for (const cauHoi of khaoSat.cauHois || []) kiemTraCauHoi(cauHoi, loiMoi)

    let loiTT = ''
    if (khaoSat.isNhapThongTin && khaoSat.isNhapThongTinRequired) {
      const thieu = []
      if (khaoSat.isTen && !nguoiKhaoSat.ten.trim()) thieu.push('Họ và tên')
      if (khaoSat.isEmail && !nguoiKhaoSat.email.trim()) thieu.push('Email')
      if (khaoSat.isDienThoai && !nguoiKhaoSat.dienThoai.trim()) thieu.push('Số điện thoại')
      if (khaoSat.isNamSinh && !nguoiKhaoSat.namSinh) thieu.push('Năm sinh')
      if (khaoSat.isDiaChi && !nguoiKhaoSat.diaChi.trim()) thieu.push('Địa chỉ')
      if (khaoSat.isGioiTinh && !nguoiKhaoSat.gioiTinh) thieu.push('Giới tính')
      if (thieu.length) loiTT = 'Vui lòng nhập đầy đủ: ' + thieu.join(', ')
    }

    setLoi(loiMoi)
    setLoiThongTin(loiTT)
    if (loiTT || Object.keys(loiMoi).length) {
      setLoiChung('Vui lòng kiểm tra lại các câu được đánh dấu đỏ ở trên.')
      cuonToiLoiDau(loiMoi, !!loiTT)
      return
    }
    setLoiChung('')
    guiPhieu()
  }

  // ----- Render -----
  if (dangTai) {
    return (
      <div className="trang">
        <div className="khung">
          <div className="the tai-giua mo-nhat">Đang tải khảo sát…</div>
        </div>
      </div>
    )
  }

  if (loiTai || !khaoSat) {
    return (
      <div className="trang">
        <div className="khung">
          {loiTai?.status === 404 ? (
            <div className="the tai-giua">
              <div className="de-cau">Không tìm thấy khảo sát</div>
              <p className="mo-nhat">Đường dẫn có thể không đúng hoặc khảo sát đã bị xoá.</p>
              <div className="hang-nut">
                <Link className="nut" to="/">
                  Về trang chủ
                </Link>
              </div>
            </div>
          ) : (
            <div className="hop-thong-bao loi">
              {loiTai?.message || 'Không tải được khảo sát, vui lòng thử lại.'}
            </div>
          )}
        </div>
      </div>
    )
  }

  const dangMo = khaoSat.trangThai === 'dang-mo'
  const batBuocTT = khaoSat.isNhapThongTinRequired && <span className="bat-buoc">*</span>

  return (
    <div className="trang" style={{ backgroundColor: khaoSat.background || '#eeecec' }}>
      <div className="khung">
        {/* Thẻ đầu: masthead cơ quan, tiêu đề, header, thời gian */}
        <div className="the the-dau">
          <Masthead
            phu={(() => {
              const { so, doiTuong } = thongTinPhieu(khaoSat.tieuDe)
              if (!so && !doiTuong) return null
              return (
                <>
                  {so != null && <div className="mh-phieu-so">PHIẾU SỐ {String(so).padStart(2, '0')}</div>}
                  {doiTuong && <div className="mh-doi-tuong">{doiTuong}</div>}
                </>
              )
            })()}
          />
          {khaoSat.logo && <img className="logo-khao-sat" src={khaoSat.logo} alt="Logo" />}
          <h1 className="tieu-de-khao-sat">{khaoSat.tieuDe}</h1>
          {khaoSat.header && (
            <div
              className="header-khao-sat"
              dangerouslySetInnerHTML={{ __html: khaoSat.header }}
            />
          )}
          {(khaoSat.thoiGianBatDau || khaoSat.thoiGianKetThuc) && (
            <div className="thoi-gian-khao-sat">
              Thời gian: {dinhDangThoiGian(khaoSat.thoiGianBatDau)} —{' '}
              {dinhDangThoiGian(khaoSat.thoiGianKetThuc)}
            </div>
          )}
        </div>

        {/* Khảo sát chưa mở / đã đóng / bị khoá — không render form */}
        {!dangMo && khaoSat.trangThai === 'chua-mo' && (
          <div className="hop-thong-bao nhac">
            Khảo sát chưa mở. Thời gian bắt đầu: {dinhDangThoiGian(khaoSat.thoiGianBatDau)}.
          </div>
        )}
        {!dangMo && khaoSat.trangThai === 'da-dong' && (
          <div className="hop-thong-bao nhac">
            Cuộc khảo sát đã kết thúc. Trân trọng cảm ơn Ông (bà) đã quan tâm!
            {khaoSat.isViewKQ && (
              <div className="hang-nut cach-tren">
                <Link className="nut" to={`/khao-sat/${id}/ket-qua`}>
                  Xem kết quả khảo sát
                </Link>
              </div>
            )}
          </div>
        )}
        {!dangMo && khaoSat.trangThai === 'khoa' && (
          <div className="hop-thong-bao loi">Khảo sát hiện không khả dụng.</div>
        )}

        {dangMo && (
          <>
            {/* Thông tin người trả lời */}
            {khaoSat.isNhapThongTin && (
              <div
                id="thong-tin-nguoi-tra-loi"
                className={'the cau-hoi' + (loiThongTin ? ' loi-cau' : '')}
              >
                <div className="de-cau tai-giua">THÔNG TIN NGƯỜI TRẢ LỜI</div>
                <div className="luoi-form">
                  {khaoSat.isTen && (
                    <div>
                      <label className="nhan-form" htmlFor="nks-ten">
                        Họ và tên{batBuocTT}
                      </label>
                      <input
                        id="nks-ten"
                        className="o-nhap"
                        value={nguoiKhaoSat.ten}
                        onChange={(e) => capNhatThongTin('ten', e.target.value)}
                      />
                    </div>
                  )}
                  {khaoSat.isEmail && (
                    <div>
                      <label className="nhan-form" htmlFor="nks-email">
                        Email{batBuocTT}
                      </label>
                      <input
                        id="nks-email"
                        type="email"
                        className="o-nhap"
                        value={nguoiKhaoSat.email}
                        onChange={(e) => capNhatThongTin('email', e.target.value)}
                      />
                    </div>
                  )}
                  {khaoSat.isDienThoai && (
                    <div>
                      <label className="nhan-form" htmlFor="nks-dien-thoai">
                        Số điện thoại{batBuocTT}
                      </label>
                      <input
                        id="nks-dien-thoai"
                        type="tel"
                        className="o-nhap"
                        value={nguoiKhaoSat.dienThoai}
                        onChange={(e) => capNhatThongTin('dienThoai', e.target.value)}
                      />
                    </div>
                  )}
                  {khaoSat.isNamSinh && (
                    <div>
                      <label className="nhan-form" htmlFor="nks-nam-sinh">
                        Năm sinh{batBuocTT}
                      </label>
                      <select
                        id="nks-nam-sinh"
                        className="o-chon"
                        value={nguoiKhaoSat.namSinh}
                        onChange={(e) => capNhatThongTin('namSinh', e.target.value)}
                      >
                        <option value="">-- Chọn năm --</option>
                        {dsNam().map((nam) => (
                          <option key={nam} value={nam}>
                            {nam}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {khaoSat.isGioiTinh && (
                    <div>
                      <label className="nhan-form" htmlFor="nks-gioi-tinh">
                        Giới tính{batBuocTT}
                      </label>
                      <select
                        id="nks-gioi-tinh"
                        className="o-chon"
                        value={nguoiKhaoSat.gioiTinh}
                        onChange={(e) => capNhatThongTin('gioiTinh', e.target.value)}
                      >
                        <option value="">-- Chọn giới tính --</option>
                        {GIOI_TINH.map((gt) => (
                          <option key={gt} value={gt}>
                            {gt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {khaoSat.isDiaChi && (
                    <div className="rong">
                      <label className="nhan-form" htmlFor="nks-dia-chi">
                        Địa chỉ{batBuocTT}
                      </label>
                      <input
                        id="nks-dia-chi"
                        className="o-nhap"
                        value={nguoiKhaoSat.diaChi}
                        onChange={(e) => capNhatThongTin('diaChi', e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {loiThongTin && <div className="loi-nhan">{loiThongTin}</div>}
              </div>
            )}

            {/* Các mục (A. THÔNG TIN CHUNG / B. PHẦN KHẢO SÁT) + câu hỏi */}
            {dsHienThi.map((m) => {
              if (m.kind === 'muc') {
                return (
                  <div key={'muc-' + m.id} className="muc-phieu">
                    {m.title}
                  </div>
                )
              }
              const coLoi = gomId(m.cauHoi).some((x) => loi[x])
              return (
                <div
                  key={m.cauHoi.id}
                  id={'cau-' + m.cauHoi.id}
                  className={'the cau-hoi' + (coLoi ? ' loi-cau' : '')}
                >
                  <CauHoiItem
                    cauHoi={m.cauHoi}
                    so={m.so}
                    tienTo={m.tienTo}
                    traLoi={traLoi}
                    capNhat={capNhat}
                    loi={loi}
                  />
                </div>
              )
            })}

            {loiChung && <div className="hop-thong-bao loi">{loiChung}</div>}

            <div className="hang-nut">
              <button
                type="button"
                className="nut nut-chinh"
                disabled={dangGui}
                onClick={xuLyGui}
              >
                {dangGui ? 'Đang gửi…' : 'Gửi phiếu khảo sát'}
              </button>
            </div>
          </>
        )}

        {/* Footer khảo sát */}
        {khaoSat.footer && (
          <div
            className="the footer-khao-sat cach-tren"
            dangerouslySetInnerHTML={{ __html: khaoSat.footer }}
          />
        )}
      </div>
    </div>
  )
}
