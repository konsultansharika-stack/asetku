/* =====================================================================
 * ASSET MANAGEMENT PRO — auth.js
 * Autentikasi + RBAC (Role Based Access Control).
 * - Mode Demo   : kredensial lokal (auth_users pada penyimpanan demo)
 * - Mode Supabase : Supabase Auth + tabel profiles/user_roles
 * ===================================================================== */

var Auth = (function () {
  'use strict';

  var SESSION_KEY = 'AMP_SESSION';
  var ROLE_KEY_MAP = {
    'super_admin': 'Super Admin',
    'pimpinan': 'Pimpinan Yayasan',
    'direktur': 'Direktur',
    'manajer': 'Manajer Departemen',
    'pengelola': 'Pengelola Inventaris',
    'gudang': 'Petugas Gudang',
    'teknisi': 'Teknisi',
    'keuangan': 'Keuangan',
    'pegawai': 'Pegawai'
  };

  /* Halaman yang boleh diakses per role */
  var ROLE_PAGES = {
    super_admin: '*',
    pimpinan: ['dashboard', 'assets', 'asset-detail', 'reports', 'disposal', 'depreciation', 'loans', 'procurement', 'stock-opname', 'qr-scanner'],
    direktur: ['dashboard', 'assets', 'asset-detail', 'reports', 'procurement', 'disposal', 'loans', 'transfers', 'qr-scanner'],
    manajer: ['dashboard', 'assets', 'asset-detail', 'reports', 'procurement', 'loans', 'returns', 'transfers', 'maintenance', 'stock-opname', 'qr-scanner'],
    pengelola: ['dashboard', 'assets', 'asset-detail', 'reports', 'units', 'categories', 'locations', 'suppliers', 'procurement', 'goods-receipt', 'loans', 'returns', 'transfers', 'maintenance', 'depreciation', 'stock-opname', 'qr-scanner', 'disposal', 'settings'],
    gudang: ['dashboard', 'assets', 'asset-detail', 'goods-receipt', 'procurement', 'stock-opname', 'qr-scanner', 'reports'],
    teknisi: ['dashboard', 'assets', 'asset-detail', 'maintenance', 'qr-scanner'],
    keuangan: ['dashboard', 'assets', 'asset-detail', 'depreciation', 'procurement', 'reports', 'qr-scanner'],
    pegawai: ['dashboard', 'assets', 'asset-detail', 'loans', 'maintenance', 'qr-scanner']
  };

  /* Izin aksi khusus per role */
  var ROLE_ACTIONS = {
    super_admin: '*',
    pimpinan: ['approve.disposal', 'approve.procurement', 'approve.loan', 'view.cost', 'view.depreciation'],
    direktur: ['approve.disposal', 'approve.procurement', 'approve.loan', 'approve.transfer', 'view.cost', 'view.depreciation'],
    manajer: ['approve.loan', 'approve.transfer', 'request.loan', 'request.procurement', 'request.maintenance'],
    pengelola: ['manage.assets', 'manage.master', 'process.loan', 'process.return', 'process.transfer', 'process.opname', 'manage.qr', 'request.maintenance', 'process.maintenance', 'manage.users.view'],
    gudang: ['process.receipt', 'view.cost', 'process.opname'],
    teknisi: ['process.maintenance', 'request.maintenance'],
    keuangan: ['view.cost', 'view.depreciation', 'process.depreciation', 'review.procurement'],
    pegawai: ['request.loan', 'request.maintenance', 'report.damage']
  };

  function getSession() {
    try {
      var s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.user_id) return s;
      return null;
    } catch (e) { return null; }
  }
  function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function rolesOf(session) { return session && session.roles ? session.roles : []; }
  function actionsOf(session) { return session && session.actions ? session.actions : []; }

  function can(session, action) {
    var acts = actionsOf(session);
    return acts.indexOf('*') >= 0 || acts.indexOf(action) >= 0;
  }
  function canPage(session, pageKey) {
    var pages = ROLE_PAGES[rolesOf(session)[0] || ''] || [];
    return pages === '*' || pages.indexOf(pageKey) >= 0;
  }

  function buildSession(userId, profile, roleKeys) {
    var actions = [];
    roleKeys.forEach(function (rk) {
      var a = ROLE_ACTIONS[rk] || [];
      if (a === '*') actions = ['*'];
      else a.forEach(function (x) { if (actions.indexOf(x) < 0 && actions[0] !== '*') actions.push(x); });
    });
    return {
      user_id: userId,
      org_id: profile.organization_id,
      profile: {
        id: profile.id, full_name: profile.full_name, email: profile.email,
        phone: profile.phone, employee_number: profile.employee_number,
        unit_id: profile.unit_id, department_id: profile.department_id, division_id: profile.division_id
      },
      roles: roleKeys,
      actions: actions,
      login_at: new Date().toISOString()
    };
  }

  /* ------------------------- LOGIN ------------------------- */
  function login(email, password) {
    email = String(email || '').trim().toLowerCase();
    if (DB.isDemo()) {
      return DB.list('auth_users', { eq: { email: email } }).then(function (r) {
        var cred = (r.data || [])[0];
        if (!cred || cred.password !== password) {
          return { ok: false, message: 'Email atau kata sandi salah.' };
        }
        return loadProfileSession(cred.user_id);
      });
    }
    // Mode Supabase
    var sb = DB._supabaseClient();
    return sb.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      if (res.error) return { ok: false, message: res.error.message };
      return loadProfileSession(res.data.user.id);
    });
  }

  function loadProfileSession(userId) {
    return DB.get('profiles', userId).then(function (r) {
      if (!r.data) return { ok: false, message: 'Profil pengguna tidak ditemukan. Hubungi administrator.' };
      if (r.data.is_active === false) return { ok: false, message: 'Akun Anda tidak aktif. Hubungi administrator.' };
      return DB.list('user_roles', { eq: { user_id: userId } }).then(function (rr) {
        var roleIds = (rr.data || []).map(function (x) { return x.role_id; });
        return DB.list('roles', {}).then(function (rolesRes) {
          var roleKeys = (rolesRes.data || []).filter(function (ro) { return roleIds.indexOf(ro.id) >= 0; })
            .map(function (ro) { return ro.role_key; });
          if (!roleKeys.length) roleKeys = ['pegawai'];
          var s = buildSession(userId, r.data, roleKeys);
          setSession(s);
          return { ok: true, session: s };
        });
      });
    });
  }

  function logout() {
    clearSession();
    if (!DB.isDemo()) {
      var sb = DB._supabaseClient();
      if (sb) sb.auth.signOut();
    }
  }

  function register(payload) {
    // Mode demo: membuat akun pegawai baru; Mode Supabase: signUp
    if (DB.isDemo()) {
      return DB.list('auth_users', { eq: { email: payload.email.toLowerCase() } }).then(function (r) {
        if ((r.data || []).length) return { ok: false, message: 'Email sudah terdaftar.' };
        var newId = 'prof-' + DB.uuid().slice(0, 8);
        return DB.insert('profiles', {
          id: newId, organization_id: 'org-1', full_name: payload.full_name, email: payload.email.toLowerCase(),
          phone: payload.phone || null, employee_number: payload.employee_number || null,
          unit_id: payload.unit_id || null, department_id: null, division_id: null, is_active: true
        }).then(function (p) {
          return DB.insert('auth_users', { id: newId, user_id: newId, email: payload.email.toLowerCase(), password: payload.password }).then(function () {
            return DB.list('roles', { eq: { role_key: 'pegawai' } }).then(function (rl) {
              var role = (rl.data || [])[0];
              return DB.insert('user_roles', { user_id: newId, role_id: role.id, organization_id: 'org-1' }).then(function () {
                return { ok: true, user_id: newId };
              });
            });
          });
        });
      });
    }
    var sb = DB._supabaseClient();
    return sb.auth.signUp({ email: payload.email, password: payload.password }).then(function (res) {
      if (res.error) return { ok: false, message: res.error.message };
      return { ok: true, user_id: res.data.user && res.data.user.id, needsConfirm: !res.data.session };
    });
  }

  return {
    getSession: getSession,
    login: login, logout: logout, register: register,
    roles: function () { return rolesOf(getSession()); },
    roleLabel: function (key) { return ROLE_KEY_MAP[key] || key; },
    actions: function () { return actionsOf(getSession()); },
    can: function (action) { return can(getSession(), action); },
    canPage: function (pageKey) { return canPage(getSession(), pageKey); },
    orgId: function () { var s = getSession(); return s && s.org_id ? s.org_id : null; },
    userId: function () { var s = getSession(); return s && s.user_id ? s.user_id : null; },
    profile: function () { var s = getSession(); return s && s.profile ? s.profile : null; },
    isAdmin: function () { return rolesOf(getSession()).indexOf('super_admin') >= 0; },
    isPengelola: function () {
      var r = rolesOf(getSession());
      return r.indexOf('super_admin') >= 0 || r.indexOf('pengelola') >= 0;
    }
  };
})();
window.Auth = Auth;
