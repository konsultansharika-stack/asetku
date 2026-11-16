/* =====================================================================
 * ASSET MANAGEMENT PRO — reports.js
 * Reporting Center: laporan inventaris, aset tetap, peminjaman,
 * pemeliharaan, penyusutan, stock opname, penghapusan + ekspor.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var current = { type: 'inv-all', rows: [], title: '', meta: '' };

  var TYPES = [
    ['inv-all', 'Laporan Inventaris — Seluruh Aset'],
    ['inv-cat', 'Inventaris per Kategori'],
    ['inv-unit', 'Inventaris per Unit'],
    ['inv-loc', 'Inventaris per Lokasi/Gedung'],
    ['inv-year', 'Inventaris per Tahun Pengadaan'],
    ['inv-cond', 'Inventaris per Kondisi'],
    ['inv-resp', 'Inventaris per Penanggung Jawab'],
    ['fixed', 'Aset Tetap & Nilai Buku'],
    ['dep', 'Penyusutan (Entri Periode)'],
    ['loan-active', 'Peminjaman — Sedang Dipinjam'],
    ['loan-late', 'Peminjaman — Terlambat'],
    ['loan-all', 'Riwayat Peminjaman'],
    ['maint', 'Pemeliharaan — Riwayat & Biaya'],
    ['maint-freq', 'Aset yang Sering Rusak'],
    ['opname', 'Hasil Stock Opname'],
    ['disposal', 'Penghapusan Aset']
  ];

  function init() {
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Reporting Center',
      'Laporan lengkap dengan filter periode, unit, dan kategori — ekspor Excel, CSV, dan PDF',
      '');
    var sel = document.getElementById('repType');
    sel.innerHTML = TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('');
    sel.value = 'inv-all';
    sel.onchange = run;
    document.getElementById('repRunBtn').onclick = run;
    document.getElementById('repFrom').value = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    document.getElementById('repTo').value = UI.todayISO();
    run();
  }

  function run() {
    var type = document.getElementById('repType').value;
    var from = document.getElementById('repFrom').value;
    var to = document.getElementById('repTo').value;
    Promise.all([
      DB.list('assets', { order: 'asset_code', asc: true }),
      DB.list('asset_categories', {}), DB.list('units', {}), DB.list('locations', {}),
      DB.list('asset_conditions', {}), DB.list('profiles', {}),
      DB.list('asset_depreciations', {}), DB.list('depreciation_entries', {}),
      DB.list('depreciation_periods', {}),
      DB.list('loan_requests', {}), DB.list('loan_items', {}), DB.list('loan_returns', {}),
      DB.list('maintenance_requests', {}), DB.list('maintenance_records', {}),
      DB.list('stock_opnames', {}), DB.list('stock_opname_items', {}),
      DB.list('asset_disposals', {}), DB.list('asset_disposal_items', {})
    ]).then(function (r) {
      var d = {
        assets: r[0].data, cats: UI.mapBy(r[1].data, 'id'), units: UI.mapBy(r[2].data, 'id'),
        locs: UI.mapBy(r[3].data, 'id'), conds: UI.mapBy(r[4].data, 'id'), profs: UI.mapBy(r[5].data, 'id'),
        deps: r[6].data, depEntries: r[7].data, depPeriods: UI.mapBy(r[8].data, 'id'),
        loans: r[9].data, loanItems: r[10].data, loanRets: r[11].data,
        tickets: r[12].data, records: r[13].data,
        ops: r[14].data, opItems: r[15].data,
        ds: r[16].data, dsItems: r[17].data
      };
      d.assets.forEach(function (a) {
        a.category_name = (d.cats[a.category_id] || {}).category_name || '-';
        a.unit_name = (d.units[a.unit_id] || {}).name || '-';
        a.location_name = a.current_location_id ? ((d.locs[a.current_location_id] || {}).location_name || '-') : '-';
        a.condition_name = (d.conds[a.current_condition_id] || {}).condition_name || '-';
        a.responsible_name = (d.profs[a.responsible_user_id] || {}).full_name || '-';
        a.grouping = a.category_name;
      });
      var rows = [], cols = [], title = '', groupNote = '';
      var today = UI.todayISO();

      if (type === 'inv-all') {
        title = 'Laporan Inventaris — Seluruh Aset';
        rows = d.assets.map(assetRow);
        cols = assetCols();
      } else if (type === 'inv-cat' || type === 'inv-unit' || type === 'inv-loc' || type === 'inv-year' || type === 'inv-cond' || type === 'inv-resp') {
        var map = { 'inv-cat': 'category_name', 'inv-unit': 'unit_name', 'inv-loc': 'location_name', 'inv-year': function (a) { return String(a.acquisition_date || '').slice(0, 4) || '-'; }, 'inv-cond': 'condition_name', 'inv-resp': 'responsible_name' };
        var keyOf = typeof map[type] === 'function' ? map[type] : function (a) { return a[map[type]] || '-'; };
        title = TYPES.find(function (t) { return t[0] === type; })[1];
        var groups = {};
        d.assets.forEach(function (a) {
          var g = keyOf(a);
          if (!groups[g]) groups[g] = { name: g, n: 0, qty: 0, cost: 0 };
          groups[g].n++; groups[g].qty += a.quantity || 1; groups[g].cost += a.acquisition_cost || 0;
        });
        rows = Object.values(groups).sort(function (a, b) { return b.n - a.n; });
        cols = [
          { key: 'name', label: 'Kelompok' },
          { key: 'n', label: 'Jumlah Item Aset', class: 'text-center' },
          { key: 'qty', label: 'Total Unit Fisik', class: 'text-center' },
          { key: 'cost', label: 'Nilai Perolehan', class: 'text-end', render: function (x) { return UI.rp(x.cost); } }
        ];
        rows.push({ name: 'TOTAL', n: rows.reduce(function (s, x) { return s + x.n; }, 0), qty: rows.reduce(function (s, x) { return s + x.qty; }, 0), cost: rows.reduce(function (s, x) { return s + x.cost; }, 0), _total: true });
      } else if (type === 'fixed') {
        title = 'Daftar Aset Tetap — Nilai Perolehan, Akumulasi Penyusutan, Nilai Buku';
        var depMap = UI.mapBy(d.deps, 'asset_id');
        rows = d.assets.filter(function (a) { return a.asset_type === 'fixed'; }).map(function (a) {
          var dd = depMap[a.id] || {};
          return { kode: a.asset_code, nama: a.asset_name, perolehan: a.acquisition_cost,
            residu: dd.residual_value || 0, umur: dd.useful_life_months ? dd.useful_life_months + ' bln' : '-',
            akumulasi: dd.accumulated_depreciation || 0, buku: dd.current_book_value || a.acquisition_cost,
            status: dd.useful_life_months && (dd.accumulated_depreciation || 0) >= dd.depreciable_amount ? 'Selesai Disusutkan' : 'Aktif',
            kondisi: a.condition_name, lokasi: a.location_name };
        });
        cols = [
          { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Aset' },
          { key: 'perolehan', label: 'Nilai Perolehan', class: 'text-end', render: rp },
          { key: 'residu', label: 'Residu', class: 'text-end', render: rp },
          { key: 'umur', label: 'Umur', class: 'text-center' },
          { key: 'akumulasi', label: 'Akumulasi Penyusutan', class: 'text-end', render: rp },
          { key: 'buku', label: 'Nilai Buku', class: 'text-end', render: function (x) { return '<strong class="text-success">' + UI.rp(x.buku) + '</strong>'; } },
          { key: 'status', label: 'Status', render: function (x) { return UI.badge(x.status); } }
        ];
      } else if (type === 'dep') {
        title = 'Laporan Penyusutan — Entri per Periode';
        rows = d.depEntries.map(function (e) {
          var x = d.deps.find(function (y) { return y.id === e.asset_depreciation_id; }) || {};
          var a = d.assets.find(function (y) { return y.id === x.asset_id; }) || {};
          var p = d.depPeriods[e.period_id] || {};
          return { periode: p.period_year + '-' + String(p.period_month).padStart(2, '0'),
            kode: a.asset_code || '-', nama: a.asset_name || '-', amount: e.depreciation_amount,
            accum: e.accumulated_after, buku: e.book_value_after, status: p.status };
        }).sort(function (a, b) { return b.periode.localeCompare(a.periode); });
        cols = [
          { key: 'periode', label: 'Periode' }, { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Aset' },
          { key: 'amount', label: 'Penyusutan', class: 'text-end', render: rp },
          { key: 'accum', label: 'Akumulasi', class: 'text-end', render: rp },
          { key: 'buku', label: 'Nilai Buku', class: 'text-end', render: rp },
          { key: 'status', label: 'Status Periode', render: function (x) { return UI.badge(x.status === 'Open' ? 'Open Periode' : 'Closed'); } }
        ];
      } else if (type === 'loan-active' || type === 'loan-late' || type === 'loan-all') {
        title = TYPES.find(function (t) { return t[0] === type; })[1];
        rows = d.loans.filter(function (l) {
          if (type === 'loan-active') return l.status === 'Dipinjam';
          if (type === 'loan-late') return l.status === 'Dipinjam' && l.planned_return_date && l.planned_return_date < today;
          return true;
        }).map(function (l) {
          var items = d.loanItems.filter(function (x) { return x.loan_id === l.id; })
            .map(function (x) { var a = d.assets.find(function (y) { return y.id === x.asset_id; }); return a ? a.asset_name : '?'; }).join(', ');
          return { nomor: l.loan_number, tgl: UI.fdate(l.request_date), peminjam: (d.profs[l.borrower_id] || {}).full_name || '-',
            unit: (d.units[l.unit_id] || {}).name || '-', barang: items,
            kembali: UI.fdate(l.planned_return_date),
            terlambat: l.status === 'Dipinjam' && l.planned_return_date && l.planned_return_date < today ? Math.round((new Date(today) - new Date(l.planned_return_date)) / 864e5) + ' hari' : '-',
            status: l.status, tujuan: l.purpose };
        });
        cols = [
          { key: 'nomor', label: 'No.' }, { key: 'tgl', label: 'Tanggal' }, { key: 'peminjam', label: 'Peminjam' },
          { key: 'unit', label: 'Unit' }, { key: 'barang', label: 'Barang' }, { key: 'kembali', label: 'Rencana Kembali' },
          { key: 'terlambat', label: 'Keterlambatan' }, { key: 'status', label: 'Status', render: function (x) { return UI.badge(x.status); } }
        ];
      } else if (type === 'maint' || type === 'maint-freq') {
        title = type === 'maint' ? 'Pemeliharaan — Riwayat & Biaya' : 'Aset yang Sering Rusak';
        if (type === 'maint') {
          rows = d.records.map(function (rc) {
            var t = d.tickets.find(function (x) { return x.id === rc.maintenance_id; }) || {};
            var a = d.assets.find(function (y) { return y.id === rc.asset_id; }) || {};
            return { tiket: t.ticket_number || '-', tgl: UI.fdate(rc.maintenance_date), aset: (a.asset_code || '-') + ' — ' + (a.asset_name || ''),
              pekerjaan: rc.work_description, jasa: rc.labor_cost, material: rc.material_cost, total: rc.total_cost,
              teknisi: (d.profs[rc.technician_id] || {}).full_name || '-' };
          }).sort(function (a, b) { return String(b.tgl).localeCompare(String(a.tgl)); });
          cols = [
            { key: 'tiket', label: 'Tiket' }, { key: 'tgl', label: 'Tanggal' }, { key: 'aset', label: 'Aset' },
            { key: 'pekerjaan', label: 'Pekerjaan' }, { key: 'teknisi', label: 'Teknisi' },
            { key: 'jasa', label: 'Jasa', class: 'text-end', render: rp }, { key: 'material', label: 'Material', class: 'text-end', render: rp },
            { key: 'total', label: 'Total', class: 'text-end', render: function (x) { return '<strong>' + UI.rp(x.total) + '</strong>'; } }
          ];
        } else {
          var freq = {};
          d.tickets.forEach(function (t) {
            var a = d.assets.find(function (y) { return y.id === t.asset_id; }) || {};
            var k = t.asset_id;
            if (!freq[k]) freq[k] = { kode: a.asset_code || '-', nama: a.asset_name || '-', n: 0, cost: 0, last: null };
            freq[k].n++;
            var rec = d.records.find(function (x) { return x.maintenance_id === t.id; });
            if (rec) { freq[k].cost += rec.total_cost; freq[k].last = UI.fdate(rec.maintenance_date); }
          });
          rows = Object.values(freq).filter(function (x) { return x.n >= 1; }).sort(function (a, b) { return b.n - a.n; });
          cols = [
            { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Aset' },
            { key: 'n', label: 'Jml Tiket', class: 'text-center' },
            { key: 'cost', label: 'Total Biaya', class: 'text-end', render: rp },
            { key: 'last', label: 'Terakhir Diperbaiki' }
          ];
        }
      } else if (type === 'opname') {
        title = 'Hasil Stock Opname';
        rows = d.opItems.map(function (x) {
          var o = d.ops.find(function (y) { return y.id === x.opname_id; }) || {};
          return { kegiatan: o.opname_number || '-', nama: x.asset_name_snapshot, kode: x.asset_code_snapshot,
            harus: (d.locs[x.expected_location_id] || {}).location_name || '-',
            aktual: (d.locs[x.actual_location_id] || {}).location_name || '-',
            hasil: x.result_status || 'Belum diperiksa',
            catatan: x.notes || '-' };
        });
        cols = [
          { key: 'kegiatan', label: 'Kegiatan' }, { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Barang' },
          { key: 'harus', label: 'Lokasi Harus' }, { key: 'aktual', label: 'Lokasi Aktual' },
          { key: 'hasil', label: 'Hasil', render: function (x) { return UI.badge(x.hasil === 'Sesuai data' ? 'Baik' : x.hasil === 'Barang tidak ditemukan' ? 'Hilang' : 'Menunggu Verifikasi') + ' ' + UI.esc(x.hasil); } },
          { key: 'catatan', label: 'Catatan' }
        ];
      } else if (type === 'disposal') {
        title = 'Penghapusan Aset';
        rows = d.ds.map(function (x) {
          var its = d.dsItems.filter(function (i) { return i.disposal_id === x.id; });
          return { nomor: x.disposal_number, tgl: UI.fdate(x.disposal_date), aset: its.map(function (i) {
            var a = d.assets.find(function (y) { return y.id === i.asset_id; }); return a ? a.asset_name : '?';
          }).join(', '), alasan: x.reason, metode: x.disposal_method || '-',
            buku: its.reduce(function (s, i) { return s + (i.book_value || 0); }, 0),
            jual: x.selling_price || 0, status: x.status };
        });
        cols = [
          { key: 'nomor', label: 'No.' }, { key: 'tgl', label: 'Tanggal' }, { key: 'aset', label: 'Aset' },
          { key: 'alasan', label: 'Alasan' }, { key: 'metode', label: 'Metode' },
          { key: 'buku', label: 'Nilai Buku', class: 'text-end', render: rp },
          { key: 'jual', label: 'Harga Jual', class: 'text-end', render: rp },
          { key: 'status', label: 'Status', render: function (x) { return UI.badge(x.status); } }
        ];
      }

      function rp(x) { return UI.rp(x); }
      function assetRow(a) {
        return { kode: a.asset_code || '(draft)', nama: a.asset_name, kategori: a.category_name, merek: [a.brand, a.model].filter(Boolean).join(' '),
          seri: a.serial_number || '-', lokasi: a.location_name, unit: a.unit_name, kondisi: a.condition_name,
          status: a.asset_status, qty: a.quantity, cost: a.acquisition_cost, tgl: a.acquisition_date, pj: a.responsible_name };
      }
      function assetCols() {
        return [
          { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Nama Barang' }, { key: 'kategori', label: 'Kategori' },
          { key: 'merek', label: 'Merek/Tipe' }, { key: 'seri', label: 'No. Seri' }, { key: 'lokasi', label: 'Lokasi' },
          { key: 'unit', label: 'Unit' }, { key: 'qty', label: 'Jml', class: 'text-center' },
          { key: 'kondisi', label: 'Kondisi', render: function (x) { return UI.badge(x.kondisi); } },
          { key: 'status', label: 'Status', render: function (x) { return UI.badge(x.status); } },
          { key: 'cost', label: 'Nilai Perolehan', class: 'text-end', render: rp },
          { key: 'tgl', label: 'Tgl Perolehan', render: function (x) { return UI.fdate(x.tgl); } },
          { key: 'pj', label: 'Penanggung Jawab' }
        ];
      }

      current = { type: type, rows: rows.map(function (x) { return x; }), cols: cols, title: title, raw: d };
      renderResult(d);
    });
  }

  function renderResult(d) {
    var el = document.getElementById('repResult');
    var orgName = 'Yayasan Pendidikan Nusantara';
    var from = document.getElementById('repFrom').value, to = document.getElementById('repTo').value;
    document.getElementById('repActions').innerHTML =
      '<button class="btn btn-success btn-sm" id="repXls"><i class="bi bi-file-earmark-excel me-1"></i>Excel</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="repCsv"><i class="bi bi-filetype-csv me-1"></i>CSV</button>' +
      '<button class="btn btn-outline-danger btn-sm" id="repPdf"><i class="bi bi-file-earmark-pdf me-1"></i>PDF</button>' +
      '<button class="btn btn-outline-dark btn-sm" id="repPrint"><i class="bi bi-printer me-1"></i>Cetak</button>';
    document.getElementById('repXls').onclick = function () {
      UI.exportExcel(current.title.slice(0, 24).replace(/\s+/g, '-').toLowerCase() + '.xlsx', current.rows.map(function (r) {
        var out = {};
        current.cols.forEach(function (c) {
          out[c.label] = c.render ? stripHTML(c.render(r)) : (r[c.key] === undefined ? '' : r[c.key]);
        });
        return out;
      }));
    };
    document.getElementById('repCsv').onclick = function () {
      UI.exportCSV(current.title.slice(0, 24).replace(/\s+/g, '-').toLowerCase() + '.csv', current.rows.map(function (r) {
        var out = {};
        current.cols.forEach(function (c) { out[c.label] = c.render ? stripHTML(c.render(r)) : (r[c.key] === undefined ? '' : r[c.key]); });
        return out;
      }));
    };
    document.getElementById('repPdf').onclick = function () {
      if (!window.jspdf) { UI.toast('error', 'Library PDF belum termuat'); return; }
      var doc = new window.jspdf.jsPDF({ orientation: current.cols.length > 8 ? 'landscape' : 'portrait' });
      doc.setFontSize(14); doc.text('ASSET MANAGEMENT PRO — ' + current.title, 14, 16);
      doc.setFontSize(9); doc.setTextColor(110);
      doc.text(orgName + ' · Periode ' + UI.fdate(from) + ' s.d. ' + UI.fdate(to) + ' · dicetak ' + new Date().toLocaleString('id-ID'), 14, 22);
      doc.autoTable({
        startY: 26,
        head: [current.cols.map(function (c) { return c.label; })],
        body: current.rows.map(function (r) { return current.cols.map(function (c) { return stripHTML(c.render ? c.render(r) : (r[c.key] === undefined ? '-' : String(r[c.key]))); }); }),
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [30, 58, 95] }
      });
      doc.save(current.title.slice(0, 30).replace(/\s+/g, '-').toLowerCase() + '.pdf');
    };
    document.getElementById('repPrint').onclick = function () {
      UI.printHTML(current.title,
        '<div style="font-family:Arial;padding:16px"><h4 style="margin:0">' + UI.esc(current.title) + '</h4>' +
        '<div style="color:#555;font-size:12px;margin-bottom:10px">' + UI.esc(orgName) + ' · Periode ' + UI.fdate(from) + ' s.d. ' + UI.fdate(to) + '</div>' +
        '<table border="1" style="border-collapse:collapse;width:100%;font-size:11px" cellpadding="4"><thead><tr>' +
        current.cols.map(function (c) { return '<th style="background:#eee">' + UI.esc(c.label) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        current.rows.map(function (r) {
          return '<tr>' + current.cols.map(function (c) {
            return '<td>' + (c.render ? c.render(r) : UI.esc(r[c.key] === undefined ? '-' : r[c.key])) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>');
    };
    el.innerHTML = '<div class="card amp-card"><div class="card-header bg-transparent py-2 d-flex justify-content-between">' +
      '<h6 class="mb-0 fw-bold">' + UI.esc(current.title) + '</h6>' +
      '<span class="text-muted small">' + current.rows.length + ' baris</span></div>' +
      '<div class="card-body p-2" id="repTbl"></div></div>';
    UI.dataTable({
      mount: '#repTbl', toolbar: false, pageSize: 15,
      columns: current.cols, rows: current.rows
    });
  }

  function stripHTML(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return (d.textContent || d.innerText || '').trim();
  }

  init();
};
