/* =====================================================================
 * ASSET MANAGEMENT PRO — dashboard.js
 * Statistik 14 indikator, grafik Chart.js, widget perhatian.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var cache = { assets: [], deps: [], schedules: [], loans: [], loanItems: [], reqs: [], opnameItems: [] };
  var filters = { unit: '', category: '' };
  var charts = [];

  function dateOnly(iso) { return iso ? String(iso).slice(0, 10) : null; }
  function today() { return new Date().toISOString().slice(0, 10); }

  function loadAll() {
    return Promise.all([
      DB.list('assets', { order: 'created_at', asc: false, limit: 1000 }),
      DB.list('asset_depreciations', { limit: 1000 }),
      DB.list('maintenance_schedules', { order: 'schedule_date', asc: true, limit: 300 }),
      DB.list('loan_requests', { limit: 300 }),
      DB.list('loan_items', { limit: 500 }),
      DB.list('procurement_requests', { limit: 200 }),
      DB.list('stock_opname_items', { limit: 2000 })
    ]).then(function (r) {
      cache.assets = r[0].data || [];
      cache.deps = r[1].data || [];
      cache.schedules = r[2].data || [];
      cache.loans = r[3].data || [];
      cache.loanItems = r[4].data || [];
      cache.reqs = r[5].data || [];
      cache.opnameItems = r[6].data || [];
      return cache;
    });
  }

  function renderHero() {
    return Promise.all([DB.list('organizations', { limit: 1 }), DB.list('units', {})]).then(function (r) {
      var org = (r[0].data || [])[0] || {};
      var prof = Auth.profile();
      var hero = document.getElementById('dashHero');
      hero.className = 'amp-hero';
      hero.innerHTML =
        '<div><h5>Selamat datang, ' + UI.esc(prof ? prof.full_name.split(',')[0] : 'Pengguna') + '</h5>' +
        '<div class="amp-hero-sub">' + UI.esc(org.name || '') + ' · ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</div></div>' +
        '<div class="d-flex flex-wrap gap-2">' +
        '<span class="amp-hero-chip"><i class="bi bi-boxes me-1"></i>' + cache.assets.filter(activeAsset).length + ' aset aktif</span>' +
        '<span class="amp-hero-chip"><i class="bi bi-' + (DB.isDemo() ? 'cone-striped' : 'cloud-check') + ' me-1"></i>' + (DB.isDemo() ? 'Mode Demo' : 'Supabase') + '</span>' +
        '<span class="amp-hero-chip"><i class="bi bi-shield-check me-1"></i>' + Auth.roles().map(function (x) { return Auth.roleLabel(x); }).join(', ') + '</span></div>';
    });
  }

  function activeAsset(a) { return a.asset_status !== 'Dihapuskan'; }
  function rpCompact(n) {
    if (!n) return 'Rp 0';
    if (n >= 1e12) return 'Rp ' + (n / 1e12).toFixed(2).replace('.', ',') + ' T';
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(1).replace('.', ',') + ' jt';
    return UI.rp(n);
  }
  function filtered() {
    return cache.assets.filter(activeAsset).filter(function (a) {
      if (filters.unit && a.unit_id !== filters.unit) return false;
      if (filters.category && a.category_id !== filters.category) return false;
      return true;
    });
  }
  function depMap() { return UI.mapBy(cache.deps, 'asset_id'); }

  function renderStats() {
    var rows = filtered();
    var dm = depMap();
    var sum = function (arr, f) { return arr.reduce(function (s, a) { return s + (f(a) || 0); }, 0); };
    var condId = function (code) {
      var el = document.createElement('div');
      // kondisi via id konvensi seed: cond-*
      return code;
    };
    function countByCond(assets, names) {
      return assets.filter(function (a) { return names.indexOf(a.current_condition_id) >= 0; }).length;
    }
    var bookValue = rows.reduce(function (s, a) {
      var d = dm[a.id];
      if (d) return s + (d.current_book_value || 0);
      return s + (a.acquisition_cost || 0);
    }, 0);
    var cards = [
      ['boxes', 'Total Seluruh Barang', rows.length, 'primary', UI.num(sum(rows, function (a) { return a.quantity; })) + ' unit fisik'],
      ['building', 'Aset Tetap', rows.filter(function (a) { return a.asset_type === 'fixed'; }).length, 'dark', 'tanah, bangunan, kendaraan'],
      ['hdd-stack', 'Aset Bergerak / Inventaris', rows.filter(function (a) { return a.asset_type === 'inventory'; }).length, 'info', 'barang inventaris individual'],
      ['basket', 'Barang Habis Pakai', rows.filter(function (a) { return a.asset_type === 'consumable'; }).length, 'warning', 'dikelola per stok kuantitas'],
      ['cash-coin', 'Nilai Perolehan', rpCompact(sum(rows, function (a) { return a.acquisition_cost; })), 'success', 'total harga perolehan'],
      ['graph-down-arrow', 'Nilai Buku', rpCompact(bookValue), 'success', 'setelah penyusutan'],
      ['check2-circle', 'Kondisi Baik', countByCond(rows, ['cond-baik', 'cond-baru']), 'success', 'baik & baru'],
      ['exclamation-triangle', 'Rusak Ringan', countByCond(rows, ['cond-rr']), 'warning', 'perlu diperbaiki'],
      ['x-octagon', 'Rusak Berat', countByCond(rows, ['cond-rb', 'cond-tf']), 'danger', 'usulan penghapusan'],
      ['arrow-left-right', 'Sedang Dipinjam', rows.filter(function (a) { return a.asset_status === 'Dipinjam'; }).length, 'info', 'tambah terlambat: ' + countLate()],
      ['wrench', 'Dalam Pemeliharaan', rows.filter(function (a) { return a.asset_status === 'Dalam Pemeliharaan'; }).length, 'warning', 'tiket aktif'],
      ['question-circle', 'Hilang', rows.filter(function (a) { return a.asset_status === 'Hilang' || a.current_condition_id === 'cond-hilang'; }).length, 'danger', 'perlu klarifikasi'],
      ['archive', 'Dihapuskan', cache.assets.filter(function (a) { return a.asset_status === 'Dihapuskan'; }).length, 'secondary', 'diarsipkan'],
      ['qr-code', 'Belum Ada QR', rows.filter(function (a) { return !a.qr_token; }).length, 'danger', 'buat QR Code sekarang']
    ];
    document.getElementById('dashStats').innerHTML = cards.map(function (c) {
      return UI.statCard(c[0], c[1], c[2], c[3], c[4]);
    }).join('');
    function countLate() {
      return cache.loans.filter(function (l) {
        return l.status === 'Dipinjam' && l.planned_return_date && l.planned_return_date < today();
      }).length;
    }
  }

  function renderFilters() {
    return Promise.all([DB.list('units', {}), DB.list('asset_categories', {})]).then(function (r) {
      var units = r[0].data || [], cats = r[1].data || [];
      var el = document.getElementById('dashFilters');
      el.innerHTML =
        '<span class="text-muted small"><i class="bi bi-funnel"></i> Filter:</span>' +
        '<select class="form-select form-select-sm" style="width:auto" id="fUnit"><option value="">Semua Unit</option>' +
        units.map(function (u) { return '<option value="' + u.id + '">' + UI.esc(u.name) + '</option>'; }).join('') + '</select>' +
        '<select class="form-select form-select-sm" style="width:auto" id="fCat"><option value="">Semua Kategori</option>' +
        cats.map(function (c) { return '<option value="' + c.id + '">' + UI.esc(c.category_name) + '</option>'; }).join('') + '</select>';
      el.querySelector('#fUnit').addEventListener('change', function (e) { filters.unit = e.target.value; refresh(); });
      el.querySelector('#fCat').addEventListener('change', function (e) { filters.category = e.target.value; refresh(); });
    });
  }

  /* ---------------- CHARTS ---------------- */
  var THEME = { txt: '#64748b', grid: 'rgba(148,163,184,.18)' };
  function palette(n) {
    var P = ['#2f6fd0', '#198754', '#fd7e14', '#dc3545', '#6f42c1', '#20c997', '#d63384', '#6c757d', '#adb5bd', '#ffc107', '#0dcaf0', '#6610f2', '#e35d6a', '#35b99f', '#98a6d3', '#5b8def', '#f19a3e', '#3aa061', '#b02a37', '#4dabf5'];
    return P.slice(0, Math.max(n, 3));
  }
  function baseOpts(legendPos, yMoney) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: legendPos || 'bottom', labels: { color: THEME.txt, boxWidth: 12, font: { size: 10 } } },
        tooltip: { callbacks: yMoney ? { label: function (c) { return (c.dataset.label ? c.dataset.label + ': ' : '') + UI.rp(c.parsed.y !== undefined && c.parsed.y !== null ? c.parsed.y : c.parsed); } } : {} }
      },
      scales: legendPos === false ? {} : {
        x: { ticks: { color: THEME.txt, font: { size: 10 } }, grid: { color: THEME.grid } },
        y: { ticks: { color: THEME.txt, font: { size: 10 }, callback: yMoney ? function (v) { return 'Rp' + (v / 1e6) + 'jt'; } : v }, grid: { color: THEME.grid }, beginAtZero: true }
      }
    };
  }
  function mkChart(id, cfg) {
    var el = document.getElementById(id);
    if (!el) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(el, cfg);
  }

  function renderCharts() {
    var rows = filtered();
    var cats = {}, units = {}, locs = {}, valCat = {};
    return Promise.all([DB.list('asset_categories', {}), DB.list('units', {}), DB.list('locations', {})])
      .then(function (r) {
        var catMap = UI.mapBy(r[0].data, 'id'), unitMap = UI.mapBy(r[1].data, 'id'), locMap = UI.mapBy(r[2].data, 'id');
        var dm = depMap();
        rows.forEach(function (a) {
          var cn = catMap[a.category_id] ? catMap[a.category_id].category_name : 'Lainnya';
          cats[cn] = (cats[cn] || 0) + 1;
          var un = unitMap[a.unit_id] ? unitMap[a.unit_id].name : '-';
          units[un] = (units[un] || 0) + 1;
          var ln = a.current_location_id ? (locMap[a.current_location_id] ? locMap[a.current_location_id].location_name : '-') : 'Tanpa Lokasi';
          locs[ln] = (locs[ln] || 0) + 1;
          if (!valCat[cn]) valCat[cn] = { cost: 0, book: 0 };
          valCat[cn].cost += a.acquisition_cost || 0;
          var d = dm[a.id];
          valCat[cn].book += d ? d.current_book_value : (a.acquisition_cost || 0);
        });
        // per kategori (bar)
        var ck = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; });
        mkChart('chartCat', {
          type: 'bar',
          data: { labels: ck.slice(0, 10), datasets: [{ label: 'Jumlah aset', data: ck.slice(0, 10).map(function (k) { return cats[k]; }), backgroundColor: palette(10), borderRadius: 5, maxBarThickness: 34 }] },
          options: Object.assign(baseOpts(false), { plugins: { legend: { display: false } } })
        });
        // per unit (doughnut)
        mkChart('chartUnit', {
          type: 'doughnut',
          data: { labels: Object.keys(units), datasets: [{ data: Object.values(units), backgroundColor: palette(Object.keys(units).length), borderWidth: 2, borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#16203a' : '#fff' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: THEME.txt, boxWidth: 12, font: { size: 10 } } } } }
        });
        // kondisi (doughnut)
        var condCount = {};
        rows.forEach(function (a) {
          var c = a.current_condition_id ? a.current_condition_id.replace('cond-', '').toUpperCase() : '-';
          condCount[c] = (condCount[c] || 0) + 1;
        });
        mkChart('chartCond', {
          type: 'doughnut',
          data: { labels: Object.keys(condCount), datasets: [{ data: Object.values(condCount), backgroundColor: ['#198754', '#0dcaf0', '#ffc107', '#fd7e14', '#dc3545', '#6c757d', '#212529'], borderWidth: 2, borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#16203a' : '#fff' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: THEME.txt, boxWidth: 12, font: { size: 10 } } } } }
        });
        // tren pengadaan 6 bulan (line)
        var months = [], values = [];
        for (var i = 5; i >= 0; i--) {
          var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
          var y = d.getFullYear(), m = d.getMonth() + 1;
          var key = y + '-' + String(m).padStart(2, '0');
          months.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
          var v = rows.filter(function (a) { return (a.acquisition_date || '').slice(0, 7) === key; })
            .reduce(function (s, a) { return s + (a.acquisition_cost || 0); }, 0);
          values.push(v);
        }
        mkChart('chartTrend', {
          type: 'line',
          data: { labels: months, datasets: [{ label: 'Nilai pengadaan', data: values, borderColor: '#2f6fd0', backgroundColor: 'rgba(47,111,208,.15)', fill: true, tension: .35, pointRadius: 3 }] },
          options: baseOpts(false, true)
        });
        // nilai perolehan vs buku per kategori
        var vk = Object.keys(valCat).sort(function (a, b) { return valCat[b].cost - valCat[a].cost; }).slice(0, 8);
        mkChart('chartValue', {
          type: 'bar',
          data: { labels: vk, datasets: [
            { label: 'Nilai Perolehan', data: vk.map(function (k) { return valCat[k].cost; }), backgroundColor: '#2f6fd0', borderRadius: 4, maxBarThickness: 22 },
            { label: 'Nilai Buku', data: vk.map(function (k) { return valCat[k].book; }), backgroundColor: '#198754', borderRadius: 4, maxBarThickness: 22 }] },
          options: baseOpts(false, true)
        });
        // peminjaman & pengembalian 6 bulan
        var lm = [], ln = [], rn = [];
        for (var j = 5; j >= 0; j--) {
          var d2 = new Date(); d2.setDate(1); d2.setMonth(d2.getMonth() - j);
          var key2 = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0');
          lm.push(d2.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }));
          ln.push(cache.loans.filter(function (l) { return (l.request_date || '').slice(0, 7) === key2; }).length);
          rn.push(cache.loans.filter(function (l) { return (l.status === 'Dikembalikan' || l.status === 'Selesai') && (l.request_date || '').slice(0, 7) === key2; }).length);
        }
        mkChart('chartLoans', {
          type: 'bar',
          data: { labels: lm, datasets: [
            { label: 'Peminjaman', data: ln, backgroundColor: '#2f6fd0', borderRadius: 4, maxBarThickness: 24 },
            { label: 'Dikembalikan', data: rn, backgroundColor: '#198754', borderRadius: 4, maxBarThickness: 24 }] },
          options: baseOpts(false)
        });
        // lokasi teratas (bar horizontal)
        var lk = Object.keys(locs).sort(function (a, b) { return locs[b] - locs[a]; }).slice(0, 8);
        mkChart('chartLoc', {
          type: 'bar',
          data: { labels: lk, datasets: [{ data: lk.map(function (k) { return locs[k]; }), backgroundColor: '#6f42c1', borderRadius: 4, maxBarThickness: 16 }] },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: THEME.txt, font: { size: 10 } }, grid: { color: THEME.grid }, beginAtZero: true }, y: { ticks: { color: THEME.txt, font: { size: 10 } }, grid: { display: false } } } }
        });
      });
  }

  /* ---------------- WIDGETS ---------------- */
  function renderWidgets() {
    var rows = cache.assets.filter(activeAsset);
    var t = today();
    var item = function (icon, color, title, sub, href) {
      return '<a class="amp-widget-item" href="' + href + '"><i class="bi bi-' + icon + ' text-' + color + '"></i>' +
        '<div class="flex-grow-1"><div>' + UI.esc(title) + '</div><div class="amp-widget-code">' + UI.esc(sub || '') + '</div></div>' +
        '<i class="bi bi-chevron-right text-muted"></i></a>';
    };
    var groups = [];
    var needsFix = rows.filter(function (a) { return ['cond-rr', 'cond-rb', 'cond-tf'].indexOf(a.current_condition_id) >= 0; });
    groups.push({ title: 'Aset yang harus segera diperbaiki', n: needsFix.length, color: 'danger',
      items: needsFix.slice(0, 4).map(function (a) { return item('tools', 'danger', a.asset_name, a.asset_code, 'asset-detail.html?id=' + a.id); }),
      more: 'assets.html?condition=cond-rr' });

    var dueSched = cache.schedules.filter(function (s) { return s.status !== 'Selesai'; })
      .sort(function (a, b) { return String(a.schedule_date).localeCompare(String(b.schedule_date)); });
    groups.push({ title: 'Jadwal pemeliharaan berikutnya', n: dueSched.length, color: 'warning',
      items: dueSched.slice(0, 4).map(function (s) {
        var late = s.schedule_date < t;
        return item('calendar-week', late ? 'danger' : 'warning', (late ? '[TERLAMBAT] ' : '') + UI.fdate(s.schedule_date) + ' · ' + s.maintenance_type,
          assetName(s.asset_id), 'maintenance.html');
      }), more: 'maintenance.html' });

    var lateLoans = cache.loans.filter(function (l) { return l.status === 'Dipinjam' && l.planned_return_date && l.planned_return_date < t; });
    groups.push({ title: 'Barang terlambat dikembalikan', n: lateLoans.length, color: 'danger',
      items: lateLoans.slice(0, 4).map(function (l) { return item('alarm', 'danger', l.loan_number + ' · ' + UI.fdate(l.planned_return_date), assetName((cache.loanItems.find(function (li) { return li.loan_id === l.id; }) || {}).asset_id), 'loans.html'); }),
      more: 'loans.html' });

    var unverified = rows.filter(function (a) { return a.asset_status === 'Menunggu Verifikasi'; });
    groups.push({ title: 'Aset belum terverifikasi', n: unverified.length, color: 'warning',
      items: unverified.slice(0, 4).map(function (a) { return item('patch-question', 'warning', a.asset_name, a.asset_code, 'asset-detail.html?id=' + a.id); }),
      more: 'assets.html?status=Menunggu%20Verifikasi' });

    var noLoc = rows.filter(function (a) { return !a.current_location_id; });
    groups.push({ title: 'Aset belum memiliki lokasi', n: noLoc.length, color: 'secondary',
      items: noLoc.slice(0, 4).map(function (a) { return item('geo-alt', 'secondary', a.asset_name, a.asset_code, 'asset-detail.html?id=' + a.id); }),
      more: 'assets.html' });

    var opnamedIds = {};
    cache.opnameItems.filter(function (i) { return i.asset_id; }).forEach(function (i) { opnamedIds[i.asset_id] = true; });
    var needOpname = rows.filter(function (a) { return a.asset_status === 'Aktif' && !opnamedIds[a.id]; });
    groups.push({ title: 'Aset yang perlu stock opname', n: needOpname.length, color: 'info',
      items: needOpname.slice(0, 4).map(function (a) { return item('clipboard-check', 'info', a.asset_name, a.asset_code, 'stock-opname.html'); }),
      more: 'stock-opname.html' });

    var dm = depMap();
    var nearEnd = cache.deps.filter(function (d) {
      var left = d.useful_life_months - (d.accumulated_depreciation / (d.monthly_depreciation || 1));
      return left > 0 && left <= 6;
    });
    groups.push({ title: 'Mendekati akhir umur manfaat', n: nearEnd.length, color: 'warning',
      items: nearEnd.slice(0, 4).map(function (d) { return item('hourglass-split', 'warning', assetName(d.asset_id), 'sisa ±' + Math.max(1, Math.round(d.useful_life_months - d.accumulated_depreciation / (d.monthly_depreciation || 1))) + ' bulan', 'depreciation.html'); }),
      more: 'depreciation.html' });

    var incompletePR = cache.reqs.filter(function (p) { return p.status === 'Approved'; });
    groups.push({ title: 'Pengadaan disetujui belum terealisasi', n: incompletePR.length, color: 'secondary',
      items: incompletePR.slice(0, 3).map(function (p) { return item('cart-plus', 'secondary', p.request_number, UI.rp(p.estimated_total), 'procurement.html'); }),
      more: 'procurement.html' });

    function assetName(id2) {
      if (!id2) return '-';
      var a = cache.assets.find(function (x) { return x.id === id2; });
      return a ? a.asset_name : '-';
    }
    document.getElementById('dashWidgets').innerHTML = groups.map(function (g, i) {
      var head = '<button class="btn w-100 d-flex justify-content-between align-items-center px-3 py-2 border-bottom amp-wg-head" data-wg="' + i + '">' +
        '<span><i class="bi bi-' + (g.n ? 'exclamation-circle text-' + g.color : 'check-circle text-success') + ' me-2"></i>' + g.title + '</span>' +
        '<span class="badge text-bg-' + (g.n ? g.color : 'success') + '">' + g.n + '</span></button>';
      var body = '<div class="amp-widget-list px-2" id="wg' + i + '"' + (i === 0 ? '' : ' style="display:none"') + '>' +
        (g.n ? g.items.join('') + '<div class="text-center py-2"><a href="' + g.more + '" class="small">Lihat semua</a></div>' :
          '<div class="text-center text-muted small py-3">Tidak ada — aman</div>') + '</div>';
      return head + body;
    }).join('');
    document.querySelectorAll('.amp-wg-head').forEach(function (b) {
      b.addEventListener('click', function () {
        var body = document.getElementById('wg' + b.dataset.wg);
        body.style.display = body.style.display === 'none' ? '' : 'none';
      });
    });
  }

  function refresh() {
    renderStats();
    renderCharts();
    renderWidgets();
  }

  loadAll().then(function () {
    renderHero();
    renderFilters().then(refresh);
    document.addEventListener('amp:theme', refresh);
  });
};
