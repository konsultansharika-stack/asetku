/* =====================================================================
 * ASSET MANAGEMENT PRO — app.js
 * Kerangka aplikasi: sidebar, header, notifikasi, tema, guard halaman,
 * pencarian global, dan dispatch inisialisasi modul per halaman.
 * ===================================================================== */

var AMP = (function () {
  'use strict';

  /* --------------------- KONFIGURASI MENU --------------------- */
  var MENU = [
    { key: 'dashboard', label: 'Dashboard', icon: 'speedometer2', href: 'index.html' },
    { section: 'Master Data', items: [
      { key: 'units', label: 'Organisasi & Unit', icon: 'diagram-3', href: 'units.html' },
      { key: 'categories', label: 'Kategori Barang', icon: 'tags', href: 'categories.html' },
      { key: 'locations', label: 'Lokasi & Ruangan', icon: 'geo-alt', href: 'locations.html' },
      { key: 'suppliers', label: 'Pemasok & Master Lain', icon: 'truck', href: 'suppliers.html' }
    ]},
    { key: 'assets', label: 'Data Inventaris', icon: 'boxes', href: 'assets.html' },
    { key: 'procurement', label: 'Pengadaan Barang', icon: 'cart-plus', href: 'procurement.html' },
    { key: 'goods-receipt', label: 'Penerimaan Barang', icon: 'archive', href: 'goods-receipt.html' },
    { key: 'loans', label: 'Peminjaman', icon: 'arrow-left-right', href: 'loans.html' },
    { key: 'returns', label: 'Pengembalian', icon: 'arrow-return-left', href: 'returns.html' },
    { key: 'transfers', label: 'Mutasi Aset', icon: 'signpost-split', href: 'transfers.html' },
    { key: 'maintenance', label: 'Pemeliharaan', icon: 'wrench', href: 'maintenance.html' },
    { key: 'depreciation', label: 'Penyusutan Aset', icon: 'graph-down-arrow', href: 'depreciation.html' },
    { key: 'stock-opname', label: 'Stock Opname', icon: 'clipboard-check', href: 'stock-opname.html' },
    { key: 'qr-scanner', label: 'QR Code Scanner', icon: 'qr-code-scan', href: 'qr-scanner.html' },
    { key: 'disposal', label: 'Penghapusan Aset', icon: 'trash3', href: 'disposal.html' },
    { key: 'reports', label: 'Laporan', icon: 'file-earmark-bar-graph', href: 'reports.html' },
    { key: 'users', label: 'Pengguna & Hak Akses', icon: 'people', href: 'users.html' },
    { key: 'settings', label: 'Pengaturan', icon: 'gear', href: 'settings.html' }
  ];

  function pageKey() {
    var p = location.pathname.split('/').pop() || 'index.html';
    if (p === 'index.html' || p === '' || p === '/') return 'dashboard';
    return p.replace('.html', '');
  }

  /* --------------------- SIDEBAR --------------------- */
  function getBranding() {
    try { return JSON.parse(localStorage.getItem('AMP_BRANDING') || 'null') || {}; }
    catch (e) { return {}; }
  }
  function saveBranding(b) {
    b.updatedAt = new Date().toISOString();
    localStorage.setItem('AMP_BRANDING', JSON.stringify(b));
  }

  function renderSidebar() {
    var el = document.getElementById('amp-sidebar');
    if (!el) return;
    var cur = pageKey();
    var br = getBranding();
    var appName = (br.appName || APP_CONFIG.APP_NAME || 'ASSET MANAGEMENT PRO').toUpperCase();
    var tagline = br.tagline || APP_CONFIG.APP_TAGLINE || '';
    var logoHtml = br.logo ? '<img src="' + br.logo + '" alt="Logo">' : '<i class="bi bi-boxes"></i>';
    var html = '' +
      '<div class="amp-brand d-flex align-items-center gap-2 px-3 py-3" title="' + UI.esc(br.orgName || appName) + '">' +
      '<span class="amp-brand-logo">' + logoHtml + '</span>' +
      '<div class="amp-brand-text"><div class="fw-bold lh-1">' + UI.esc(appName) + '</div>' +
      '<div class="amp-brand-sub">' + UI.esc(String(tagline).slice(0, 34)) + '</div></div></div>' +
      '<nav class="amp-nav flex-grow-1 px-2">';
    MENU.forEach(function (item) {
      if (item.section) {
        html += '<div class="amp-nav-section">' + item.section + '</div>';
        item.items.forEach(function (sub) { html += navItem(sub, cur); });
      } else {
        html += navItem(item, cur);
      }
    });
    html += '</nav>' +
      '<div class="amp-sidebar-foot px-3 py-2 small text-white-50">' +
      '<div>' + APP_CONFIG.APP_TAGLINE + '</div>' +
      '<div class="mt-1 amp-mode-line"><i class="bi bi-' + (DB.isDemo() ? 'cone-striped' : 'cloud-check') + '"></i> ' +
      (DB.isDemo() ? 'Mode Demo (data lokal)' : 'Tersambung Supabase') + '</div></div>';
    el.innerHTML = html;
  }
  function navItem(item, cur) {
    if (!Auth.canPage(item.key)) return '';
    var active = cur === item.key ? ' active' : '';
    return '<a class="amp-nav-link' + active + '" href="' + item.href + '">' +
      '<i class="bi bi-' + item.icon + '"></i><span>' + item.label + '</span></a>';
  }

  /* --------------------- TOPBAR --------------------- */
  function renderTopbar() {
    var el = document.getElementById('amp-topbar');
    if (!el) return;
    var prof = Auth.profile();
    var roleLabel = Auth.roles().map(function (r) { return Auth.roleLabel(r); }).join(', ');
    el.innerHTML =
      '<button class="btn amp-burger d-lg-none" id="ampBurger" aria-label="Menu"><i class="bi bi-list fs-4"></i></button>' +
      '<div class="amp-global-search position-relative d-none d-md-block">' +
      '<i class="bi bi-search amp-gs-icon"></i>' +
      '<input type="search" class="form-control" id="ampGlobalSearch" placeholder="Cari aset (kode, nama, nomor seri)..." autocomplete="off">' +
      '<div class="amp-gs-results shadow" id="ampGsResults" style="display:none"></div></div>' +
      '<div class="ms-auto d-flex align-items-center gap-2">' +
      '<button class="btn amp-top-btn" id="ampThemeBtn" title="Mode terang/gelap"><i class="bi bi-moon-stars"></i></button>' +
      '<div class="dropdown">' +
      '<button class="btn amp-top-btn position-relative" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" title="Notifikasi">' +
      '<i class="bi bi-bell"></i><span class="badge rounded-pill text-bg-danger amp-notif-badge" id="ampNotifBadge" style="display:none">0</span></button>' +
      '<div class="dropdown-menu dropdown-menu-end amp-notif-menu shadow" id="ampNotifMenu">' +
      '<div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">' +
      '<strong class="small">Notifikasi</strong>' +
      '<button class="btn btn-link btn-sm p-0 small" id="ampNotifReadAll">Tandai dibaca</button></div>' +
      '<div id="ampNotifList" class="amp-notif-list"><div class="text-center text-muted small py-3">Memuat...</div></div></div></div>' +
      '<div class="dropdown">' +
      '<button class="btn amp-user-btn d-flex align-items-center gap-2" data-bs-toggle="dropdown" aria-expanded="false">' +
      '<span class="amp-avatar">' + initials(prof ? prof.full_name : '?') + '</span>' +
      '<span class="d-none d-lg-inline text-start"><span class="d-block lh-1 fw-semibold small">' + UI.esc(prof ? prof.full_name : '-') + '</span>' +
      '<span class="d-block lh-1 text-muted" style="font-size:.72rem">' + UI.esc(roleLabel || 'Pengguna') + '</span></span>' +
      '<i class="bi bi-chevron-down small"></i></button>' +
      '<ul class="dropdown-menu dropdown-menu-end shadow">' +
      '<li><h6 class="dropdown-header">' + UI.esc(prof ? prof.email : '') + '</h6></li>' +
      '<li><a class="dropdown-item" href="settings.html"><i class="bi bi-person me-2"></i>Profil Saya</a></li>' +
      '<li><a class="dropdown-item" href="settings.html"><i class="bi bi-sliders me-2"></i>Pengaturan</a></li>' +
      '<li><hr class="dropdown-divider"></li>' +
      '<li><a class="dropdown-item text-danger" href="javascript:void(0)" id="ampLogout"><i class="bi bi-box-arrow-right me-2"></i>Keluar</a></li>' +
      '</ul></div></div>';

    document.getElementById('ampBurger').addEventListener('click', function () {
      document.body.classList.toggle('amp-sidebar-open');
    });
    document.getElementById('ampThemeBtn').addEventListener('click', toggleTheme);
    document.getElementById('ampLogout').addEventListener('click', function () {
      UI.confirmDialog({ title: 'Keluar dari aplikasi?', icon: 'question', confirmText: 'Ya, Keluar' })
        .then(function (ok) { if (ok) { Auth.logout(); location.href = 'login.html'; } });
    });
    setupGlobalSearch();
    setupNotifications();
  }

  function initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  /* --------------------- TEMA & BRANDING --------------------- */
  var BRAND_VARS = ['--amp-navy-900', '--amp-navy-800', '--amp-navy-700', '--amp-navy-600', '--amp-navy-500', '--amp-accent'];

  /** Terapkan warna kustom + logo dari cache branding (localStorage). */
  function applyBrand() {
    var br = getBranding();
    var root = document.documentElement;
    if (br.vars) {
      BRAND_VARS.forEach(function (v) {
        if (br.vars[v]) root.style.setProperty(v, br.vars[v]);
      });
    } else {
      BRAND_VARS.forEach(function (v) { root.style.removeProperty(v); });
    }
    // Logo & nama pada login page (elemen opsional)
    var loginLogo = document.getElementById('ampLoginLogo');
    if (loginLogo && br.logo) loginLogo.innerHTML = '<img src="' + br.logo + '" alt="Logo">';
    var loginTitle = document.getElementById('ampLoginAppName');
    if (loginTitle && br.appName) loginTitle.textContent = br.appName;
    var loginTag = document.getElementById('ampLoginTagline');
    if (loginTag && br.tagline) loginTag.textContent = br.tagline;
  }

  /**
   * Sinkronkan branding dari tabel organizations (multi-device).
   * Dipanggil setelah DB.ready di halaman dengan sidebar.
   */
  function syncBrandingFromDB() {
    return DB.list('organizations', { limit: 1 }).then(function (r) {
      var o = (r.data || [])[0];
      if (!o) return;
      var br = getBranding();
      var changed = false;
      var name = o.name || '';
      if (name && br.appName !== name) { br.appName = name; br.orgName = name; changed = true; }
      if (o.logo_url && br.logo !== o.logo_url) { br.logo = o.logo_url; changed = true; }
      if (changed) {
        saveBranding(br);
        applyBrand();
        renderSidebar();
      }
    }).catch(function () { /* abaikan */ });
  }

  function applyTheme() {
    var t = localStorage.getItem('AMP_THEME') || 'light';
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('ampThemeBtn');
    if (btn) btn.innerHTML = '<i class="bi bi-' + (t === 'dark' ? 'sun' : 'moon-stars') + '"></i>';
  }
  function toggleTheme() {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('AMP_THEME', t);
    applyTheme();
    document.dispatchEvent(new CustomEvent('amp:theme'));
  }

  /* --------------------- NOTIFIKASI --------------------- */
  function refreshNotifBadge() {
    DB.list('notifications', { eq: { user_id: Auth.userId(), is_read: false }, order: 'created_at', asc: false })
      .then(function (r) {
        var badge = document.getElementById('ampNotifBadge');
        if (!badge) return;
        var n = (r.data || []).length;
        badge.textContent = n > 9 ? '9+' : n;
        badge.style.display = n ? '' : 'none';
      });
  }
  function renderNotifList() {
    var listEl = document.getElementById('ampNotifList');
    if (!listEl) return;
    DB.list('notifications', { eq: { user_id: Auth.userId() }, order: 'created_at', asc: false, limit: 12 })
      .then(function (r) {
        var rows = r.data || [];
        if (!rows.length) { listEl.innerHTML = '<div class="text-center text-muted small py-3">Tidak ada notifikasi</div>'; return; }
        var ICONS = { loan_overdue: 'alarm', loan_pending: 'hourglass-split', disposal_pending: 'trash3',
          maintenance_new: 'wrench', schedule_due: 'calendar-week', asset_unverified: 'patch-question',
          opname_active: 'clipboard-check', depreciation_period: 'graph-down-arrow', default: 'info-circle' };
        listEl.innerHTML = rows.map(function (n) {
          var ic = ICONS[n.notification_type] || ICONS.default;
          return '<a class="dropdown-item amp-notif-item ' + (n.is_read ? '' : 'unread') + '" href="javascript:void(0)" data-id="' + n.id + '">' +
            '<div class="d-flex gap-2"><i class="bi bi-' + ic + ' mt-1 text-primary"></i>' +
            '<div><div class="small fw-semibold">' + UI.esc(n.title) + '</div>' +
            '<div class="small text-body-secondary">' + UI.esc(n.message) + '</div>' +
            '<div class="small text-muted mt-1">' + UI.fdatetime(n.created_at) + '</div></div></div></a>';
        }).join('');
        listEl.querySelectorAll('.amp-notif-item').forEach(function (a) {
          a.addEventListener('click', function () {
            DB.update('notifications', a.dataset.id, { is_read: true }).then(function () {
              refreshNotifBadge(); renderNotifList();
            });
          });
        });
      });
  }
  function setupNotifications() {
    refreshNotifBadge();
    var menu = document.getElementById('ampNotifMenu');
    if (menu) {
      menu.addEventListener('shown.bs.dropdown', renderNotifList);
      var btnReadAll = document.getElementById('ampNotifReadAll');
      btnReadAll.addEventListener('click', function () {
        DB.updateWhere('notifications', { user_id: Auth.userId(), is_read: false }, { is_read: true })
          .then(function () { refreshNotifBadge(); renderNotifList(); });
      });
    }
  }

  /* --------------------- GLOBAL SEARCH --------------------- */
  function setupGlobalSearch() {
    var input = document.getElementById('ampGlobalSearch');
    var box = document.getElementById('ampGsResults');
    if (!input || !box) return;
    var doSearch = UI.debounce(function () {
      var q = input.value.trim();
      if (q.length < 2) { box.style.display = 'none'; return; }
      var needle = q.replace(/[%_]/g, '');
      DB.list('assets', { or: 'asset_code.ilike.' + needle + ',asset_name.ilike.' + needle + ',serial_number.ilike.' + needle + ',brand.ilike.' + needle, limit: 8 })
        .then(function (r) {
          var rows = (r && r.data) || [];
          if (!rows.length) { box.innerHTML = '<div class="p-3 text-muted small">Tidak ada hasil untuk "' + UI.esc(q) + '"</div>'; box.style.display = 'block'; return; }
          box.innerHTML = rows.map(function (a) {
            return '<a class="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none text-body amp-gs-item" href="asset-detail.html?id=' + a.id + '">' +
              '<i class="bi bi-box-seam text-primary"></i><div><div class="small fw-semibold">' + UI.esc(a.asset_name) + '</div>' +
              '<div class="text-muted" style="font-size:.75rem">' + UI.esc(a.asset_code) + ' · ' + UI.badge(a.asset_status) + '</div></div></a>';
          }).join('');
          box.style.display = 'block';
        });
    }, 300);
    input.addEventListener('input', doSearch);
    input.addEventListener('focus', doSearch);
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) box.style.display = 'none';
    });
  }

  /* --------------------- BOOT --------------------- */
  function boot() {
    var s = Auth.getSession();
    if (!s) { location.href = 'login.html'; return; }
    var pk = pageKey();
    if (!Auth.canPage(pk)) {
      document.getElementById('amp-content').innerHTML =
        '<div class="text-center py-5"><i class="bi bi-shield-lock fs-1 text-danger d-block mb-3"></i>' +
        '<h5>Halaman tidak tersedia untuk peran Anda</h5>' +
        '<p class="text-muted">Peran <strong>' + Auth.roles().map(function (r) { return Auth.roleLabel(r); }).join(', ') +
        '</strong> tidak memiliki akses ke halaman ini.</p>' +
        '<a class="btn btn-primary" href="index.html"><i class="bi bi-house me-1"></i>Kembali ke Dashboard</a></div>';
      applyBrand();
      renderSidebar(); renderTopbar(); applyTheme();
      DB.ready().then(syncBrandingFromDB);
      return;
    }
    applyBrand();
    applyTheme();
    renderSidebar();
    renderTopbar();
    DB.ready().then(function () {
      syncBrandingFromDB();
      if (typeof window.PAGE_INIT === 'function') {
        try { window.PAGE_INIT(); } catch (err) {
          console.error('Page init error', err);
          UI.toast('error', 'Terjadi kesalahan memuat halaman: ' + err.message);
        }
      }
    });
  }

  var APP_CONFIG = window.AMP_CONFIG;

  document.addEventListener('DOMContentLoaded', function () {
    applyBrand(); // berlaku juga di halaman login (tanpa sidebar)
    if (document.getElementById('amp-content')) {
      boot();
    } else if (typeof window.PAGE_INIT === 'function') {
      // Halaman standalone (login): inisialisasi modul langsung
      DB.ready().then(function () { window.PAGE_INIT(); });
    }
  });

  return { MENU: MENU, pageKey: pageKey, refreshNotifBadge: refreshNotifBadge, applyTheme: applyTheme,
    applyBrand: applyBrand, getBranding: getBranding, saveBranding: saveBranding, syncBranding: syncBrandingFromDB,
    renderSidebar: renderSidebar,
    notify: function () { refreshNotifBadge(); } };
})();
window.AMP = AMP;

/* Guard login.html: jika sudah login langsung ke dashboard */
if (location.pathname.indexOf('login.html') >= 0) {
  document.addEventListener('DOMContentLoaded', function () {
    if (Auth.getSession()) location.href = 'index.html';
  });
}
