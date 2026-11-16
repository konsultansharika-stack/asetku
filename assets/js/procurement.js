/* =====================================================================
 * ASSET MANAGEMENT PRO — procurement.js
 * Pengadaan: pengajuan kebutuhan + workflow persetujuan + realisasi PO.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();
  var canRequest = true;
  var isAdmin = Auth.isAdmin();
  var roles = Auth.roles();

  function loadAll() {
    return Promise.all([
      DB.list('procurement_requests', { order: 'request_date', asc: false }),
      DB.list('procurement_request_items', {}),
      DB.list('procurements', { order: 'procurement_date', asc: false }),
      DB.list('procurement_items', {}),
      DB.list('approval_histories', { order: 'decided_at', asc: true }),
      DB.list('profiles', {}), DB.list('units', {}), DB.list('suppliers', {}),
      DB.list('asset_categories', {}), DB.list('goods_receipts', {})
    ]).then(function (r) {
      return {
        reqs: r[0].data, reqItems: r[1].data, pos: r[2].data, poItems: r[3].data,
        approvals: r[4].data, profs: UI.mapBy(r[5].data, 'id'), units: UI.mapBy(r[6].data, 'id'),
        sups: r[7].data, cats: r[8].data, grs: r[9].data
      };
    });
  }

  /* ---------------- PENGAJUAN KEBUTUHAN ---------------- */
  function renderReq(d) {
    var rows = d.reqs.map(function (q) {
      var items = d.reqItems.filter(function (i) { return i.request_id === q.id; });
      return Object.assign({}, q, { nItems: items.length, requester_name: (d.profs[q.requester_id] || {}).full_name || '-', unit_name: (d.units[q.unit_id] || {}).name || '-' });
    });
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Pengadaan Barang',
      'Pengajuan kebutuhan, persetujuan berjenjang, dan realisasi pembelian',
      '<button class="btn btn-primary btn-sm" id="addReq"><i class="bi bi-plus-lg me-1"></i>Pengajuan Baru</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="expReq"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>');

    UI.dataTable({
      mount: '#reqTable',
      columns: [
        { key: 'request_number', label: 'No. Pengajuan' },
        { key: 'request_date', label: 'Tanggal', render: function (q) { return UI.fdate(q.request_date); } },
        { key: 'requester_name', label: 'Pemohon' },
        { key: 'unit_name', label: 'Unit' },
        { key: 'purpose', label: 'Keperluan' },
        { key: 'nItems', label: 'Item', class: 'text-center' },
        { key: 'priority', label: 'Prioritas', render: function (q) { return UI.badge(q.priority === 'Tinggi' ? 'Rusak Berat' : q.priority === 'Sedang' ? 'Dalam Pemeliharaan' : 'Draft'); } },
        { key: 'estimated_total', label: 'Estimasi', class: 'text-end', render: function (q) { return UI.rp(q.estimated_total); } },
        { key: 'status', label: 'Status', render: function (q) { return UI.badge(q.status); } }
      ],
      rows: rows, pageSize: 10,
      actions: function (q) {
        var h = UI.iconBtn('Detail & Riwayat', 'eye', 'data-act="detail" data-id="' + q.id + '"', 'btn-outline-secondary');
        if (q.status === 'Draft') h += UI.iconBtn('Ajukan', 'send', 'data-act="submit" data-id="' + q.id + '"', 'btn-outline-primary');
        if (q.status === 'Submitted') h += UI.iconBtn('Review Atasan', 'check2-circle', 'data-act="step1" data-id="' + q.id + '"', 'btn-outline-success');
        if (q.status === 'Review Keuangan') h += UI.iconBtn('Review Keuangan', 'cash-coin', 'data-act="step2" data-id="' + q.id + '"', 'btn-outline-success');
        if (q.status === 'Review Atasan') h += '<span class="badge text-bg-warning">Menunggu Keuangan</span>';
        if (q.status === 'Approval Pimpinan') h += UI.iconBtn('Setujui', 'check2-circle', 'data-act="step3-ok" data-id="' + q.id + '"', 'btn-outline-success') +
          UI.iconBtn('Tolak', 'x-circle', 'data-act="step3-no" data-id="' + q.id + '"', 'btn-outline-danger');
        if (q.status === 'Approved' && !d.pos.some(function (p) { return p.request_id === q.id; })) {
          h += UI.iconBtn('Buat PO', 'cart-plus', 'data-act="po" data-id="' + q.id + '"', 'btn-primary');
        }
        return h;
      }
    });

    document.getElementById('expReq').onclick = function () {
      UI.exportExcel('pengajuan-pengadaan.xlsx', rows.map(function (q) {
        return { Nomor: q.request_number, Tanggal: q.request_date, Pemohon: q.requester_name, Unit: q.unit_name,
          Keperluan: q.purpose, Prioritas: q.priority, 'Estimasi Total': q.estimated_total, Status: q.status };
      }));
    };
    bindReqActions(d);
  }

  function bindReqActions(d) {
    var host = document.getElementById('reqTable');
    host.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var q = d.reqs.find(function (x) { return x.id === b.dataset.id; });
      if (!q) return;
      var act = b.dataset.act;

      if (act === 'detail') return showReqDetail(d, q);
      if (act === 'submit') {
        return UI.confirmDialog({ title: 'Ajukan pengajuan ini?', html: 'Masuk ke tahap <strong>Review Atasan</strong>.' }).then(function (ok) {
          if (!ok) return;
          Promise.all([
            DB.update('procurement_requests', q.id, { status: 'Submitted' }),
            DB.insert('approval_histories', { transaction_type: 'procurement_request', transaction_id: q.id, step_order: 0, approver_id: Auth.userId(), decision: 'Submitted', notes: 'Pengajuan dikirim', decided_at: new Date().toISOString() })
          ]).then(reload);
        });
      }
      if (act === 'step1') return approveStep(d, q, 1, 'Review Atasan', 'Review Keuangan', ['manajer', 'direktur', 'pimpinan']);
      if (act === 'step2') return approveStep(d, q, 2, 'Review Keuangan', 'Approval Pimpinan', ['keuangan']);
      if (act === 'step3-ok') return approveStep(d, q, 3, 'Approval Pimpinan', 'Approved', ['pimpinan', 'direktur']);
      if (act === 'step3-no') return rejectStep(d, q, 3, ['pimpinan', 'direktur']);
      if (act === 'po') return openPOForm(d, q);
    };
  }

  function approveStep(d, q, step, fromStatus, toStatus, allowedRoles) {
    if (isAdmin || roles.some(function (r) { return allowedRoles.indexOf(r) >= 0; })) {
      return UI.confirmDialog({ title: 'Setujui tahap ' + fromStatus + '?', html: q.request_number }).then(function (ok) {
        if (!ok) return;
        Promise.all([
          DB.update('procurement_requests', q.id, { status: toStatus }),
          DB.insert('approval_histories', { transaction_type: 'procurement_request', transaction_id: q.id, step_order: step, approver_id: Auth.userId(), decision: 'Approved', notes: null, decided_at: new Date().toISOString() })
        ]).then(function () { UI.toast('success', 'Tahap ' + fromStatus + ' disetujui'); reload(); });
      });
    }
    UI.toast('warning', 'Tahap ini memerlukan peran: ' + allowedRoles.map(function (r) { return Auth.roleLabel(r); }).join(', '));
  }
  function rejectStep(d, q, step, allowedRoles) {
    if (!isAdmin && !roles.some(function (r) { return allowedRoles.indexOf(r) >= 0; })) return UI.toast('warning', 'Tidak memiliki kewenangan');
    UI.formModal({
      title: 'Tolak Pengajuan ' + q.request_number, submitText: 'Tolak Pengajuan',
      fields: [{ name: 'notes', label: 'Alasan Penolakan', type: 'textarea', required: true }],
      onSubmit: function (data) {
        return Promise.all([
          DB.update('procurement_requests', q.id, { status: 'Rejected', notes: data.notes }),
          DB.insert('approval_histories', { transaction_type: 'procurement_request', transaction_id: q.id, step_order: step, approver_id: Auth.userId(), decision: 'Rejected', notes: data.notes, decided_at: new Date().toISOString() })
        ]).then(function () { UI.toast('success', 'Pengajuan ditolak'); reload(); });
      }
    });
  }

  function showReqDetail(d, q) {
    var items = d.reqItems.filter(function (i) { return i.request_id === q.id; });
    var hist = d.approvals.filter(function (h) { return h.transaction_type === 'procurement_request' && h.transaction_id === q.id; })
      .sort(function (a, b) { return a.step_order - b.step_order; });
    var tl = hist.map(function (h) {
      return { title: h.decision + ' — Tahap ' + (h.step_order || 0) + (h.step_order === 1 ? ' (Review Atasan)' : h.step_order === 2 ? ' (Review Keuangan)' : h.step_order === 3 ? ' (Approval Pimpinan)' : ''),
        when: h.decided_at, by: (d.profs[h.approver_id] || {}).full_name || '-', note: h.notes, color: h.decision === 'Approved' || h.decision === 'Submitted' ? 'success' : h.decision === 'Rejected' ? 'danger' : 'secondary' };
    });
    UI.modal({
      title: 'Pengajuan ' + q.request_number, size: 'lg',
      body: '<div class="row amp-detail-grid mb-2">' +
        UI.kv('Tanggal', UI.fdate(q.request_date)) +
        UI.kv('Pemohon', UI.esc((d.profs[q.requester_id] || {}).full_name || '-')) +
        UI.kv('Unit', UI.esc((d.units[q.unit_id] || {}).name || '-')) +
        UI.kv('Prioritas', q.priority) +
        UI.kv('Keperluan', UI.esc(q.purpose)) +
        UI.kv('Estimasi Total', UI.rp(q.estimated_total)) +
        UI.kv('Status', UI.badge(q.status)) + '</div>' +
        '<h6 class="fw-bold">Item Kebutuhan</h6>' +
        '<table class="table table-sm"><thead><tr><th>Barang</th><th>Spesifikasi</th><th class="text-end">Jml</th><th class="text-end">Harga Est.</th><th class="text-end">Total</th></tr></thead><tbody>' +
        items.map(function (i) {
          return '<tr><td>' + UI.esc(i.item_name) + '</td><td class="small text-muted">' + UI.esc(i.specification || '-') + '</td>' +
            '<td class="text-end">' + i.quantity + '</td><td class="text-end">' + UI.rp(i.estimated_unit_price) + '</td><td class="text-end">' + UI.rp(i.estimated_total) + '</td></tr>';
        }).join('') + '</tbody></table>' +
        '<h6 class="fw-bold mt-3">Riwayat Persetujuan</h6>' + UI.timeline(tl),
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
    });
  }

  function openReqForm() {
    return Promise.all([
      DB.list('units', {}), DB.list('asset_categories', {}), DB.list('profiles', {})
    ]).then(function (r) {
      var units = r[0].data, cats = r[1].data;
      var items = [{ item_name: '', category_id: '', specification: '', quantity: 1, estimated_unit_price: 0 }];
      var body = '<div class="row g-2">' +
        '<div class="col-md-4 mb-2"><label class="form-label">Unit Pemohon *</label><select class="form-select" id="rqUnit">' + units.map(function (u) { return '<option value="' + u.id + '">' + UI.esc(u.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="col-md-3 mb-2"><label class="form-label">Tanggal *</label><input type="date" class="form-control" id="rqDate" value="' + UI.todayISO() + '"></div>' +
        '<div class="col-md-3 mb-2"><label class="form-label">Prioritas</label><select class="form-select" id="rqPrio"><option>Rendah</option><option selected>Sedang</option><option>Tinggi</option></select></div>' +
        '<div class="col-md-2 mb-2"><label class="form-label">Anggaran</label><select class="form-select" id="rqFund"><option value="fund-yayasan">Kas Yayasan</option><option value="fund-bos">Dana BOS</option><option value="fund-komite">Dana Komite</option><option value="fund-hibah">Hibah</option></select></div>' +
        '<div class="col-12 mb-2"><label class="form-label">Alasan Kebutuhan *</label><textarea class="form-control" id="rqPurpose" rows="2"></textarea></div>' +
        '<div class="col-12"><div class="amp-form-section-title">Item Kebutuhan</div><div id="rqItems"></div>' +
        '<button class="btn btn-outline-secondary btn-sm mt-1" id="rqAddItem"><i class="bi bi-plus-lg"></i> Tambah Item</button></div></div>';
      function itemRow(it, idx) {
        return '<div class="amp-repeater-row" data-idx="' + idx + '">' +
          '<button class="btn-close amp-repeater-remove" data-rm="' + idx + '" title="Hapus item"></button>' +
          '<div class="row g-2">' +
          '<div class="col-md-4"><label class="form-label small">Nama Barang *</label><input class="form-control form-control-sm rq-name" value="' + UI.esc(it.item_name) + '"></div>' +
          '<div class="col-md-2"><label class="form-label small">Kategori</label><select class="form-select form-select-sm rq-cat">' + cats.map(function (c) { return '<option value="' + c.id + '"' + (it.category_id === c.id ? ' selected' : '') + '>' + UI.esc(c.category_name) + '</option>'; }).join('') + '</select></div>' +
          '<div class="col-md-3"><label class="form-label small">Spesifikasi</label><input class="form-control form-control-sm rq-spec" value="' + UI.esc(it.specification) + '"></div>' +
          '<div class="col-md-1"><label class="form-label small">Jml</label><input type="number" min="1" class="form-control form-control-sm rq-qty" value="' + it.quantity + '"></div>' +
          '<div class="col-md-2"><label class="form-label small">Harga Est.</label><input type="number" min="0" class="form-control form-control-sm rq-price" value="' + it.estimated_unit_price + '"></div>' +
          '</div></div>';
      }
      function drawItems() {
        document.getElementById('rqItems').innerHTML = items.map(itemRow).join('');
        document.querySelectorAll('#rqItems [data-rm]').forEach(function (b) {
          b.onclick = function () { items.splice(Number(b.dataset.rm), 1); if (!items.length) items.push({}); drawItems(); drawTotal(); };
        });
        document.querySelectorAll('#rqItems .amp-repeater-row').forEach(function (rowEl, i) {
          rowEl.querySelector('.rq-name').onchange = function (e) { items[i].item_name = e.target.value; };
          rowEl.querySelector('.rq-cat').onchange = function (e) { items[i].category_id = e.target.value; };
          rowEl.querySelector('.rq-spec').onchange = function (e) { items[i].specification = e.target.value; };
          rowEl.querySelector('.rq-qty').onchange = function (e) { items[i].quantity = Number(e.target.value) || 1; drawTotal(); };
          rowEl.querySelector('.rq-price').onchange = function (e) { items[i].estimated_unit_price = Number(e.target.value) || 0; drawTotal(); };
        });
      }
      function drawTotal() {
        var t = items.reduce(function (s, i) { return s + (i.quantity || 0) * (i.estimated_unit_price || 0); }, 0);
        document.getElementById('rqTotal').textContent = UI.rp(t);
      }
      var m = UI.modal({
        title: 'Pengajuan Kebutuhan Barang', size: 'xl',
        body: body + '<div class="text-end fw-bold mt-2">Total Estimasi: <span id="rqTotal">' + UI.rp(0) + '</span></div>',
        footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
          '<button class="btn btn-outline-primary" id="rqSaveDraft"><i class="bi bi-save me-1"></i>Simpan Draft</button>' +
          '<button class="btn btn-primary" id="rqSubmit"><i class="bi bi-send me-1"></i>Ajukan</button>',
        onShown: function () {
          drawItems();
          document.getElementById('rqAddItem').onclick = function () { items.push({}); drawItems(); };
          document.getElementById('rqSaveDraft').onclick = function () { save('Draft'); };
          document.getElementById('rqSubmit').onclick = function () { save('Submitted'); };
        }
      });
      function save(status) {
        var purpose = document.getElementById('rqPurpose').value.trim();
        if (!purpose) { UI.toast('warning', 'Isi alasan kebutuhan'); return; }
        var validItems = items.filter(function (i) { return i.item_name && i.item_name.trim(); });
        if (!validItems.length) { UI.toast('warning', 'Minimal satu item dengan nama barang'); return; }
        var total = validItems.reduce(function (s, i) { return s + (i.quantity || 1) * (i.estimated_unit_price || 0); }, 0);
        DB.nextNumber('REQ', 'procurement_requests', 'request_number').then(function (num) {
          return DB.insert('procurement_requests', {
            organization_id: org, request_number: num,
            request_date: document.getElementById('rqDate').value,
            requester_id: Auth.userId(), unit_id: document.getElementById('rqUnit').value,
            purpose: purpose, priority: document.getElementById('rqPrio').value,
            estimated_total: total, status: status,
            notes: document.getElementById('rqFund').value
          }).then(function (ins) {
            var rec = ins.data;
            return DB.insertMany('procurement_request_items', validItems.map(function (i) {
              return { request_id: rec.id, category_id: i.category_id || null, item_name: i.item_name,
                specification: i.specification || null, quantity: i.quantity || 1,
                estimated_unit_price: i.estimated_unit_price || 0, estimated_total: (i.quantity || 1) * (i.estimated_unit_price || 0) };
            })).then(function () { return rec; });
          });
        }).then(function (rec) {
          if (status === 'Submitted') {
            DB.insert('approval_histories', { transaction_type: 'procurement_request', transaction_id: rec.id, step_order: 0, approver_id: Auth.userId(), decision: 'Submitted', notes: 'Pengajuan dikirim', decided_at: new Date().toISOString() });
          }
          UI.toast('success', 'Pengajuan tersimpan (' + status + ')');
          m.close(); reload();
        }).catch(function (e) { UI.toast('error', e.message); });
      }
    });
  }

  /* ---------------- REALISASI PO ---------------- */
  function renderPO(d) {
    var rows = d.pos.map(function (p) {
      var items = d.poItems.filter(function (i) { return i.procurement_id === p.id; });
      var gr = d.grs.find(function (g) { return g.procurement_id === p.id; });
      return Object.assign({}, p, { nItems: items.length, supplier_name: (d.sups.find(function (s) { return s.id === p.supplier_id; }) || {}).supplier_name || '-', receipt: gr ? gr.receipt_number : null });
    });
    UI.dataTable({
      mount: '#poTable',
      columns: [
        { key: 'procurement_number', label: 'No. Pengadaan' },
        { key: 'procurement_date', label: 'Tanggal', render: function (p) { return UI.fdate(p.procurement_date); } },
        { key: 'supplier_name', label: 'Pemasok' },
        { key: 'invoice_number', label: 'Invoice' },
        { key: 'nItems', label: 'Item', class: 'text-center' },
        { key: 'total_amount', label: 'Total', class: 'text-end', render: function (p) { return UI.rp(p.total_amount); } },
        { key: 'status', label: 'Status', render: function (p) { return UI.badge(p.status === 'Completed' ? 'Selesai' : p.status); } },
        { key: 'receipt', label: 'Penerimaan', render: function (p) { return p.receipt ? UI.esc(p.receipt) : '<span class="text-warning small">Belum diterima</span>'; } }
      ],
      rows: rows, pageSize: 10,
      actions: function (p) { return UI.iconBtn('Detail', 'eye', 'data-act="podetail" data-id="' + p.id + '"', 'btn-outline-secondary'); }
    });
    document.getElementById('poTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var p = d.pos.find(function (x) { return x.id === b.dataset.id; });
      var items = d.poItems.filter(function (i) { return i.procurement_id === p.id; });
      var tax = p.tax_amount || 0, disc = p.discount_amount || 0, add = p.additional_cost || 0;
      var subtotal = items.reduce(function (s, i) { return s + (i.total_price || 0); }, 0);
      UI.modal({
        title: 'Pengadaan ' + p.procurement_number, size: 'lg',
        body: '<div class="row amp-detail-grid mb-2">' +
          UI.kv('Tanggal', UI.fdate(p.procurement_date)) +
          UI.kv('Pemasok', UI.esc(p.supplier_name || '-')) +
          UI.kv('Invoice', UI.esc(p.invoice_number || '-')) +
          UI.kv('Sumber Dana', UI.esc(p.funding_source_id)) +
          UI.kv('Status', UI.badge(p.status)) + '</div>' +
          '<table class="table table-sm"><thead><tr><th>Barang</th><th class="text-end">Jml</th><th class="text-end">Harga</th><th class="text-end">Total</th></tr></thead><tbody>' +
          items.map(function (i) { return '<tr><td>' + UI.esc(i.item_name) + '</td><td class="text-end">' + i.quantity + '</td><td class="text-end">' + UI.rp(i.unit_price) + '</td><td class="text-end">' + UI.rp(i.total_price) + '</td></tr>'; }).join('') +
          '</tbody><tfoot><tr><th colspan="3" class="text-end">Subtotal</th><th class="text-end">' + UI.rp(subtotal) + '</th></tr>' +
          '<tr><th colspan="3" class="text-end">Pajak</th><th class="text-end">' + UI.rp(tax) + '</th></tr>' +
          '<tr><th colspan="3" class="text-end">Diskon</th><th class="text-end">-' + UI.rp(disc) + '</th></tr>' +
          '<tr><th colspan="3" class="text-end">Biaya Tambahan</th><th class="text-end">' + UI.rp(add) + '</th></tr>' +
          '<tr><th colspan="3" class="text-end">TOTAL</th><th class="text-end">' + UI.rp(p.total_amount) + '</th></tr></tfoot></table>',
        footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
      });
    };
  }

  function openPOForm(d, q) {
    var items = d.reqItems.filter(function (i) { return i.request_id === q.id; });
    return Promise.all([DB.list('suppliers', {}), DB.list('funding_sources', {})]).then(function (r) {
      UI.formModal({
        title: 'Realisasi Pengadaan — ' + q.request_number, size: 'lg', submitText: 'Simpan PO',
        fields: [
          { name: 'supplier_id', label: 'Pemasok', type: 'select', required: true, options: r[0].data.map(function (s) { return { value: s.id, label: s.supplier_name }; }) },
          { name: 'procurement_date', label: 'Tanggal Pembelian', type: 'date', required: true, col: 'col-6 col-md-4', value: UI.todayISO() },
          { name: 'invoice_number', label: 'Nomor Invoice', col: 'col-6 col-md-4' },
          { name: 'funding_source_id', label: 'Sumber Anggaran', type: 'select', col: 'col-6 col-md-4', options: r[1].data.map(function (f) { return { value: f.id, label: f.name }; }) },
          { name: 'tax_amount', label: 'Pajak (Rp)', type: 'number', min: 0, col: 'col-6 col-md-3', value: 0 },
          { name: 'discount_amount', label: 'Diskon (Rp)', type: 'number', min: 0, col: 'col-6 col-md-3', value: 0 },
          { name: 'additional_cost', label: 'Biaya Tambahan (Rp)', type: 'number', min: 0, col: 'col-6 col-md-3', value: 0 },
          { name: 'status', label: 'Status', type: 'select', col: 'col-6 col-md-3', options: [{ value: 'Draft', label: 'Draft' }, { value: 'Completed', label: 'Selesai (Lunas)' }] },
          { name: 'notes', label: 'Catatan', type: 'textarea' }
        ],
        values: {},
        onShown: function (el) { },
        onSubmit: function (data) {
          var subtotal = items.reduce(function (s, i) { return s + i.estimated_total; }, 0);
          var total = subtotal + (data.tax_amount || 0) - (data.discount_amount || 0) + (data.additional_cost || 0);
          return DB.nextNumber('PO', 'procurements', 'procurement_number').then(function (num) {
            return DB.insert('procurements', {
              organization_id: org, procurement_number: num, request_id: q.id,
              supplier_id: data.supplier_id, procurement_date: data.procurement_date,
              invoice_number: data.invoice_number, tax_amount: data.tax_amount || 0,
              discount_amount: data.discount_amount || 0, additional_cost: data.additional_cost || 0,
              total_amount: total, funding_source_id: data.funding_source_id, status: data.status,
              notes: data.notes
            }).then(function (ins) {
              return DB.insertMany('procurement_items', items.map(function (i) {
                return { procurement_id: ins.data.id, item_name: i.item_name, category_id: i.category_id,
                  quantity: i.quantity, unit_price: i.quantity ? Math.round(i.estimated_total / i.quantity) : i.estimated_total,
                  total_price: i.estimated_total };
              })).then(function () { return ins.data; });
            });
          }).then(function (rec) {
            UI.toast('success', 'PO ' + rec.procurement_number + ' tersimpan — lanjutkan di menu Penerimaan Barang');
            reload();
          });
        }
      });
    });
  }

  function reload() { loadAll().then(function (d) { renderReq(d); renderPO(d); }); }

  loadAll().then(function (d) {
    renderReq(d);
    renderPO(d);
    document.getElementById('addReq').onclick = openReqForm;
  });
};
