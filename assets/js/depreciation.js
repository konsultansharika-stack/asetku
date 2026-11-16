/* =====================================================================
 * ASSET MANAGEMENT PRO — depreciation.js
 * Penyusutan: garis lurus & saldo menurun, periode, posting, simulasi.
 * Akumulasi tidak boleh melebihi nilai yang dapat disusutkan;
 * satu periode tidak dapat diposting dua kali untuk aset yang sama.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();
  var canPost = Auth.can('process.depreciation') || Auth.isAdmin() || Auth.roles().indexOf('keuangan') >= 0;

  function loadAll() {
    return Promise.all([
      DB.list('asset_depreciations', { order: 'created_at', asc: false }),
      DB.list('assets', {}), DB.list('depreciation_periods', { order: 'period_year', asc: false }),
      DB.list('depreciation_entries', {}),
      DB.list('depreciation_settings', {}), DB.list('asset_categories', {})
    ]).then(function (r) {
      return {
        deps: r[0].data, assets: r[1].data, periods: r[2].data.sort(function (a, b) {
          return (b.period_year + '-' + String(b.period_month).padStart(2, '0')).localeCompare(a.period_year + '-' + String(a.period_month).padStart(2, '0'));
        }), entries: r[3].data, settings: r[4].data, cats: r[5].data
      };
    });
  }

  function monthsBetween(d1, d2) {
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  }

  function render(d) {
    var assetMap = UI.mapBy(d.assets, 'id');
    d.deps.forEach(function (x) {
      var a = assetMap[x.asset_id] || {};
      x.asset_name = a.asset_name || '-';
      x.asset_code = a.asset_code || '-';
      x.method_label = x.depreciation_method === 'straight_line' ? 'Garis Lurus' : x.depreciation_method === 'declining' ? 'Saldo Menurun' : 'Tidak Disusutkan';
    });

    document.getElementById('pageHead').innerHTML = UI.pageHeader('Penyusutan Aset Tetap',
      'Perhitungan penyusutan manajerial — garis lurus (SLM) dan saldo menurun (DBM), periode & posting',
      (canPost ? '<button class="btn btn-primary btn-sm" id="postBtn"><i class="bi bi-lightning-charge me-1"></i>Posting Periode Terbuka</button>' : '') +
      '<button class="btn btn-outline-secondary btn-sm" id="expDep"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>');

    /* ---- Tab: Aset & Nilai Buku ---- */
    UI.dataTable({
      mount: '#depTable',
      columns: [
        { key: 'asset_code', label: 'Kode / Aset', render: function (x) { return '<a class="text-decoration-none" href="asset-detail.html?id=' + x.asset_id + '"><span class="amp-asset-code">' + UI.esc(x.asset_code) + '</span></a><div class="small">' + UI.esc(x.asset_name) + '</div>'; } },
        { key: 'acquisition_cost', label: 'Perolehan', class: 'text-end', render: function (x) { return UI.rp(x.acquisition_cost); } },
        { key: 'residual_value', label: 'Residu', class: 'text-end', render: function (x) { return UI.rp(x.residual_value); } },
        { key: 'useful_life_months', label: 'Umur', class: 'text-center', render: function (x) { return x.useful_life_months + ' bln'; } },
        { key: 'method_label', label: 'Metode' },
        { key: 'monthly_depreciation', label: 'Per Bulan', class: 'text-end', render: function (x) { return UI.rp(x.monthly_depreciation); } },
        { key: 'accumulated_depreciation', label: 'Akumulasi', class: 'text-end', render: function (x) { return UI.rp(x.accumulated_depreciation); } },
        { key: 'current_book_value', label: 'Nilai Buku', class: 'text-end', render: function (x) { return '<strong class="text-success">' + UI.rp(x.current_book_value) + '</strong>'; } },
        { key: 'depreciation_status', label: 'Status', render: function (x) { return UI.badge(x.depreciation_status); } }
      ],
      rows: d.deps, pageSize: 10,
      footerTotals: function (rowsArr, col) {
        if (col.key === 'accumulated_depreciation') return 'Total: ' + UI.rp(rowsArr.reduce(function (s, x) { return s + (x.accumulated_depreciation || 0); }, 0));
        if (col.key === 'current_book_value') return '<span class="text-success">' + UI.rp(rowsArr.reduce(function (s, x) { return s + (x.current_book_value || 0); }, 0)) + '</span>';
        if (col.key === 'acquisition_cost') return UI.rp(rowsArr.reduce(function (s, x) { return s + (x.acquisition_cost || 0); }, 0));
        return '';
      }
    });
    document.getElementById('expDep').onclick = function () {
      UI.exportExcel('penyusutan-aset.xlsx', d.deps.map(function (x) {
        return { Kode: x.asset_code, Aset: x.asset_name, 'Harga Perolehan': x.acquisition_cost, 'Nilai Residu': x.residual_value,
          'Nilai Dapat Disusutkan': x.depreciable_amount, 'Umur (bulan)': x.useful_life_months, Metode: x.method_label,
          'Penyusutan/Bulan': x.monthly_depreciation, 'Akumulasi': x.accumulated_depreciation, 'Nilai Buku': x.current_book_value, Status: x.depreciation_status };
      }));
    };

    /* ---- Tab: Periode ---- */
    var periodRows = d.periods.map(function (p) {
      var nEntries = d.entries.filter(function (e) { return e.period_id === p.id; }).length;
      var total = d.entries.filter(function (e) { return e.period_id === p.id; }).reduce(function (s, e) { return s + e.depreciation_amount; }, 0);
      return Object.assign({}, p, { nEntries: nEntries, total: total, label: p.period_year + '-' + String(p.period_month).padStart(2, '0') });
    });
    UI.dataTable({
      mount: '#periodTable',
      columns: [
        { key: 'label', label: 'Periode' },
        { key: 'status', label: 'Status', render: function (p) { return UI.badge(p.status === 'Open' ? 'Open Periode' : 'Closed'); } },
        { key: 'nEntries', label: 'Entri', class: 'text-center' },
        { key: 'total', label: 'Total Penyusutan', class: 'text-end', render: function (p) { return UI.rp(p.total); } },
        { key: 'closed_at', label: 'Ditutup', render: function (p) { return p.closed_at ? UI.fdate(p.closed_at) : '-'; } }
      ],
      rows: periodRows, pageSize: 14,
      actions: function (p) {
        if (!canPost) return '';
        if (p.status === 'Open') {
          return UI.iconBtn('Tutup Periode', 'lock', 'data-act="close" data-id="' + p.id + '"', 'btn-outline-danger') +
            UI.iconBtn('Posting Periode Ini', 'lightning-charge', 'data-act="post" data-id="' + p.id + '"', 'btn-outline-primary');
        }
        return '<span class="text-muted small"><i class="bi bi-lock"></i></span>';
      }
    });
    document.getElementById('periodTable').onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var p = d.periods.find(function (x) { return x.id === b.dataset.id; });
      if (b.dataset.act === 'post') postPeriod(d, p);
      else if (b.dataset.act === 'close') closePeriod(d, p);
    };
    var postBtn = document.getElementById('postBtn');
    if (postBtn) postBtn.onclick = function () {
      var open = d.periods.find(function (p) { return p.status === 'Open'; });
      if (!open) return UI.toast('warning', 'Tidak ada periode terbuka');
      postPeriod(d, open);
    };

    /* ---- Tab: Kebijakan ---- */
    var catMap = UI.mapBy(d.cats, 'id');
    document.getElementById('depSettings').innerHTML =
      '<div class="card amp-card"><div class="card-body p-0">' +
      '<table class="table mb-0"><thead><tr><th>Kategori</th><th>Metode</th><th>Umur (bulan)</th><th>Residu (%)</th><th>Status</th><th></th></tr></thead><tbody>' +
      d.settings.map(function (s) {
        return '<tr><td>' + UI.esc(s.category_id ? (catMap[s.category_id] ? catMap[s.category_id].category_name : 'Default Semua Kategori') : 'Default Semua Kategori') + '</td>' +
          '<td>' + UI.esc(s.depreciation_method === 'straight_line' ? 'Garis Lurus' : s.depreciation_method === 'declining' ? 'Saldo Menurun' : s.depreciation_method) + '</td>' +
          '<td>' + s.default_useful_life_months + '</td><td>' + s.default_residual_percentage + '%</td>' +
          '<td>' + UI.badge(s.is_active ? 'Aktif' : 'Diarsipkan') + '</td>' +
          '<td class="text-end">' + (canPost ? UI.iconBtn('Ubah', 'pencil', 'data-set="' + s.id + '"', 'btn-outline-primary') : '') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="p-3 text-muted small"><i class="bi bi-info-circle me-1"></i>Tanah tidak disusutkan. Penyusutan hanya untuk aset tetap. Perhitungan ini bersifat manajerial; integrasi jurnal akuntansi resmi opsional.</div></div></div>';
    document.getElementById('depSettings').onclick = function (e) {
      var b = e.target.closest('[data-set]'); if (!b || !canPost) return;
      var s = d.settings.find(function (x) { return x.id === b.dataset.set; });
      UI.formModal({
        title: 'Ubah Kebijakan Penyusutan', submitText: 'Simpan',
        fields: [
          { name: 'depreciation_method', label: 'Metode', type: 'select', options: [{ value: 'straight_line', label: 'Garis Lurus' }, { value: 'declining', label: 'Saldo Menurun' }, { value: 'none', label: 'Tidak Disusutkan' }], value: s.depreciation_method },
          { name: 'default_useful_life_months', label: 'Umur Manfaat Default (bulan)', type: 'number', min: 1, value: s.default_useful_life_months },
          { name: 'default_residual_percentage', label: 'Nilai Residu (%)', type: 'number', min: 0, max: 90, value: s.default_residual_percentage },
          { name: 'is_active', label: 'Aktif', type: 'checkbox', value: s.is_active !== false }
        ],
        onSubmit: function (data) {
          return DB.update('depreciation_settings', s.id, data).then(function () { UI.toast('success', 'Kebijakan tersimpan'); reload(); });
        }
      });
    };

    /* ---- Tab: Simulasi ---- */
    document.getElementById('simPanel').innerHTML =
      '<div class="card amp-card"><div class="card-body">' +
      '<div class="row g-2 mb-3"><div class="col-md-6"><label class="form-label">Pilih Aset (penyusutan)</label>' +
      '<select class="form-select" id="simAsset">' + d.deps.map(function (x) {
        return '<option value="' + x.id + '">' + UI.esc(x.asset_code + ' — ' + x.asset_name) + '</option>';
      }).join('') + '</select></div></div>' +
      '<div id="simResult"></div></div></div>';
    function runSim() {
      var x = d.deps.find(function (y) { return y.id === document.getElementById('simAsset').value; });
      if (!x) return;
      var rows = [];
      var accum = 0, bv = x.acquisition_cost;
      for (var m = 1; m <= x.useful_life_months; m++) {
        var dep;
        if (x.depreciation_method === 'straight_line') dep = Math.round(x.depreciable_amount / x.useful_life_months);
        else {
          var rate = 1.5 / x.useful_life_months; // saldo menurun 150%
          dep = Math.round(bv * rate);
          if (bv - dep < x.residual_value) dep = bv - x.residual_value;
        }
        if (accum + dep > x.depreciable_amount) dep = x.depreciable_amount - accum;
        if (dep <= 0) break;
        accum += dep; bv -= dep;
        var dt = new Date(x.depreciation_start_date + 'T00:00:00');
        dt.setMonth(dt.getMonth() + m - 1);
        rows.push({ Bulan: m, Periode: dt.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
          Penyusutan: dep, Akumulasi: accum, 'Nilai Buku': bv });
        if (accum >= x.depreciable_amount) break;
      }
      document.getElementById('simResult').innerHTML =
        '<div class="mb-2 small text-muted">Simulasi jadwal penyusutan — nilai akumulasi dibatasi hingga nilai dapat disusutkan ( ' + UI.rp(x.depreciable_amount) + ' ).</div>' +
        '<div id="simTbl"></div>';
      UI.dataTable({
        mount: '#simTbl', toolbar: false, search: false, pageSize: 12,
        columns: [
          { key: 'Bulan', label: 'Bln', class: 'text-center' },
          { key: 'Periode', label: 'Periode' },
          { key: 'Penyusutan', label: 'Penyusutan', class: 'text-end', render: function (r) { return UI.rp(r.Penyusutan); } },
          { key: 'Akumulasi', label: 'Akumulasi', class: 'text-end', render: function (r) { return UI.rp(r.Akumulasi); } },
          { key: 'Nilai Buku', label: 'Nilai Buku', class: 'text-end', render: function (r) { return UI.rp(r['Nilai Buku']); } }
        ], rows: rows
      });
    }
    document.getElementById('simAsset').onchange = runSim;
    runSim();
  }

  /* ---------------- POSTING PERIODE ---------------- */
  function postPeriod(d, p) {
    var periodEnd = p.period_end;
    var posted = 0, skipped = 0;
    var chains = [];
    var existing = d.entries.filter(function (e) { return e.period_id === p.id; });
    d.deps.forEach(function (x) {
      if (x.depreciation_status !== 'Aktif') { skipped++; return; }
      var start = new Date(x.depreciation_start_date + 'T00:00:00');
      var pd = new Date(periodEnd + 'T00:00:00');
      var elapsed = monthsBetween(start, pd);
      if (elapsed < 0) { skipped++; return; }
      if (existing.some(function (e) { return e.asset_depreciation_id === x.id; })) { skipped++; return; }
      var dep;
      if (x.depreciation_method === 'straight_line') dep = x.monthly_depreciation;
      else {
        var bv = x.acquisition_cost - x.accumulated_depreciation;
        var rate = 1.5 / x.useful_life_months;
        dep = Math.round(bv * rate);
      }
      if (x.accumulated_depreciation + dep > x.depreciable_amount) dep = x.depreciable_amount - x.accumulated_depreciation;
      if (dep <= 0) {
        skipped++;
        DB.update('asset_depreciations', x.id, { depreciation_status: 'Selesai Disusutkan', current_book_value: x.residual_value });
        return;
      }
      chains.push(DB.insert('depreciation_entries', {
        organization_id: org, asset_depreciation_id: x.id, period_id: p.id,
        depreciation_amount: dep,
        accumulated_before: x.accumulated_depreciation,
        accumulated_after: x.accumulated_depreciation + dep,
        book_value_after: x.acquisition_cost - (x.accumulated_depreciation + dep),
        posted_at: new Date().toISOString(), posted_by: Auth.userId()
      }).then(function () {
        var newAccum = x.accumulated_depreciation + dep;
        return DB.update('asset_depreciations', x.id, {
          accumulated_depreciation: newAccum,
          current_book_value: Math.max(x.acquisition_cost - newAccum, x.residual_value),
          depreciation_status: newAccum >= x.depreciable_amount ? 'Selesai Disusutkan' : 'Aktif'
        });
      }));
      posted++;
    });
    if (!chains.length) { UI.toast('warning', 'Tidak ada entri baru untuk diposting pada periode ini (cek status periode/aset)'); return; }
    UI.confirmDialog({
      title: 'Posting penyusutan periode ' + p.period_year + '-' + String(p.period_month).padStart(2, '0') + '?',
      html: '<strong>' + posted + '</strong> aset akan diposting, ' + skipped + ' dilewati (sudah diposting / tidak aktif).'
    }).then(function (ok) {
      if (!ok) return;
      Promise.all(chains).then(function () {
        DB.insert('audit_logs', { organization_id: org, user_id: Auth.userId(), user_name: (Auth.profile() || {}).full_name, action: 'POST_DEPRECIATION', table_name: 'depreciation_entries', record_id: p.id, created_at: new Date().toISOString() });
        DB.insert('notifications', { user_id: null, title: 'Penyusutan diposting', message: posted + ' entri penyusutan periode ' + p.period_year + '-' + String(p.period_month).padStart(2, '0') + ' berhasil diposting.', notification_type: 'depreciation_period', is_read: false });
        UI.toast('success', posted + ' entri penyusutan berhasil diposting');
        reload();
      }).catch(function (e) { UI.toast('error', e.message); });
    });
  }

  function closePeriod(d, p) {
    UI.confirmDialog({
      title: 'Tutup periode ' + p.period_year + '-' + String(p.period_month).padStart(2, '0') + '?',
      html: 'Periode tertutup tidak dapat diposting lagi — mekanisme penutupan mencegah posting ganda.', danger: true, confirmText: 'Tutup Periode'
    }).then(function (ok) {
      if (!ok) return;
      DB.update('depreciation_periods', p.id, { status: 'Closed', closed_by: Auth.userId(), closed_at: new Date().toISOString() })
        .then(function () { UI.toast('success', 'Periode ditutup'); reload(); });
    });
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
