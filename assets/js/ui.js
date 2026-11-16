/* =====================================================================
 * ASSET MANAGEMENT PRO — ui.js
 * Helper UI bersama: format, toast, modal, form, tabel, ekspor, cetak.
 * ===================================================================== */

var UI = (function () {
  'use strict';

  // ------------------------- FORMAT -------------------------
  function rp(n) {
    if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '-';
    return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(n));
  }
  function num(n) {
    if (n === null || n === undefined || n === '') return '-';
    return new Intl.NumberFormat('id-ID').format(Number(n));
  }
  function fdate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fdatetime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = Array.prototype.slice.call(arguments);
      clearTimeout(t);
      t = setTimeout(fn.bind.apply(fn, [this].concat(args)), ms || 300);
    };
  }

  // ------------------------- BADGE -------------------------
  var STATUS_COLOR = {
    'draft': 'secondary', 'Draft': 'secondary',
    'Menunggu Verifikasi': 'warning', 'Menunggu Persetujuan': 'warning', 'Submitted': 'warning',
    'Review Atasan': 'warning', 'Review Keuangan': 'warning', 'Approval Pimpinan': 'warning',
    'Aktif': 'success', 'Disetujui': 'success', 'Approved': 'success', 'Selesai': 'success',
    'Sebagian': 'info', 'Dipinjam': 'info', 'Dalam Mutasi': 'info', 'Berlangsung': 'info',
    'Dalam Pemeliharaan': 'warning', 'Open': 'warning', 'Assigned': 'info', 'In Progress': 'info',
    'Waiting Parts': 'warning', 'Completed': 'success', 'Verified': 'success', 'Cancelled': 'secondary',
    'Rusak': 'danger', 'Rusak Ringan': 'warning', 'Rusak Berat': 'danger', 'Hilang': 'danger',
    'Ditolak': 'danger', 'Rejected': 'danger', 'Dihapuskan': 'dark', 'Diarsipkan': 'secondary',
    'Terlambat': 'danger', 'Dikembalikan': 'success', 'Siap Diambil': 'primary',
    'Dikembalikan dengan kondisi baik': 'success', 'Pengiriman': 'info', 'Penerimaan': 'primary',
    'Review': 'warning', 'Pelaksanaan': 'info', 'Arsip': 'secondary', 'Closed': 'dark', 'Open Periode': 'primary',
    'Baru': 'success', 'Baik': 'success', 'Cukup Baik': 'info', 'Tidak Berfungsi': 'danger', 'Dihapus': 'dark'
  };
  function badge(text) {
    if (!text) return '<span class="text-muted">-</span>';
    var c = STATUS_COLOR[text] || 'secondary';
    return '<span class="badge text-bg-' + c + ' amp-badge">' + esc(text) + '</span>';
  }

  // ------------------------- TOAST & CONFIRM -------------------------
  var Toast = null;
  function ensureToast() {
    if (!Toast && window.Swal) {
      Toast = window.Swal.mixin({
        toast: true, position: 'top-end', showConfirmButton: false,
        timer: 3200, timerProgressBar: true
      });
    }
    return Toast;
  }
  function toast(type, msg) {
    var T = ensureToast();
    if (T) return T.fire({ icon: type || 'success', title: msg });
    console.log('[' + type + '] ' + msg);
  }
  function confirmDialog(opts) {
    if (!window.Swal) return Promise.resolve(window.confirm(opts.title || 'Lanjutkan?'));
    return window.Swal.fire({
      title: opts.title || 'Apakah Anda yakin?',
      html: opts.html || '',
      icon: opts.icon || 'question',
      showCancelButton: true,
      confirmButtonText: opts.confirmText || 'Ya, Lanjutkan',
      cancelButtonText: opts.cancelText || 'Batal',
      confirmButtonColor: opts.danger ? '#dc3545' : '#1e3a5f',
      reverseButtons: true
    }).then(function (r) { return r.isConfirmed; });
  }
  function alertInfo(title, html) {
    if (!window.Swal) return window.alert(title);
    return window.Swal.fire({ title: title, html: html, icon: 'info', confirmButtonColor: '#1e3a5f' });
  }

  // ------------------------- MODAL -------------------------
  var _modalSeq = 0;
  function modal(opts) {
    // opts: {title, body, size, footer, onShown(el), static}
    _modalSeq++;
    var id = 'ampModal' + _modalSeq;
    var sizeCls = opts.size === 'lg' ? 'modal-lg' : opts.size === 'xl' ? 'modal-xl' : opts.size === 'sm' ? 'modal-sm' : '';
    var root = document.getElementById('amp-modal-root') || document.body;
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal fade" id="' + id + '" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ' + sizeCls + '">' +
      '<div class="modal-content">' +
      '<div class="modal-header py-2"><h5 class="modal-title">' + (opts.title || '') + '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.footer !== null ?
        '<div class="modal-footer py-2">' + (opts.footer ||
          '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>') + '</div>' : '') +
      '</div></div></div>';
    root.appendChild(wrap.firstChild);
    var el = document.getElementById(id);
    var m = new bootstrap.Modal(el, { backdrop: opts.static ? 'static' : true });
    el.addEventListener('hidden.bs.modal', function () { setTimeout(function () { el.remove(); }, 300); });
    if (opts.onShown) el.addEventListener('shown.bs.modal', function () { opts.onShown(el); });
    m.show();
    return { el: el, close: function () { m.hide(); } };
  }
  function closeModal() {
    var open = document.querySelector('.modal.show');
    if (open) bootstrap.Modal.getInstance(open) && bootstrap.Modal.getInstance(open).hide();
  }

  // ------------------------- FORM -------------------------
  /**
   * fields: [{name,label,type,value,options,required,placeholder,attr,col,help,step,min,max,readonly}]
   * type: text|number|date|time|textarea|select|select-multi|file|checkbox|static|password|month
   */
  function fieldHTML(f, val) {
    var v = val !== undefined && val !== null ? val : (f.value !== undefined ? f.value : '');
    var req = f.required ? ' required' : '';
    var attr = f.attr || '';
    var col = f.col ? 'col-' + f.col : 'col-12';
    var id = 'ff-' + f.name;
    var input = '';
    switch (f.type) {
      case 'textarea':
        input = '<textarea class="form-control" id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 2) + '" ' + attr + (f.readonly ? ' readonly' : '') + '>' + esc(v) + '</textarea>';
        break;
      case 'select':
        var opts = (f.options || []).map(function (o) {
          var ov = typeof o === 'object' ? o.value : o;
          var ol = typeof o === 'object' ? o.label : o;
          var sel = String(v) === String(ov) ? ' selected' : '';
          return '<option value="' + esc(ov) + '"' + sel + '>' + esc(ol) + '</option>';
        }).join('');
        input = '<select class="form-select" id="' + id + '" name="' + f.name + '" ' + attr + req + (f.disabled ? ' disabled' : '') + '>' +
          (f.placeholder !== false && f.placeholder !== '' ? '<option value="">' + esc(f.placeholder || '-- Pilih --') + '</option>' : '') + opts + '</select>';
        break;
      case 'select-multi':
        var optsM = (f.options || []).map(function (o) {
          var ov = typeof o === 'object' ? o.value : o;
          var ol = typeof o === 'object' ? o.label : o;
          var sel = (Array.isArray(v) ? v.map(String) : [String(v)]).indexOf(String(ov)) >= 0 ? ' selected' : '';
          return '<option value="' + esc(ov) + '"' + sel + '>' + esc(ol) + '</option>';
        }).join('');
        input = '<select class="form-select" id="' + id + '" name="' + f.name + '" multiple size="' + (f.size || 5) + '" ' + attr + req + '>' + optsM + '</select>';
        break;
      case 'checkbox':
        return '<div class="' + col + ' mb-2"><div class="form-check form-switch">' +
          '<input class="form-check-input" type="checkbox" id="' + id + '" name="' + f.name + '"' + (v ? ' checked' : '') + ' ' + attr + '>' +
          '<label class="form-check-label" for="' + id + '">' + esc(f.label) + '</label></div></div>';
      case 'static':
        input = '<div class="form-control bg-body-secondary border-0">' + (v || '-') + '</div>';
        break;
      case 'file':
        input = '<input type="file" class="form-control" id="' + id + '" name="' + f.name + '" ' + attr + '>';
        break;
      case 'password':
        input = '<input type="password" class="form-control" id="' + id + '" name="' + f.name + '" value="' + esc(v) + '" ' + attr + req + '>';
        break;
      case 'static-text':
        return '<div class="' + col + ' mb-2">' + (f.label ? '<label class="form-label mb-0 text-muted small">' + esc(f.label) + '</label>' : '') +
          '<div class="fw-semibold">' + (v || '-') + '</div></div>';
      default:
        input = '<input type="' + (f.type || 'text') + '" class="form-control" id="' + id + '" name="' + f.name + '" value="' + esc(v) + '" placeholder="' + esc(f.placeholder || '') + '" ' + attr + req +
          (f.step ? ' step="' + f.step + '"' : '') + (f.min !== undefined ? ' min="' + f.min + '"' : '') + (f.max !== undefined ? ' max="' + f.max + '"' : '') + (f.readonly ? ' readonly' : '') + '>';
    }
    return '<div class="' + col + ' mb-2"><label class="form-label" for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="text-danger">*</span>' : '') + '</label>' +
      input + (f.help ? '<div class="form-text">' + f.help + '</div>' : '') + '</div>';
  }

  function formModal(opts) {
    // opts: {title, fields, values, size, submitText, onSubmit(data, form) -> Promise|bool, onShown}
    var fields = opts.fields || [];
    var vals = opts.values || {};
    var body = '<form id="ampForm" class="row g-2 needs-validation" novalidate>' +
      fields.map(function (f) { return fieldHTML(f, vals[f.name]); }).join('') + '</form>';
    var m = modal({
      title: opts.title, body: body, size: opts.size,
      footer: '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>' +
        '<button type="submit" class="btn btn-primary" form="ampForm">' + (opts.submitText || 'Simpan') + '</button>',
      onShown: function (el) {
        if (opts.onShown) opts.onShown(el);
        var form = el.querySelector('#ampForm');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          form.classList.add('was-validated');
          if (!form.checkValidity()) return;
          var data = {};
          fields.forEach(function (f) {
            var el2 = form.querySelector('[name="' + f.name + '"]');
            if (!el2) return;
            if (f.type === 'checkbox') data[f.name] = el2.checked;
            else if (f.type === 'number') data[f.name] = el2.value === '' ? null : Number(el2.value);
            else if (f.type === 'select-multi') data[f.name] = Array.from(el2.selectedOptions).map(function (o) { return o.value; });
            else data[f.name] = el2.value;
          });
          Promise.resolve(opts.onSubmit(data, form)).then(function (res) {
            if (res !== false) m.close();
          }).catch(function (err) {
            toast('error', err.message || 'Gagal menyimpan data');
          });
        });
      }
    });
    return m;
  }

  // ------------------------- DATA TABLE -------------------------
  /**
   * dataTable({mount, columns, rows, actions, search, pageSize, footerTotals, empty})
   * column: {key, label, render(row), class, searchKey}
   * actions: function(row) -> html string of action buttons
   */
  function dataTable(opts) {
    var state = { page: 1, query: '', rows: opts.rows || [], pageSize: opts.pageSize || 10 };
    var mount = typeof opts.mount === 'string' ? document.querySelector(opts.mount) : opts.mount;
    if (!mount) return null;

    function filtered() {
      var q = state.query.trim().toLowerCase();
      if (!q) return state.rows;
      var keys = [];
      (opts.columns || []).forEach(function (c) {
        if (c.searchKey) keys.push(c.searchKey);
        else if (c.key && !c.render) keys.push(c.key);
      });
      if (opts.searchKeys) keys = keys.concat(opts.searchKeys);
      return state.rows.filter(function (r) {
        return keys.some(function (k) {
          var v = k.split('.').reduce(function (o, p) { return o ? o[p] : ''; }, r);
          return String(v || '').toLowerCase().includes(q);
        });
      });
    }
    function render() {
      var rows = filtered();
      var total = rows.length;
      var pages = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.page > pages) state.page = pages;
      var start = (state.page - 1) * state.pageSize;
      var pageRows = rows.slice(start, start + state.pageSize);
      var html = '<div class="amp-table card"><div class="card-body p-0">';
      html += '<div class="table-responsive"><table class="table table-hover align-middle mb-0">';
      html += '<thead><tr>' + (opts.columns || []).map(function (c) {
        return '<th class="' + (c.class || '') + '">' + esc(c.label) + '</th>';
      }).join('') + (opts.actions ? '<th class="text-end amp-th-actions">Aksi</th>' : '') + '</tr></thead><tbody>';
      if (!pageRows.length) {
        html += '<tr><td colspan="' + ((opts.columns || []).length + (opts.actions ? 1 : 0)) + '" class="text-center text-muted py-4">' +
          (opts.empty || 'Tidak ada data') + '</td></tr>';
      } else {
        pageRows.forEach(function (r) {
          html += '<tr data-id="' + esc(r.id || '') + '">' + (opts.columns || []).map(function (c) {
            var val = c.render ? c.render(r) : (r[c.key] === null || r[c.key] === undefined || r[c.key] === '' ? '<span class="text-muted">-</span>' : esc(r[c.key]));
            return '<td class="' + (c.class || '') + '">' + val + '</td>';
          }).join('');
          if (opts.actions) html += '<td class="text-end text-nowrap amp-td-actions">' + (opts.actions(r) || '') + '</td>';
          html += '</tr>';
        });
      }
      html += '</tbody>';
      if (opts.footerTotals && pageRows.length) {
        html += '<tfoot><tr>' + (opts.columns || []).map(function (c) {
          return '<th class="' + (c.class || '') + '">' + (opts.footerTotals(rows, c) || '') + '</th>';
        }).join('') + (opts.actions ? '<th></th>' : '') + '</tr></tfoot>';
      }
      html += '</table></div>';

      var from = total === 0 ? 0 : start + 1, to = Math.min(start + state.pageSize, total);
      html += '<div class="d-flex flex-wrap justify-content-between align-items-center p-2 border-top amp-tbl-foot">' +
        '<div class="text-muted small">Menampilkan ' + from + '-' + to + ' dari ' + total + ' data</div>' +
        '<nav><ul class="pagination pagination-sm mb-0">';
      html += '<li class="page-item' + (state.page <= 1 ? ' disabled' : '') + '"><a class="page-link amp-pg" data-pg="' + (state.page - 1) + '" href="javascript:void(0)">&laquo;</a></li>';
      for (var p = 1; p <= pages; p++) {
        if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - state.page) > 1) {
          if (p === 3) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
          continue;
        }
        html += '<li class="page-item' + (p === state.page ? ' active' : '') + '"><a class="page-link amp-pg" data-pg="' + p + '" href="javascript:void(0)">' + p + '</a></li>';
      }
      html += '<li class="page-item' + (state.page >= pages ? ' disabled' : '') + '"><a class="page-link amp-pg" data-pg="' + (state.page + 1) + '" href="javascript:void(0)">&raquo;</a></li>';
      html += '</ul></nav></div></div></div>';

      mount.innerHTML = html;
      mount.querySelectorAll('.amp-pg').forEach(function (a) {
        a.addEventListener('click', function () { state.page = Number(a.dataset.pg); render(); });
      });
      if (opts.onRendered) opts.onRendered();
    }
    var searchBox = null;
    if (opts.search !== false) {
      searchBox = '<div class="mb-2 amp-tbl-search"><div class="input-group input-group-sm amp-search-group">' +
        '<span class="input-group-text bg-white border-end-0"><i class="bi bi-search"></i></span>' +
        '<input type="search" class="form-control border-start-0" placeholder="' + (opts.searchPlaceholder || 'Cari data...') + '"></div></div>';
    }
    if (opts.toolbar !== false) {
      var tb = document.createElement('div');
      tb.innerHTML = searchBox || '';
      mount.parentNode.insertBefore(tb, mount);
      if (searchBox) {
        tb.querySelector('input').addEventListener('input', debounce(function (e) {
          state.query = e.target.value; state.page = 1; render();
        }, 250));
      }
    }
    render();
    return {
      reload: function (rows) { if (rows) state.rows = rows; render(); },
      getRows: function () { return state.rows; }
    };
  }

  // ------------------------- LOOKUP HELPERS -------------------------
  function mapBy(rows, key) {
    var m = {}; (rows || []).forEach(function (r) { m[r[key || 'id']] = r; }); return m;
  }
  function pick(map, id, field) {
    var r = map[id];
    return r ? (r[field || 'name'] !== undefined && r[field || 'name'] !== null ? r[field || 'name'] : '-') : '-';
  }

  // ------------------------- EXPORT -------------------------
  function exportExcel(filename, rows, sheetName) {
    if (!window.XLSX) { toast('error', 'Library Excel belum termuat'); return; }
    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Data').slice(0, 31));
    XLSX.writeFile(wb, filename);
    toast('success', 'File Excel berhasil diunduh');
  }
  function exportCSV(filename, rows) {
    if (!rows || !rows.length) { toast('warning', 'Tidak ada data untuk diekspor'); return; }
    var cols = Object.keys(rows[0]);
    var csv = cols.map(function (c) { return '"' + c + '"'; }).join(';') + '\n' +
      rows.map(function (r) {
        return cols.map(function (c) {
          var v = r[c] === null || r[c] === undefined ? '' : String(r[c]).replace(/"/g, '""');
          return '"' + v + '"';
        }).join(';');
      }).join('\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    toast('success', 'File CSV berhasil diunduh');
  }
  function printHTML(title, innerHTML, extraCss) {
    var w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) { toast('error', 'Pop-up diblokir peramban. Izinkan pop-up untuk mencetak.'); return; }
    w.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">' +
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">' +
      '<style>' + (extraCss || '') + '</style></head><body>' + innerHTML +
      '<script>setTimeout(function(){window.print();},600);<\/script></body></html>');
    w.document.close();
  }

  // ------------------------- LAYOUT SNIPPETS -------------------------
  function pageHeader(title, subtitle, actionsHtml) {
    return '<div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3 amp-page-head">' +
      '<div><h4 class="fw-bold mb-1">' + title + '</h4>' +
      (subtitle ? '<div class="text-muted small">' + subtitle + '</div>' : '') + '</div>' +
      '<div class="d-flex flex-wrap gap-2">' + (actionsHtml || '') + '</div></div>';
  }
  function btn(label, icon, attrs, cls) {
    return '<button ' + (attrs || '') + ' class="btn ' + (cls || 'btn-primary') + ' btn-sm">' +
      (icon ? '<i class="bi bi-' + icon + ' me-1"></i>' : '') + label + '</button>';
  }
  function iconBtn(title, icon, attrs, cls) {
    return '<button ' + (attrs || '') + ' title="' + esc(title) + '" class="btn ' + (cls || 'btn-outline-secondary') + ' btn-sm amp-icon-btn">' +
      '<i class="bi bi-' + icon + '"></i></button>';
  }
  function kv(label, value) {
    return '<div class="col-6 col-md-4 col-lg-3 mb-2"><div class="text-muted small">' + esc(label) + '</div>' +
      '<div class="fw-semibold text-break">' + (value === undefined || value === null || value === '' ? '-' : value) + '</div></div>';
  }
  function card(title, bodyHtml, actionsHtml, cls) {
    return '<div class="card amp-card ' + (cls || '') + '">' +
      (title ? '<div class="card-header bg-transparent d-flex justify-content-between align-items-center py-2"><h6 class="mb-0 fw-bold">' + title + '</h6>' +
        '<div>' + (actionsHtml || '') + '</div></div>' : '') +
      '<div class="card-body">' + bodyHtml + '</div></div>';
  }
  function statCard(icon, label, value, color, sub) {
    return '<div class="col-6 col-md-4 col-lg-3 col-xl-' + (arguments[5] || '2') + '">' +
      '<div class="card amp-stat-card h-100 border-0"><div class="card-body py-3">' +
      '<div class="d-flex align-items-center gap-2 mb-1"><span class="amp-stat-icon bg-' + color + '-subtle text-' + color + '">' +
      '<i class="bi bi-' + icon + '"></i></span><span class="text-muted small flex-grow-1">' + esc(label) + '</span></div>' +
      '<div class="fs-5 fw-bold mb-0">' + value + '</div>' +
      (sub ? '<div class="text-muted small">' + sub + '</div>' : '') + '</div></div></div>';
  }
  function emptyState(msg, icon) {
    return '<div class="text-center text-muted py-5"><i class="bi bi-' + (icon || 'inbox') + ' fs-1 d-block mb-2"></i>' + esc(msg || 'Belum ada data') + '</div>';
  }
  function timeline(items) {
    // items: [{title, when, by, note, color}]
    if (!items.length) return emptyState('Belum ada riwayat');
    return '<div class="amp-timeline">' + items.map(function (it) {
      return '<div class="amp-tl-item"><span class="amp-tl-dot bg-' + (it.color || 'secondary') + '"></span>' +
        '<div><div class="fw-semibold small">' + it.title + '</div>' +
        '<div class="text-muted small">' + (it.when ? fdatetime(it.when) : '') + (it.by ? ' · oleh ' + esc(it.by) : '') + '</div>' +
        (it.note ? '<div class="small text-body-secondary mt-1">' + it.note + '</div>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  return {
    rp: rp, num: num, fdate: fdate, fdatetime: fdatetime, todayISO: todayISO, esc: esc, debounce: debounce,
    badge: badge, toast: toast, confirmDialog: confirmDialog, alertInfo: alertInfo,
    modal: modal, closeModal: closeModal, formModal: formModal, fieldHTML: fieldHTML,
    dataTable: dataTable, mapBy: mapBy, pick: pick,
    exportExcel: exportExcel, exportCSV: exportCSV, printHTML: printHTML,
    pageHeader: pageHeader, btn: btn, iconBtn: iconBtn, kv: kv, card: card, statCard: statCard,
    emptyState: emptyState, timeline: timeline
  };
})();
window.UI = UI;
