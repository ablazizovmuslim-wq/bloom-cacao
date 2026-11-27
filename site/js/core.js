/* MAVİ — shared UI helpers and state */
(function () {
  'use strict';
  var M = window.MAVI = {};
  var I = window.I18N;
  M.t = I.t; M.tl = I.tl;
  M.$ = function (s, r) { return (r || document).querySelector(s); };
  M.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  M.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  M.fmt = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  M.som = function (n) { return M.fmt(n) + ' ' + M.t('som'); };
  M.state = { cat: null, me: null, cart: [], fav: [], filter: 'all', co: null, coStep: 1 };
  M.store = function (k, v) {
    try { if (v === undefined) { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  };
  M.toast = function (msg, err) {
    var d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.textContent = msg;
    M.$('#toasts').appendChild(d); setTimeout(function () { d.remove(); }, 3300);
  };
  M.err = function (e) {
    var c = e && (e.code || e.message);
    var k = 'err_' + c, msg = M.t(k);
    M.toast(msg === k ? M.t('err_generic') : msg, true);
  };
  M.call = async function (route, body) {
    try { return await API.call(route, body); } catch (e) { M.err(e); throw e; }
  };
  M.dur = function (ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (d ? d + ' ' + M.t('d') + ' ' : '') + p(h) + ':' + p(m) + ':' + p(ss);
  };
  M.parts = function (ms) { ms = Math.max(0, ms); var s = Math.floor(ms / 1000); return [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60]; };
  M.now = function () { var c = M.state.cat; return c ? c.now + (performance.now() - M._loadedAt) : Date.now(); };
  M._loadedAt = performance.now();

  /* modal */
  M.modal = function (html, wide) {
    var m = M.$('#modal'), b = M.$('#mbox');
    b.className = 'mbox' + (wide ? ' wide' : '');
    b.innerHTML = '<button class="x" type="button" aria-label="' + M.t('close') + '" data-close>×</button>' + html;
    m.hidden = false; I.apply(b);
    var f = b.querySelector('input,textarea,button:not([data-close])'); if (f) setTimeout(function () { f.focus(); }, 50);
    return b;
  };
  M.closeModal = function () { M.$('#modal').hidden = true; M.$('#mbox').innerHTML = ''; if (M._modalClose) { M._modalClose(); M._modalClose = null; } };
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target.id === 'modal') M.closeModal();
  });

  /* drawers */
  M.drawer = function (id, open) {
    var d = M.$('#' + id); d.classList.toggle('open', open); d.setAttribute('aria-hidden', String(!open));
    var any = M.$$('.drawer.open').length > 0;
    M.$('#shade').classList.toggle('open', any);
  };
  M.$('#shade').addEventListener('click', function () { M.drawer('cartD', false); M.drawer('accD', false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') { M.drawer('cartD', false); M.drawer('accD', false); M.closeModal(); } });

  /* products & prices */
  M.prod = function (id) { return (M.state.cat.products || []).find(function (p) { return p.id === id; }); };
  M.set = function () { return M.state.cat.settings; };
  M.findIn = function (list, id) { return (list || []).find(function (x) { return x.id === id; }); };
  M.linePrice = function (l) {
    var s = M.set();
    if (l.type === 'box') { var pk = M.findIn(s.packaging, l.pack) || s.packaging[0]; return l.size * s.piecePrice + pk.price; }
    if (l.type === 'bar') { var b = M.findIn(s.bars, l.base); return (b ? b.price : 0) + l.tops.reduce(function (a, t) { var x = M.findIn(s.toppings, t); return a + (x ? x.price : 0); }, 0); }
    if (l.type === 'toy') return M.toyTotal(l.pack, l.guests);
    if (l.type === 'kit') { var k = M.findIn(s.kits, l.kit); return k ? k.price + l.cups.reduce(function (a, c) { var x = M.findIn(s.cupItems, c); return a + (x ? x.price : 0); }, 0) : 0; }
    if (l.type === 'bonbon') return s.bonbon.price;
    if (l.type === 'club') { var pl = s.clubPlans.find(function (p) { return p.months === l.months; }); return pl ? pl.price : 0; }
    var p = M.prod(l.id); return p ? p.dealPrice : 0;
  };
  M.toyEach = function (pack) { var s = M.set(), p = M.findIn(s.toyPacks, pack); return p ? p.pieces * s.piecePrice + p.wrap : 0; };
  M.toyTotal = function (pack, g) { var s = M.set(), sum = M.toyEach(pack) * g; if (g >= s.toyDiscountFrom) sum = Math.round(sum * (100 - s.toyDiscount) / 100 / 1000) * 1000; return sum; };
  M.lineName = function (l) {
    var s = M.set();
    if (l.type === 'box') return M.t('box_name', l.size);
    if (l.type === 'bar') { var b = M.findIn(s.bars, l.base); return M.t('bar_name') + ' · ' + M.tl(b && b.name); }
    if (l.type === 'toy') { var p = M.findIn(s.toyPacks, l.pack); return M.t('toy_name', l.guests, M.tl(p && p.name)); }
    if (l.type === 'club') return M.t('club_name', l.months);
    if (l.type === 'kit') { var k = M.findIn(s.kits, l.kit); return M.tl(k && k.name); }
    if (l.type === 'bonbon') return M.t('bb_name');
    var pr = M.prod(l.id); return pr ? M.tl(pr.name) : '?';
  };
  M.lineSub = function (l) {
    var s = M.set();
    if (l.type === 'box') { var pk = M.findIn(s.packaging, l.pack); return M.tl(pk && pk.name); }
    if (l.type === 'bar') return l.tops.map(function (t) { return M.tl((M.findIn(s.toppings, t) || {}).name); }).join(', ');
    if (l.type === 'product') { var pr = M.prod(l.id); return pr ? M.tl(pr.sub) : ''; }
    if (l.type === 'kit') return l.cups.map(function (c) { return M.tl((M.findIn(s.cupItems, c) || {}).name); }).join(' + ') + (l.dear ? ' · 💝 «' + M.t('kit_dear_lid') + '»' : '');
    if (l.type === 'bonbon') { var b = s.bonbon; return [M.findIn(b.shapes || [], l.shape), M.findIn(b.colors || [], l.color), M.findIn(b.finishes || [], l.finish), M.findIn(b.shells, l.shell), M.findIn(b.l1, l.l1), M.findIn(b.l2, l.l2), M.findIn(b.dust, l.dust)].filter(Boolean).map(function (x) { return M.tl(x.name); }).join(' · '); }
    return '';
  };
  M.lineThumb = function (l) {
    var s = M.set();
    if (l.type === 'product') { var p = M.prod(l.id); return p ? '<img src="' + M.esc(p.img) + '" alt="">' : ''; }
    if (l.type === 'box') return '<div class="mbb">' + l.cells.slice(0, 9).map(function (c) { return '<i style="--c:' + (M.findIn(s.flavors, c) || {}).color + '"></i>'; }).join('') + '</div>';
    if (l.type === 'bar') return '<div style="width:44px;height:30px;border-radius:4px;background:' + (M.findIn(s.bars, l.base) || {}).color + '"></div>';
    if (l.type === 'kit') { var kk = M.findIn(s.kits, l.kit); return kk ? '<img src="' + M.esc(kk.img) + '" alt="">' : ''; }
    if (l.type === 'bonbon') return M.bonbonSvg(l, 50, 'whole');
    if (l.type === 'toy') return '<div class="tb" style="width:34px;--rib:' + (M.findIn(s.ribbons, l.ribbon) || s.ribbons[0]).color + '"></div>';
    return document.getElementById('tpl-crown').innerHTML;
  };
  M.sameLine = function (a, b) { return JSON.stringify(Object.assign({}, a, { qty: 0 })) === JSON.stringify(Object.assign({}, b, { qty: 0 })); };

  /* cart */
  M.saveCart = function () { M.store('mavi_cart', M.state.cart); M.renderBadge && M.renderBadge(); };
  M.addLine = function (line, fromImg) {
    try { if (M.tg && M.tg.HapticFeedback) M.tg.HapticFeedback.impactOccurred('light'); } catch (e) {}
    var c = M.state.cart, ex = c.find(function (x) { return x.type !== 'toy' && x.type !== 'club' && M.sameLine(x, line); });
    if (line.type === 'club') c = M.state.cart = c.filter(function (x) { return x.type !== 'club'; });
    if (ex) ex.qty = (ex.qty || 1) + (line.qty || 1); else { line.qty = line.qty || 1; M.state.cart.push(line); }
    M.saveCart();
    var target = M.$('#cartOpen');
    if (fromImg) FX.fly(fromImg, target, function () { M.bump(); }); else { M.bump(); var r = target.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 14); }
    M.toast(M.t('added'));
    M.renderMenu && M.renderMenu(true);
  };
  M.bump = function () { var b = M.$('#badge'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); };
  M.inCart = function (id) { return M.state.cart.filter(function (l) { return l.type === 'product' && l.id === id; }).reduce(function (a, l) { return a + l.qty; }, 0); };

  /* favourites */
  M.favs = function () { return M.state.me ? (M.state.me.user.fav || []) : (M.store('mavi_fav') || []); };
  M.toggleFav = async function (id, btn) {
    var f = M.favs().slice(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else { f.push(id); if (btn) { var r = btn.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 18, true); } }
    if (M.state.me) { M.state.me.user.fav = f; try { await API.call('profile', { fav: f }); } catch (e) {} }
    else M.store('mavi_fav', f);
    M.renderMenu(true);
  };

  M.brand = function () { return (M.state.cat && M.state.cat.settings.brand) || 'Bloom & Cacao'; };
  /* bon-bon drawing: any shape, colour and finish; mode 'cut' (cross-section) or 'whole' */
  var SHAPES = {
    dome: { c: [150, 150], el: '<path d="M38 222 C38 96 94 40 150 40 C206 40 262 96 262 222 Z"/>' },
    sphere: { c: [150, 128], el: '<circle cx="150" cy="128" r="96"/>' },
    heart: { c: [150, 118], el: '<path d="M150 224 C88 182 36 142 36 92 C36 56 64 34 96 34 C121 34 140 48 150 70 C160 48 179 34 204 34 C236 34 264 56 264 92 C264 142 212 182 150 224 Z"/>' },
    square: { c: [150, 133], el: '<path d="M58 62 Q58 44 76 44 H224 Q242 44 242 62 V204 Q242 222 224 222 H76 Q58 222 58 204 Z"/>' },
    flower: { c: [150, 130], el: (function () { var o = '<circle cx="150" cy="130" r="58"/>'; for (var k = 0; k < 6; k++) { var a = k * Math.PI / 3 - Math.PI / 2; o += '<circle cx="' + (150 + Math.cos(a) * 56).toFixed(1) + '" cy="' + (130 + Math.sin(a) * 56).toFixed(1) + '" r="40"/>'; } return o; })() },
    star: { c: [150, 134], el: (function () { var pts = []; for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 46 : 100; pts.push((150 + Math.cos(a) * r).toFixed(1) + ',' + (136 + Math.sin(a) * r).toFixed(1)); } return '<polygon points="' + pts.join(' ') + '" stroke-width="16" stroke-linejoin="round"/>'; })() },
    gem: { c: [150, 126], el: '<path d="M150 216 L46 104 L88 50 H212 L254 104 Z" stroke-width="6" stroke-linejoin="round"/>' }
  };
  M.BB_SHAPES = SHAPES;
  M.bonbonSvg = function (o, w, mode, big) {
    var b = M.set().bonbon, f = function (list, id) { return (M.findIn(list || [], id) || {}).color || ''; };
    var sh = SHAPES[o.shape] || SHAPES.dome, sc = f(b.shells, o.shell) || '#3b2216', j = f(b.l1, o.l1) || '#b3123b', cr = f(b.l2, o.l2) || '#cfe0b0';
    var paint = f(b.colors, o.color) || sc, fin = o.finish || 'gloss', d = o.dust === 'none' ? null : f(b.dust, o.dust);
    var id = 'b' + Math.random().toString(36).slice(2, 8), cx = sh.c[0], cy = sh.c[1];
    var el = function (fill, extra) { return sh.el.replace(/<(path|circle|polygon)/g, '<$1 fill="' + fill + '" stroke="' + (/stroke-width/.test(sh.el) ? fill : 'none') + '"' + (extra || '')); };
    var shrink = function (k) { return 'transform="translate(' + cx + ' ' + cy + ') scale(' + k + ') translate(' + (-cx) + ' ' + (-cy) + ')"'; };
    var defs = '<defs><clipPath id="' + id + 'o">' + sh.el + '</clipPath><clipPath id="' + id + 'i">' + sh.el.replace(/<(path|circle|polygon)/g, '<$1 ' + shrink(.8)) + '</clipPath>' +
      '<radialGradient id="' + id + 'g" cx=".32" cy=".26" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".18" stop-color="#fff" stop-opacity=".12"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>' +
      '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".3" stop-color="' + paint + '"/><stop offset=".55" stop-color="#fff" stop-opacity=".35"/><stop offset=".75" stop-color="' + paint + '"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + paint + '"/><stop offset="1" stop-color="' + sc + '"/></linearGradient></defs>';
    var seedR = function (n) { var o = '', k = 0, x = 7; while (k++ < n) { x = (x * 9301 + 49297) % 233280; o += x / 233280 + ','; } return o.split(',').map(Number); };
    var R = seedR(80), ri = 0, rnd = function () { return R[(ri++) % R.length]; };
    var coat;
    if (fin === 'ombre') coat = el('url(#' + id + 'b)');
    else if (fin === 'metal') coat = el('url(#' + id + 'm)');
    else if (fin === 'splash') { coat = el(sc); for (var k = 0; k < 16; k++) coat += '<circle clip-path="url(#' + id + 'o)" cx="' + (40 + rnd() * 220).toFixed(0) + '" cy="' + (30 + rnd() * 190).toFixed(0) + '" r="' + (4 + rnd() * 16).toFixed(1) + '" fill="' + paint + '" opacity="' + (.6 + rnd() * .4).toFixed(2) + '"/>'; }
    else if (fin === 'marble') { coat = el(paint) + '<g clip-path="url(#' + id + 'o)" fill="none" stroke="#fff" stroke-linecap="round" opacity=".55"><path d="M20 90 C80 60 120 150 190 110 S260 60 290 120" stroke-width="10"/><path d="M10 170 C70 140 130 210 200 170 S270 150 300 190" stroke-width="6"/><path d="M60 40 C90 80 70 120 120 150" stroke-width="4" stroke="' + sc + '"/></g>'; }
    else coat = el(paint);
    var gloss = '<g clip-path="url(#' + id + 'o)"><rect width="300" height="240" fill="url(#' + id + 'g)"/></g>';
    var dots = '';
    if (d) for (var q = 0; q < (big ? 22 : 9); q++) dots += '<circle clip-path="url(#' + id + 'o)" cx="' + (cx - 70 + rnd() * 140).toFixed(1) + '" cy="' + (cy - 100 + rnd() * 60).toFixed(1) + '" r="' + (1.2 + rnd() * 2).toFixed(1) + '" fill="' + d + '"/>';
    var shadow = '<ellipse cx="150" cy="228" rx="100" ry="9" fill="#000" opacity=".18"/>';
    if (mode !== 'cut') return '<svg viewBox="0 0 300 240" width="' + w + '" aria-hidden="true">' + defs + shadow + coat + gloss + dots + '</svg>';
    var seeds = ''; for (var s2 = 0; s2 < (big ? 12 : 4); s2++) seeds += '<circle cx="' + (cx - 60 + rnd() * 120).toFixed(0) + '" cy="' + (cy - 60 + rnd() * 70).toFixed(0) + '" r="' + (2 + rnd() * 3).toFixed(1) + '" fill="#fff" opacity=".25"/>';
    var split = cy + 26;
    return '<svg viewBox="0 0 300 240" width="' + w + '" aria-hidden="true">' + defs + shadow + coat +
      '<g ' + shrink(.93) + '>' + el(sc) + '</g>' +
      '<g clip-path="url(#' + id + 'i)"><rect class="lay l1" x="0" y="0" width="300" height="' + split + '" fill="' + j + '"/>' + seeds +
      '<rect class="lay l2" x="0" y="' + split + '" width="300" height="' + (240 - split) + '" fill="' + cr + '"/><path d="M0 ' + split + ' Q75 ' + (split - 8) + ' 150 ' + split + ' T300 ' + split + '" fill="none" stroke="' + j + '" stroke-width="6"/></g>' + dots + '</svg>';
  };

  /* small svgs */
  M.heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C1 8.4 3 5 6.4 5c2.1 0 3.4 1.2 4.1 2.4C11.2 6.2 12.5 5 14.6 5 18 5 20 8.4 18.6 11.7 16.5 16.4 12 21 12 21z" fill="none" stroke="#c94b6d" stroke-width="1.8"/></svg>';
})();
