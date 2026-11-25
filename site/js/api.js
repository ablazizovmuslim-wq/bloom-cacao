/* MAVİ — API client. Server mode talks to /api on the same origin; demo mode runs the same logic on localStorage. */
(function () {
  var KEY = 'mavi_db_v2', UID = 'mavi_uid', TOK = 'mavi_token', ADM = 'mavi_admin';
  var mode = 'demo', config = {};
  var mem = null;

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; }
  }
  function loadDb() {
    if (mem) return mem;
    var raw = ls(KEY);
    try { mem = raw ? JSON.parse(raw) : null; } catch (e) { mem = null; }
    if (!mem || mem.v !== 2) mem = MaviLogic.seed();
    return mem;
  }
  function saveDb() { ls(KEY, JSON.stringify(mem)); }

  async function detect() {
    if (location.protocol === 'file:') return;
    try {
      var r = await fetch('/api/config', { headers: { Accept: 'application/json' } });
      if (r.ok) {
        var j = await r.json();
        if (j && j.mode === 'server') { mode = 'server'; config = j; }
      }
    } catch (e) { /* demo */ }
  }

  function demoCall(route, body) {
    var db = loadDb();
    var ctx = { events: [] };
    var uid = ls(UID);
    if (uid) ctx.user = MaviLogic.findUser(db, uid) || null;
    if (route.indexOf('admin.') === 0) ctx.admin = ls(ADM) === '1';
    var res = MaviLogic.handle(db, route, JSON.parse(JSON.stringify(body || {})), ctx);
    saveDb();
    if (ctx.events.length) window.dispatchEvent(new CustomEvent('mavi:events', { detail: ctx.events }));
    return JSON.parse(JSON.stringify(res));
  }

  async function serverCall(route, body) {
    var headers = { 'Content-Type': 'application/json' };
    var tok = route.indexOf('admin.') === 0 ? ls(ADM + '_tok') : ls(TOK);
    if (tok) headers.Authorization = 'Bearer ' + tok;
    var r = await fetch('/api/' + route, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) });
    var j = await r.json().catch(function () { return { error: 'bad_json' }; });
    if (!r.ok || j.error) { var e = new Error(j.error || 'http_' + r.status); e.code = j.error || 'http'; e.extra = j.extra; throw e; }
    return j.data;
  }

  window.API = {
    ready: detect(),
    get mode() { return mode; },
    get config() { return config; },
    call: async function (route, body) {
      await this.ready;
      if (mode === 'server') return serverCall(route, body);
      return demoCall(route, body);
    },
    loggedIn: function () { return mode === 'server' ? !!ls(TOK) : !!ls(UID); },
    demoLogin: async function (name, phone) {
      var r = demoCall('demoLogin', { name: name, phone: phone }); ls(UID, r.uid); return r;
    },
    telegramLogin: async function (tgUser) {
      var r = await fetch('/api/auth/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tgUser) });
      var j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'auth');
      ls(TOK, j.data.token); return j.data;
    },
    logout: function () { ls(UID, null); ls(TOK, null); },
    adminLogin: async function (password) {
      await this.ready;
      if (mode === 'server') {
        var r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: password }) });
        var j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || 'auth');
        ls(ADM + '_tok', j.data.token); return true;
      }
      if (password !== 'mavi') throw new Error('bad_password');
      ls(ADM, '1'); return true;
    },
    adminLoggedIn: function () { return mode === 'server' ? !!ls(ADM + '_tok') : ls(ADM) === '1'; },
    adminLogout: function () { ls(ADM, null); ls(ADM + '_tok', null); },
    upload: async function (dataUrl) {
      await this.ready;
      if (mode === 'server') return serverCall('admin.upload', { dataUrl: dataUrl });
      return { url: dataUrl };
    },
    resetDemo: function () { mem = null; ls(KEY, null); ls(UID, null); }
  };
})();
