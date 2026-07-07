import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, adminHeaders } from '../api.js'
import { dinhDangThoiGian } from '../constants.js'
import FormKhaoSat, { modelMoi, taoModelTuPublic } from '../components/quantri/FormKhaoSat.jsx'
import PanelPhieu from '../components/quantri/PanelPhieu.jsx'
import '../quantri.css'

// ---------- màn đăng nhập ----------
function ManDangNhap({ onThanhCong, nhac }) {
  const [khoa, setKhoa] = useState('')
  const [loi, setLoi] = useState('')
  const [dangGui, setDangGui] = useState(false)

  async function gui(e) {
    e.preventDefault()
    if (!khoa.trim()) {
      setLoi('Vui lòng nhập khóa quản trị.')
      return
    }
    setDangGui(true)
    setLoi('')
    try {
      await api('/api/v1/admin/login', { method: 'POST', body: JSON.stringify({ key: khoa }) })
      sessionStorage.setItem('adminKey', khoa)
      onThanhCong()
    } catch (e2) {
      setLoi(e2.status === 401 ? 'Khóa quản trị không đúng.' : e2.message || 'Không đăng nhập được.')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <div className="trang">
      <div className="khung">
        <div className="the the-hep">
          <h2 className="tai-giua">QUẢN TRỊ KHẢO SÁT</h2>
          {nhac && <div className="hop-thong-bao nhac">{nhac}</div>}
          {loi && <div className="hop-thong-bao loi">{loi}</div>}
          <form onSubmit={gui}>
            <label className="nhan-form" htmlFor="khoa-quan-tri">
              Khóa quản trị
            </label>
            <input
              id="khoa-quan-tri"
              type="password"
              className="o-nhap"
              value={khoa}
              onChange={(e) => setKhoa(e.target.value)}
              placeholder="Nhập khóa quản trị"
              autoFocus
            />
            <div className="hang-nut cach-tren">
              <button type="submit" className="nut nut-chinh" disabled={dangGui}>
                {dangGui ? 'Đang kiểm tra…' : 'Đăng nhập'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ---------- panel nhập khảo sát từ JSON ----------
function PanelNhapJSON({ goiAdmin, onXong, onDong }) {
  const [vanBan, setVanBan] = useState('')
  const [loi, setLoi] = useState('')
  const [dangGui, setDangGui] = useState(false)

  function chonTep(e) {
    const tep = e.target.files && e.target.files[0]
    if (!tep) return
    const doc = new FileReader()
    doc.onload = () => setVanBan(String(doc.result || ''))
    doc.onerror = () => setLoi('Không đọc được tệp đã chọn.')
    doc.readAsText(tep)
  }

  async function gui() {
    let duLieu
    try {
      duLieu = JSON.parse(vanBan)
    } catch {
      setLoi('Nội dung không phải JSON hợp lệ.')
      return
    }
    setDangGui(true)
    setLoi('')
    try {
      await goiAdmin('/api/v1/admin/khaosats/import', {
        method: 'POST',
        body: JSON.stringify(duLieu),
      })
      onXong()
    } catch (e) {
      if (e.status !== 401) setLoi(e.message || 'Nhập khảo sát thất bại.')
    } finally {
      setDangGui(false)
    }
  }

  return (
    <div className="the">
      <div className="dau-khoi">
        <strong>Nhập khảo sát từ JSON</strong>
        <span className="day-phai">
          <button type="button" className="nut nut-nho" onClick={onDong}>
            Đóng
          </button>
        </span>
      </div>
      {loi && <div className="hop-thong-bao loi">{loi}</div>}
      <label className="nhan-form">Dán nội dung JSON (bản export từ hệ thống tham chiếu)</label>
      <textarea
        className="vung-nhap"
        value={vanBan}
        onChange={(e) => setVanBan(e.target.value)}
        placeholder='{"data":{…}}'
      />
      <div className="cach-tren-nho">
        <label className="nhan-form">Hoặc chọn tệp .json</label>
        <input type="file" accept=".json,application/json" onChange={chonTep} />
      </div>
      <div className="hang-thao-tac cach-tren">
        <button type="button" className="nut nut-chinh nut-nho" onClick={gui} disabled={dangGui || !vanBan.trim()}>
          {dangGui ? 'Đang nhập…' : 'Nhập khảo sát'}
        </button>
      </div>
    </div>
  )
}

// ---------- trang quản trị ----------
export default function QuanTri() {
  const [daDangNhap, setDaDangNhap] = useState(() => !!sessionStorage.getItem('adminKey'))
  const [nhacDangNhap, setNhacDangNhap] = useState('')
  const [thongBao, setThongBao] = useState(null) // {loai:'ok'|'loi'|'nhac', noiDung}
  const [dsKhaoSat, setDsKhaoSat] = useState([])
  const [dangTai, setDangTai] = useState(false)
  const [manHinh, setManHinh] = useState('danhsach') // 'danhsach' | 'form'
  const [formBanDau, setFormBanDau] = useState(null)
  const [suaId, setSuaId] = useState(null)
  const [suaSoPhieu, setSuaSoPhieu] = useState(0)
  const [hienNhap, setHienNhap] = useState(false)
  const [phieuCua, setPhieuCua] = useState(null) // {id, tieuDe}
  const [daChepId, setDaChepId] = useState(null)

  function dangXuat(nhac) {
    sessionStorage.removeItem('adminKey')
    setDaDangNhap(false)
    setNhacDangNhap(nhac || '')
    setManHinh('danhsach')
    setHienNhap(false)
    setPhieuCua(null)
    setThongBao(null)
  }

  // Mọi request admin: kèm x-admin-key; lỗi 401 → xóa key, quay về đăng nhập.
  // Lưu ý: api() thay cả object headers khi được truyền, nên phải kèm lại Content-Type.
  async function goiAdmin(path, options = {}) {
    try {
      return await api(path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...adminHeaders(), ...(options.headers || {}) },
      })
    } catch (e) {
      if (e.status === 401) dangXuat('Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.')
      throw e
    }
  }

  async function taiDanhSach() {
    setDangTai(true)
    try {
      const body = await goiAdmin('/api/v1/admin/khaosats')
      setDsKhaoSat(body.data || [])
    } catch (e) {
      if (e.status !== 401) setThongBao({ loai: 'loi', noiDung: e.message || 'Không tải được danh sách khảo sát.' })
    } finally {
      setDangTai(false)
    }
  }

  useEffect(() => {
    if (daDangNhap) taiDanhSach()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daDangNhap])

  // ----- thao tác trên từng khảo sát -----
  async function chepLink(id) {
    try {
      await navigator.clipboard.writeText(`${location.origin}/khao-sat/${id}`)
      setDaChepId(id)
      setTimeout(() => setDaChepId((cu) => (cu === id ? null : cu)), 2000)
    } catch {
      setThongBao({ loai: 'loi', noiDung: 'Không sao chép được liên kết vào bộ nhớ tạm.' })
    }
  }

  async function taiCSV(ks) {
    try {
      const res = await fetch(`/api/v1/admin/khaosats/${ks.id}/export.csv`, { headers: adminHeaders() })
      if (res.status === 401) {
        dangXuat('Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại.')
        return
      }
      if (!res.ok) throw new Error(`Lỗi ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `khao-sat-${ks.id}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setThongBao({ loai: 'loi', noiDung: 'Không tải được tệp CSV: ' + (e.message || 'lỗi không rõ.') })
    }
  }

  async function doiCo(ks, truong) {
    try {
      await goiAdmin(`/api/v1/admin/khaosats/${ks.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [truong]: !ks[truong] }),
      })
      taiDanhSach()
    } catch (e) {
      if (e.status !== 401) setThongBao({ loai: 'loi', noiDung: e.message || 'Cập nhật thất bại.' })
    }
  }

  // ----- form tạo/sửa -----
  function moTaoMoi() {
    setFormBanDau(modelMoi())
    setSuaId(null)
    setSuaSoPhieu(0)
    setManHinh('form')
    setThongBao(null)
    setHienNhap(false)
    setPhieuCua(null)
  }

  async function moSua(ks) {
    try {
      const body = await api(`/api/v1/khaosats/${ks.id}/public`)
      setFormBanDau(taoModelTuPublic(body.data))
      setSuaId(ks.id)
      setSuaSoPhieu(ks.soPhieu || 0)
      setManHinh('form')
      setThongBao(null)
      setHienNhap(false)
      setPhieuCua(null)
    } catch (e) {
      setThongBao({ loai: 'loi', noiDung: 'Không tải được dữ liệu khảo sát: ' + (e.message || 'lỗi không rõ.') })
    }
  }

  async function guiForm(payload) {
    if (suaId) {
      await goiAdmin(`/api/v1/admin/khaosats/${suaId}`, { method: 'PUT', body: JSON.stringify(payload) })
      return 'Đã cập nhật khảo sát.'
    }
    await goiAdmin('/api/v1/admin/khaosats', { method: 'POST', body: JSON.stringify(payload) })
    return 'Đã tạo khảo sát mới.'
  }

  function xongForm(thongDiep) {
    setManHinh('danhsach')
    setThongBao({ loai: 'ok', noiDung: thongDiep })
    taiDanhSach()
  }

  // ----- render -----
  if (!daDangNhap) {
    return (
      <ManDangNhap
        nhac={nhacDangNhap}
        onThanhCong={() => {
          setNhacDangNhap('')
          setDaDangNhap(true)
        }}
      />
    )
  }

  return (
    <div className="trang">
      <div className="thanh-dau">
        <div className="khung-rong">
          <h1>QUẢN TRỊ KHẢO SÁT</h1>
          <button type="button" className="nut nut-nho" onClick={() => dangXuat('')}>
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="khung-rong">
        {thongBao && <div className={`hop-thong-bao ${thongBao.loai}`}>{thongBao.noiDung}</div>}

        {manHinh === 'form' && (
          <FormKhaoSat
            key={suaId || 'tao-moi'}
            banDau={formBanDau}
            dangSua={!!suaId}
            soPhieu={suaSoPhieu}
            onGui={guiForm}
            onXong={xongForm}
            onHuy={() => setManHinh('danhsach')}
          />
        )}

        {manHinh === 'danhsach' && (
          <>
            <div className="thanh-cong-cu">
              <button type="button" className="nut nut-chinh" onClick={moTaoMoi}>
                + Tạo khảo sát mới
              </button>
              <button type="button" className="nut" onClick={() => setHienNhap((h) => !h)}>
                Nhập từ JSON
              </button>
            </div>

            {hienNhap && (
              <PanelNhapJSON
                goiAdmin={goiAdmin}
                onDong={() => setHienNhap(false)}
                onXong={() => {
                  setHienNhap(false)
                  setThongBao({ loai: 'ok', noiDung: 'Đã nhập khảo sát từ JSON.' })
                  taiDanhSach()
                }}
              />
            )}

            <div className="the">
              {dangTai ? (
                <div className="tai-giua mo-nhat">Đang tải danh sách khảo sát…</div>
              ) : dsKhaoSat.length === 0 ? (
                <div className="tai-giua mo-nhat">Chưa có khảo sát nào. Hãy tạo khảo sát mới hoặc nhập từ JSON.</div>
              ) : (
                <div className="cuon-ngang">
                  <table className="bang-du-lieu">
                    <thead>
                      <tr>
                        <th>Tiêu đề</th>
                        <th>Trạng thái</th>
                        <th>Số phiếu</th>
                        <th>Thời gian</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dsKhaoSat.map((ks) => (
                        <tr key={ks.id}>
                          <td>{ks.tieuDe}</td>
                          <td>
                            <span className={'nhan-trang-thai ' + (ks.isActive ? 'mo' : 'dong')}>
                              {ks.trangThai || (ks.isActive ? 'Đang mở' : 'Đã khóa')}
                            </span>
                          </td>
                          <td>{ks.soPhieu ?? 0}</td>
                          <td>
                            {ks.thoiGianBatDau || ks.thoiGianKetThuc
                              ? `${ks.thoiGianBatDau ? dinhDangThoiGian(ks.thoiGianBatDau) : '—'} → ${
                                  ks.thoiGianKetThuc ? dinhDangThoiGian(ks.thoiGianKetThuc) : '—'
                                }`
                              : '—'}
                          </td>
                          <td>
                            <div className="hang-thao-tac">
                              <button type="button" className="nut nut-nho" onClick={() => chepLink(ks.id)}>
                                {daChepId === ks.id ? 'Đã chép' : 'Sao chép link'}
                              </button>
                              <Link className="nut nut-nho" to={`/khao-sat/${ks.id}/ket-qua`}>
                                Kết quả
                              </Link>
                              <button type="button" className="nut nut-nho" onClick={() => taiCSV(ks)}>
                                CSV
                              </button>
                              <button
                                type="button"
                                className="nut nut-nho"
                                onClick={() =>
                                  setPhieuCua(
                                    phieuCua && phieuCua.id === ks.id ? null : { id: ks.id, tieuDe: ks.tieuDe },
                                  )
                                }
                              >
                                Phiếu
                              </button>
                              <button type="button" className="nut nut-nho" onClick={() => moSua(ks)}>
                                Sửa
                              </button>
                              <button type="button" className="nut nut-nho" onClick={() => doiCo(ks, 'isActive')}>
                                {ks.isActive ? 'Khóa' : 'Mở'}
                              </button>
                              <button type="button" className="nut nut-nho" onClick={() => doiCo(ks, 'isViewKQ')}>
                                Công khai KQ: {ks.isViewKQ ? 'Bật' : 'Tắt'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {phieuCua && (
              <PanelPhieu
                key={phieuCua.id}
                khaoSat={phieuCua}
                goiAdmin={goiAdmin}
                onDong={() => setPhieuCua(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
