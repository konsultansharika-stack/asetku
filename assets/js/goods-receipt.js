/* =====================================================================
 * ASSET MANAGEMENT PRO — goods-receipt.js
 * Penerimaan barang: pemeriksaan jumlah/spesifikasi/kondisi + pembuatan
 * data inventaris otomatis setelah verifikasi.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();
  var canProcess = Auth.can('process.receipt') || Auth.isPengelola() || Auth.isAdmin();

  function loadAll() {
    return Promise.all([
      DB.list('goods_receipts', { order: 'receipt_date', asc: false }),
      DB.list('goods_receipt_items', {}),
      DB.list('procurements', { order: 'procurement_date', asc: false }),
      DB.list('procurement_items', {}),
      DB.list('profiles', {}), DB.list('suppliers', {}), DB.list('assets', {})
    ]).then(function (r) {
      return {
        grs: r[0].data, gri: r[1].data, pos: r[2].data, poi: r[3].data,
        profs: UI.mapBy(r[4].data, 'id'), sups: r[5].data, assets: r[6].data
      };
    });
  }

  function render(d) {
    var rows = d.grs.map(function (g) {
      var po = d.pos.find(function (p) { return p.id === g.procurement_id; });
      var items = d.gri.filter(function (i) { return i.receipt_id === g.id; });
      return Object.assign({}, g, {
        po_number: po ? po.procurement_number : '-', supplier_name: po ? ((d.sups.find(function (s) { return s.id === po.supplier_id; }) || {}).supplier_name || '-') : '-',
        received_name: (d.profs[g.received_by] || {}).full_name || '-', nItems: items.length
      });
    });
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Penerimaan Barang',
      'Pemeriksaan barang datang dari pemasok dan pembuatan data inventaris otomatis',
      (canProcess ? '<button class="btn btn-primary btn-sm" id="addGr"><i class="bi bi-plus-lg me-1"></i>Penerimaan Baru</button>' : '') +
      '<button class="btn btn-outline-secondary btn-sm" id="expGr"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>');

    UI.dataTable({
      mount: '#grTable',
      columns: [
        { key: 'receipt_number', label: 'No. Penerimaan' },
        { key: 'receipt_date', label: 'Tanggal', render: function (g) { return UI.fdate(g.receipt_date); } },
        { key: 'po_number', label: 'PO' },
        { key: 'supplier_name', label: 'Pemasok' },
        { key: 'nItems', label: 'Item', class: 'text-center' },
        { key: 'received_name', label: 'Penerima' },
        { key: 'inspection_status', label: 'Status Verifikasi', render: function (g) { return UI.badge(g.inspection_status === 'Verified' ? 'Verified' : g.inspection_status === 'Pending' ? 'Menunggu Verifikasi' : g.inspection_status); } }
      ],
      rows: rows, pageSize: 10,
      actions: function (g) {
        var h = UI.iconBtn('Detail', 'eye', 'data-act="detail" data-id="' + g.id + '"', 'btn-outline-secondary');
        if (canProcess && g.inspection_status !== 'Verified') {
          h += UI.iconBtn('Verifikasi & Buat Aset', 'check2-circle', 'data-act="verify" data-id="' + g.id + '"', 'btn-outline-success');
        }
        return h;
      }
    });

    document.getElementById('expGr').onclick = function () {
      UI.exportExcel('penerimaan-barang.xlsx', rows.map(function (g) {
        return { Nomor: g.receipt_number, Tanggal: g.receipt_date, PO: g.po_number, Pemasok: g.supplier_name,
          Penerima: g.received_name, 'Jumlah Item': g.nItems, Status: g.inspection_status, Catatan: g.notes || '' };
      }));
    };

    document.getElementById('grTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var g = d.grs.find(function (x) { return x.id === b.dataset.id; });
      if (b.dataset.act === 'detail') showDetail(d, g);
      else if (b.dataset.act === 'verify') verifyReceipt(d, g);
    };

    var addGr = document.getElementById('addGr');
    if (addGr) addGr.onclick = function () { openReceiptForm(d); };
  }

  function showDetail(d, g) {
    var items = d.gri.filter(function (i) { return i.receipt_id === g.id; });
    var po = d.pos.find(function (p) { return p.id === g.procurement_id; });
    var created = po ? d.assets.filter(function (a) { return a.procurement_number === po.procurement_number; }) : [];
    UI.modal({
      title: 'Penerimaan ' + g.receipt_number, size: 'lg',
      body: '<div class="row amp-detail-grid mb-2">' +
        UI.kv('Tanggal', UI.fdate(g.receipt_date)) +
        UI.kv('PO', UI.esc(po ? po.procurement_number : '-')) +
        UI.kv('Penerima', UI.esc((d.profs[g.received_by] || {}).full_name || '-')) +
        UI.kv('Status', UI.badge(g.inspection_status === 'Verified' ? 'Verified' : 'Menunggu Verifikasi')) +
        UI.kv('Catatan', UI.esc(g.notes || '-')) + '</div>' +
        '<h6 class="fw-bold">Item Penerimaan</h6>' +
        '<table class="table table-sm"><thead><tr><th>Barang</th><th class="text-end">Pesanan</th><th class="text-end">Diterima</th><th class="text-end">Ditolak</th><th>Kondisi</th></tr></thead><tbody>' +
        items.map(function (i) {
          return '<tr><td>' + UI.esc(i.item_name) + '</td><td class="text-end">' + i.quantity_ordered + '</td><td class="text-end fw-semibold">' + i.quantity_received + '</td><td class="text-end text-danger">' + (i.quantity_rejected || 0) + '</td><td>' + UI.badge(i.condition_id === 'cond-baru' ? 'Baru' : 'Baik') + '</td></tr>';
        }).join('') + '</tbody></table>' +
        (created.length ? '<h6 class="fw-bold mt-2">Aset Dibuat</h6>' + created.map(function (a) {
          return '<div class="small mb-1"><i class="bi bi-box-seam me-1 text-primary"></i>' + UI.esc(a.asset_code + ' — ' + a.asset_name) + ' ' + UI.badge(a.asset_status) + '</div>';
        }).join('') : '<div class="text-muted small mt-2"><i class="bi bi-info-circle me-1"></i>Aset belum dibuat — verifikasi penerimaan untuk membuat data inventaris.</div>'),
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
    });
  }

  function verifyReceipt(d, g) {
    UI.confirmDialog({
      title: 'Verifikasi penerimaan?',
      html: 'Seluruh item <strong>' + g.receipt_number + '</strong> akan dibuat sebagai data inventaris dengan status <em>Menunggu Verifikasi</em> (tidak langsung aktif).'
    }).then(function (ok) {
      if (!ok) return;
      var items = d.gri.filter(function (i) { return i.receipt_id === g.id; });
      var po = d.pos.find(function (p) { return p.id === g.procurement_id; });
      Promise.all([
        DB.list('asset_categories', {}), DB.list('units_of_measure', {}), DB.list('asset_conditions', {})
      ]).then(function (r) {
        var cats = r[0].data, uoms = r[1].data, conds = r[2].data;
        var barUom = (uoms.find(function (u) { return u.symbol === 'unit'; }) || uoms[0]).id;
        var condOk = (conds.find(function (c) { return c.condition_code === 'BRU'; }) || conds[0]).id;
        return DB.list('assets', { limit: 1500 }).then(function (ar) {
          var seq = {};
          (ar.data || []).forEach(function (a) {
            var c = String(a.asset_code || '');
            var parts = c.split('/');
            if (parts.length === 3) seq[parts[0] + '/' + parts[1]] = Math.max(seq[parts[0] + '/' + parts[1]] || 0, parseInt(parts[2], 10) || 0);
          });
          function makeCode(catCode, year) {
            var key = catCode + '/' + year;
            seq[key] = (seq[key] || 0) + 1;
            return catCode + '/' + year + '/' + String(seq[key]).padStart(4, '0');
          }
          var inserts = [];
          items.forEach(function (i) {
            if (!i.quantity_received) return;
            var cat = cats.find(function (c) { return c.category_name && i.item_name.toLowerCase().includes(c.category_name.toLowerCase().split(' ')[0]); });
            var catFallback = cats.find(function (c) { return c.category_code === 'PKT'; });
            var catObj = cat || catFallback;
            var year = (g.receipt_date || UI.todayISO()).slice(0, 4);
            inserts.push(DB.insert('assets', {
              organization_id: org, asset_code: makeCode(catObj.category_code, year),
              asset_name: i.item_name, category_id: catObj.id, unit_of_measure_id: barUom,
              asset_type: catObj.is_consumable ? 'consumable' : catObj.is_fixed_asset ? 'fixed' : 'inventory',
              acquisition_date: g.receipt_date, acquisition_cost: null, quantity: i.quantity_received,
              current_condition_id: i.condition_id || condOk,
              unit_id: null, current_location_id: null,
              responsible_user_id: null, supplier_id: po ? po.supplier_id : null,
              funding_source_id: po ? po.funding_source_id : null,
              invoice_number: po ? po.invoice_number : null, procurement_number: po ? po.procurement_number : null,
              qr_token: DB.uuid(), asset_status: 'Menunggu Verifikasi', is_active: true,
              condition_note: i.notes || null
            }));
          });
          return Promise.all(inserts);
        }).then(function () {
          return DB.update('goods_receipts', g.id, { inspection_status: 'Verified' });
        }).then(function () {
          UI.toast('success', 'Penerimaan terverifikasi — aset dibuat (menunggu verifikasi pengelola)');
          reload();
        });
      }).catch(function (e) { UI.toast('error', e.message || 'Gagal memverifikasi'); });
    });
  }

  function openReceiptForm(d) {
    var openPOs = d.pos.filter(function (p) { return p.status !== 'Draft'; });
    if (!openPOs.length) { UI.toast('warning', 'Belum ada PO pengadaan. Buat PO di menu Pengadaan.'); return; }
    var body = '<div class="row g-2">' +
      '<div class="col-md-5 mb-2"><label class="form-label">Pilih PO *</label><select class="form-select" id="grPO">' +
      openPOs.map(function (p) { return '<option value="' + p.id + '">' + UI.esc(p.procurement_number + ' — ' + (d.sups.find(function (s) { return s.id === p.supplier_id; }) || {}).supplier_name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="col-md-3 mb-2"><label class="form-label">Tanggal Terima *</label><input type="date" class="form-control" id="grDate" value="' + UI.todayISO() + '"></div>' +
      '<div class="col-md-4 mb-2"><label class="form-label">Catatan Pemeriksaan</label><input class="form-control" id="grNote" placeholder="cth: segel utuh, sesuai PO"></div>' +
      '<div class="col-12"><div class="amp-form-section-title">Pemeriksaan Item</div><div id="grItems"></div></div></div>';
    var m = UI.modal({
      title: 'Penerimaan Barang Baru', size: 'xl', body: body,
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
        '<button class="btn btn-primary" id="grSave"><i class="bi bi-check-lg me-1"></i>Simpan Penerimaan</button>',
      onShown: function () {
        draw();
        document.getElementById('grPO').onchange = draw;
        document.getElementById('grSave').onclick = save;
      }
    });
    function draw() {
      var poId = document.getElementById('grPO').value;
      var items = d.poi.filter(function (i) { return i.procurement_id === poId; });
      document.getElementById('grItems').innerHTML = items.map(function (i, idx) {
        return '<div class="amp-repeater-row" data-iid="' + i.id + '"><div class="row g-2 align-items-end">' +
          '<div class="col-md-4"><label class="form-label small">Barang</label><div class="fw-semibold small">' + UI.esc(i.item_name) + '</div></div>' +
          '<div class="col-md-2"><label class="form-label small">Pesanan</label><div>' + i.quantity + '</div></div>' +
          '<div class="col-md-2"><label class="form-label small">Diterima</label><input type="number" min="0" max="' + i.quantity + '" class="form-control form-control-sm gri-recv" value="' + i.quantity + '"></div>' +
          '<div class="col-md-2"><label class="form-label small">Ditolak</label><input type="number" min="0" class="form-control form-control-sm gri-rej" value="0"></div>' +
          '<div class="col-md-2"><label class="form-label small">Kondisi</label><select class="form-select form-select-sm gri-cond"><option value="cond-baru">Baru</option><option value="cond-baik">Baik</option><option value="cond-rr">Rusak Ringan</option></select></div>' +
          '</div></div>';
      }).join('');
    }
    function save() {
      var poId = document.getElementById('grPO').value;
      var date = document.getElementById('grDate').value;
      if (!date) { UI.toast('warning', 'Isi tanggal terima'); return; }
      DB.nextNumber('GRN', 'goods_receipts', 'receipt_number').then(function (num) {
        return DB.insert('goods_receipts', {
          organization_id: org, receipt_number: num, procurement_id: poId,
          receipt_date: date, received_by: Auth.userId(),
          inspection_status: 'Pending', notes: document.getElementById('grNote').value || null
        }).then(function (ins) {
          var rec = ins.data;
          var rows = [];
          document.querySelectorAll('#grItems .amp-repeater-row').forEach(function (rowEl) {
            var poi = d.poi.find(function (x) { return x.id === rowEl.dataset.iid; });
            rows.push({
              receipt_id: rec.id, procurement_item_id: poi.id, item_name: poi.item_name,
              quantity_ordered: poi.quantity,
              quantity_received: Number(rowEl.querySelector('.gri-recv').value) || 0,
              quantity_rejected: Number(rowEl.querySelector('.gri-rej').value) || 0,
              condition_id: rowEl.querySelector('.gri-cond').value, notes: null
            });
          });
          return DB.insertMany('goods_receipt_items', rows).then(function () { return rec; });
        });
      }).then(function (rec) {
        UI.toast('success', 'Penerimaan ' + rec.receipt_number + ' tersimpan — lakukan verifikasi untuk membuat aset');
        m.close(); reload();
      }).catch(function (e) { UI.toast('error', e.message); });
    }
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
