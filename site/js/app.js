/* Bloom & Cacao — main app: init, menu, holiday, cart & checkout, account */
(function () {
  'use strict';
  var M = window.MAVI, t = M.t, tl = M.tl, $ = M.$, $$ = M.$$, esc = M.esc, som = M.som, S = M.state;

  /* ---------------- init ---------------- */
  async function init() {
    S.cart = M.store('mavi_cart') || [];
    applyTheme(M.store('mavi_theme') || 'emerald'); setMode(autoMode(M.store('bc_mode') || 'day'), true);
    await API.ready;
    await tgApp();
    $('#demoTag').hidden = API.mode !== 'demo'; setTimeout(function () { $('#demoTag').classList.add('fade'); }, 5000);
    await loadCatalog();
    if (API.loggedIn()) await loadMe();
    renderAll();
    applySeason();
    bind();
    route();
    setInterval(tick, 1000);
  }
  /* ---- Telegram Mini App: the shop opened from the bot's menu button ---- */
  async function tgApp() {
    if (!/tgWebApp/.test(location.hash + location.search)) return;
    document.documentElement.classList.add('tgapp');
    await new Promise(function (ok) { var sc = document.createElement('script'); sc.src = 'https://telegram.org/js/telegram-web-app.js'; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); setTimeout(ok, 4000); });
    var W = window.Telegram && window.Telegram.WebApp;
    history.replaceState(null, '', location.pathname);
    if (!W) return;
    M.tg = W;
    try { W.ready(); W.expand(); W.setHeaderColor('#fbf7f0'); W.setBackgroundColor('#fbf7f0'); if (W.disableVerticalSwipes) W.disableVerticalSwipes(); } catch (e) {}
    setMode('day', true);
    if (API.mode === 'server' && W.initData && !API.loggedIn()) { try { await API.webappLogin(W.initData); } catch (e) { console.warn('webapp login', e); } }
    var sp = W.initDataUnsafe && W.initDataUnsafe.start_param;
    if (sp && /^pass-[A-Za-z0-9]+$/.test(sp)) history.replaceState(null, '', '#' + sp);
  }
  async function loadCatalog() {
    try { S.cat = await API.call('catalog', {}); M._loadedAt = performance.now(); }
    catch (e) { console.error(e); }
  }
  async function loadMe() {
    try { S.me = await API.call('me', {}); }
    catch (e) { if (e.code === 'need_login') API.logout(); S.me = null; }
  }
  M.refresh = async function () { await loadCatalog(); if (API.loggedIn()) await loadMe(); renderAll(true); };

  function renderAll(soft) {
    I18N.apply();
    $$('.langs button').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === I18N.lang); });
    renderStatic(soft);
    M.renderMenu(); renderBayram(); M.renderBadge(); renderAccBtn();
    ['renderAI', 'renderStory', 'renderBox', 'renderKits', 'renderBonbon', 'renderBar', 'renderToy', 'renderClub', 'renderGames', 'renderReviews', 'renderClasses', 'renderCorp', 'renderFaq', 'renderFooter']
      .forEach(function (f) { if (M[f]) try { M[f](); } catch (e) { console.error(f, e); } });
    if ($('#cartD').classList.contains('open')) renderCart();
    if ($('#accD').classList.contains('open')) renderAcc();
    FX.observe(document);
  }
  M.renderAll = renderAll;

  function renderBrand() {
    var B = M.brand(); try { localStorage.setItem('bc_brand', B); } catch (e) {}
    I18N.brand = B;
    $$('[data-brand]').forEach(function (el) { el.textContent = B; });
    var h = $('.hero .brand');
    if (h && h.getAttribute('aria-label') !== B) {
      var i = 0; h.setAttribute('aria-label', B);
      h.innerHTML = B.split(' ').map(function (w) { return '<span class="wd">' + w.split('').map(function (c) { return '<span class="ch gold" style="--i:' + (i++) + ';animation-delay:0s,0s">' + esc(c) + '</span>'; }).join('') + '</span>'; }).join(' ');
    }
    document.title = B + ' — ' + t('hero_sub');
  }
  function renderStatic(soft) {
    renderBrand();
    var sub = $('#heroSub');
    sub.innerHTML = t('hero_sub').split(' ').map(function (w, i) { return '<span class="w" style="--i:' + i + (soft ? ';animation-delay:0s' : '') + '">' + esc(w) + '</span>'; }).join(' ');
    var rb = t('rb'), items = rb.map(function (x) { return '<span>' + esc(x) + '</span><span class="star" aria-hidden="true">✦</span>'; }).join('');
    $('#ribbon').innerHTML = items + items;
    var mt = $('#mtitle');
    mt.setAttribute('aria-label', t('menu_title'));
    var ci = 0; mt.innerHTML = t('menu_title').split(' ').map(function (w) { return '<span style="white-space:nowrap;display:inline-block">' + w.split('').map(function (c) { return '<span class="ch" style="--i:' + (ci++) + '">' + esc(c) + '</span>'; }).join('') + '</span>'; }).join(' ');
    if (soft) mt.classList.add('in');
    var f = [['all', 'f_all'], ['shok', 'f_shok'], ['choy', 'f_choy'], ['boks', 'f_boks'], ['fav', 'f_fav']];
    $('#filters').innerHTML = f.map(function (x) { return '<button type="button" class="chip' + (S.filter === x[0] ? ' on' : '') + '" data-f="' + x[0] + '">' + t(x[1]) + (x[0] === 'fav' ? ' ♥' : '') + '</button>'; }).join('');
  }

  /* ---------------- menu ---------------- */
  M.renderMenu = function (keep) {
    if (!S.cat) return;
    var favs = M.favs(), now = M.now();
    var list = S.cat.products.filter(function (p) {
      if (p.holiday) return false;
      if (S.filter === 'fav') return favs.indexOf(p.id) >= 0;
      return S.filter === 'all' || p.cat === S.filter;
    });
    $('#grid').innerHTML = list.map(function (p, i) { return card(p, i, favs, now, keep); }).join('') ||
      '<p class="lead corm">' + (S.filter === 'fav' ? t('wish_lead') : '') + '</p>';
    // holiday collection
    var h = S.cat.holiday, col = $('#collection');
    var hp = h ? S.cat.products.filter(function (p) { return p.holiday === h.id; }) : [];
    if (h && hp.length && h.days <= 45) {
      col.innerHTML = '<div class="collection"><h3 class="serif">' + t('collection', t('hol_' + h.id)) + '</h3><div class="grid">' + hp.map(function (p, i) { return card(p, i, favs, now, keep); }).join('') + '</div></div>';
    } else col.innerHTML = '';
    if (keep) $$('.card', $('#menu')).forEach(function (c) { c.classList.add('in'); fillBar(c); });
    else FX.observe($('#menu'));
    $$('.card', $('#menu')).forEach(function (c) { c._onIn = function () { fillBar(c); countPrice(c); }; });
  };
  function card(p, i, favs, now, keep) {
    var inC = M.inCart(p.id), left = Math.max(0, p.left - inC), sold = left === 0, locked = p.locked && p.dropAt > now;
    var notified = S.me && S.me.notify && S.me.notify.indexOf(p.id) >= 0;
    var btn = locked ? '<button class="add" type="button" disabled>' + t('drop_locked') + '</button>'
      : sold ? '<button class="add notify" type="button" data-notify="' + p.id + '"' + (notified ? ' disabled' : '') + '>' + t(notified ? 'notify_on' : 'notify_me') + '</button>'
        : '<button class="add drip" type="button" data-add="' + p.id + '">' + (inC ? t('in_cart', inC) : t('add')) + '</button>';
    var tag = p.deal ? '<span class="ribbonTag">' + t('deal', S.cat.settings.dealPercent) + '</span>' : p.dropAt ? '<span class="ribbonTag">' + t('drop_soon') + '</span>' : '';
    var leftTxt = p.dropAt && !locked ? t('drop_live', left) : t('left_today', left);
    return '<article class="card' + (keep ? ' in' : '') + (locked ? ' locked' : '') + '" style="--i:' + i + '" data-id="' + p.id + '">' + tag +
      '<button type="button" class="fav' + (favs.indexOf(p.id) >= 0 ? ' on' : '') + '" data-fav="' + p.id + '" aria-label="' + t('fav_add') + '">' + M.heart + '</button>' +
      '<div class="ph"><img src="' + esc(p.img) + '" alt="' + esc(tl(p.name)) + '" loading="lazy">' +
      (locked ? '<div class="lockbox"><div>' + t('drop_in') + '<b data-drop="' + p.dropAt + '">' + M.dur(p.dropAt - now) + '</b></div></div>' : '') + '</div>' +
      '<div class="info"><h3>' + esc(tl(p.name)) + '</h3><p class="s">' + esc(tl(p.sub)) + '</p>' +
      '<p class="price corm" data-v="' + p.dealPrice + '">' + (keep ? som(p.dealPrice) : '0 ' + t('som')) + (p.deal ? '<span class="oldp">' + M.fmt(p.price) + '</span>' : '') + '</p>' +
      '<div class="bar"><i data-w="' + (p.total ? left / p.total * 100 : 0) + '"></i></div><p class="left">' + leftTxt + '</p>' + btn + '</div></article>';
  }
  function fillBar(c) { var i = c.querySelector('.bar i'); if (i) i.style.width = i.dataset.w + '%'; }
  function countPrice(c) {
    var pr = c.querySelector('.price'); if (!pr) return;
    var v = +pr.dataset.v, old = pr.querySelector('.oldp'), oh = old ? old.outerHTML : '', t0 = performance.now();
    (function step(n) { var k = Math.min(1, (n - t0) / 1300), e = 1 - Math.pow(1 - k, 3); pr.innerHTML = som(Math.round(v * e / 1000) * 1000) + oh; if (k < 1) requestAnimationFrame(step); })(t0);
  }

  /* ---------------- holiday band ---------------- */
  function renderBayram() {
    var h = S.cat.holiday, el = $('#bayram');
    if (!h || h.days > 60) { el.hidden = true; return; }
    el.hidden = false;
    var hp = S.cat.settings.holidayPromo;
    var pr = !hp ? '' : h.days <= hp.daysBefore ? '<p>' + t('hol_promo', '<span class="code" data-copy="' + esc(hp.code) + '">' + esc(hp.code) + '</span>', hp.percent) + '</p>'
      : '<p>' + t('hol_promo_soon', hp.daysBefore, esc(hp.code)) + '</p>';
    el.innerHTML = '<h3 class="serif gold">' + t('hol_left', t('hol_' + h.id)) + '</h3><div class="cd" id="cd">' +
      ['d', 'h', 'm', 's'].map(function (k) { return '<div><b data-k="' + k + '">00</b><small>' + t(k) + '</small></div>'; }).join('') + '</div>' + pr;
    tickBayram(true);
  }
  function tickBayram(force) {
    var h = S.cat && S.cat.holiday; if (!h || $('#bayram').hidden) return;
    var target = Date.parse(h.date + 'T00:00:00+05:00'), p = M.parts(target - M.now());
    $$('#cd b').forEach(function (b, i) { var v = (p[i] < 10 ? '0' : '') + p[i]; if (b.textContent !== v) { b.textContent = v; if (!force) { b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); } } });
  }

  function tick() {
    if (!S.cat) return;
    var ms = S.cat.msToMidnight - (performance.now() - M._loadedAt);
    if (ms < 0) { M.refresh(); return; }
    $('#menuTimer').innerHTML = '⏳ ' + t('menu_timer') + ' <b>' + M.dur(ms) + '</b>';
    tickBayram();
    var now = M.now(), reload = false;
    $$('[data-drop]').forEach(function (b) { var d = +b.dataset.drop - now; b.textContent = M.dur(d); if (d <= 0) reload = true; });
    $$('[data-until]').forEach(function (b) { var d = +b.dataset.until - now; b.textContent = d > 0 ? t('next_in', M.dur(d)) : ''; });
    if (reload) M.refresh();
    if (M.onTick) M.onTick(now);
  }

  /* ---------------- header & mode & lang ---------------- */
  var MOB = [['#menu', 'nav_menu', 'M4 6h16M4 12h16M4 18h10'], ['#boks', 'nav_box', 'M4 9h16v11H4zM2 6h20v3H2zM12 6v14'], ['#bokslar', 'nav_kits', 'M3 8h18v12H3zM3 8l3-4h12l3 4M8 13h3M13 13h3'], ['#bonbon', 'nav_bonbon', 'M4 18C4 9 8 5 12 5s8 4 8 13zM4 18h16M8 13h8'], ['#plitka', 'nav_bar', 'M5 4h14v16H5zM5 9h14M5 14h14M12 4v16'],
    ['#toy', 'nav_toy', 'M12 21s-7-4.5-9-9a5 5 0 0 1 9-4 5 5 0 0 1 9 4c-2 4.5-9 9-9 9z'], ['#sovga', 'nav_gifts', 'M12 3v18M3 12h18M7 7l10 10M17 7 7 17'], ['#story', 'nav_story', 'M6 3h12v18l-6-4-6 4z'],
    ['#choy', 'nav_tea', 'M4 10h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 11h2a2 2 0 0 1 0 4h-2M8 3c-1 2 1 3 0 5M12 3c-1 2 1 3 0 5'], ['#club', 'nav_club', 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z'],
    ['#master', 'nav_classes', 'M6 21v-8M18 21v-8M4 13h16M8 13V8a4 4 0 0 1 8 0v5'], ['#korporativ', 'nav_corp', 'M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h2M14 10h2'],
    ['#sharhlar', 'nav_reviews', 'M4 5h16v11H9l-5 4z'], ['#faq', 'nav_faq', 'M9 9a3 3 0 1 1 4 2.8c-.7.3-1 1-1 1.7V15M12 18h.01'], ['#kontakt', 'nav_contacts', 'M4 6h16v12H4zM4 7l8 6 8-6'], ['#settings', 'settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z']];
  function renderMob() {
    var m = $('#mob'), day = document.body.dataset.mode === 'day';
    m.innerHTML = '<div class="mobin"><div class="mobh">' + document.getElementById('tpl-crown').innerHTML + '<b class="serif gold">' + esc(M.brand()) + '</b><button type="button" class="x" data-mx aria-label="' + t('close') + '">×</button></div>' +
      '<div class="mobq"><button type="button" class="mq" data-macc>' + (S.me ? esc(S.me.user.name) + '<small>' + som(S.me.user.balance) + '</small>' : t('login')) + '</button><button type="button" class="mq" data-mcart>' + t('cart') + '<small>' + $('#badge').textContent + '</small></button></div>' +
      '<div class="mobg">' + MOB.map(function (x, i) { return '<a href="' + x[0] + '" style="--i:' + i + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + x[2] + '"/></svg><span>' + t(x[1]) + '</span></a>'; }).join('') + '</div>' +
      '<div class="mobf"><div class="langs">' + ['uz', 'ru', 'en'].map(function (l) { return '<button type="button" data-lang="' + l + '" class="' + (I18N.lang === l ? 'on' : '') + '">' + l.toUpperCase() + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="mq" data-mmode>' + (day ? '☾ ' + t('night') : '☀ ' + t('day')) + '</button></div></div>';
  }
  function openMob(o) {
    if (o) renderMob();
    $('#mob').classList.toggle('open', o); document.documentElement.classList.toggle('noscroll', o);
  }
  var THEMES = { emerald: ['#0a3a32', '#e6c277'], choc: ['#3b2216', '#e6c277'], rose: ['#5a1028', '#f0c987'], night: ['#121a3a', '#e6c277'], noir: ['#111111', '#d9b56a'] };
  function applyTheme(th) { if (!THEMES[th]) th = 'emerald'; document.documentElement.dataset.theme = th; M.store('mavi_theme', th); var tc = document.querySelector('meta[name=theme-color]'); if (tc && document.body.dataset.mode !== 'day') tc.content = THEMES[th][0]; }
  function autoMode(m) { if (m !== 'auto') return m; var h = new Date(Date.now() + 5 * 3600e3).getUTCHours(); return h >= 7 && h < 18 ? 'day' : 'night'; }
  function applySeason() {
    var on = M.store('mavi_season'); if (on === false) { FX.setSeason('off'); return; }
    var s = S.cat && S.cat.settings.season; FX.setSeason(!s || s === 'auto' ? FX.autoSeason(M.now()) : s);
  }
  function openSettings() {
    var th = document.documentElement.dataset.theme, mode = M.store('bc_mode') || 'night', anim = (function () { try { return localStorage.getItem('mavi_anim'); } catch (er) { return null; } })() || 'auto', seas = M.store('mavi_season') !== false;
    var opt = function (attr, val, cur, label) { return '<button type="button" class="opt' + (val === cur ? ' on' : '') + '" data-' + attr + '="' + val + '">' + label + '</button>'; };
    var b = M.modal('<h2 class="serif">' + t('settings') + '</h2><div class="stack">' +
      '<div><p class="lab">' + t('set_theme') + '</p><div class="themes">' + Object.keys(THEMES).map(function (k) {
        return '<button type="button" class="thm' + (k === th ? ' on' : '') + '" data-th="' + k + '"><i style="background:linear-gradient(135deg,' + THEMES[k][0] + ' 55%,' + THEMES[k][1] + ' 55%)"></i>' + t('th_' + k) + '</button>'; }).join('') + '</div><p class="hint">' + t('set_theme_hint') + '</p></div>' +
      '<div><p class="lab">' + t('set_mode') + '</p><div class="opts">' + opt('md', 'night', mode, '☾ ' + t('night')) + opt('md', 'day', mode, '☀ ' + t('day')) + opt('md', 'auto', mode, t('mode_auto')) + '</div></div>' +
      '<div><p class="lab">' + t('lang') + '</p><div class="opts">' + ['uz', 'ru', 'en'].map(function (l) { return opt('lg', l, I18N.lang, { uz: 'Oʻzbekcha', ru: 'Русский', en: 'English' }[l]); }).join('') + '</div></div>' +
      '<div><p class="lab">' + t('set_anim') + '</p><div class="opts">' + ['auto', 'full', 'lite', 'off'].map(function (a) { return opt('an', a, anim, t('anim_' + a)); }).join('') + '</div><p class="hint">' + t('anim_hint') + '</p></div>' +
      '<div><p class="lab">' + t('set_season') + '</p><div class="opts">' + opt('se', '1', seas ? '1' : '0', t('on')) + opt('se', '0', seas ? '1' : '0', t('off')) + '</div></div>' +
      '<a class="ghost" href="admin.html" style="display:grid;place-items:center;text-decoration:none">⚙ ' + t('set_admin') + '</a>' +
      (API.mode === 'demo' ? '<button type="button" class="ghost" data-reset style="font-size:13px">' + t('set_reset') + '</button>' : '') + '</div>');
    b.onclick = function (e) {
      var x;
      if ((x = e.target.closest('[data-th]'))) { applyTheme(x.dataset.th); if (document.body.dataset.mode === 'day') { M.store('bc_mode', 'night'); setMode('night', true); } }
      else if ((x = e.target.closest('[data-md]'))) { M.store('bc_mode', x.dataset.md); setMode(autoMode(x.dataset.md)); }
      else if ((x = e.target.closest('[data-lg]'))) { I18N.set(x.dataset.lg); renderAll(true); }
      else if ((x = e.target.closest('[data-an]'))) { try { localStorage.setItem('mavi_anim', x.dataset.an); } catch (er) {} location.reload(); return; }
      else if ((x = e.target.closest('[data-se]'))) { M.store('mavi_season', x.dataset.se === '1'); applySeason(); }
      else if (e.target.closest('[data-reset]')) { API.resetDemo(); ['mavi_cart', 'mavi_co', 'mavi_box', 'mavi_bar', 'mavi_toy', 'mavi_fav'].forEach(function (k) { try { localStorage.removeItem(k); } catch (er) {} }); location.reload(); return; }
      else return;
      openSettings();
    };
  }
  M.openSettings = openSettings;
  function setMode(m, silent) {
    document.body.dataset.mode = m;
    var tc = document.querySelector('meta[name=theme-color]'); if (tc) tc.content = m === 'day' ? '#f2e6cf' : '#0a3a32';
    if (!silent) { var r = $('#modeBtn').getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 20); }
  }
  M.renderBadge = function () { $('#badge').textContent = S.cart.reduce(function (a, l) { return a + (l.qty || 1); }, 0); };
  function renderAccBtn() {
    var b = $('#accBal');
    b.textContent = S.me ? som(S.me.user.balance) : t('login');
  }

  /* ---------------- events ---------------- */
  function bind() {
    $('.langs').addEventListener('click', function (e) { var b = e.target.closest('[data-lang]'); if (!b) return; I18N.set(b.dataset.lang); renderAll(true); });
    $('#modeBtn').addEventListener('click', function () { var m = document.body.dataset.mode === 'day' ? 'night' : 'day'; M.store('bc_mode', m); setMode(m); });
    $('#setBtn').addEventListener('click', openSettings);
    $('#burger').addEventListener('click', function () { openMob(true); });
    $('#nav').addEventListener('click', function (e) { if (e.target.closest('a')) { $('.more').classList.remove('open'); } });
    $('#mob').addEventListener('click', function (e) {
      var b;
      if (e.target.closest('[data-mx]') || e.target.id === 'mob') { openMob(false); return; }
      if ((b = e.target.closest('[data-lang]'))) { I18N.set(b.dataset.lang); renderAll(true); renderMob(); return; }
      if (e.target.closest('[data-mmode]')) { var nm = document.body.dataset.mode === 'day' ? 'night' : 'day'; M.store('bc_mode', nm); setMode(nm); renderMob(); return; }
      if (e.target.closest('[data-macc]')) { openMob(false); if (S.me) openAcc(); else M.login(); return; }
      if (e.target.closest('[data-mcart]')) { openMob(false); openCart(); return; }
      var sa = e.target.closest('a[href="#settings"]'); if (sa) { e.preventDefault(); openMob(false); openSettings(); return; }
      if (e.target.closest('a')) openMob(false);
    });
    $('.morebtn').addEventListener('click', function (e) { var m = $('.more'); m.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', m.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.more')) $('.more').classList.remove('open'); });
    $('#cartOpen').addEventListener('click', function () { openCart(); });
    $('#accBtn').addEventListener('click', function () { if (S.me) openAcc(); else M.login(); });
    $('#filters').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; S.filter = b.dataset.f; $$('#filters .chip').forEach(function (x) { x.classList.toggle('on', x === b); }); M.renderMenu(); FX.observe($('#menu')); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-add]');
      if (a) { var c = a.closest('.card'); M.addLine({ type: 'product', id: a.dataset.add, qty: 1 }, c && c.querySelector('img')); return; }
      var f = e.target.closest('[data-fav]'); if (f) { M.toggleFav(f.dataset.fav, f); return; }
      var n = e.target.closest('[data-notify]'); if (n) { notify(n.dataset.notify); return; }
      var cp = e.target.closest('[data-copy]'); if (cp) { copy(cp.dataset.copy); return; }
    });
    var lg = $('#logo'), taps = 0, tt;
    lg.addEventListener('click', function () { taps++; clearTimeout(tt); tt = setTimeout(function () { taps = 0; }, 1500); });
    addEventListener('hashchange', route);
    window.addEventListener('mavi:events', function (e) {
      e.detail.forEach(function (ev) { if (ev.type === 'birthday') setTimeout(bdayGreeting, 400); });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && S.me) loadMe().then(renderAccBtn); });
  }
  async function notify(id) {
    if (!S.me) { M.login(); return; }
    try { await M.call('notify', { product: id }); S.me.notify = (S.me.notify || []).concat(id); M.toast(t('notify_on')); M.renderMenu(true); } catch (e) {}
  }
  function copy(text) {
    var done = function () { M.toast(t('wish_copied')); };
    try { navigator.clipboard.writeText(text).then(done, function () { fallback(); }); } catch (e) { fallback(); }
    function fallback() { var i = document.createElement('textarea'); i.value = text; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); done(); } catch (e2) {} i.remove(); }
  }
  M.copy = copy;

  /* hash routes: #gift-CODE, #wish-code */
  function route() {
    var h = location.hash.slice(1);
    if (/^gift-[A-Za-z0-9]+$/.test(h)) M.giftView && M.giftView(h.slice(5));
    else if (/^wish-[a-z0-9]+$/.test(h)) M.wishView && M.wishView(h.slice(5));
    else if (/^pass-[A-Za-z0-9]+$/.test(h)) M.passView && M.passView(h.slice(5));
  }

  /* ---------------- cart & checkout ---------------- */
  function openCart() { S.coStep = 1; renderCart(); M.drawer('cartD', true); }
  M.openCart = openCart;
  function coDefaults() {
    var u = S.me && S.me.user, saved = M.store('mavi_co') || {};
    return Object.assign({ name: u ? u.name : '', phone: u ? u.phone : '', district: '', address: '', date: S.cat.today, time: '', gift: { on: false, to: '', phone: '', secret: false },
      cardText: '', cardDesign: 'cream', voice: '', engrave: '', comment: '', pay: 'cash', useWallet: false, promo: '' }, saved, { voice: '', promo: saved.promo || '' });
  }
  function renderCart() {
    if (!S.co) S.co = coDefaults();
    var d = $('#cartD'), st = S.coStep;
    var head = '<div class="dh"><h2 class="serif">' + t(st === 1 ? 'co_cart' : st === 2 ? 'co_details' : 'co_done') + '</h2><button class="x" type="button" data-cx aria-label="' + t('close') + '">×</button></div>' +
      '<div class="stepsbar">' + [1, 2, 3].map(function (i) { return '<span class="' + (i <= st ? 'on' : '') + '"></span>'; }).join('') + '</div>';
    if (st === 1) d.innerHTML = head + cartStep1();
    else if (st === 2) d.innerHTML = head + cartStep2();
    else d.innerHTML = head + cartStep3();
    d.querySelector('[data-cx]').onclick = function () { M.drawer('cartD', false); };
    if (st === 1) bindStep1(d); else if (st === 2) bindStep2(d); else bindStep3(d);
  }
  M.renderCart = renderCart;

  function cartStep1() {
    if (!S.cart.length) return '<div class="db"><p class="empty corm" style="text-align:center;font-size:22px;margin-top:40px">' + t('empty') + '</p></div>';
    var items = 0;
    var rows = S.cart.map(function (l, i) {
      var p = M.linePrice(l), sum = p * (l.qty || 1); items += sum;
      var qty = l.type === 'toy' || l.type === 'club' ? '<button type="button" class="x" data-rm="' + i + '" aria-label="×" style="width:32px;height:32px;font-size:16px">×</button>'
        : '<div class="qty"><button type="button" data-m="' + i + '">−</button><span>' + l.qty + '</span><button type="button" data-p="' + i + '">+</button></div>';
      return '<div class="line" style="animation-delay:' + i * .05 + 's"><div class="th">' + M.lineThumb(l) + '</div><div class="nm"><b>' + esc(M.lineName(l)) + '</b><small>' + esc(M.lineSub(l)) + '</small><br>' + som(sum) + '</div>' + qty + '</div>';
    }).join('');
    return '<div class="db">' + rows + '</div><div class="df"><div class="sumrow big"><span>' + t('sum_items') + '</span><b>' + som(items) + '</b></div>' +
      '<button class="order" type="button" data-next>' + t('next') + '</button></div>';
  }
  function bindStep1(d) {
    d.onclick = function (e) {
      var m = e.target.closest('[data-m]'), p = e.target.closest('[data-p]'), r = e.target.closest('[data-rm]');
      if (m) { var l = S.cart[+m.dataset.m]; l.qty--; if (l.qty <= 0) S.cart.splice(+m.dataset.m, 1); }
      else if (p) { var l2 = S.cart[+p.dataset.p]; if (l2.type === 'product') { var pr = M.prod(l2.id); if (pr && M.inCart(pr.id) >= pr.left) { M.toast(t('err_no_stock'), true); return; } } l2.qty++; }
      else if (r) S.cart.splice(+r.dataset.rm, 1);
      else if (e.target.closest('[data-next]')) { S.coStep = 2; renderCart(); return; }
      else return;
      M.saveCart(); renderCart(); M.renderMenu(true);
    };
  }

  function opt(v, cur, label) { return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  var DESIGNS = { cream: '#fffaf0', rose: '#fde4ea', mint: '#e3f3ec', gold: '#f8eccb', night: '#e9e4f5' };
  function cartStep2() {
    var c = S.co, s = M.set(), u = S.me && S.me.user, today = S.cat.today, tomorrow = MaviLogic.addDays(today, 1);
    var dateMode = c.date === today ? 'today' : c.date === tomorrow ? 'tomorrow' : 'pick';
    var dists = MaviLogic.DISTRICTS.map(function (id) { return opt(id, c.district, I18N.district(id) + ' — ' + M.fmt(s.deliveryFees[id]) + ' ' + t('som')); }).join('');
    var times = ['', '10:00–13:00', '13:00–16:00', '16:00–19:00', '19:00–21:00'].map(function (x) { return opt(x, c.time, x || '—'); }).join('');
    return '<form class="db" id="coForm" novalidate>' +
      '<div class="formbox" style="padding:0;border:0;background:none">' +
      '<label class="field">' + t('f_name') + '<input name="name" value="' + esc(c.name) + '" autocomplete="name" required></label>' +
      '<label class="field">' + t('f_phone') + '<input name="phone" type="tel" inputmode="tel" value="' + esc(c.phone) + '" placeholder="+998" autocomplete="tel" required></label></div>' +
      '<label class="chk"><input type="checkbox" name="giftOn"' + (c.gift.on ? ' checked' : '') + '><span>🎁 ' + t('f_gift') + '</span></label>' +
      (c.gift.on ? '<div class="sub3"><label class="field">' + t('f_gift_to') + '<input name="giftTo" value="' + esc(c.gift.to) + '"></label><label class="field">' + t('f_gift_phone') + '<input name="giftPhone" type="tel" value="' + esc(c.gift.phone) + '"></label>' +
        '<label class="chk"><input type="checkbox" name="giftSecret"' + (c.gift.secret ? ' checked' : '') + '><span>' + t('f_secret') + '</span></label></div>' : '') +
      '<label class="field">' + t('f_district') + '<select name="district"><option value="">—</option>' + dists + '</select></label>' +
      '<div class="route" aria-hidden="true"><svg viewBox="0 0 400 56" preserveAspectRatio="none"><path d="M10 40 C80 10 140 50 200 28 S330 10 390 30" fill="none" stroke="#c9a06a" stroke-width="3" stroke-dasharray="8 8"/></svg>' +
      '<svg class="car" viewBox="0 0 48 28"><rect x="4" y="8" width="34" height="12" rx="4" fill="#0a3a32"/><path d="M12 8 L18 2 H30 L36 8Z" fill="#145247"/><rect x="20" y="4" width="8" height="4" fill="#bfe8dc"/><circle cx="13" cy="21" r="4" fill="#2b1a0b"/><circle cx="31" cy="21" r="4" fill="#2b1a0b"/><text x="21" y="17" font-size="6" fill="#e6c277" text-anchor="middle">♥</text></svg>' +
      '<svg class="pin" viewBox="0 0 24 32"><path d="M12 31s10-11 10-18a10 10 0 0 0-20 0c0 7 10 18 10 18z" fill="#c94b6d"/><circle cx="12" cy="13" r="4" fill="#fff"/></svg></div>' +
      '<label class="field">' + t('f_address') + '<input name="address" value="' + esc(c.address) + '" autocomplete="street-address"></label>' +
      '<div class="field">' + t('f_date') + '<div class="opts"><button type="button" class="opt' + (dateMode === 'today' ? ' on' : '') + '" data-date="' + today + '">' + t('today') + '</button><button type="button" class="opt' + (dateMode === 'tomorrow' ? ' on' : '') + '" data-date="' + tomorrow + '">' + t('tomorrow') + '</button>' +
      '<input type="date" name="date" min="' + today + '" max="' + MaviLogic.addDays(today, 90) + '" value="' + c.date + '" style="flex:1;min-height:44px;border:1px solid #cfae73;border-radius:12px;padding:0 10px;background:#fffaf0">' + '</div>' +
      (c.date > today ? '<small style="color:#8e2445">✦ ' + t('preorder') + '</small>' : '') + '</div>' +
      '<label class="field">' + t('f_time') + '<select name="time">' + times + '</select></label>' +
      '<div class="field">' + t('f_card') + '<div class="cdes">' + Object.keys(DESIGNS).map(function (k) { return '<button type="button" class="' + (c.cardDesign === k ? 'on' : '') + '" data-des="' + k + '" style="--bg:' + DESIGNS[k] + '" aria-label="' + k + '"></button>'; }).join('') + '</div>' +
      '<div class="envelope" id="env" style="--cardbg:' + DESIGNS[c.cardDesign] + '"><div class="env"></div><div class="letter" id="envText">' + esc(c.cardText) + '</div><div class="flap"></div><div class="seal">M</div></div>' +
      '<textarea class="ta" name="cardText" maxlength="400" placeholder="' + t('f_card_ph') + '">' + esc(c.cardText) + '</textarea>' +
      '<button type="button" class="ghost" data-seal>✉ ' + t('seal') + '</button></div>' +
      '<div class="field">' + t('gift_voice') + '<div class="rec" id="rec"><button type="button" class="ghost" data-rec style="padding:0 16px">🎙 ' + t('f_voice') + '</button></div></div>' +
      '<label class="field">' + t('f_engrave', M.fmt(s.engravePrice)) + '<input name="engrave" maxlength="24" value="' + esc(c.engrave) + '" placeholder="' + t('f_engrave_ph') + '"></label>' +
      (c.engrave ? '<div class="engr"><span>' + esc(c.engrave) + '</span></div>' : '') +
      '<label class="field">' + t('f_comment') + '<textarea name="comment" maxlength="300">' + esc(c.comment) + '</textarea></label>' +
      '<div class="field">' + t('f_pay') + '<div class="opts"><button type="button" class="opt' + (c.pay === 'cash' ? ' on' : '') + '" data-pay="cash">' + t('pay_cash') + '</button><button type="button" class="opt' + (c.pay === 'card' ? ' on' : '') + '" data-pay="card">' + t('pay_card') + '</button></div></div>' +
      (u && u.balance > 0 ? '<label class="chk"><input type="checkbox" name="useWallet"' + (c.useWallet ? ' checked' : '') + '><span>' + t('use_wallet', som(u.balance)) + '</span></label>' : '') +
      '<div class="promo"><input name="promo" value="' + esc(c.promo) + '" placeholder="' + t('promo_ph') + '"><button type="button" class="ghost" data-promo style="padding:0 16px">' + t('apply') + '</button></div>' +
      '</form><div class="df" id="sum"></div>';
  }
  var qTimer;
  function bindStep2(d) {
    var f = $('#coForm', d), c = S.co;
    var read = function () {
      c.name = f.name.value; c.phone = f.phone.value; c.district = f.district.value; c.address = f.address.value; c.time = f.time.value;
      c.cardText = f.cardText.value; c.engrave = f.engrave.value; c.comment = f.comment.value; c.promo = f.promo.value.trim().toUpperCase();
      c.date = f.date.value || S.cat.today;
      if (f.useWallet) c.useWallet = f.useWallet.checked;
      if (f.giftTo) { c.gift.to = f.giftTo.value; c.gift.phone = f.giftPhone.value; c.gift.secret = f.giftSecret.checked; }
      M.store('mavi_co', Object.assign({}, c, { voice: '' }));
    };
    f.addEventListener('input', function (e) {
      read();
      if (e.target.name === 'cardText') { $('#envText').textContent = c.cardText; $('#env').classList.remove('sealed'); }
      if (e.target.name === 'engrave') { var en = $('.engr span', d); if (en) en.textContent = c.engrave; else if (c.engrave) rerender(); }
      if (e.target.name !== 'cardText' && e.target.name !== 'comment') quote();
    });
    f.addEventListener('change', function (e) {
      read();
      if (e.target.name === 'giftOn') { c.gift.on = e.target.checked; rerender(); return; }
      if (e.target.name === 'district') moveCar();
      if (e.target.name === 'date') rerender();
      quote();
    });
    d.onclick = function (e) {
      var b;
      if ((b = e.target.closest('[data-date]'))) { read(); c.date = b.dataset.date; rerender(); }
      else if ((b = e.target.closest('[data-pay]'))) { c.pay = b.dataset.pay; $$('[data-pay]', d).forEach(function (x) { x.classList.toggle('on', x === b); }); }
      else if ((b = e.target.closest('[data-des]'))) { c.cardDesign = b.dataset.des; $$('[data-des]', d).forEach(function (x) { x.classList.toggle('on', x === b); }); $('#env').style.setProperty('--cardbg', DESIGNS[c.cardDesign]); }
      else if (e.target.closest('[data-seal]')) { read(); $('#env').classList.add('sealed'); var r = $('#env').getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 14, true); M.toast(t('sealed')); }
      else if (e.target.closest('[data-rec]')) record();
      else if (e.target.closest('[data-promo]')) { read(); quote(true); }
      else if (e.target.closest('[data-back]')) { read(); S.coStep = 1; renderCart(); }
      else if (e.target.closest('[data-place]')) { read(); place(e.target.closest('[data-place]')); }
    };
    function rerender() { var y = $('.db', d).scrollTop; renderCart(); $('.db', $('#cartD')).scrollTop = y; }
    moveCar(true); renderVoice(); quote();
  }
  function moveCar(instant) {
    var car = $('#cartD .car'); if (!car) return;
    var i = MaviLogic.DISTRICTS.indexOf(S.co.district);
    car.style.transition = instant ? 'none' : '';
    car.style.left = i < 0 ? '8px' : 'calc(' + (i === 0 ? 55 : 80) + '% - 40px)';
    if (!instant) { car.classList.add('go'); setTimeout(function () { car.classList.remove('go'); }, 1600); }
  }
  function payload() {
    var c = S.co;
    return { lines: S.cart, name: c.name, phone: c.phone, district: c.district, address: c.address, date: c.date, time: c.time, comment: c.comment,
      pay: c.pay, useWallet: c.useWallet, promo: c.promo, engrave: c.engrave, cardText: c.cardText, cardDesign: c.cardDesign, voice: c.voice, gift: c.gift };
  }
  function quote(showErr) {
    clearTimeout(qTimer);
    qTimer = setTimeout(async function () {
      var box = $('#sum'); if (!box) return;
      var q, perr = null;
      try { q = await API.call('quote', payload()); }
      catch (e) {
        if (/^promo/.test(e.code)) { perr = e; try { q = await API.call('quote', Object.assign(payload(), { promo: '' })); } catch (e2) { e = e2; } }
        if (!q) { box.innerHTML = '<p class="hint">' + (t('err_' + e.code) !== 'err_' + e.code ? t('err_' + e.code) : t('err_generic')) + '</p><button class="ghost" type="button" data-back>' + t('back') + '</button>'; return; }
      }
      if (perr && showErr) M.err(perr);
      if (!perr && showErr && q.discount) M.toast('−' + som(q.discount));
      var row = function (k, v, cls) { return '<div class="sumrow' + (cls ? ' ' + cls : '') + '"><span>' + t(k) + '</span><b' + (cls === 'neg' ? ' class="neg"' : '') + '>' + v + '</b></div>'; };
      box.innerHTML = row('sum_items', som(q.items)) + (q.discount ? row('sum_disc', '−' + som(q.discount), 'neg') : '') + (q.extras ? row('sum_extra', som(q.extras)) : '') +
        row('sum_deliv', q.district ? som(q.delivery) : '—') + (q.wallet ? row('sum_wallet', '−' + som(q.wallet), 'neg') : '') +
        '<div class="sumrow big"><span>' + t('sum_pay') + '</span><b>' + som(q.toPay) + '</b></div>' +
        (q.cashback ? '<p class="hint">✦ ' + t('cashback_will', som(q.cashback)) + '</p>' : '') +
        '<div style="display:flex;gap:10px"><button class="ghost" type="button" data-back style="flex:1">' + t('back') + '</button><button class="order drip" type="button" data-place style="flex:2">' + t('place') + '</button></div>';
    }, 250);
  }
  var recorder = null;
  function renderVoice() {
    var r = $('#rec'); if (!r) return;
    if (S.co.voice) r.innerHTML = '<audio controls src="' + S.co.voice + '" style="height:40px;max-width:220px"></audio><button type="button" class="ghost" data-rec style="padding:0 14px">↺ ' + t('rec_again') + '</button>';
  }
  async function record() {
    var r = $('#rec');
    if (recorder && recorder.state === 'recording') { recorder.stop(); return; }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var chunks = []; recorder = new MediaRecorder(stream);
      recorder.ondataavailable = function (e) { chunks.push(e.data); };
      recorder.onstop = function () {
        stream.getTracks().forEach(function (tr) { tr.stop(); });
        var blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        var fr = new FileReader(); fr.onload = function () { S.co.voice = fr.result; renderVoice(); }; fr.readAsDataURL(blob);
      };
      recorder.start();
      r.innerHTML = '<span class="dot"></span><b id="recT">0:00</b><button type="button" class="ghost" data-rec style="padding:0 14px">■ ' + t('rec_stop') + '</button>';
      var t0 = Date.now(), iv = setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000); var el = $('#recT'); if (!el || recorder.state !== 'recording') { clearInterval(iv); return; } el.textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); if (s >= 60) recorder.stop(); }, 250);
    } catch (e) { M.toast(t('rec_blocked'), true); }
  }
  async function place(btn) {
    btn.disabled = true; btn.textContent = t('placing');
    try {
      var o = await API.call('order', payload());
      S.lastOrder = o; S.cart = []; M.saveCart(); S.co.promo = ''; S.co.voice = ''; S.co.cardText = ''; S.co.engrave = ''; S.co.gift = { on: false, to: '', phone: '', secret: false };
      M.store('mavi_co', Object.assign({}, S.co));
      S.coStep = 3; renderCart();
      var r = $('#cartD').getBoundingClientRect();
      for (var k = 0; k < 5; k++) setTimeout(function () { FX.burst(r.left + Math.random() * r.width, r.top + 120 + Math.random() * 200, 26); }, k * 160);
      await loadCatalog(); if (API.loggedIn()) await loadMe(); M.renderMenu(true); renderAccBtn(); M.renderGames && M.renderGames();
    } catch (e) {
      M.err(e); btn.disabled = false; btn.textContent = t('place');
    }
  }
  function cartStep3() {
    var o = S.lastOrder; if (!o) return '';
    var link = o.gift ? location.origin + location.pathname + '#gift-' + o.gift.code : '';
    return '<div class="db" style="text-align:center;align-items:center">' + document.getElementById('tpl-crown').innerHTML.replace('width="40" height="22"', 'width="110" height="60"') +
      '<h3 class="serif" style="font-size:30px;margin:6px 0">' + t('done_t', o.id) + '</h3><p>' + t('done_p') + '</p>' + track(o) +
      (link ? '<div class="sub3" style="width:100%"><b>' + t('gift_link') + '</b><span class="code" data-copy="' + esc(link) + '" style="word-break:break-all">' + esc(link) + '</span></div>' : '') +
      (API.mode === 'demo' ? '<p class="hint">' + t('done_demo') + '</p>' : '') + '</div>' +
      '<div class="df"><button class="order" type="button" data-cx2>' + t('close') + '</button></div>';
  }
  function bindStep3(d) { d.onclick = null; var b = d.querySelector('[data-cx2]'); if (b) b.onclick = function () { M.drawer('cartD', false); }; }
  function track(o) {
    if (o.status === 'cancelled') return '<p class="hint">✕ ' + t('st_cancelled') + '</p>';
    var st = ['new', 'accepted', 'on_way', 'delivered'], cur = st.indexOf(o.status);
    var icons = ['✓', '♨', '🚚', '🎁'];
    return '<div class="track3" style="width:100%">' + st.map(function (s, i) {
      return (i ? '<i class="' + (i <= cur ? 'on' : '') + '"></i>' : '') + '<b class="' + (i <= cur ? 'on' : '') + (i === cur ? ' cur' : '') + '" title="' + t('st_' + s) + '">' + icons[i] + '</b>';
    }).join('') + '</div><div class="hint" style="text-align:center">' + t('st_' + o.status) + '</div>';
  }
  M.track = track;

  /* ---------------- login ---------------- */
  M.login = function () {
    var b;
    if (API.mode === 'server') {
      b = M.modal('<h2 class="serif">' + t('login_t') + '</h2><p>' + t('login_p') + '</p><div id="tgw" style="min-height:48px;display:grid;place-items:center"></div>');
      var bot = API.config.botUsername;
      window.onTelegramAuth = async function (user) {
        try { await API.telegramLogin(user); M.closeModal(); await loadMe(); renderAll(true); openAcc(); } catch (e) { M.err(e); }
      };
      if (bot) {
        var s = document.createElement('script'); s.async = true; s.src = 'https://telegram.org/js/telegram-widget.js?22';
        s.setAttribute('data-telegram-login', bot); s.setAttribute('data-size', 'large'); s.setAttribute('data-radius', '20');
        s.setAttribute('data-onauth', 'onTelegramAuth(user)'); s.setAttribute('data-request-access', 'write');
        $('#tgw').appendChild(s);
      }
      return;
    }
    b = M.modal('<h2 class="serif">' + t('login_t') + '</h2><p>' + t('login_p') + '</p><p class="hint">' + t('login_demo') + '</p>' +
      '<form class="stack" id="lf"><label class="field">' + t('f_name') + '<input name="n" required autocomplete="name"></label>' +
      '<label class="field">' + t('f_phone') + '<input name="p" type="tel" placeholder="+998" autocomplete="tel"></label>' +
      '<button class="order" type="submit">' + t('login') + '</button></form>');
    $('#lf', b).addEventListener('submit', async function (e) {
      e.preventDefault(); var n = this.n.value.trim(); if (!n) { M.toast(t('err_need_name'), true); return; }
      try { await API.demoLogin(n, this.p.value.trim()); M.closeModal(); await loadMe(); renderAll(true); openAcc(); } catch (er) { M.err(er); }
    });
  };

  /* ---------------- account ---------------- */
  function openAcc() { renderAcc(); M.drawer('accD', true); }
  M.openAcc = openAcc;
  function renderAcc() {
    var d = $('#accD'), me = S.me;
    if (!me) { d.innerHTML = ''; return; }
    var u = me.user, lv = u.level, pct = lv.next ? Math.min(100, (lv.spent - lv.min) / (lv.nextMin - lv.min) * 100) : 100;
    var ava = u.photo ? '<img src="' + esc(u.photo) + '" alt="">' : '<span>' + esc((u.name || '?').charAt(0)) + '</span>';
    var promos = me.promos.map(function (p) { return '<span class="code" data-copy="' + esc(p.code) + '">' + esc(p.code) + ' · −' + p.value + (p.kind === 'percent' ? '%' : '') + '</span>'; }).join(' ');
    var pend = me.topups.filter(function (x) { return x.status === 'pending'; });
    var orders = me.orders.map(function (o) {
      return '<div class="oc"><div class="hd"><b>#' + o.id + '</b><span>' + o.date + (o.preorder ? ' ✦' : '') + '</span><b>' + som(o.total) + '</b></div>' + track(o) +
        ((o.photos || []).length ? '<p class="hint" style="margin:8px 0 4px">📸 ' + t('order_photos') + '</p><div class="ophs">' + o.photos.map(function (u) { return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt=""></a>'; }).join('') + '</div>' : '') +
        (o.gift && o.gift.opened ? '<p class="hint">🎁 ' + t('gift_sent') + (o.gift.thanks ? ' «' + esc(o.gift.thanks) + '»' : '') + '</p>' : '') +
        '<div class="acts"><button type="button" data-repeat="' + o.id + '">↻ ' + t('repeat') + '</button>' +
        (o.pass && o.status !== 'cancelled' ? '<button type="button" data-pass="' + esc(o.pass) + '">🏷 ' + t('pass_btn') + '</button>' : '') +
        (o.status === 'delivered' && !o.reviewed ? '<button type="button" data-review="' + o.id + '">★ ' + t('leave_review') + '</button>' : '') +
        (o.gift ? '<button type="button" data-copy="' + esc(location.origin + location.pathname + '#gift-' + o.gift.code) + '">🔗 ' + t('gift_link') + '</button>' : '') + '</div></div>';
    }).join('') || '<p class="hint">' + t('no_orders') + '</p>';
    var txs = me.txs.slice(0, 12).map(function (x) {
      var k = 'tx_' + x.kind; return '<div><span>' + t(k, x.note) + '</span><b class="' + (x.amount >= 0 ? 'p' : 'm') + '">' + (x.amount >= 0 ? '+' : '') + M.fmt(x.amount) + '</b></div>';
    }).join('');
    var bd = me.badges.map(function (b) { return '<div class="bdg' + (b.on ? ' on' : '') + '"><i>' + t('b_' + b.id).charAt(0) + '</i>' + t('b_' + b.id) + '</div>'; }).join('');
    var dates = (u.dates || []).map(function (x, i) { return '<span class="chip" style="display:inline-flex;align-items:center;gap:6px">' + esc(x.name) + ' · ' + x.md + '<button type="button" data-deldate="' + i + '" style="border:0;background:none;color:inherit">×</button></span>'; }).join('');
    var wishLink = me.wish ? location.origin + location.pathname + '#wish-' + me.wish.code : '';
    d.innerHTML = '<div class="dh"><h2 class="serif">' + t('acc') + '</h2><button class="x" type="button" data-ax aria-label="' + t('close') + '">×</button></div><div class="db">' +
      (u.isBirthday ? '<div class="bdaybanner"><b class="serif" style="font-size:22px">' + t('happy_bday', esc(u.name)) + '</b><br>' + t('bday_gift', S.cat.settings.birthdayPercent) + '</div>' : '') +
      '<div class="prof lv-' + lv.id + '"><div class="ava">' + ava + '</div><div style="flex:1"><b class="serif" style="font-size:22px">' + esc(u.name) + '</b><br><small>' + t('lv_' + lv.id) + ' · ' + t('lv_cb', u.cashback) + '</small>' +
      '<div class="lvbar" style="margin-top:6px"><i style="width:0" data-w="' + pct + '"></i></div><small>' + (lv.next ? t('lv_next', t('lv_' + lv.next), som(lv.nextMin - lv.spent)) : t('lv_max')) + '</small></div></div>' +
      '<div class="walletc" id="walletC"><div class="row2"><span>' + t('wallet') + '</span><button type="button" data-topup>+ ' + t('topup') + '</button></div><div class="bal" id="bal" data-v="' + u.balance + '">0</div>' +
      (pend.length ? '<small>' + t('topup_wait', som(pend[0].amount)) + '</small>' : '') + '</div>' +
      (txs ? '<details><summary class="acc-h">' + t('history') + '</summary><div class="txl" style="margin-top:8px">' + txs + '</div></details>' : '') +
      (promos ? '<p class="acc-h">' + t('my_promos') + '</p><div style="display:flex;flex-wrap:wrap;gap:6px">' + promos + '</div>' : '') +
      '<p class="acc-h">' + t('badges') + '</p><div class="bgrid">' + bd + '</div>' +
      '<p class="acc-h">' + t('my_orders') + '</p>' + orders +
      '<p class="acc-h">' + t('wish_title') + '</p><p class="hint">' + t('wish_lead') + ' (' + M.favs().length + ' ♥)</p>' +
      '<button type="button" class="ghost" data-wish>🔗 ' + t('wish_share') + '</button>' + (wishLink ? '<span class="code" data-copy="' + esc(wishLink) + '" style="word-break:break-all;font-size:12px">' + esc(wishLink) + '</span>' : '') +
      '<p class="acc-h">' + t('dates_t') + '</p><p class="hint">' + t('dates_p') + '</p>' +
      '<label class="field">' + t('my_bday') + ' (' + t('bday_gift', S.cat.settings.birthdayPercent) + ')<input type="text" id="myBday" placeholder="MM-DD, 03-02" value="' + esc(u.birthday) + '" maxlength="5"></label>' +
      '<div class="dates">' + dates + '</div><div style="display:flex;gap:8px"><input id="dName" placeholder="' + t('who') + '" style="flex:1;min-height:44px;border:1px solid #cfae73;border-radius:12px;padding:0 12px;background:#fffaf0">' +
      '<input id="dMd" placeholder="MM-DD" maxlength="5" style="width:90px;min-height:44px;border:1px solid #cfae73;border-radius:12px;padding:0 12px;background:#fffaf0"><button type="button" class="ghost" data-adddate style="padding:0 14px">+</button></div>' +
      '<button type="button" class="ghost" data-savedates>' + t('save') + '</button>' +
      '</div><div class="df"><button type="button" class="ghost" data-logout>' + t('logout') + '</button></div>';
    I18N.apply(d);
    d.querySelector('[data-ax]').onclick = function () { M.drawer('accD', false); };
    requestAnimationFrame(function () { var i = d.querySelector('.lvbar i'); if (i) i.style.width = i.dataset.w + '%'; countBal(); });
    d.onclick = accClick;
  }
  M.renderAcc = renderAcc;
  function countBal() {
    var b = $('#bal'); if (!b) return; var v = +b.dataset.v, t0 = performance.now();
    (function s(n) { var k = Math.min(1, (n - t0) / 1200), e = 1 - Math.pow(1 - k, 3); b.textContent = som(Math.round(v * e)); if (k < 1) requestAnimationFrame(s); })(t0);
  }
  async function accClick(e) {
    var b, me = S.me;
    if ((b = e.target.closest('[data-pass]'))) { M.passView(b.dataset.pass); return; }
    if ((b = e.target.closest('[data-repeat]'))) {
      var o = me.orders.find(function (x) { return x.id === +b.dataset.repeat; });
      o.lines.forEach(function (l) { var c = Object.assign({}, l); delete c.price; delete c.sum; delete c.name; delete c.deal; if (c.type === 'product' && !M.prod(c.id)) return; S.cart.push(c); });
      M.saveCart(); M.drawer('accD', false); openCart(); return;
    }
    if ((b = e.target.closest('[data-review]'))) { M.reviewForm(+b.dataset.review); return; }
    if (e.target.closest('[data-topup]')) { topupForm(); return; }
    if (e.target.closest('[data-logout]')) { API.logout(); S.me = null; M.drawer('accD', false); renderAll(true); return; }
    if (e.target.closest('[data-wish]')) {
      try { var w = await M.call('wishSave', { items: M.favs() }); me.wish = w; var link = location.origin + location.pathname + '#wish-' + w.code; copy(link); renderAcc(); } catch (er) {}
      return;
    }
    if (e.target.closest('[data-adddate]')) {
      var n = $('#dName').value.trim(), md = $('#dMd').value.trim();
      if (!n || !/^\d{2}-\d{2}$/.test(md)) { M.toast(t('err_need_fields'), true); return; }
      me.user.dates = (me.user.dates || []).concat({ name: n, md: md }); renderAcc(); return;
    }
    if ((b = e.target.closest('[data-deldate]'))) { me.user.dates.splice(+b.dataset.deldate, 1); renderAcc(); return; }
    if (e.target.closest('[data-savedates]')) {
      try { var u = await M.call('profile', { dates: me.user.dates, birthday: $('#myBday').value.trim() }); me.user = Object.assign(me.user, u); M.toast(t('saved')); await loadMe(); renderAcc(); } catch (er) {}
    }
  }
  function topupForm() {
    var s = M.set();
    var b = M.modal('<h2 class="serif">' + t('topup_t') + '</h2><p>' + t('topup_p') + '</p>' +
      (s.cardNumber ? '<div class="cardnum"><span>' + esc(s.cardNumber) + '</span><button type="button" class="ghost" data-copy="' + esc(s.cardNumber.replace(/\s/g, '')) + '" style="color:#f3d98f;border-color:#e6c277;padding:0 12px">' + t('copy') + '</button></div>' + (s.cardOwner ? '<p class="hint">' + esc(s.cardOwner) + '</p>' : '')
        : '<p class="hint">' + t('topup_card_none') + '</p>') +
      '<div class="opts" style="margin:12px 0">' + [50000, 100000, 200000, 500000].map(function (v) { return '<button type="button" class="opt" data-amt="' + v + '">' + M.fmt(v) + '</button>'; }).join('') + '</div>' +
      '<form class="stack" id="tf"><input class="numin" style="width:100%" name="a" type="number" min="10000" step="1000" placeholder="100000"><button class="order" type="submit">' + t('topup_sent') + '</button></form>');
    b.addEventListener('click', function (e) { var a = e.target.closest('[data-amt]'); if (a) { $('#tf').a.value = a.dataset.amt; $$('[data-amt]', b).forEach(function (x) { x.classList.toggle('on', x === a); }); } });
    $('#tf').addEventListener('submit', async function (e) {
      e.preventDefault();
      try { await M.call('topup', { amount: +this.a.value }); M.closeModal(); await loadMe(); renderAcc(); M.toast(t('topup_wait', som(+this.a.value))); } catch (er) {}
    });
  }
  function bdayGreeting() {
    if (!S.me) return;
    var p = S.me.promos.find(function (x) { return x.note === 'birthday'; });
    M.modal('<div class="giftview"><div class="big">🎂</div><h2 class="serif">' + t('happy_bday', esc(S.me.user.name)) + '</h2><p>' + t('bday_gift', S.cat.settings.birthdayPercent) + '</p>' +
      (p ? '<span class="code" data-copy="' + esc(p.code) + '" style="font-size:22px">' + esc(p.code) + '</span>' : '') + '</div>');
    for (var k = 0; k < 6; k++) setTimeout(function () { FX.burst(innerWidth * Math.random(), innerHeight * .4, 30, Math.random() < .5); }, k * 200);
  }
  M.loadMe = loadMe;

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})();
