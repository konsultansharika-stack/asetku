/* =====================================================================
 * ASSET MANAGEMENT PRO — db.js
 * Lapisan akses data seragam (unified data layer).
 *
 *  - MODE DEMO      : DemoDB (penyimpanan lokal peramban + data contoh)
 *  - MODE PRODUKSI  : SupabaseDB (supabase-js v2 → PostgreSQL + RLS)
 *
 * API yang dipakai seluruh modul:
 *   DB.list(table, opts)   -> {data, error, count}
 *   DB.get(table, id)      -> {data, error}
 *   DB.insert(table, row)  -> {data, error}
 *   DB.insertMany(t, rows)
 *   DB.update(table, id, patch)
 *   DB.updateWhere(table, eq, patch)
 *   DB.remove(table, id)
 *   DB.removeWhere(table, eq)
 *   DB.count(table, eq)
 *   DB.nextNumber(prefix, table, column)
 *
 * opts.list = { select, eq:{}, neq:{}, in:{}, gte:{}, lte:{}, like:{}, is:{},
 *               or:'col.op.val,...', order:'col', asc:true|false, limit, offset, count }
 * ===================================================================== */

var DB = (function () {
  'use strict';

  var _sb = null; // instance supabase-js

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function nowISO() { return new Date().toISOString(); }
  function currentUser() {
    try { return JSON.parse(localStorage.getItem('AMP_SESSION') || 'null'); } catch (e) { return null; }
  }

  /* =========================== DEMO DB =========================== */
  var DemoDB = (function () {
    var KEY = 'AMP_DEMO_DB_V3';
    var store = null;

    function load() {
      if (store) return store;
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) { store = JSON.parse(raw); return store; }
      } catch (e) { /* korup -> reseed */ }
      store = window.AMP_DEMO_SEED ? window.AMP_DEMO_SEED() : {};
      persist();
      return store;
    }
    function persist() {
      try { localStorage.setItem(KEY, JSON.stringify(store)); }
      catch (e) { console.warn('Gagal menyimpan demo db', e); }
    }
    function reset() {
      store = window.AMP_DEMO_SEED ? window.AMP_DEMO_SEED() : {};
      persist();
    }
    function t(name) {
      var s = load();
      if (!s[name]) s[name] = [];
      return s[name];
    }
    function stamp(row, isUpdate) {
      var u = currentUser();
      var out = Object.assign({}, row);
      if (!isUpdate) {
        out.id = out.id || uuid();
        out.created_at = out.created_at || nowISO();
        if (u) out.created_by = out.created_by || u.user_id;
      }
      out.updated_at = nowISO();
      if (u) out.updated_by = u.user_id;
      return out;
    }
    function matchVal(a, b) { return String(a === undefined || a === null ? '' : a) === String(b === undefined || b === null ? '' : b); }
    function filterRows(rows, opts) {
      opts = opts || {};
      var out = rows.filter(function (r) {
        var k;
        for (k in (opts.eq || {})) if (!matchVal(r[k], opts.eq[k])) return false;
        for (k in (opts.neq || {})) if (matchVal(r[k], opts.neq[k])) return false;
        for (k in (opts.in || {})) {
          var arr = opts.in[k] || [];
          if (arr.length && !arr.some(function (v) { return matchVal(r[k], v); })) return false;
        }
        for (k in (opts.gte || {})) {
          if (r[k] === null || r[k] === undefined) return false;
          if (isNaN(Number(r[k])) ? String(r[k]) < String(opts.gte[k]) : Number(r[k]) < Number(opts.gte[k])) return false;
        }
        for (k in (opts.lte || {})) {
          if (r[k] === null || r[k] === undefined) return false;
          if (isNaN(Number(r[k])) ? String(r[k]) > String(opts.lte[k]) : Number(r[k]) > Number(opts.lte[k])) return false;
        }
        for (k in (opts.like || {})) {
          var needle = String(opts.like[k] || '').replace(/%/g, '').toLowerCase();
          if (!String(r[k] === null || r[k] === undefined ? '' : r[k]).toLowerCase().includes(needle)) return false;
        }
        for (k in (opts.is || {})) {
          var want = opts.is[k];
          if (want === null && r[k] !== null && r[k] !== undefined) return false;
        }
        if (opts.or) {
          var groups = opts.or.split(',').map(function (g) {
            var p = g.trim().split('.');
            if (p.length < 2) return null;
            var col = p[0], op = p[1], val = p.slice(2).join('.');
            return { col: col, op: op, val: val };
          }).filter(Boolean);
          if (groups.length) {
            var ok = groups.some(function (g) {
              if (g.op === 'eq') return matchVal(r[g.col], g.val);
              if (g.op === 'like' || g.op === 'ilike') return String(r[g.col] || '').toLowerCase().includes(String(g.val).replace(/%/g, '').toLowerCase());
              if (g.op === 'neq') return !matchVal(r[g.col], g.val);
              return false;
            });
            if (!ok) return false;
          }
        }
        return true;
      });
      if (opts.order) {
        var col = opts.order, asc = opts.asc !== false;
        out.sort(function (a, b) {
          var va = a[col], vb = b[col];
          if (va === null || va === undefined) return 1;
          if (vb === null || vb === undefined) return -1;
          var na = Number(va), nb = Number(vb);
          var c;
          if (!isNaN(na) && !isNaN(nb) && String(na) === String(va) && String(nb) === String(vb)) c = na - nb;
          else c = String(va).localeCompare(String(vb), 'id');
          return asc ? c : -c;
        });
      }
      return out;
    }
    function audit(action, table, record) {
      try {
        var u = currentUser();
        t('audit_logs').push({
          id: uuid(), organization_id: u && u.org_id,
          user_id: u && u.user_id, user_name: u && u.profile && u.profile.full_name,
          action: action, table_name: table, record_id: record && record.id,
          old_data: null, new_data: null, ip_address: null, created_at: nowISO()
        });
      } catch (e) { /* ignore */ }
    }

    return {
      list: function (table, opts) {
        return new Promise(function (resolve) {
          setTimeout(function () {
            var rows = filterRows(t(table), opts);
            var res = { data: rows.map(function (r) { return Object.assign({}, r); }), error: null };
            if (opts && opts.count) res.count = rows.length;
            resolve(res);
          }, 60);
        });
      },
      get: function (table, id) {
        return new Promise(function (resolve) {
          var row = t(table).find(function (r) { return r.id === id; });
          resolve({ data: row ? Object.assign({}, row) : null, error: row ? null : { message: 'Data tidak ditemukan' } });
        });
      },
      insert: function (table, row) {
        return new Promise(function (resolve) {
          var rec = stamp(Array.isArray(row) ? row[0] : row, false);
          t(table).push(rec); audit('INSERT', table, rec); persist();
          resolve({ data: Object.assign({}, rec), error: null });
        });
      },
      insertMany: function (table, rows) {
        return new Promise(function (resolve) {
          var recs = (rows || []).map(function (r) { return stamp(r, false); });
          recs.forEach(function (r) { t(table).push(r); });
          audit('INSERT_MANY', table, { count: recs.length }); persist();
          resolve({ data: recs.map(function (r) { return Object.assign({}, r); }), error: null });
        });
      },
      update: function (table, id, patch) {
        return new Promise(function (resolve) {
          var arr = t(table);
          var idx = arr.findIndex(function (r) { return r.id === id; });
          if (idx < 0) return resolve({ data: null, error: { message: 'Data tidak ditemukan' } });
          arr[idx] = stamp(Object.assign({}, arr[idx], patch), true);
          audit('UPDATE', table, arr[idx]); persist();
          resolve({ data: Object.assign({}, arr[idx]), error: null });
        });
      },
      updateWhere: function (table, eq, patch) {
        return new Promise(function (resolve) {
          var arr = t(table);
          var targets = filterRows(arr, { eq: eq });
          targets.forEach(function (tgt) {
            var idx = arr.findIndex(function (r) { return r.id === tgt.id; });
            arr[idx] = stamp(Object.assign({}, arr[idx], patch), true);
          });
          audit('UPDATE_WHERE', table, { matched: targets.length }); persist();
          resolve({ data: targets, error: null });
        });
      },
      remove: function (table, id) {
        return new Promise(function (resolve) {
          var s = load();
          s[table] = t(table).filter(function (r) { return r.id !== id; });
          audit('DELETE', table, { id: id }); persist();
          resolve({ error: null });
        });
      },
      removeWhere: function (table, eq) {
        return new Promise(function (resolve) {
          var targets = filterRows(t(table), { eq: eq });
          var s = load();
          s[table] = t(table).filter(function (r) { return !targets.some(function (tg) { return tg.id === r.id; }); });
          audit('DELETE_WHERE', table, { matched: targets.length }); persist();
          resolve({ error: null });
        });
      },
      count: function (table, eq) {
        return this.list(table, { eq: eq || {}, count: true }).then(function (r) { return r.count; });
      },
      _reset: reset
    };
  })();

  /* ========================= SUPABASE DB ========================= */
  var SupabaseDB = {
    client: function () { return _sb; },
    list: function (table, opts) {
      opts = opts || {};
      var q = _sb.from(table).select(opts.select || '*');
      var k;
      for (k in (opts.eq || {})) q = q.eq(k, opts.eq[k]);
      for (k in (opts.neq || {})) q = q.neq(k, opts.neq[k]);
      for (k in (opts.in || {})) q = q.in(k, opts.in[k]);
      for (k in (opts.gte || {})) q = q.gte(k, opts.gte[k]);
      for (k in (opts.lte || {})) q = q.lte(k, opts.lte[k]);
      for (k in (opts.like || {})) q = q.ilike(k, '%' + String(opts.like[k]).replace(/%/g, '') + '%');
      for (k in (opts.is || {})) q = q.is(k, opts.is[k]);
      if (opts.or) q = q.or(opts.or);
      if (opts.order) q = q.order(opts.order, { ascending: opts.asc !== false });
      if (opts.limit) q = q.limit(opts.limit);
      if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit || 1000) - 1);
      return q.then(function (res) { return { data: res.data, error: res.error, count: res.count }; });
    },
    get: function (table, id) {
      return _sb.from(table).select('*').eq('id', id).maybeSingle()
        .then(function (r) { return { data: r.data, error: r.error }; });
    },
    insert: function (table, row) {
      var payload = Array.isArray(row) ? row : [row];
      return _sb.from(table).insert(payload).select()
        .then(function (r) { return { data: Array.isArray(row) ? r.data : (r.data && r.data[0]), error: r.error }; });
    },
    insertMany: function (table, rows) {
      return _sb.from(table).insert(rows || []).select()
        .then(function (r) { return { data: r.data, error: r.error }; });
    },
    update: function (table, id, patch) {
      return _sb.from(table).update(patch).eq('id', id).select()
        .then(function (r) { return { data: r.data && r.data[0], error: r.error }; });
    },
    updateWhere: function (table, eq, patch) {
      var q = _sb.from(table).update(patch), k;
      for (k in eq) q = q.eq(k, eq[k]);
      return q.select().then(function (r) { return { data: r.data, error: r.error }; });
    },
    remove: function (table, id) {
      return _sb.from(table).delete().eq('id', id).then(function (r) { return { error: r.error }; });
    },
    removeWhere: function (table, eq) {
      var q = _sb.from(table).delete(), k;
      for (k in eq) q = q.eq(k, eq[k]);
      return q.then(function (r) { return { error: r.error }; });
    },
    count: function (table, eq) {
      var q = _sb.from(table).select('id', { count: 'exact', head: true }), k;
      for (k in (eq || {})) q = q.eq(k, eq[k]);
      return q.then(function (r) { return r.count || 0; });
    },
    rpc: function (name, params) {
      return _sb.rpc(name, params || {}).then(function (r) { return { data: r.data, error: r.error }; });
    }
  };

  /* =========================== FACADE =========================== */
  var impl = null, readyPromise = null;

  function ready() {
    if (readyPromise) return readyPromise;
    if (window.AMP_CONFIG && window.AMP_CONFIG.DEMO_MODE) {
      impl = DemoDB;
      readyPromise = Promise.resolve();
    } else {
      readyPromise = window.AMP_loadSupabaseJS().then(function () {
        _sb = window.supabase.createClient(window.AMP_CONFIG.SUPABASE_URL, window.AMP_CONFIG.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        impl = SupabaseDB;
      });
    }
    return readyPromise;
  }

  var facade = {
    ready: ready,
    mode: function () { return window.AMP_CONFIG.DEMO_MODE ? 'demo' : 'supabase'; },
    isDemo: function () { return window.AMP_CONFIG.DEMO_MODE; },
    _supabaseClient: function () { return _sb; },
    uuid: uuid,
    list: function (t2, o) { return ready().then(function () { return impl.list(t2, o); }); },
    get: function (t2, id) { return ready().then(function () { return impl.get(t2, id); }); },
    insert: function (t2, r) { return ready().then(function () { return impl.insert(t2, r); }); },
    insertMany: function (t2, r) { return ready().then(function () { return impl.insertMany(t2, r); }); },
    update: function (t2, id, p) { return ready().then(function () { return impl.update(t2, id, p); }); },
    updateWhere: function (t2, eq, p) { return ready().then(function () { return impl.updateWhere(t2, eq, p); }); },
    remove: function (t2, id) { return ready().then(function () { return impl.remove(t2, id); }); },
    removeWhere: function (t2, eq) { return ready().then(function () { return impl.removeWhere(t2, eq); }); },
    rpc: function (n, p) { return ready().then(function () { return impl.rpc ? impl.rpc(n, p) : { data: null, error: null }; }); },
    count: function (t2, eq) { return ready().then(function () { return impl.count(t2, eq); }); },

    /** Nomor dokumen otomatis: PREFIX/YYYYMM/SEQ (unik per organisasi). */
    nextNumber: function (prefix, table, column) {
      var org = (currentUser() && currentUser().org_id) || null;
      var ym = new Date().toISOString().slice(0, 7).replace('-', '');
      var head = prefix + '-' + ym + '-';
      return this.list(table, {
        eq: org ? { organization_id: org } : {},
        order: column || 'created_at', asc: false, limit: 500
      }).then(function (r) {
        var max = 0;
        (r.data || []).forEach(function (row) {
          var v = String(row[column] || row.document_number || '');
          if (v.indexOf(head) === 0) {
            var n = parseInt(v.slice(head.length), 10);
            if (!isNaN(n) && n > max) max = n;
          }
        });
        return head + String(max + 1).padStart(4, '0');
      });
    },
    resetDemo: function () { DemoDB._reset(); }
  };

  return facade;
})();
window.DB = DB;
