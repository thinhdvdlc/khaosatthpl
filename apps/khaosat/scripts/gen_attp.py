# -*- coding: utf-8 -*-
"""Chuyển 2 phiếu khảo sát Word (an toàn thực phẩm — Sở Tư pháp Đắk Lắk) sang JSON
định dạng builder mà server/lib/nhapKhaoSat.js:taoKhaoSat nhận.

Chạy: python scripts/gen_attp.py
Xuất: data/attp-cbcc.json, data/attp-nguoi-dan.json
"""
import json
import os
import re

import docx
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, '..', 'docs')
DATA = os.path.join(HERE, '..', 'data')

# Mã loại câu hỏi (khớp server/lib/loaiCauHoi.js)
CHON_NHIEU, CHON_MOT, NHAP_TEXT, MTX_NHIEU, MTX_MOT, NHOM = 2, 3, 4, 5, 6, 7


def iter_block(doc):
    for child in doc.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield ('p', Paragraph(child, doc))
        elif isinstance(child, CT_Tbl):
            yield ('t', Table(child, doc))


def clean(s):
    return re.sub(r'\s+', ' ', (s or '').replace('\xa0', ' ')).strip()


def la_khac(label):
    """Phương án 'ý kiến khác' — chứa từ 'khác' ở phần nhãn chính."""
    core = label.split('(')[0].lower()
    return 'khác' in core


def lam_sach_pa(label):
    """Bỏ đuôi '(đề nghị nêu rõ)', dấu hai chấm và các dòng chấm."""
    s = re.sub(r'\(đề nghị nêu rõ\).*$', '', label, flags=re.IGNORECASE)
    s = s.strip().rstrip('.').strip()
    s = re.sub(r'[.．…]{3,}.*$', '', s).strip()
    s = s.rstrip(':').strip()
    return s


def tach_phuong_an(text):
    """Một đoạn có thể chứa nhiều ô '☐' → tách thành nhiều phương án."""
    if '☐' not in text:
        return []
    return [clean(x) for x in text.split('☐') if clean(x)]


def loai_multi(qtext):
    t = qtext.lower()
    multi = ('có thể lựa chọn nhiều' in t or 'chọn nhiều phương án' in t or 'chọn tối đa' in t)
    m = re.search(r'tối đa\s+(\d+)', t)
    return multi, (int(m.group(1)) if m else None)


def dung_cauhoi(qtext, options, table, ep_multi=None, ep_max=None):
    """Dựng 1 câu hỏi từ đề bài + danh sách option (đoạn text thô) + bảng (nếu có).
    ep_multi/ep_max: ép loại chọn-nhiều / số tối đa khi heuristic không đủ."""
    if table is not None:
        return dung_matran(qtext, table)

    pa, khac = [], False
    for optline in options:
        for raw in tach_phuong_an(optline):
            if la_khac(raw):
                khac = True
            else:
                lab = lam_sach_pa(raw)
                if lab:
                    pa.append(lab)

    if not pa and not khac:
        # không có phương án → câu nhập text
        return {'noiDung': qtext, 'maLoaiCauHoi': NHAP_TEXT, 'isBatBuoc': False}

    multi, mx = loai_multi(qtext)
    if ep_multi:
        multi = True
        mx = ep_max or mx
    cau = {
        'noiDung': qtext,
        'maLoaiCauHoi': CHON_NHIEU if multi else CHON_MOT,
        'isBatBuoc': False,
        'isLyDoKhac': khac,
        'cauTraLoi': pa,
    }
    if multi and mx:
        cau['soLuongTraLoiMax'] = mx
    return cau


def dung_matran(qtext, table):
    rows = [[clean(c.text) for c in r.cells] for r in table.rows]
    header = rows[0]
    has_stt = header and header[0].upper() == 'STT'
    row_idx = 1 if has_stt else 0
    col_start = row_idx + 1
    cols = [c for c in header[col_start:] if c]
    hang = []
    for r in rows[1:]:
        lab = clean(r[row_idx]) if len(r) > row_idx else ''
        if lab:
            hang.append(lab)
    return {
        'noiDung': qtext,
        'maLoaiCauHoi': MTX_MOT,  # các phiếu này đều chọn 1 ô/hàng
        'isBatBuoc': False,
        'cauTraLoi': cols,
        'cauHoiCon': [
            {'noiDung': h, 'maLoaiCauHoi': CHON_MOT, 'isBatBuoc': False, 'cauTraLoi': []}
            for h in hang
        ],
    }


def parse(path, multi_set=None, max_map=None):
    multi_set = multi_set or set()
    max_map = max_map or {}
    blocks = list(iter_block(docx.Document(path)))
    texts = []  # (kind, obj, text)
    for kind, obj in blocks:
        if kind == 'p':
            texts.append(('p', obj, clean(obj.text)))
        else:
            texts.append(('t', obj, ''))

    # Header: đoạn "Nhằm thu thập..."
    header = ''
    for k, o, t in texts:
        if t.startswith('Nhằm thu thập'):
            header = t
            break

    # Vùng section A và section B
    idx_a = next((i for i, (k, o, t) in enumerate(texts) if t.startswith('A.')), None)
    idx_b = next((i for i, (k, o, t) in enumerate(texts) if t.startswith('B.')), None)

    cauHois = []

    # ---- Nhóm A. THÔNG TIN CHUNG ----
    nhom_con = []
    if idx_a is not None and idx_b is not None:
        cur_label, cur_opts = None, []

        def flush_info():
            if cur_label is None:
                return
            q = dung_cauhoi(cur_label, cur_opts, None)
            nhom_con.append(q)

        for k, o, t in texts[idx_a + 1:idx_b]:
            if not t:
                continue
            m = re.match(r'^\d+\.\s*(.+)$', t)
            if m:
                flush_info()
                cur_label = clean(m.group(1)).rstrip(':')
                cur_opts = []
            elif '☐' in t:
                cur_opts.append(t)
            else:
                # dòng mô tả thêm cho field text (vd "Ông/Bà đang sinh sống tại...")
                if cur_label and not cur_opts and 'sinh sống' in t.lower():
                    pass  # giữ nhãn ngắn gọn
        flush_info()

        cauHois.append({
            'noiDung': clean(texts[idx_a][2]).lstrip('A.').strip() or 'THÔNG TIN CHUNG',
            'maLoaiCauHoi': NHOM,
            'isBatBuoc': False,
            'cauHoiCon': nhom_con,
        })

    # ---- Section B: các "Câu N." ----
    start = idx_b + 1 if idx_b is not None else 0
    i = start
    n = len(texts)
    cur_q, cur_opts, cur_table = None, [], None

    def flush_q():
        nonlocal cur_q, cur_opts, cur_table
        if cur_q is None:
            return
        m = re.match(r'^Câu\s+(\d+)\.', cur_q)
        qnum = int(m.group(1)) if m else None
        cauHois.append(dung_cauhoi(
            cur_q, cur_opts, cur_table,
            ep_multi=(qnum in multi_set),
            ep_max=max_map.get(qnum),
        ))
        cur_q, cur_opts, cur_table = None, [], None

    while i < n:
        k, o, t = texts[i]
        if k == 'p' and re.match(r'^Câu\s+\d+\.', t):
            flush_q()
            cur_q = t
            cur_opts, cur_table = [], None
        elif k == 't':
            if cur_q is not None and cur_table is None:
                cur_table = o
        elif k == 'p' and t:
            if '☐' in t:
                cur_opts.append(t)
            # bỏ qua các dòng chấm, footer
        i += 1
    flush_q()

    footer = 'Xin trân trọng cảm ơn sự hợp tác của Ông/Bà!'
    return header, footer, cauHois


def main():
    meta = {
        'Phieu_khao_sat so 1 CBCC.docx': {
            'id': '11111111-1111-4111-8111-111111111111',
            'tieuDe': 'Phiếu khảo sát số 01 — Tình hình thi hành pháp luật về an toàn thực phẩm '
                      '(dành cho cán bộ, công chức, viên chức)',
            'out': 'attp-cbcc.json',
            # Câu chọn-nhiều (đọc từ nội dung phiếu, kể cả câu không ghi rõ "chọn nhiều")
            'multi': {3, 11, 12, 17, 18, 22, 23, 27, 29, 32},
            'max': {},
        },
        'Phieu_khao_sat_so 2_nguoi_dan.docx': {
            'id': '22222222-2222-4222-8222-222222222222',
            'tieuDe': 'Phiếu khảo sát số 02 — Tình hình thi hành pháp luật về an toàn thực phẩm '
                      '(dành cho người dân, hộ kinh doanh, cơ sở nhỏ lẻ)',
            'out': 'attp-nguoi-dan.json',
            'multi': {2, 5, 14, 19, 25, 26},
            'max': {26: 3},
        },
    }
    for fname, cfg in meta.items():
        header, footer, cauHois = parse(os.path.join(DOCS, fname), cfg['multi'], cfg['max'])
        payload = {
            'id': cfg['id'],
            'tieuDe': cfg['tieuDe'],
            'header': header,
            'footer': footer,
            'background': '#eeecec',
            'isActive': True,
            'isViewKQ': True,
            'isNhapThongTin': False,
            'cauHois': cauHois,
        }
        outp = os.path.join(DATA, cfg['out'])
        with open(outp, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        # tóm tắt
        def dem(qs):
            tong = 0
            for q in qs:
                tong += 1
                tong += dem(q.get('cauHoiCon', []))
            return tong
        loai_dem = {}
        def walk(qs):
            for q in qs:
                loai_dem[q['maLoaiCauHoi']] = loai_dem.get(q['maLoaiCauHoi'], 0) + 1
                walk(q.get('cauHoiCon', []))
        walk(cauHois)
        print(f"[{cfg['out']}] gốc={len(cauHois)} tổng(cả con)={dem(cauHois)} theo loại={loai_dem}")


if __name__ == '__main__':
    main()
