/* =====================================================================
 * ASSET MANAGEMENT PRO — asset-detail.js
 * Detail aset: identitas, QR, riwayat lengkap, aksi cepat.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var id = new URLSearchParams(location.search).get('id');
  var canManage = Auth.can('manage.assets') || Auth.isPengelola() || Auth.isAdmin();

  function loadAll() {
    return Promise.all([
      DB.get('assets', id),
      DB.list('asset_categories', {}), DB.list('units', {}), DB.list('locations', {}),
      DB.list('asset_conditions', {}), DB.list('suppliers', {}), DB.list('funding_sources', {}),
      DB.list('profiles', {}), DB.list('units_of_measure', {}),
      DB.list('asset_condition_histories', { eq: { asset_id: id }, order: 'inspection_date', asc: false }),
      DB.list('asset_location_histories', { eq: { asset_id: id }, order: 'movement_date', asc: false }),
      DB.list('loan_items', { eq: { asset_id: id } }),
      DB.list('loan_requests', {}),
      DB.list('maintenance_requests', { eq: { asset_id: id }, order: 'report_date', asc: false }),
      DB.list('maintenance_records', { eq: { asset_id: id }, order: 'maintenance_date', asc: false }),
      DB.list('asset_depreciations', { eq: { asset_id: id } }),
      DB.list('depreciation_entries', {}),
      DB.list('asset_documents', { eq: { asset_id: id } }),
      DB.list('asset_qr_logs', { eq: { asset_id: id }, order: 'scanned_at', asc: false }),
      DB.list('asset_transfers', {}), DB.list('asset_transfer_items', { eq: { asset_id: id } })
    ]).then(function (r) {
      var a = r[0].data;
      if (!a) return { a: null };
      var L = {
        cat: UI.mapBy(r[1].data, 'id'), unit: UI.mapBy(r[2].data, 'id'), loc: UI.mapBy(r[3].data, 'id'),
        cond: UI.mapBy(r[4].data, 'id'), sup: UI.mapBy(r[5].data, 'id'), fund: UI.mapBy(r[6].data, 'id'),
        prof: UI.mapBy(r[7].data, 'id'), uom: UI.mapBy(r[8].data, 'id')
      };
      a.category_name = L.cat[a.category_id] ? L.cat[a.category_id].category_name : '-';
      a.unit_name = L.unit[a.unit_id] ? L.unit[a.unit_id].name : '-';
      a.location_name = a.current_location_id && L.loc[a.current_location_id] ? L.loc[a.current_location_id].location_name : null;
      a.condition_name = L.cond[a.current_condition_id] ? L.cond[a.current_condition_id].condition_name : '-';
      a.supplier_name = L.sup[a.supplier_id] ? L.sup[a.supplier_id].supplier_name : '-';
      a.funding_name = L.fund[a.funding_source_id] ? L.fund[a.funding_source_id].name : '-';
      a.responsible_name = L.prof[a.responsible_user_id] ? L.prof[a.responsible_user_id].full_name : '-';
      a.uom_name = L.uom[a.unit_of_measure_id] ? L.uom[a.unit_of_measure_id].name : '-';
      var loanIds = r[11].data.map(function (li) { return li.loan_id; });
      var loans = r[12].data.filter(function (l) { return loanIds.indexOf(l.id) >= 0; });
      return {
        a: a, L: L, condHist: r[9].data, locHist: r[10].data, loanItems: r[11].data,
        loans: loans, tickets: r[13].data, records: r[14].data,
        dep: (r[15].data || [])[0] || null, depEntries: r[16].data.filter(function (e) { return e.asset_depreciation_id === ((r[15].data || [])[0] || {}).id; }),
        docs: r[17].data, scans: r[18].data,
        transferItems: r[20].data,
        transfers: r[19].data.filter(function (t) { return r[20].data.some(function (ti) { return ti.transfer_id === t.id; }); })
      };
    });
  }

  function render(data) {
    var a = data.a;
    if (!a) {
      document.getElementById('detailHead').innerHTML = UI.pageHeader('Aset tidak ditemukan', 'Data tidak tersedia atau telah dihapus');
      return;
    }
    var L = data.L;
    document.getElementById('detailHead').innerHTML = UI.pageHeader(
      '<i class="bi bi-box-seam me-2"></i>' + UI.esc(a.asset_name),
      a.asset_code + ' · ' + UI.badge(a.asset_status) + ' ' + UI.badge(a.condition_name),
      (canManage ? '<button class="btn btn-primary btn-sm" id="actEdit"><i class="bi bi-pencil me-1"></i>Ubah</button>' : '') +
      (a.qr_token ? '<button class="btn btn-outline-dark btn-sm" id="actQr"><i class="bi bi-qr-code me-1"></i>QR</button>' : '') +
      '<button class="btn btn-outline-secondary btn-sm" id="actBack"><i class="bi bi-arrow-left me-1"></i>Kembali</button>');

    /* ---------- SIDEBAR ---------- */
    document.getElementById('detailSide').innerHTML =
      '<div class="card amp-card mb-3"><div class="card-body text-center">' +
      '<div class="amp-asset-photo mb-2"><i class="bi bi-image"></i></div>' +
      '<div class="text-muted small">Foto barang' + (a.photo_path ? '' : ' belum diunggah') + '</div></div></div>' +
      '<div class="card amp-card mb-3"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">QR Code Aset</h6></div>' +
      '<div class="card-body text-center">' +
      (a.qr_token ? '<div id="qrHolder" class="d-inline-block mb-2"></div>' +
        '<div class="text-muted small mb-2" style="word-break:break-all">' + UI.esc(a.qr_token) + '</div>' +
        '<div class="d-grid gap-1"><button class="btn btn-outline-dark btn-sm" id="qrDl"><i class="bi bi-download me-1"></i>Unduh PNG</button>' +
        '<button class="btn btn-outline-dark btn-sm" id="qrLbl"><i class="bi bi-printer me-1"></i>Cetak Label</button>' +
        '<button class="btn btn-outline-dark btn-sm" id="qrCard"><i class="bi bi-card-text me-1"></i>Kartu Inventaris</button></div>'
        : '<div class="text-muted py-3"><i class="bi bi-qr-code fs-1 d-block mb-2"></i>QR Code belum dibuat<br><span class="small">Aset akan mendapatkan QR setelah terverifikasi.</span></div>') +
      '</div></div>' +
      '<div class="card amp-card"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">Aksi Cepat</h6></div><div class="card-body d-grid gap-2">' +
      '<button class="btn btn-outline-primary btn-sm" id="actCond"><i class="bi bi-clipboard-pulse me-1"></i>Perbarui Kondisi</button>' +
      '<button class="btn btn-outline-warning btn-sm" id="actMaint"><i class="bi bi-wrench me-1"></i>Ajukan Pemeliharaan</button>' +
      (a.asset_status === 'Aktif' ? '<button class="btn btn-outline-info btn-sm" id="actLoan"><i class="bi bi-arrow-left-right me-1"></i>Ajukan Peminjaman</button>' : '') +
      '</div></div>';

    /* ---------- QR ---------- */
    if (a.qr_token) {
      QRA.render(document.getElementById('qrHolder'), a.qr_token, 140);
      document.getElementById('qrDl').onclick = function () { QRA.download(a); };
      document.getElementById('qrLbl').onclick = function () { QRA.printLabels([a], L.orgName || ''); };
      document.getElementById('qrCard').onclick = function () { QRA.printCard(a, L.orgName || '', a.specification); };
    }

    /* ---------- MAIN TABS ---------- */
    var tabs = [
      ['info', 'Informasi', renderInfo],
      ['hist', 'Riwayat', renderHistory],
      ['loan', 'Peminjaman', renderLoans],
      ['maint', 'Pemeliharaan', renderMaint],
      ['dep', 'Penyusutan', renderDep],
      ['doc', 'Dokumen', renderDocs],
      ['scan', 'Pemindaian', renderScans]
    ];
    document.getElementById('detailMain').innerHTML =
      '<ul class="nav nav-tabs mb-0" id="detailTabs">' +
      tabs.map(function (t, i) { return '<li class="nav-item"><a class="nav-link' + (i === 0 ? ' active' : '') + '" data-bs-toggle="tab" href="#tab-' + t[0] + '">' + t[1] + '</a></li>'; }).join('') +
      '</ul><div class="tab-content bg-surface">' +
      tabs.map(function (t, i) { return '<div class="tab-pane fade' + (i === 0 ? ' show active' : '') + '" id="tab-' + t[0] + '"><div class="card amp-card border-top-0" style="border-top-left-radius:0"><div class="card-body">' + '' + '</div></div></div>'; }).join('') +
      '</div>';
    tabs.forEach(function (t) { t[2](document.querySelector('#tab-' + t[0] + ' .card-body'), data); });

    function renderInfo(el) {
      el.innerHTML = '<div class="row amp-detail-grid">' +
        UI.kv('Kode Inventaris', '<span class="amp-asset-code">' + UI.esc(a.asset_code || '(draft)') + '</span>') +
        UI.kv('Kategori', UI.esc(a.category_name)) +
        UI.kv('Merek', UI.esc(a.brand || '-')) +
        UI.kv('Tipe / Model', UI.esc(a.model || '-')) +
        UI.kv('Nomor Seri', UI.esc(a.serial_number || '-')) +
        UI.kv('Satuan / Jumlah', UI.esc(a.uom_name) + ' / ' + a.quantity) +
        UI.kv('Spesifikasi', UI.esc(a.specification || '-')) +
        UI.kv('Deskripsi', UI.esc(a.description || '-')) +
        UI.kv('Tgl Perolehan', UI.fdate(a.acquisition_date)) +
        UI.kv('Nilai Perolehan', UI.rp(a.acquisition_cost)) +
        UI.kv('Pemasok', UI.esc(a.supplier_name)) +
        UI.kv('Sumber Dana', UI.esc(a.funding_name)) +
        UI.kv('Nomor Invoice', UI.esc(a.invoice_number || '-')) +
        UI.kv('Metode Pengadaan', UI.esc(a.acquisition_method || '-')) +
        UI.kv('Unit Pemilik', UI.esc(a.unit_name)) +
        UI.kv('Lokasi', UI.esc(a.location_name || '<span class="text-warning">Tanpa lokasi</span>')) +
        UI.kv('Penanggung Jawab', UI.esc(a.responsible_name)) +
        UI.kv('Status Kepemilikan', UI.esc(a.ownership_status || '-')) +
        UI.kv('Garansi', UI.fdate(a.warranty_start_date) + ' s.d. ' + UI.fdate(a.warranty_end_date)) +
        UI.kv('Dibuat', UI.fdatetime(a.created_at)) +
        UI.kv('Diperbarui', UI.fdatetime(a.updated_at)) +
        '</div>';
    }
    function renderHistory(el) {
      var items = [];
      data.condHist.forEach(function (h) {
        items.push({ title: 'Kondisi: ' + (L.cond[h.old_condition_id] ? L.cond[h.old_condition_id].condition_name : '-') + ' → ' + (L.cond[h.new_condition_id] ? L.cond[h.new_condition_id].condition_name : '-'),
          when: h.inspection_date, by: (L.prof[h.inspected_by] || {}).full_name || '-', note: h.notes, color: 'warning' });
      });
      data.locHist.forEach(function (h) {
        items.push({ title: 'Lokasi: ' + (L.loc[h.old_location_id] ? L.loc[h.old_location_id].location_name : '-') + ' → ' + (L.loc[h.new_location_id] ? L.loc[h.new_location_id].location_name : '-'),
          when: h.movement_date, by: (L.prof[h.approved_by] || {}).full_name || '-', note: h.notes, color: 'info' });
      });
      el.innerHTML = UI.timeline(items.sort(function (x, y) { return String(y.when).localeCompare(String(x.when)); }));
    }
    function renderLoans(el) {
      if (!data.loans.length) { el.innerHTML = UI.emptyState('Belum pernah dipinjam', 'arrow-left-right'); return; }
      UI.dataTable({
        mount: el, toolbar: false, search: false,
        columns: [
          { key: 'loan_number', label: 'No. Peminjaman' },
          { key: 'borrower_id', label: 'Peminjam', render: function (l) { return UI.esc((L.prof[l.borrower_id] || {}).full_name || '-'); } },
          { key: 'request_date', label: 'Tgl Pinjam', render: function (l) { return UI.fdate(l.request_date); } },
          { key: 'planned_return_date', label: 'Rencana Kembali', render: function (l) { return UI.fdate(l.planned_return_date); } },
          { key: 'status', label: 'Status', render: function (l) { return UI.badge(l.status); } },
          { key: 'purpose', label: 'Tujuan' }
        ], rows: data.loans, pageSize: 5
      });
    }
    function renderMaint(el) {
      var rows = data.tickets.map(function (t) {
        var rec = data.records.find(function (x) { return x.maintenance_id === t.id; });
        return Object.assign({}, t, { cost: rec ? rec.total_cost : null });
      });
      if (!rows.length) { el.innerHTML = UI.emptyState('Tidak ada tiket pemeliharaan', 'wrench'); return; }
      UI.dataTable({
        mount: el, toolbar: false, search: false,
        columns: [
          { key: 'ticket_number', label: 'No. Tiket' },
          { key: 'report_date', label: 'Tanggal', render: function (t) { return UI.fdate(t.report_date); } },
          { key: 'damage_description', label: 'Kerusakan' },
          { key: 'status', label: 'Status', render: function (t) { return UI.badge(t.status); } },
          { key: 'cost', label: 'Biaya', class: 'text-end', render: function (t) { return t.cost !== null && t.cost !== undefined ? UI.rp(t.cost) : '-'; } }
        ], rows: rows, pageSize: 5
      });
    }
    function renderDep(el) {
      var d = data.dep;
      if (!d) { el.innerHTML = UI.emptyState('Aset ini tidak memiliki jadwal penyusutan (bukan aset tetap / tanah)', 'graph-down-arrow'); return; }
      el.innerHTML = '<div class="row amp-detail-grid mb-3">' +
        UI.kv('Harga Perolehan', UI.rp(d.acquisition_cost)) +
        UI.kv('Nilai Residu', UI.rp(d.residual_value)) +
        UI.kv('Nilai Dapat Disusutkan', UI.rp(d.depreciable_amount)) +
        UI.kv('Umur Manfaat', d.useful_life_months + ' bulan') +
        UI.kv('Metode', d.depreciation_method === 'straight_line' ? 'Garis Lurus' : 'Saldo Menurun') +
        UI.kv('Penyusutan per Bulan', UI.rp(d.monthly_depreciation)) +
        UI.kv('Akumulasi Penyusutan', UI.rp(d.accumulated_depreciation)) +
        UI.kv('Nilai Buku Saat Ini', '<strong class="text-success">' + UI.rp(d.current_book_value) + '</strong>') +
        UI.kv('Status', UI.badge(d.depreciation_status)) + '</div>' +
        '<h6 class="fw-bold">Entri Penyusutan Terakhir</h6><div id="depEntryTbl"></div>';
      UI.dataTable({
        mount: '#depEntryTbl', toolbar: false, search: false, pageSize: 6,
        columns: [
          { key: 'posted_at', label: 'Periode', render: function (e) { return UI.fdate(e.posted_at); } },
          { key: 'depreciation_amount', label: 'Penyusutan', class: 'text-end', render: function (e) { return UI.rp(e.depreciation_amount); } },
          { key: 'accumulated_after', label: 'Akumulasi', class: 'text-end', render: function (e) { return UI.rp(e.accumulated_after); } },
          { key: 'book_value_after', label: 'Nilai Buku', class: 'text-end', render: function (e) { return UI.rp(e.book_value_after); } }
        ], rows: data.depEntries
      });
    }
    function renderDocs(el) {
      if (!data.docs.length) { el.innerHTML = UI.emptyState('Belum ada dokumen terlampir', 'file-earmark'); return; }
      el.innerHTML = data.docs.map(function (d) {
        return '<div class="d-flex align-items-center gap-2 border-bottom pb-2 mb-2"><i class="bi bi-file-earmark-text fs-4 text-primary"></i>' +
          '<div class="flex-grow-1"><div class="fw-semibold small">' + UI.esc(d.document_type) + ' — ' + UI.esc(d.document_number || '-') + '</div>' +
          '<div class="text-muted small">' + UI.esc(d.description || '') + ' · ' + UI.fdate(d.created_at) + '</div></div>' +
          '<span class="badge text-bg-light border">' + (d.file_path ? 'File tersedia' : 'Referensi') + '</span></div>';
      }).join('');
    }
    function renderScans(el) {
      if (!data.scans.length) { el.innerHTML = UI.emptyState('Belum pernah dipindai', 'qr-code-scan'); return; }
      UI.dataTable({
        mount: el, toolbar: false, search: false, pageSize: 6,
        columns: [
          { key: 'scanned_at', label: 'Waktu', render: function (s) { return UI.fdatetime(s.scanned_at); } },
          { key: 'scanned_by', label: 'Pemindai', render: function (s) { return UI.esc((L.prof[s.scanned_by] || {}).full_name || '-'); } },
          { key: 'scan_action', label: 'Aksi', render: function (s) { return UI.esc(s.scan_action); } },
          { key: 'device_info', label: 'Perangkat' }
        ], rows: data.scans
      });
    }

    /* ---------- ACTIONS ---------- */
    document.getElementById('actBack').onclick = function () { history.back(); };
    if (canManage) {
      document.getElementById('actEdit').onclick = function () { location.href = 'assets.html?q=' + encodeURIComponent(a.asset_code || a.asset_name); };
    }
    document.getElementById('actCond').onclick = function () {
      DB.list('asset_conditions', {}).then(function (r) {
        UI.formModal({
          title: 'Perbarui Kondisi Aset', submitText: 'Simpan',
          fields: [
            { name: 'new_condition_id', label: 'Kondisi Baru', type: 'select', required: true, options: r.data.map(function (c) { return { value: c.id, label: c.condition_name }; }) },
            { name: 'notes', label: 'Catatan Pemeriksaan', type: 'textarea' }
          ],
          onSubmit: function (d2) {
            return DB.insert('asset_condition_histories', {
              asset_id: a.id, old_condition_id: a.current_condition_id, new_condition_id: d2.new_condition_id,
              inspection_date: UI.todayISO(), notes: d2.notes || null, inspected_by: Auth.userId()
            }).then(function (ins) {
              return DB.update('assets', a.id, { current_condition_id: d2.new_condition_id });
            }).then(function (r2) {
              if (r2.error) throw r2.error;
              UI.toast('success', 'Kondisi diperbarui');
              loadAll().then(render);
            });
          }
        });
      });
    };
    document.getElementById('actMaint').onclick = function () {
      UI.formModal({
        title: 'Ajukan Tiket Pemeliharaan', submitText: 'Kirim Tiket',
        fields: [
          { name: 'damage_description', label: 'Deskripsi Kerusakan', type: 'textarea', required: true },
          { name: 'priority', label: 'Tingkat Urgensi', type: 'select', options: ['Rendah', 'Sedang', 'Tinggi'], value: 'Sedang' }
        ],
        onSubmit: function (d2) {
          return DB.nextNumber('TKT', 'maintenance_requests', 'ticket_number').then(function (num) {
            return DB.insert('maintenance_requests', {
              organization_id: Auth.orgId(), ticket_number: num, asset_id: a.id,
              reported_by: Auth.userId(), report_date: UI.todayISO(),
              damage_description: d2.damage_description, priority: d2.priority,
              status: 'Open', maintenance_type: 'Corrective Maintenance'
            });
          }).then(function () {
            DB.insert('notifications', { user_id: null, title: 'Tiket pemeliharaan baru', message: 'Aset ' + a.asset_code + ' dilaporkan rusak oleh ' + (Auth.profile().full_name || 'pengguna'), notification_type: 'maintenance_new', related_table: 'maintenance_requests', is_read: false });
            UI.toast('success', 'Tiket pemeliharaan dibuat');
            loadAll().then(render);
          });
        }
      });
    };
    var actLoan = document.getElementById('actLoan');
    if (actLoan) actLoan.onclick = function () {
      location.href = 'loans.html?asset=' + a.id;
    };
  }

  loadAll().then(function (data) {
    DB.list('organizations', { limit: 1 }).then(function (r) {
      if (data.L) data.L.orgName = (r.data[0] || {}).name || '';
      render(data);
    });
  });
};
