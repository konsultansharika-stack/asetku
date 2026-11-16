/* =====================================================================
 * ASSET MANAGEMENT PRO — settings.js
 * Pengaturan: identitas organisasi & logo, tampilan warna (tema),
 * koneksi Supabase, preferensi aplikasi, dan audit trail.
 * ===================================================================== */

window.PAGE_INIT = function () {
  'use strict';
  var isAdmin = Auth.isAdmin();
  var canEdit = Auth.isPengelola(); // super_admin & pengelola
  var org = Auth.orgId();

  /* =====================================================
   * UTILITAS LOGO: resize otomatis -> dataURL (max 256px)
   * ===================================================== */
  function dataUrlSize(dataUrl) { return Math.round((dataUrl.length - (dataUrl.indexOf(',') + 1)) * 0.75); }

  function processLogoFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return reject(new Error('Tidak ada file dipilih'));
      if (file.size > 4 * 1024 * 1024) return reject(new Error('Ukuran file maksimal 4 MB'));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Gagal membaca file')); };
      reader.onload = function () {
        var dataUrl = String(reader.result);
        // SVG: simpan apa adanya (vektor, ringan)
        if (/image\/svg/i.test(file.type)) {
          if (dataUrl.length > 200 * 1024) return reject(new Error('SVG terlalu besar — gunakan SVG maksimal 150 KB'));
          return resolve(dataUrl);
        }
        var img = new Image();
        img.onerror = function () { reject(new Error('Format gambar tidak didukung')); };
        img.onload = function () {
          var MAX = 256, scale = Math.min(1, MAX / Math.max(img.width, img.height));
          (function draw(s) {
            var c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.width * s));
            c.height = Math.max(1, Math.round(img.height * s));
            var ctx = c.getContext('2d');
            ctx.clearRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);
            var out = c.toDataURL('image/png');
            if (dataUrlSize(out) > 260 * 1024 && s > 0.3) { draw(s * 0.75); return; }
            resolve(out);
          })(scale);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = (parts[0].match(/data:(.+?);/) || [null, 'image/png'])[1];
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /** Mode Supabase: unggah logo ke bucket "branding" (publik), balas URL publik. */
  function uploadLogoSupabase(dataUrl, orgId) {
    var sb = DB._supabaseClient();
    if (!sb || !sb.storage) return Promise.reject(new Error('Klien Supabase belum siap'));
    var blob = dataUrlToBlob(dataUrl);
    var ext = blob.type.indexOf('svg') >= 0 ? 'svg' : blob.type.indexOf('jpeg') >= 0 ? 'jpg' : blob.type.indexOf('webp') >= 0 ? 'webp' : 'png';
    var path = (orgId || 'umum') + '/logo-' + Date.now() + '.' + ext;
    return sb.storage.from('branding').upload(path, blob, { contentType: blob.type, upsert: true })
      .then(function (up) {
        if (up.error) throw up.error;
        return sb.storage.from('branding').getPublicUrl(path).data.publicUrl;
      });
  }

  /* =====================================================
   * TAB 1 — IDENTITAS & LOGO
   * ===================================================== */
  var currentLogo = null;

  function renderOrg() {
    DB.list('organizations', { limit: 1 }).then(function (r) {
      if (r.error || !r.data) {
        document.getElementById('orgPanel').innerHTML =
          '<div class="alert alert-danger py-2 small"><i class="bi bi-wifi-off me-1"></i>' +
          '<strong>Gagal memuat identitas organisasi.</strong> ' + UI.esc(r.error ? r.error.message : 'Tidak ada data.') +
          ' Periksa koneksi Supabase pada tab Koneksi Supabase, atau gunakan Mode Demo.</div>';
        return;
      }
      var o = r.data[0] || {};
      if (!o.id) o.id = 'org-lokal'; // pengaman: data organisasi belum ada
      currentLogo = o.logo_url || null;
      document.getElementById('orgPanel').innerHTML =
        '<div class="row g-3">' +
        '<div class="col-lg-4">' +
          '<div class="card amp-card h-100"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold"><i class="bi bi-image me-1"></i>Logo Organisasi</h6></div><div class="card-body text-center">' +
          '<div class="amp-logo-preview mb-2" id="logoPreview">' +
          (currentLogo ? '<img src="' + currentLogo + '" alt="Logo">' : '<i class="bi bi-image fs-1"></i>') +
          '</div>' +
          '<div class="small text-muted mb-2">PNG / JPG / SVG, otomatis di-resize ke 256px.<br>Tampil di sidebar, halaman masuk, dan cetakan.</div>' +
          '<input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="d-none">' +
          '<div class="d-flex gap-2 justify-content-center">' +
          '<button class="btn btn-primary btn-sm" id="logoPick"' + (canEdit ? '' : ' disabled') + '><i class="bi bi-upload me-1"></i>Pilih Logo</button>' +
          '<button class="btn btn-outline-danger btn-sm" id="logoRemove"' + (currentLogo && canEdit ? '' : ' disabled') + '><i class="bi bi-trash me-1"></i>Hapus</button>' +
          '</div></div></div>' +
        '</div>' +
        '<div class="col-lg-8">' +
          '<div class="card amp-card h-100"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold"><i class="bi bi-building me-1"></i>Identitas Organisasi</h6></div><div class="card-body">' +
          '<form id="orgForm" class="row g-2">' +
          '<div class="col-md-8 mb-1"><label class="form-label">Nama Organisasi *</label><input class="form-control" name="name" value="' + UI.esc(o.name || '') + '" maxlength="120" required' + (canEdit ? '' : ' readonly') + '><div class="form-text">Dipakai sebagai nama aplikasi di sidebar & halaman masuk.</div></div>' +
          '<div class="col-md-4 mb-1"><label class="form-label">Kode</label><input class="form-control" name="code" value="' + UI.esc(o.code || '') + '" maxlength="20"' + (canEdit ? '' : ' readonly') + '></div>' +
          '<div class="col-12 mb-1"><label class="form-label">Alamat Lengkap</label><textarea class="form-control" name="address" rows="2" maxlength="300"' + (canEdit ? '' : ' readonly') + '>' + UI.esc(o.address || '') + '</textarea></div>' +
          '<div class="col-md-4 mb-1"><label class="form-label">Telepon</label><input class="form-control" name="phone" value="' + UI.esc(o.phone || '') + '" maxlength="25"' + (canEdit ? '' : ' readonly') + '></div>' +
          '<div class="col-md-8 mb-1"><label class="form-label">Email</label><input class="form-control" type="email" name="email" value="' + UI.esc(o.email || '') + '" maxlength="100"' + (canEdit ? '' : ' readonly') + '></div>' +
          '<div class="col-md-6 mb-1"><label class="form-label">Website</label><input class="form-control" name="website" value="' + UI.esc(o.website || '') + '" placeholder="https://..." maxlength="120"' + (canEdit ? '' : ' readonly') + '></div>' +
          '<div class="col-md-6 mb-1"><label class="form-label">NPWP</label><input class="form-control" name="npwp" value="' + UI.esc(o.npwp || '') + '" placeholder="00.000.000.0-000.000" maxlength="30"' + (canEdit ? '' : ' readonly') + '></div>' +
          '<div class="col-md-6 mb-1"><label class="form-label">Pimpinan / Kepala Organisasi</label><input class="form-control" name="leader_name" value="' + UI.esc(o.leader_name || '') + '" maxlength="100"' + (canEdit ? '' : ' readonly') + '><div class="form-text">Dicantumkan pada laporan & berita acara.</div></div>' +
          '<div class="col-md-6 mb-1"><label class="form-label">Catatan Kaki Laporan (Footer)</label><input class="form-control" name="footer_note" value="' + UI.esc(o.footer_note || '') + '" placeholder="Contoh: Dicetak melalui Sistem AMP" maxlength="120"' + (canEdit ? '' : ' readonly') + '></div>' +
          (canEdit ? '<div class="col-12 text-end"><button class="btn btn-primary btn-sm"><i class="bi bi-save me-1"></i>Simpan Identitas</button></div>' : '') +
          '</form></div></div>' +
        '</div>' +
        '</div>';

      // ---- Upload logo ----
      document.getElementById('logoPick').onclick = function () { document.getElementById('logoFile').click(); };
      document.getElementById('logoFile').onchange = function (e) {
        var f = e.target.files[0];
        if (!f) return;
        UI.toast('info', 'Memproses logo...');
        processLogoFile(f).then(function (dataUrl) {
          var save;
          if (DB.isDemo() || !o.id) {
            save = Promise.resolve(dataUrl);
          } else {
            save = uploadLogoSupabase(dataUrl, o.id).catch(function (err) {
              console.warn('Upload storage gagal, simpan sebagai dataURL', err);
              UI.toast('warning', 'Upload bucket gagal — logo disimpan inline');
              return dataUrl;
            });
          }
          return save.then(function (val) {
            currentLogo = val;
            return DB.update('organizations', o.id, { logo_url: val });
          }).then(function (r2) {
            if (r2.error) throw r2.error;
            var logoVal = currentLogo;
            var br = AMP.getBranding();
            br.logo = logoVal;
            if (document.getElementById('orgForm').name.value) br.appName = document.getElementById('orgForm').name.value;
            AMP.saveBranding(br);
            AMP.applyBrand();
            AMP.renderSidebar && AMP.renderSidebar();
            document.getElementById('logoPreview').innerHTML = '<img src="' + logoVal + '" alt="Logo">';
            document.getElementById('logoRemove').disabled = false;
            UI.toast('success', 'Logo tersimpan & langsung tampil di sidebar');
          });
        }).catch(function (err) { UI.toast('error', err.message || 'Gagal memproses logo'); });
        e.target.value = '';
      };
      document.getElementById('logoRemove').onclick = function () {
        UI.confirmDialog({ title: 'Hapus logo?', icon: 'warning', confirmText: 'Hapus', danger: true })
          .then(function (ok) {
            if (!ok) return;
            DB.update('organizations', o.id, { logo_url: null }).then(function (r2) {
              if (r2.error) throw r2.error;
              currentLogo = null;
              var br = AMP.getBranding(); delete br.logo;
              AMP.saveBranding(br); AMP.applyBrand();
              document.getElementById('logoPreview').innerHTML = '<i class="bi bi-image fs-1"></i>';
              document.getElementById('logoRemove').disabled = true;
              UI.toast('success', 'Logo dihapus');
            }).catch(function (err) { UI.toast('error', err.message); });
          });
      };

      // ---- Simpan identitas ----
      document.getElementById('orgForm').onsubmit = function (e) {
        e.preventDefault();
        var f = e.target;
        var data = {
          name: f.name.value.trim(), code: f.code.value.trim(), address: f.address.value.trim(),
          phone: f.phone.value.trim(), email: f.email.value.trim(), website: f.website.value.trim(),
          npwp: f.npwp.value.trim(), leader_name: f.leader_name.value.trim(), footer_note: f.footer_note.value.trim()
        };
        DB.update('organizations', o.id, data).then(function (r2) {
          if (r2.error) throw r2.error;
          var br = AMP.getBranding();
          br.appName = data.name; br.orgName = data.name;
          AMP.saveBranding(br);
          AMP.applyBrand();
          UI.toast('success', 'Identitas organisasi tersimpan — nama aplikasi diperbarui');
        }).catch(function (err) { UI.toast('error', err.message); });
      };
    });
  }

  /* =====================================================
   * TAB 2 — TAMPILAN WARNA
   * ===================================================== */
  var PALETTES = [
    { id: 'navy',   name: 'Navy Klasik (Bawaan)', vars: { '--amp-navy-900': '#0b1f3a', '--amp-navy-800': '#12294d', '--amp-navy-700': '#1e3a5f', '--amp-navy-600': '#274b7a', '--amp-navy-500': '#33598f', '--amp-accent': '#2f6fd0' } },
    { id: 'hijau',  name: 'Hijau Pendidikan',     vars: { '--amp-navy-900': '#04291c', '--amp-navy-800': '#0a3d2b', '--amp-navy-700': '#0f5132', '--amp-navy-600': '#146c43', '--amp-navy-500': '#1a8754', '--amp-accent': '#1ba05b' } },
    { id: 'samudra',name: 'Biru Samudra',         vars: { '--amp-navy-900': '#042a3d', '--amp-navy-800': '#063a52', '--amp-navy-700': '#0b5570', '--amp-navy-600': '#0e6f8f', '--amp-navy-500': '#1289ae', '--amp-accent': '#0aa2c0' } },
    { id: 'ungu',   name: 'Ungu Elegan',          vars: { '--amp-navy-900': '#1e0f3c', '--amp-navy-800': '#2a1752', '--amp-navy-700': '#3b2270', '--amp-navy-600': '#4e2d8f', '--amp-navy-500': '#6438ad', '--amp-accent': '#7c3aed' } },
    { id: 'marun',  name: 'Merah Marun',          vars: { '--amp-navy-900': '#2b0a10', '--amp-navy-800': '#451015', '--amp-navy-700': '#611a20', '--amp-navy-600': '#7f2229', '--amp-navy-500': '#9e2a33', '--amp-accent': '#b02a37' } },
    { id: 'senja',  name: 'Oranye Senja',         vars: { '--amp-navy-900': '#331503', '--amp-navy-800': '#4a2005', '--amp-navy-700': '#632c08', '--amp-navy-600': '#7d3a0b', '--amp-navy-500': '#98480e', '--amp-accent': '#ea580c' } }
  ];

  function hexToHsl(hex) {
    var m = hex.replace('#', '');
    if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
    var r = parseInt(m.slice(0, 2), 16) / 255, g = parseInt(m.slice(2, 4), 16) / 255, b = parseInt(m.slice(4, 6), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.min(1, Math.max(0, s)); l = Math.min(0.98, Math.max(0.02, l));
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    var rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    var hex = rgb.map(function (v) {
      v = Math.round((v + m) * 255);
      return ('0' + v.toString(16)).slice(-2);
    }).join('');
    return '#' + hex;
  }
  /** Dari satu warna dasar sidebar -> 5 gradasi (900..500). */
  function shadesFrom(base) {
    var c = hexToHsl(base);
    var s = Math.min(0.75, Math.max(0.25, c.s));
    return {
      '--amp-navy-900': hslToHex(c.h, s, c.l * 0.42),
      '--amp-navy-800': hslToHex(c.h, s, c.l * 0.62),
      '--amp-navy-700': hslToHex(c.h, s, Math.min(0.75, c.l * 0.62 + 0.13)),
      '--amp-navy-600': hslToHex(c.h, s, Math.min(0.82, c.l * 0.62 + 0.22)),
      '--amp-navy-500': hslToHex(c.h, s, Math.min(0.9, c.l * 0.62 + 0.3))
    };
  }

  function previewBar(vars, selected, pid) {
    return '<div class="col-6 col-md-4 col-xl-2">' +
      '<div class="amp-palette-card' + (selected ? ' selected' : '') + '" data-pid="' + pid + '">' +
      '<div class="amp-palette-preview" style="background:linear-gradient(135deg,' + vars['--amp-navy-900'] + ',' + vars['--amp-navy-800'] + ')">' +
      '<span class="amp-palette-dot" style="background:' + vars['--amp-accent'] + '"></span>' +
      '<span style="color:#fff;font-size:.62rem;font-weight:700;letter-spacing:.04em">AMP</span>' +
      '<span class="amp-palette-dot ms-auto" style="background:' + vars['--amp-navy-500'] + '"></span>' +
      '</div>' +
      '<div class="small fw-semibold mt-2">' + pid + '</div>' +
      '<div class="d-flex gap-1 mt-1">' +
      Object.keys(vars).map(function (k) { return '<span style="width:16px;height:10px;border-radius:3px;background:' + vars[k] + ';display:inline-block"></span>'; }).join('') +
      '</div></div></div>';
  }

  function renderTheme() {
    var br = AMP.getBranding();
    var activeId = br.paletteId || 'navy';
    var custom = br.vars && !PALETTES.some(function (p) { return JSON.stringify(p.vars) === JSON.stringify(br.vars); });
    if (custom) activeId = 'custom';

    document.getElementById('themePanel').innerHTML =
      '<div class="card amp-card" style="max-width:980px">' +
      '<div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold"><i class="bi bi-palette me-1"></i>Tema Warna Aplikasi</h6></div>' +
      '<div class="card-body">' +
      '<div class="alert alert-info py-2 small mb-3"><i class="bi bi-info-circle me-1"></i>' +
      'Warna disimpan pada peramban ini (localStorage) dan langsung diterapkan ke seluruh halaman. ' +
      'Mode terang/gelap diatur lewat tombol <i class="bi bi-moon-stars"></i> di bilah atas.</div>' +
      '<div class="row g-2 mb-3" id="paletteGrid">' +
      PALETTES.map(function (p) { return previewBar(p.vars, activeId === p.id, p.name); }).join('') +
      previewBar(customVarsFromInputs(), activeId === 'custom', 'Kustom') +
      '</div>' +
      '<hr>' +
      '<div class="row g-3 align-items-end">' +
      '<div class="col-auto"><label class="form-label small mb-1">Warna dasar sidebar</label><br>' +
      '<input type="color" class="amp-color-input" id="colorSidebar" value="' + UI.esc(br.customSidebar || '#12294d') + '"></div>' +
      '<div class="col-auto"><label class="form-label small mb-1">Warna aksen</label><br>' +
      '<input type="color" class="amp-color-input" id="colorAccent" value="' + UI.esc(br.customAccent || '#2f6fd0') + '"></div>' +
      '<div class="col-auto d-flex gap-2">' +
      '<button class="btn btn-primary btn-sm" id="applyCustom"><i class="bi bi-check2-circle me-1"></i>Terapkan Kustom</button>' +
      '<button class="btn btn-outline-secondary btn-sm" id="resetTheme"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset Bawaan</button>' +
      '</div>' +
      '<div class="col-12"><div class="form-text">Warna dasar dipakai untuk gradasi sidebar (gelap → sedang); warna aksen dipakai untuk menu aktif, tombol utama, dan sorotan.</div></div>' +
      '</div>' +
      '</div></div>';

    function customVarsFromInputs() {
      var sb = document.getElementById('colorSidebar'), ac = document.getElementById('colorAccent');
      var vars = shadesFrom(sb ? sb.value : '#12294d');
      vars['--amp-accent'] = ac ? ac.value : '#2f6fd0';
      return vars;
    }
    function markSelected(pid) {
      document.querySelectorAll('#paletteGrid .amp-palette-card').forEach(function (c) {
        c.classList.toggle('selected', c.dataset.pid === pid);
      });
    }
    function applyPalette(p) {
      var b = AMP.getBranding();
      b.paletteId = p.id; b.vars = p.vars;
      if (p.id === 'navy') { delete b.customSidebar; delete b.customAccent; }
      AMP.saveBranding(b);
      AMP.applyBrand();
      UI.toast('success', 'Tema "' + p.name + '" diterapkan');
    }

    document.getElementById('paletteGrid').onclick = function (e) {
      var card = e.target.closest('[data-pid]');
      if (!card) return;
      var pid = card.dataset.pid;
      if (pid === 'Kustom') {
        var vars = customVarsFromInputs();
        var b = AMP.getBranding();
        b.paletteId = 'custom'; b.vars = vars;
        b.customSidebar = document.getElementById('colorSidebar').value;
        b.customAccent = document.getElementById('colorAccent').value;
        AMP.saveBranding(b); AMP.applyBrand();
        markSelected('Kustom');
        UI.toast('success', 'Warna kustom diterapkan');
        return;
      }
      var p = PALETTES.find(function (x) { return x.name === pid; });
      if (p) { applyPalette(p); markSelected(pid); }
    };
    ['colorSidebar', 'colorAccent'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        // pratinjau langsung tanpa menyimpan
        var vars = customVarsFromInputs();
        var root = document.documentElement;
        Object.keys(vars).forEach(function (k) { root.style.setProperty(k, vars[k]); });
      });
    });
    document.getElementById('applyCustom').onclick = function () {
      var vars = customVarsFromInputs();
      var b = AMP.getBranding();
      b.paletteId = 'custom'; b.vars = vars;
      b.customSidebar = document.getElementById('colorSidebar').value;
      b.customAccent = document.getElementById('colorAccent').value;
      AMP.saveBranding(b); AMP.applyBrand();
      markSelected('Kustom');
      UI.toast('success', 'Warna kustom tersimpan untuk peramban ini');
    };
    document.getElementById('resetTheme').onclick = function () {
      var b = AMP.getBranding();
      delete b.paletteId; delete b.vars; delete b.customSidebar; delete b.customAccent;
      AMP.saveBranding(b); AMP.applyBrand();
      markSelected('Navy Klasik (Bawaan)');
      document.getElementById('colorSidebar').value = '#12294d';
      document.getElementById('colorAccent').value = '#2f6fd0';
      UI.toast('success', 'Tema dikembalikan ke bawaan');
    };
  }

  /* =====================================================
   * TAB 3 — KONEKSI SUPABASE
   * ===================================================== */
  var testedConn = null; // { url, key, ok }

  function renderData() {
    var cfg = window.AMP_CONFIG;
    var connStored = null;
    try { connStored = JSON.parse(localStorage.getItem('AMP_SUPABASE_CONN') || 'null'); } catch (e) { /* abaikan */ }
    var isDemo = DB.isDemo();
    var modeBadge = isDemo
      ? '<span class="badge text-bg-warning"><i class="bi bi-cone-striped me-1"></i>Mode Demo</span>'
      : '<span class="badge text-bg-success"><i class="bi bi-cloud-check me-1"></i>Tersambung Supabase</span>';
    var host = '';
    try { host = cfg.SUPABASE_URL ? new URL(cfg.SUPABASE_URL).host : ''; } catch (e) { host = ''; }

    var adminHtml = '';
    if (isAdmin) {
      adminHtml =
        '<div class="card amp-card mt-3" style="max-width:760px"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold"><i class="bi bi-plug me-1"></i>Konfigurasi Koneksi</h6></div><div class="card-body">' +
        '<form id="connForm" class="row g-2">' +
        '<div class="col-12 mb-1"><label class="form-label">Project URL *</label>' +
        '<input class="form-control" name="url" type="url" placeholder="https://xxxxx.supabase.co" value="' + UI.esc(connStored ? connStored.url : (cfg.CONN_SOURCE === 'settings' ? cfg.SUPABASE_URL : '')) + '" required>' +
        '<div class="form-text">Dashboard Supabase → Project Settings → Data API → Project URL.</div></div>' +
        '<div class="col-12 mb-1"><label class="form-label">Anon / Publishable Key *</label>' +
        '<div class="input-group"><input class="form-control" name="key" id="connKey" type="password" placeholder="eyJhbGciOi..." value="' + UI.esc(connStored ? connStored.key : (cfg.CONN_SOURCE === 'settings' ? cfg.SUPABASE_ANON_KEY : '')) + '" required>' +
        '<button class="btn btn-outline-secondary" type="button" id="connShowKey"><i class="bi bi-eye"></i></button></div>' +
        '<div class="form-text">Anon Key aman dipakai di frontend karena dibatasi Row Level Security. <strong>Jangan</strong> gunakan Service Role Key.</div></div>' +
        '<div class="col-12 d-flex gap-2 flex-wrap">' +
        '<button type="button" class="btn btn-outline-primary btn-sm" id="btnTestConn"><i class="bi bi-lightning-charge me-1"></i>Uji Koneksi</button>' +
        '<button type="submit" class="btn btn-primary btn-sm" id="btnSaveConn" disabled><i class="bi bi-save me-1"></i>Simpan & Aktifkan</button>' +
        (connStored ? '<button type="button" class="btn btn-outline-danger btn-sm" id="btnDropConn"><i class="bi bi-plug me-1"></i>Putuskan (kembali ke Demo)</button>' : '') +
        '</div>' +
        '<div class="col-12"><div id="connTestResult"></div></div>' +
        '</form></div></div>';
    } else {
      adminHtml = '<div class="alert alert-secondary py-2 small mt-3" style="max-width:760px"><i class="bi bi-shield-lock me-1"></i>Konfigurasi koneksi hanya dapat diubah oleh <strong>Super Admin</strong>.</div>';
    }

    document.getElementById('dataPanel').innerHTML =
      '<div class="card amp-card" style="max-width:760px"><div class="card-body">' +
      '<div class="d-flex justify-content-between align-items-center mb-2"><h6 class="fw-bold mb-0">Status Koneksi Data</h6>' + modeBadge + '</div>' +
      '<div class="alert ' + (isDemo ? 'alert-warning' : 'alert-success') + ' py-2 small mb-2">' +
      (isDemo ?
        '<strong>Mode Demo aktif.</strong> Data disimpan di penyimpanan lokal peramban — cocok untuk demonstrasi dan pelatihan, tidak untuk data nyata. Untuk produksi:' +
        '<ol class="mb-0 mt-1"><li>Buat project Supabase, jalankan <code>supabase/schema.sql</code>, <code>rls-policies.sql</code>, <code>seed.sql</code> di SQL Editor.</li>' +
        '<li>Isi Project URL & Anon Key pada form di bawah' + (isAdmin ? '' : ' (oleh Super Admin)') + ', klik <em>Uji Koneksi</em>, lalu <em>Simpan & Aktifkan</em>.</li>' +
        '<li>Buat pengguna di Supabase Auth; seluruh data berpindah ke PostgreSQL + RLS otomatis.</li></ol>' :
        '<strong>Tersambung ke Supabase' + (host ? ' (' + UI.esc(host) + ')' : '') + '.</strong> Sumber: ' +
        (cfg.CONN_SOURCE === 'settings' ? 'Pengaturan (localStorage peramban ini)' : 'file <code>supabase-config.js</code>') +
        '. Semua transaksi tersimpan di PostgreSQL dengan Row Level Security.') +
      '</div>' +
      '</div></div>' +
      adminHtml +
      '<div class="card amp-card mt-3" style="max-width:760px"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold"><i class="bi bi-hdd me-1"></i>Alat Data</h6></div><div class="card-body">' +
      '<div class="d-flex gap-2 flex-wrap">' +
      '<button class="btn btn-outline-secondary btn-sm" id="expAll"><i class="bi bi-download me-1"></i>Ekspor Seluruh Data (JSON)</button>' +
      (DB.isDemo() && canEdit ? '<button class="btn btn-outline-danger btn-sm" id="resetDemo"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset Data Demo</button>' : '') +
      '</div></div></div>';

    // ---- Uji koneksi ----
    var btnTest = document.getElementById('btnTestConn');
    if (btnTest) {
      document.getElementById('connShowKey').onclick = function () {
        var k = document.getElementById('connKey');
        k.type = k.type === 'password' ? 'text' : 'password';
        this.innerHTML = '<i class="bi bi-' + (k.type === 'password' ? 'eye' : 'eye-slash') + '"></i>';
      };
      btnTest.onclick = function () {
        var f = document.getElementById('connForm');
        var url = f.url.value.trim(), key = f.key.value.trim();
        var resBox = document.getElementById('connTestResult');
        if (!/^https?:\/\/.+\..+/i.test(url)) { UI.toast('error', 'Project URL tidak valid (harus https://...)'); return; }
        if (key.length < 20) { UI.toast('error', 'Anon Key terlalu pendek — salin lengkap dari Supabase'); return; }
        btnTest.disabled = true;
        btnTest.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menguji...';
        resBox.innerHTML = '';
        var t0 = Date.now();
        window.AMP_loadSupabaseJS().then(function () {
          var tmp;
          try { tmp = window.supabase.createClient(url, key, { auth: { persistSession: false } }); }
          catch (e) { throw new Error('Gagal membuat klien: ' + e.message); }
          return tmp.from('organizations').select('id', { count: 'exact', head: true }).then(function (r) {
            if (r.error) {
              var msg = r.error.message || 'Query gagal';
              if (/JWT|Invalid API key|apikey/i.test(msg)) throw new Error('Anon Key tidak diterima. Salin ulang dari Project Settings → API.');
              if (/Failed to fetch|NetworkError/i.test(msg)) throw new Error('Server tidak dapat dihubungi. Periksa URL dan status project Supabase.');
              if (/relation|does not exist|schema/i.test(msg)) throw new Error('Terhubung, tetapi tabel belum ada. Jalankan supabase/schema.sql di SQL Editor.');
              throw new Error(msg);
            }
            var ms = Date.now() - t0;
            return { ms: ms, count: r.count };
          });
        }).then(function (info) {
          testedConn = { url: url, key: key };
          document.getElementById('btnSaveConn').disabled = false;
          resBox.innerHTML = '<div class="alert alert-success py-2 small mb-0"><i class="bi bi-check-circle me-1"></i>' +
            '<strong>Koneksi berhasil</strong> — respons ' + info.ms + ' ms, tabel terjangkau' + (info.count !== null ? ' (' + info.count + ' organisasi)' : '') + '. Klik <em>Simpan & Aktifkan</em>.</div>';
        }).catch(function (err) {
          testedConn = null;
          document.getElementById('btnSaveConn').disabled = true;
          resBox.innerHTML = '<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-x-circle me-1"></i><strong>Gagal:</strong> ' + UI.esc(err.message) + '</div>';
        }).finally(function () {
          btnTest.disabled = false;
          btnTest.innerHTML = '<i class="bi bi-lightning-charge me-1"></i>Uji Koneksi';
        });
      };
      document.getElementById('connForm').onsubmit = function (e) {
        e.preventDefault();
        if (!testedConn) { UI.toast('warning', 'Jalankan Uji Koneksi terlebih dahulu'); return; }
        var f = e.target;
        localStorage.setItem('AMP_SUPABASE_CONN', JSON.stringify({ url: testedConn.url, key: testedConn.key, savedAt: new Date().toISOString() }));
        UI.toast('success', 'Koneksi tersimpan — memuat ulang aplikasi...');
        setTimeout(function () { location.reload(); }, 900);
      };
      var drop = document.getElementById('btnDropConn');
      if (drop) drop.onclick = function () {
        UI.confirmDialog({
          title: 'Putuskan koneksi Supabase?',
          html: 'Aplikasi akan kembali ke <strong>Mode Demo</strong> pada peramban ini. Koneksi dapat diaktifkan lagi kapan saja.',
          danger: true, confirmText: 'Putuskan'
        }).then(function (ok) {
          if (!ok) return;
          localStorage.removeItem('AMP_SUPABASE_CONN');
          UI.toast('success', 'Koneksi diputus — memuat ulang...');
          setTimeout(function () { location.reload(); }, 800);
        });
      };
    }

    // ---- Ekspor / reset ----
    document.getElementById('expAll').onclick = function () {
      var tables = ['assets', 'asset_categories', 'locations', 'suppliers', 'loan_requests', 'procurement_requests', 'maintenance_requests'];
      Promise.all(tables.map(function (t) { return DB.list(t, { limit: 2000 }); })).then(function (rs) {
        var out = {};
        tables.forEach(function (t, i) { out[t] = rs[i].data; });
        var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'asset-management-export.json';
        a.click();
        UI.toast('success', 'Ekspor JSON diunduh');
      });
    };
    var rd = document.getElementById('resetDemo');
    if (rd) rd.onclick = function () {
      UI.confirmDialog({ title: 'Reset seluruh data demo?', html: 'Data contoh akan dimuat ulang; perubahan Anda hilang.', danger: true, confirmText: 'Reset' })
        .then(function (ok) {
          if (!ok) return;
          DB.resetDemo();
          UI.toast('success', 'Data demo dimuat ulang — halaman akan dimuat ulang');
          setTimeout(function () { location.reload(); }, 900);
        });
    };
  }

  /* =====================================================
   * TAB 4 — PREFERENSI APLIKASI (tidak berubah)
   * ===================================================== */
  function renderPref() {
    DB.list('app_settings', {}).then(function (r) {
      var rows = r.data || [];
      document.getElementById('prefPanel').innerHTML =
        '<div class="card amp-card" style="max-width:760px"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">Preferensi & Kebijakan Aplikasi</h6></div><div class="card-body p-0">' +
        '<table class="table mb-0"><thead><tr><th>Kunci Pengaturan</th><th>Nilai</th><th></th></tr></thead><tbody>' +
        rows.map(function (s) {
          return '<tr><td class="fw-semibold">' + UI.esc(s.setting_key) + '</td>' +
            '<td><code style="font-size:.78rem">' + UI.esc(JSON.stringify(s.setting_value)) + '</code></td>' +
            '<td class="text-end">' + (isAdmin ? UI.iconBtn('Ubah', 'pencil', 'data-set="' + s.id + '"', 'btn-outline-primary') : '') + '</td></tr>';
        }).join('') +
        '</tbody></table>' +
        '<div class="p-3 d-flex gap-3 flex-wrap">' +
        '<div><label class="form-label small mb-1">Mode warna</label><button class="btn btn-outline-secondary btn-sm" id="prefTheme"><i class="bi bi-circle-half me-1"></i>Ganti Terang/Gelap</button></div>' +
        '<div><label class="form-label small mb-1">Tampilan tabel</label><span class="badge text-bg-light border">Default 10-15 baris</span></div>' +
        '</div></div></div>' +
        '<div class="card amp-card mt-3" style="max-width:760px"><div class="card-header bg-transparent py-2"><h6 class="mb-0 fw-bold">Tentang Aplikasi</h6></div><div class="card-body small">' +
        '<div><strong>' + window.AMP_CONFIG.APP_NAME + '</strong> — ' + window.AMP_CONFIG.APP_TAGLINE + '</div>' +
        '<div class="text-muted mt-1">Sistem Informasi Inventaris, Barang, dan Manajemen Aset Terintegrasi. ' +
        'Mendukung siklus: Perencanaan → Pengadaan → Penerimaan → Inventarisasi → QR Code → Penempatan → Peminjaman → Pengembalian → Pemeliharaan → Penyusutan → Stock Opname → Penghapusan → Pelaporan.</div>' +
        '<div class="text-muted mt-2">Mode data: <strong>' + (DB.isDemo() ? 'Demo (lokal peramban)' : 'Supabase PostgreSQL') + '</strong></div>' +
        '</div></div>';
      document.getElementById('prefPanel').onclick = function (e) {
        if (e.target.closest('#prefTheme')) { document.getElementById('ampThemeBtn').click(); return; }
        var b = e.target.closest('[data-set]'); if (!b || !isAdmin) return;
        var s = rows.find(function (x) { return x.id === b.dataset.set; });
        UI.formModal({
          title: 'Ubah Pengaturan: ' + s.setting_key, submitText: 'Simpan',
          fields: [{ name: 'val', label: 'Nilai (JSON)', type: 'textarea', rows: 4, required: true, value: JSON.stringify(s.setting_value) }],
          onSubmit: function (data) {
            var parsed;
            try { parsed = JSON.parse(data.val); } catch (err) { UI.toast('error', 'Format JSON tidak valid'); return false; }
            return DB.update('app_settings', s.id, { setting_value: parsed }).then(function () { UI.toast('success', 'Pengaturan tersimpan'); renderPref(); });
          }
        });
      };
    });
  }

  /* =====================================================
   * TAB 5 — AUDIT TRAIL (tidak berubah)
   * ===================================================== */
  function renderAudit() {
    if (!isAdmin) {
      document.getElementById('auditTable').innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-shield-lock fs-2 d-block"></i>Audit trail hanya untuk Super Admin.</div>';
      return;
    }
    DB.list('audit_logs', { order: 'created_at', asc: false, limit: 300 }).then(function (r) {
      UI.dataTable({
        mount: '#auditTable', pageSize: 12,
        columns: [
          { key: 'created_at', label: 'Waktu', render: function (a) { return UI.fdatetime(a.created_at); } },
          { key: 'user_name', label: 'Pengguna', render: function (a) { return UI.esc(a.user_name || '-'); } },
          { key: 'action', label: 'Aksi', render: function (a) { return '<span class="badge text-bg-secondary">' + UI.esc(a.action) + '</span>'; } },
          { key: 'table_name', label: 'Tabel' },
          { key: 'record_id', label: 'Record', render: function (a) { return '<code style="font-size:.72rem">' + UI.esc(String(a.record_id || '-').slice(0, 18)); } }
        ], rows: r.data
      });
    });
  }

  document.getElementById('pageHead').innerHTML = UI.pageHeader('Pengaturan',
    'Identitas & logo organisasi, tema warna, koneksi Supabase, preferensi, dan audit trail',
    '<button class="btn btn-outline-dark btn-sm" id="backHome"><i class="bi bi-house me-1"></i>Dashboard</button>');
  document.getElementById('backHome').onclick = function () { location.href = 'index.html'; };
  renderOrg();
  renderTheme();
  renderData();
  renderPref();
  renderAudit();
};
