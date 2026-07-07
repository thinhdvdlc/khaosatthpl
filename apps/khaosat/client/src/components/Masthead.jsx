import { CO_QUAN } from '../constants.js'

// Masthead cơ quan. Prop `phu` (tùy chọn): khối bên phải (vd "PHIẾU SỐ 02 / Dành cho...").
export default function Masthead({ phu }) {
  return (
    <div className="mh">
      <div className="mh-trai">
        <img className="mh-emblem" src="/logo-tu-phap.jpg" alt="Biểu trưng ngành Tư pháp Việt Nam" />
        <div>
          <div className="mh-coquan">{CO_QUAN.ten}</div>
          <div className="mh-diachi">{CO_QUAN.diaChi}</div>
        </div>
      </div>
      {phu && <div className="mh-phai">{phu}</div>}
    </div>
  )
}
