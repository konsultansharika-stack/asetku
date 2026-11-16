/* =====================================================================
 * ASSET MANAGEMENT PRO — maintenance.js
 * Pemeliharaan: tiket kerusakan, jadwal berulang, riwayat & biaya.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var org = Auth.orgId();
  var canWork = Auth.can('process.maintenance') || Auth.isAdmin();

  function loadAll() {
    return Promise.all([
      DB.list('maintenance_requests', { order: 'report_date', asc: false }),
      DB.list('maintenance_schedules', { order: 'schedule_date', asc: true }),
      DB.list('maintenance_records', { order: 'maintenance_date', asc: false }),
      DB.list('maintenance_parts', {}),
      DB.list('assets', {}), DB.list('profiles', {})
    ]).then(function (r) {
      return {
        tickets: r[0].data, schedules: r[1].data, records: r[2].data, parts: r[3].data,
        assets: r[4].data, profs: UI.mapBy(r[5].data, 'id')
      };
    });
  }

  function assetOf(d, id2) { return d.assets.find(function (a) { return a.id === id2; }) || { asset_name: '-', asset_code: '-' }; }

  function render(d) {
    document.getElementById('pageHead').innerHTML = UI.pageHeader('Pemeliharaan & Perbaikan',
      'Tiket kerusakan, penugasan teknisi, jadwal preventif, dan rekap biaya',
      '<button class="btn btn-primary btn-sm" id="addTkt"><i class="bi bi-plus-lg me-1"></i>Tiket Baru</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="addSch"><i class="bi bi-calendar-plus me-1"></i>Jadwal Baru</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="expMaint"><i class="bi bi-file-earmark-excel me-1"></i>Excel Biaya</button>');

    /* ---- Tiket ---- */
    var tktRows = d.tickets.map(function (t) {
      var rec = d.records.find(function (x) { return x.maintenance_id === t.id; });
      return Object.assign({}, t, {
        asset_name: assetOf(d, t.asset_id).asset_name,
        asset_code: assetOf(d, t.asset_id).asset_code,
        reporter_name: (d.profs[t.reported_by] || {}).full_name || '-',
        tech_name: t.assigned_to ? ((d.profs[t.assigned_to] || {}).full_name || '-') : '-',
        cost: rec ? rec.total_cost : null
      });
    });
    UI.dataTable({
      mount: '#tktTable',
      columns: [
        { key: 'ticket_number', label: 'No. Tiket' },
        { key: 'report_date', label: 'Tanggal', render: function (t) { return UI.fdate(t.report_date); } },
        { key: 'asset_name', label: 'Aset', render: function (t) { return '<a class="text-decoration-none" href="asset-detail.html?id=' + t.asset_id + '">' + UI.esc(t.asset_name) + '</a><div class="text-muted" style="font-size:.72rem">' + UI.esc(t.asset_code) + '</div>'; } },
        { key: 'damage_description', label: 'Kerusakan', render: function (t) { return '<span class="small">' + UI.esc(t.damage_description) + '</span>'; } },
        { key: 'priority', label: 'Urgensi', render: function (t) { return UI.badge(t.priority === 'Tinggi' ? 'Rusak Berat' : t.priority === 'Sedang' ? 'Dalam Pemeliharaan' : 'Draft'); } },
        { key: 'tech_name', label: 'Teknisi' },
        { key: 'status', label: 'Status', render: function (t) { return UI.badge(t.status); } },
        { key: 'cost', label: 'Biaya', class: 'text-end', render: function (t) { return t.cost !== null ? UI.rp(t.cost) : '-'; } }
      ],
      rows: tktRows, pageSize: 10,
      actions: function (t) {
        var h = UI.iconBtn('Detail', 'eye', 'data-act="detail" data-id="' + t.id + '"', 'btn-outline-secondary');
        if (canWork) {
          if (t.status === 'Open') h += UI.iconBtn('Tugaskan', 'person-plus', 'data-act="assign" data-id="' + t.id + '"', 'btn-outline-primary');
          if (t.status === 'Assigned') h += UI.iconBtn('Mulai Kerja', 'play', 'data-act="progress" data-id="' + t.id + '"', 'btn-outline-info');
          if (t.status === 'In Progress' || t.status === 'Waiting Parts') h += UI.iconBtn('Selesaikan', 'check2-square', 'data-act="done" data-id="' + t.id + '"', 'btn-outline-success');
          if (t.status === 'Completed') h += UI.iconBtn('Verifikasi', 'patch-check', 'data-act="verify" data-id="' + t.id + '"', 'btn-outline-success');
          if (['Open', 'Assigned', 'In Progress', 'Waiting Parts'].indexOf(t.status) >= 0) h += UI.iconBtn('Batalkan', 'x-circle', 'data-act="cancel" data-id="' + t.id + '"', 'btn-outline-danger');
        }
        return h;
      }
    });

    /* ---- Jadwal ---- */
    var today = UI.todayISO();
    var schRows = d.schedules.map(function (s) {
      var late = s.schedule_date < today && s.status !== 'Selesai';
      return Object.assign({}, s, {
        asset_name: assetOf(d, s.asset_id).asset_name,
        responsible_name: s.responsible_user_id ? ((d.profs[s.responsible_user_id] || {}).full_name || '-') : '-',
        display_status: late ? 'Terlambat' : s.status,
        due_label: UI.fdate(s.schedule_date) + (s.recurrence_interval ? ' · tiap ' + s.recurrence_interval + ' ' + (s.recurrence_type === 'months' ? 'bulan' : s.recurrence_type) : '')
      });
    });
    UI.dataTable({
      mount: '#schTable',
      columns: [
        { key: 'asset_name', label: 'Aset', render: function (s) { return UI.esc(s.asset_name); } },
        { key: 'maintenance_type', label: 'Jenis' },
        { key: 'due_label', label: 'Jadwal / Perulangan' },
        { key: 'responsible_name', label: 'Penanggung Jawab' },
        { key: 'display_status', label: 'Status', render: function (s) { return UI.badge(s.display_status); } },
        { key: 'notes', label: 'Catatan' }
      ],
      rows: schRows, pageSize: 10,
      actions: function (s) {
        var h = '';
        if (s.display_status !== 'Selesai') h += UI.iconBtn('Buat Tiket', 'wrench', 'data-act="gen" data-id="' + s.id + '"', 'btn-outline-primary');
        h += UI.iconBtn('Tandai Selesai', 'check2-circle', 'data-act="schdone" data-id="' + s.id + '"', 'btn-outline-success');
        return h;
      }
    });

    /* ---- Riwayat & biaya ---- */
    var recRows = d.records.map(function (rc) {
      var t = d.tickets.find(function (x) { return x.id === rc.maintenance_id; });
      return Object.assign({}, rc, {
        asset_name: assetOf(d, rc.asset_id).asset_name,
        tech_name: rc.technician_id ? ((d.profs[rc.technician_id] || {}).full_name || '-') : '-',
        ticket_number: t ? t.ticket_number : '(jadwal/insidental)'
      });
    });
    UI.dataTable({
      mount: '#recTable',
      columns: [
        { key: 'ticket_number', label: 'Tiket' },
        { key: 'asset_name', label: 'Aset' },
        { key: 'maintenance_date', label: 'Tanggal', render: function (rc) { return UI.fdate(rc.maintenance_date); } },
        { key: 'work_description', label: 'Pekerjaan', render: function (rc) { return '<span class="small">' + UI.esc(rc.work_description) + '</span>'; } },
        { key: 'tech_name', label: 'Teknisi' },
        { key: 'labor_cost', label: 'Jasa', class: 'text-end', render: function (rc) { return UI.rp(rc.labor_cost); } },
        { key: 'material_cost', label: 'Material', class: 'text-end', render: function (rc) { return UI.rp(rc.material_cost); } },
        { key: 'total_cost', label: 'Total', class: 'text-end', render: function (rc) { return '<strong>' + UI.rp(rc.total_cost) + '</strong>'; } }
      ],
      rows: recRows, pageSize: 10,
      footerTotals: function (rowsArr, col) {
        if (col.key === 'labor_cost') return 'Total: ' + UI.rp(rowsArr.reduce(function (s, r) { return s + (r.labor_cost || 0); }, 0));
        if (col.key === 'material_cost') return UI.rp(rowsArr.reduce(function (s, r) { return s + (r.material_cost || 0); }, 0));
        if (col.key === 'total_cost') return '<span class="text-success">' + UI.rp(rowsArr.reduce(function (s, r) { return s + (r.total_cost || 0); }, 0)) + '</span>';
        return '';
      }
    });

    document.getElementById('expMaint').onclick = function () {
      UI.exportExcel('biaya-pemeliharaan.xlsx', recRows.map(function (rc) {
        return { Tiket: rc.ticket_number, Aset: rc.asset_name, Tanggal: rc.maintenance_date, Pekerjaan: rc.work_description,
          Teknisi: rc.tech_name, 'Biaya Jasa': rc.labor_cost, 'Biaya Material': rc.material_cost, Total: rc.total_cost, Hasil: rc.result || '' };
      }));
    };

    bindActions(d);
    document.getElementById('addTkt').onclick = function () { openTicketForm(d); };
    document.getElementById('addSch').onclick = function () { openScheduleForm(d); };
  }

  function bindActions(d) {
    var host = document.getElementById('pageHead').parentNode;
    host.onclick = function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var kind = b.dataset.act;
      if (kind === 'detail') {
        var t = d.tickets.find(function (x) { return x.id === b.dataset.id; });
        showTicketDetail(d, t);
      } else if (kind === 'assign') {
        var t2 = d.tickets.find(function (x) { return x.id === b.dataset.id; });
        UI.formModal({
          title: 'Tugaskan Teknisi — ' + t2.ticket_number, submitText: 'Tugaskan',
          fields: [
            { name: 'assigned_to', label: 'Teknisi', type: 'select', required: true, options: Object.values(d.profs).filter(function (p) { return p.department_id; }).map(function (p) { return { value: p.id, label: p.full_name }; }) },
            { name: 'status', label: 'Status', type: 'select', options: [{ value: 'Assigned', label: 'Assigned' }, { value: 'Waiting Parts', label: 'Menunggu Suku Cadang' }] }
          ],
          onSubmit: function (data) {
            return DB.update('maintenance_requests', t2.id, { assigned_to: data.assigned_to, status: data.status }).then(function () {
              UI.toast('success', 'Tiket ditugaskan'); reload();
            });
          }
        });
      } else if (kind === 'progress') {
        var t3 = d.tickets.find(function (x) { return x.id === b.dataset.id; });
        DB.update('maintenance_requests', t3.id, { status: 'In Progress' }).then(function () { UI.toast('success', 'Pekerjaan dimulai'); reload(); });
      } else if (kind === 'done') {
        var t4 = d.tickets.find(function (x) { return x.id === b.dataset.id; });
        openCompleteForm(d, t4);
      } else if (kind === 'verify') {
        var t5 = d.tickets.find(function (x) { return x.id === b.dataset.id; });
        UI.confirmDialog({ title: 'Verifikasi hasil perbaikan?', html: 'Status aset kembali <strong>Aktif</strong>.' }).then(function (ok) {
          if (!ok) return;
          var rec = d.records.find(function (x) { return x.maintenance_id === t5.id; });
          DB.update('maintenance_requests', t5.id, { status: 'Verified', verification_by: Auth.userId(), verification_date: new Date().toISOString() })
            .then(function () { return DB.update('assets', t5.asset_id, { asset_status: 'Aktif' }); })
            .then(function () { UI.toast('success', 'Tiket terverifikasi — aset aktif kembali'); reload(); });
        });
      } else if (kind === 'cancel') {
        var t6 = d.tickets.find(function (x) { return x.id === b.dataset.id; });
        UI.confirmDialog({ title: 'Batalkan tiket?', danger: true, confirmText: 'Batalkan' }).then(function (ok) {
          if (ok) DB.update('maintenance_requests', t6.id, { status: 'Cancelled' }).then(function () { reload(); });
        });
      } else if (kind === 'gen') {
        var s = d.schedules.find(function (x) { return x.id === b.dataset.id; });
        generateTicket(d, s);
      } else if (kind === 'schdone') {
        var s2 = d.schedules.find(function (x) { return x.id === b.dataset.id; });
        finishSchedule(d, s2);
      }
    };
  }

  function showTicketDetail(d, t) {
    var rec = d.records.find(function (x) { return x.maintenance_id === t.id; });
    var parts = rec ? d.parts.filter(function (p) { return p.maintenance_record_id === rec.id; }) : [];
    UI.modal({
      title: 'Tiket ' + t.ticket_number, size: 'lg',
      body: '<div class="row amp-detail-grid mb-2">' +
        UI.kv('Aset', UI.esc(assetOf(d, t.asset_id).asset_code + ' — ' + assetOf(d, t.asset_id).asset_name)) +
        UI.kv('Pelapor', UI.esc((d.profs[t.reported_by] || {}).full_name || '-')) +
        UI.kv('Tanggal Lapor', UI.fdate(t.report_date)) +
        UI.kv('Urgensi', t.priority) +
        UI.kv('Jenis', UI.esc(t.maintenance_type || 'Corrective Maintenance')) +
        UI.kv('Teknisi', UI.esc(t.assigned_to ? ((d.profs[t.assigned_to] || {}).full_name || '-') : '-')) +
        UI.kv('Status', UI.badge(t.status)) +
        UI.kv('Deskripsi Kerusakan', UI.esc(t.damage_description)) + '</div>' +
        (rec ? '<h6 class="fw-bold mt-2">Hasil Pekerjaan</h6><div class="row amp-detail-grid">' +
          UI.kv('Pekerjaan', UI.esc(rec.work_description)) +
          UI.kv('Tanggal Selesai', UI.fdate(rec.maintenance_date)) +
          UI.kv('Biaya Jasa', UI.rp(rec.labor_cost)) +
          UI.kv('Biaya Material', UI.rp(rec.material_cost)) +
          UI.kv('Total Biaya', UI.rp(rec.total_cost)) +
          UI.kv('Hasil', UI.esc(rec.result || '-')) + '</div>' +
          (parts.length ? '<h6 class="fw-bold mt-2">Suku Cadang</h6><ul class="small">' + parts.map(function (p) { return '<li>' + UI.esc(p.part_name) + ' ×' + p.quantity + ' = ' + UI.rp(p.total_price) + '</li>'; }).join('') + '</ul>' : '') : ''),
      footer: '<button class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>'
    });
  }

  function openTicketForm(d) {
    UI.formModal({
      title: 'Tiket Kerusakan Baru', size: 'lg', submitText: 'Kirim Tiket',
      fields: [
        { name: 'asset_id', label: 'Aset', type: 'select', required: true, options: d.assets.filter(function (a) { return a.is_active !== false; }).map(function (a) { return { value: a.id, label: a.asset_code + ' — ' + a.asset_name }; }) },
        { name: 'damage_description', label: 'Deskripsi Kerusakan', type: 'textarea', required: true },
        { name: 'priority', label: 'Tingkat Urgensi', type: 'select', options: ['Rendah', 'Sedang', 'Tinggi'], value: 'Sedang' },
        { name: 'maintenance_type', label: 'Jenis Pemeliharaan', type: 'select', options: ['Corrective Maintenance', 'Preventive Maintenance', 'Inspeksi Rutin', 'Kalibrasi'] }
      ],
      onSubmit: function (data) {
        return DB.nextNumber('TKT', 'maintenance_requests', 'ticket_number').then(function (num) {
          return DB.insert('maintenance_requests', {
            organization_id: org, ticket_number: num, asset_id: data.asset_id,
            reported_by: Auth.userId(), report_date: UI.todayISO(),
            damage_description: data.damage_description, priority: data.priority,
            status: 'Open', maintenance_type: data.maintenance_type || 'Corrective Maintenance'
          });
        }).then(function (ins) {
          var a = assetOf(d, data.asset_id);
          DB.insert('notifications', { user_id: null, title: 'Tiket pemeliharaan baru', message: a.asset_code + ' — ' + data.damage_description.slice(0, 60), notification_type: 'maintenance_new', related_table: 'maintenance_requests', related_id: ins.data.id, is_read: false });
          UI.toast('success', 'Tiket ' + ins.data.ticket_number + ' dibuat');
          reload();
        });
      }
    });
  }

  function openCompleteForm(d, t) {
    UI.formModal({
      title: 'Selesaikan Pekerjaan — ' + t.ticket_number, size: 'lg', submitText: 'Simpan Hasil',
      fields: [
        { name: 'maintenance_date', label: 'Tanggal Selesai', type: 'date', required: true, value: UI.todayISO() },
        { name: 'work_description', label: 'Jenis Pekerjaan / Hasil Perbaikan', type: 'textarea', required: true },
        { name: 'technician_id', label: 'Teknisi', type: 'select', options: Object.values(d.profs).map(function (p) { return { value: p.id, label: p.full_name }; }) },
        { name: 'labor_cost', label: 'Biaya Jasa (Rp)', type: 'number', min: 0, value: 0, col: 'col-6' },
        { name: 'material_cost', label: 'Biaya Material (Rp)', type: 'number', min: 0, value: 0, col: 'col-6' },
        { name: 'parts', label: 'Suku Cadang (format: nama | jml | harga; baris baru)', type: 'textarea', help: 'cth: Selang tinta | 1 | 200000' },
        { name: 'result', label: 'Kesimpulan Hasil', type: 'textarea' }
      ],
      onSubmit: function (data) {
        var total = (data.labor_cost || 0) + (data.material_cost || 0);
        return DB.insert('maintenance_records', {
          organization_id: org, maintenance_id: t.id, asset_id: t.asset_id,
          maintenance_date: data.maintenance_date, work_description: data.work_description,
          technician_id: data.technician_id || t.assigned_to, vendor_id: null,
          labor_cost: data.labor_cost || 0, material_cost: data.material_cost || 0,
          total_cost: total, result: data.result || null
        }).then(function (ins) {
          var rows = String(data.parts || '').split('\n').filter(function (s) { return s.trim(); }).map(function (line) {
            var p = line.split('|').map(function (s) { return s.trim(); });
            var qty = Number(p[1]) || 1, price = Number(p[2]) || 0;
            return { maintenance_record_id: ins.data.id, part_name: p[0], quantity: qty, unit_price: price, total_price: qty * price };
          });
          if (rows.length) return DB.insertMany('maintenance_parts', rows);
          return null;
        }).then(function () {
          return DB.update('maintenance_requests', t.id, { status: 'Completed', completion_date: data.maintenance_date });
        }).then(function () {
          DB.update('assets', t.asset_id, { asset_status: 'Aktif' });
          UI.toast('success', 'Pekerjaan selesai — menunggu verifikasi');
          reload();
        });
      }
    });
  }

  function openScheduleForm(d) {
    UI.formModal({
      title: 'Jadwal Pemeliharaan Baru', size: 'lg', submitText: 'Simpan Jadwal',
      fields: [
        { name: 'asset_id', label: 'Aset', type: 'select', required: true, options: d.assets.filter(function (a) { return a.is_active !== false; }).map(function (a) { return { value: a.id, label: a.asset_code + ' — ' + a.asset_name }; }) },
        { name: 'maintenance_type', label: 'Jenis', type: 'select', options: ['Preventive Maintenance', 'Inspeksi Rutin', 'Kalibrasi', 'Servis Berkala'] },
        { name: 'schedule_date', label: 'Tanggal Jadwal', type: 'date', required: true, value: UI.todayISO() },
        { name: 'recurrence_type', label: 'Perulangan', type: 'select', col: 'col-6', options: [{ value: 'months', label: 'Setiap (bulan)' }, { value: 'days', label: 'Setiap (hari)' }] },
        { name: 'recurrence_interval', label: 'Interval', type: 'number', min: 1, col: 'col-6', value: 6, help: 'cth: 3 = tiap 3 bulan' },
        { name: 'responsible_user_id', label: 'Penanggung Jawab', type: 'select', options: Object.values(d.profs).map(function (p) { return { value: p.id, label: p.full_name }; }) },
        { name: 'notes', label: 'Catatan', type: 'textarea' }
      ],
      onSubmit: function (data) {
        return DB.insert('maintenance_schedules', {
          organization_id: org, asset_id: data.asset_id,
          maintenance_type: data.maintenance_type || 'Preventive Maintenance',
          schedule_date: data.schedule_date,
          recurrence_type: data.recurrence_type || 'months',
          recurrence_interval: data.recurrence_interval || 6,
          responsible_user_id: data.responsible_user_id || null,
          status: 'Terjadwal', notes: data.notes || null
        }).then(function () { UI.toast('success', 'Jadwal tersimpan'); reload(); });
      }
    });
  }

  function generateTicket(d, s) {
    var a = assetOf(d, s.asset_id);
    return DB.nextNumber('TKT', 'maintenance_requests', 'ticket_number').then(function (num) {
      return DB.insert('maintenance_requests', {
        organization_id: org, ticket_number: num, asset_id: s.asset_id,
        reported_by: s.responsible_user_id || Auth.userId(), report_date: UI.todayISO(),
        damage_description: 'Jadwal ' + s.maintenance_type + ' (' + (s.notes || '') + ')',
        priority: 'Sedang', status: 'Open',
        assigned_to: s.responsible_user_id, maintenance_type: s.maintenance_type
      });
    }).then(function (ins) {
      DB.insert('notifications', { user_id: s.responsible_user_id, title: 'Tiket dari jadwal pemeliharaan', message: a.asset_name + ' — ' + s.maintenance_type, notification_type: 'schedule_due', is_read: false });
      UI.toast('success', 'Tiket ' + ins.data.ticket_number + ' dibuat dari jadwal');
      reload();
    });
  }

  function finishSchedule(d, s) {
    // majukan jadwal berulang, atau selesaikan
    if (s.recurrence_interval) {
      var next = new Date(s.schedule_date + 'T00:00:00');
      if (s.recurrence_type === 'months') next.setMonth(next.getMonth() + Number(s.recurrence_interval));
      else next.setDate(next.getDate() + Number(s.recurrence_interval));
      DB.update('maintenance_schedules', s.id, { schedule_date: next.toISOString().slice(0, 10), status: 'Terjadwal' })
        .then(function () { UI.toast('success', 'Jadwal digeser ke ' + UI.fdate(next.toISOString().slice(0, 10))); reload(); });
    } else {
      DB.update('maintenance_schedules', s.id, { status: 'Selesai' }).then(function () { UI.toast('success', 'Jadwal selesai'); reload(); });
    }
  }

  function reload() { loadAll().then(render); }
  loadAll().then(render);
};
