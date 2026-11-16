/* =====================================================================
 * ASSET MANAGEMENT PRO — supabase-config.js
 * ---------------------------------------------------------------------
 * Konfigurasi koneksi Supabase.
 *
 * CARA PRODUKSI:
 *   1. Buat project di https://supabase.com
 *   2. Jalankan supabase/schema.sql, supabase/rls-policies.sql, supabase/seed.sql
 *      di SQL Editor Supabase.
 *   3. Ganti nilai SUPABASE_URL dan SUPABASE_ANON_KEY di bawah ini
 *      (atau override melalui file assets/js/config.local.js).
 *
 * CARA CEPAT (tanpa edit kode):
 *   Buka menu Pengaturan → tab "Koneksi Supabase" di aplikasi,
 *   isi URL & Anon Key, uji koneksi lalu simpan. Koneksi tersimpan
 *   pada localStorage peramban dan otomatis memakai nilai di bawah.
 *
 * Selama URL & KEY masih placeholder, aplikasi berjalan pada
 * MODE DEMO (penyimpanan lokal peramban) agar dapat dicoba tanpa backend.
 * Service Role Key TIDAK PERNAH diletakkan di frontend.
 * ===================================================================== */

(function () {
  window.AMP_CONFIG = {
    APP_NAME: 'ASSET MANAGEMENT PRO',
    APP_TAGLINE: 'Smart Asset, Accurate Data, Better Management',
    // ---- Ganti dua nilai di bawah ini untuk koneksi Supabase produksi ----
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    // --------------------------------------------------------------------
    // Override dari halaman Pengaturan (localStorage) — prioritas tertinggi
    // setelah config.local.js.
    SUPABASE_CONN_KEY: 'AMP_SUPABASE_CONN',
    DEMO_MODE: true,
    CURRENCY: 'IDR',
    LOCALE: 'id-ID',
    QR_LABEL_PREFIX: 'AMP',
  };

  // Override opsional lewat config.local.js (diabaikan git)
  if (window.AMP_CONFIG_LOCAL) {
    Object.assign(window.AMP_CONFIG, window.AMP_CONFIG_LOCAL);
  }

  // Override dari halaman Pengaturan (disimpan per peramban)
  try {
    var _conn = JSON.parse(localStorage.getItem('AMP_SUPABASE_CONN') || 'null');
    if (_conn && _conn.url && _conn.key) {
      window.AMP_CONFIG.SUPABASE_URL = _conn.url;
      window.AMP_CONFIG.SUPABASE_ANON_KEY = _conn.key;
      window.AMP_CONFIG.CONN_SOURCE = 'settings';
    }
  } catch (e) { /* abaikan */ }

  var url = (window.AMP_CONFIG.SUPABASE_URL || '').trim();
  var key = (window.AMP_CONFIG.SUPABASE_ANON_KEY || '').trim();
  var valid = /^https?:\/\/.+/i.test(url) && key.length >= 20 && !key.toUpperCase().includes('GANTI');

  window.AMP_CONFIG.DEMO_MODE = !valid;

  /**
   * Muat library supabase-js v2 dari CDN saat mode produksi.
   * Dipanggil otomatis oleh db.js.
   */
  window.AMP_loadSupabaseJS = function () {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
      s.onload = function () { resolve(); };
      s.onerror = function () {
        reject(new Error('Gagal memuat supabase-js. Periksa koneksi internet.'));
      };
      document.head.appendChild(s);
    });
  };
})();
