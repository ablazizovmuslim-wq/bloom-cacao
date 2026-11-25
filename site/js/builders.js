/* Bloom & Cacao — interactive builders: AI helper, chocolate story, box, bar, wedding calculator, club, games */
(function () {
  'use strict';
  var M = window.MAVI, t = M.t, tl = M.tl, $ = M.$, $$ = M.$$, esc = M.esc, som = M.som, S = M.state;

  /* ---------------- AI gift helper ---------------- */
  M.renderAI = function () {
    var ex = { uz: ['Onamga 8-martga 200 000 gacha', 'Hamkasbimga choy sovgʻasi', 'Sevgilimga 500 000 gacha shokolad'],
      ru: ['Маме на 8 Марта до 200 000', 'Коллеге — чайный подарок', 'Любимой шоколад до 500 000'],
      en: ['For mum, up to 200 000', 'A tea gift for a colleague', 'Chocolate for my love up to 500 000'] }[I18N.lang];
    $('#aiChips').innerHTML = ex.map(function (x) { return '<button type="button" class="chip" data-ex="' + esc(x) + '">' + esc(x) + '</button>'; }).join('');
    I18N.apply($('#ai'));
    if (!M._aiBound) {
      M._aiBound = true;
      $('#aiChips').addEventListener('click', function (e) { var b = e.target.closest('[data-ex]'); if (b) { $('#aiText').value = b.dataset.ex; ask(); } });
      $('#aiForm').addEventListener('submit', function (e) { e.preventDefault(); ask(); });
    }
  };
  async function ask() {
    var text = $('#aiText').value.trim(); if (!text) return;
    var out = $('#aiOut');
    out.innerHTML = '<p class="corm lead2 typing">' + t('ai_thinking') + '</p>';
    try {
      var r = await API.call('suggest', { text: text, lang: I18N.lang });
      await new Promise(function (res) { setTimeout(res, 700); });
      var items = r.items.map(M.prod).filter(Boolean);
      if (!items.length) { out.innerHTML = '<p class="lead2 corm">' + t('err_generic') + '</p>'; return; }
      out.innerHTML = '<p class="lead2 corm">' + (r.reason ? esc(r.reason) + '<br>' : '') + t('ai_result', som(r.sum)) + '</p><div class="aires">' +
        items.map(function (p, i) { return '<div class="mini" style="animation-delay:' + i * .12 + 's"><img src="' + esc(p.img) + '" alt=""><b>' + esc(tl(p.name)) + '</b><span>' + som(p.dealPrice) + '</span></div>'; }).join('') +
        '</div><button type="button" class="cta sm drip" id="aiAll" style="margin-top:22px">' + t('ai_add_all') + '</button>';
      $('#aiAll').onclick = function () { items.forEach(function (p) { M.addLine({ type: 'product', id: p.id, qty: 1 }); }); M.openCart(); };
    } catch (e) { out.innerHTML = ''; M.err(e); }
  }

  /* ---------------- chocolate story (scroll driven) ---------------- */
  var SCENES = [
    // cacao pod
    '<svg viewBox="0 0 400 400"><defs><radialGradient id="pod" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e0a055"/><stop offset=".6" stop-color="#a5521f"/><stop offset="1" stop-color="#5e2a10"/></radialGradient></defs>' +
    '<g class="spin" style="animation-duration:30s"><circle cx="200" cy="200" r="170" fill="none" stroke="#e6c277" stroke-opacity=".25" stroke-dasharray="4 10"/></g>' +
    '<path d="M200 60 C290 80 320 180 300 260 C280 330 230 350 200 350 C170 350 120 330 100 260 C80 180 110 80 200 60Z" fill="url(#pod)"/>' +
    '<g stroke="#5e2a10" stroke-opacity=".5" fill="none" stroke-width="3"><path d="M200 64 Q190 200 200 346"/><path d="M160 74 Q130 200 150 336"/><path d="M240 74 Q270 200 250 336"/></g>' +
    '<g class="beans">' + [[90, 300], [310, 300], [70, 220], [330, 210], [120, 360], [280, 360]].map(function (p, i) { return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="16" ry="24" fill="#6b3a1f" stroke="#3b2216" style="animation:bean 2.4s ' + (-i * .4) + 's ease-in-out infinite alternate"/>'; }).join('') + '</g></svg>',
    // tempering bowl
    '<svg viewBox="0 0 400 400"><defs><clipPath id="bowlc"><path d="M60 200 H340 C340 290 280 340 200 340 C120 340 60 290 60 200Z"/></clipPath><linearGradient id="chocg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4a30"/><stop offset="1" stop-color="#2a160c"/></linearGradient></defs>' +
    '<ellipse cx="200" cy="350" rx="150" ry="14" fill="#000" opacity=".3"/>' +
    '<g clip-path="url(#bowlc)"><rect x="40" y="215" width="320" height="140" fill="url(#chocg)"/><path class="melt" d="M40 222 Q80 205 120 222 T200 222 T280 222 T360 222 T440 222 V240 H40Z" fill="#8a5638"/></g>' +
    '<path d="M60 200 H340 C340 290 280 340 200 340 C120 340 60 290 60 200Z" fill="none" stroke="#d9c7a8" stroke-width="6"/><ellipse cx="200" cy="200" rx="140" ry="16" fill="none" stroke="#efe3c8" stroke-width="4"/>' +
    '<g class="spin" style="transform-origin:200px 215px;animation-duration:4s"><path d="M200 215 L300 70" stroke="#c9a06a" stroke-width="10" stroke-linecap="round"/><ellipse cx="200" cy="215" rx="26" ry="10" fill="#c9a06a"/></g>' +
    '<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"><path class="steam" d="M150 190 C140 160 165 140 150 110"/><path class="steam" style="animation-delay:-1.5s" d="M250 190 C240 160 265 140 250 110"/></g></svg>',
    // filling a bonbon
    '<svg viewBox="0 0 400 400"><defs><radialGradient id="shell" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".2" stop-color="#1e88a8"/><stop offset="1" stop-color="#0b2d3a"/></radialGradient></defs>' +
    '<ellipse cx="200" cy="350" rx="120" ry="12" fill="#000" opacity=".3"/><path d="M90 220 A110 110 0 0 0 310 220 Z" fill="url(#shell)"/><ellipse cx="200" cy="220" rx="110" ry="22" fill="#2a160c"/>' +
    '<ellipse cx="200" cy="222" rx="90" ry="14" fill="#8fae3e"/>' +
    '<path d="M200 40 C230 40 240 70 222 92 L206 120 L194 120 L178 92 C160 70 170 40 200 40Z" fill="#efe3c8" stroke="#c9a06a" stroke-width="3"/>' +
    '<g class="fill-drop"><path d="M200 130 C212 150 212 160 200 166 C188 160 188 150 200 130Z" fill="#8fae3e"/></g>' +
    '<g>' + [[120, 300], [280, 300], [150, 330]].map(function (p) { return '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="16" ry="10" fill="#c98b4c" transform="rotate(-20 ' + p[0] + ' ' + p[1] + ')"/>'; }).join('') + '</g></svg>',
    // packing
    '<svg viewBox="0 0 400 400"><defs><linearGradient id="pbx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#145247"/><stop offset="1" stop-color="#062a24"/></linearGradient><linearGradient id="prb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c7128"/><stop offset=".5" stop-color="#fff0bd"/><stop offset="1" stop-color="#9c7128"/></linearGradient></defs>' +
    '<ellipse cx="200" cy="350" rx="150" ry="14" fill="#000" opacity=".3"/><rect x="70" y="200" width="260" height="140" rx="10" fill="url(#pbx)" stroke="#c99a45" stroke-width="2"/>' +
    [[115, 250, '#c2185b'], [165, 250, '#1e88a8'], [215, 250, '#c9a227'], [265, 250, '#8fae3e'], [140, 295, '#4a2a1a'], [190, 295, '#efe3c8'], [240, 295, '#c2185b']].map(function (b) { return '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="18" fill="' + b[2] + '"/><circle cx="' + (b[0] - 6) + '" cy="' + (b[1] - 6) + '" r="5" fill="#fff" opacity=".5"/>'; }).join('') +
    '<g class="lidc"><rect x="58" y="168" width="284" height="42" rx="8" fill="url(#pbx)" stroke="#c99a45" stroke-width="2"/><rect x="188" y="168" width="24" height="42" fill="url(#prb)"/>' +
    '<path d="M200 168 C170 130 140 140 150 160 C156 172 186 170 200 168 C214 170 244 172 250 160 C260 140 230 130 200 168Z" fill="url(#prb)"/>' +
    '<text x="200" y="198" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-size="15" font-weight="700" fill="#e6c277" letter-spacing="1">{BRAND}</text></g></svg>'
  ];
  M.renderStory = function () {
    $('#scene').innerHTML = SCENES.map(function (s, i) { return s.replace('{BRAND}', esc(M.brand())).replace('<svg ', '<svg role="img" aria-label="' + esc(t('st' + (i + 1) + '_t')) + '" class="' + (i === 0 ? 'on' : '') + '" '); }).join('');
    $('#steps').innerHTML = [1, 2, 3, 4].map(function (i) { return '<div class="sstep' + (i === 1 ? ' on' : '') + '"><h3 class="serif">' + i + '. ' + t('st' + i + '_t') + '</h3><p>' + t('st' + i + '_p') + '</p></div>'; }).join('');
    I18N.apply($('#story'));
    storyScroll(scrollY);
  };
  var lastIdx = -1;
  function storyScroll(y) {
    var s = $('#story'); if (!s) return;
    var top = s.offsetTop, h = s.offsetHeight - innerHeight, p = Math.max(0, Math.min(1, (y - top) / h));
    var idx = Math.min(3, Math.floor(p * 4));
    $('#sbar').style.width = (p * 100) + '%';
    if (idx !== lastIdx) {
      lastIdx = idx;
      $$('#scene svg').forEach(function (g, i) { g.classList.toggle('on', i === idx); });
      $$('#steps .sstep').forEach(function (g, i) { g.classList.toggle('on', i === idx); });
    }
  }
  var prevScroll = FX.onScroll;
  FX.onScroll = function (y) { if (prevScroll) prevScroll(y); storyScroll(y); };

  /* ---------------- box builder ---------------- */
  var box = M.store('mavi_box') || { size: 9, cells: [], ribbon: 'gold', pack: 'std' };
  M.renderBox = function () {
    var s = M.set(), el = $('#boxApp');
    if (s.boxSizes.indexOf(box.size) < 0) box.size = s.boxSizes[1] || s.boxSizes[0];
    box.cells = box.cells.slice(0, box.size);
    var cols = box.size === 6 ? 3 : box.size === 9 ? 3 : 4;
    var rib = (M.findIn(s.ribbons, box.ribbon) || s.ribbons[0]).color;
    var filled = box.cells.filter(Boolean).length, full = filled === box.size;
    var price = M.linePrice({ type: 'box', size: box.size, pack: box.pack });
    el.innerHTML = '<div class="builder"><div class="stage2">' +
      '<div class="giftbox' + (box.pack === 'premium' ? ' premium' : '') + (full ? ' closed' : '') + '" id="gbox" style="--rib:' + rib + '">' +
      '<div class="cells" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' +
      Array.apply(null, Array(box.size)).map(function (_, i) {
        var f = box.cells[i] && M.findIn(s.flavors, box.cells[i]);
        return '<button type="button" class="cell" data-cell="' + i + '" aria-label="' + (f ? esc(tl(f.name)) : String(i + 1)) + '">' + (f ? '<span class="bb" style="--c:' + f.color + '"></span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="lid" aria-hidden="true"><div class="rib-v"></div><div class="rib-h"></div><svg class="bow" viewBox="0 0 110 70"><path d="M55 35 C30 0 0 8 8 30 C14 46 44 42 55 35 C66 42 96 46 102 30 C110 8 80 0 55 35Z" fill="' + rib + '" stroke="rgba(0,0,0,.25)"/><circle cx="55" cy="35" r="9" fill="' + rib + '" stroke="rgba(0,0,0,.3)"/></svg><div class="brand2">' + esc(M.brand()) + '</div></div></div>' +
      '<p class="hint" aria-live="polite">' + (full ? '✦ ' + t('box_ready') : t('box_fill', box.size - filled)) + '</p></div>' +
      '<div class="panel"><h2 class="h2 serif">' + t('box_title') + '</h2><p class="hint">' + t('box_lead') + '</p>' +
      '<div><p class="lab">' + t('box_size') + '</p><div class="opts">' + s.boxSizes.map(function (n) { return '<button type="button" class="opt' + (n === box.size ? ' on' : '') + '" data-size="' + n + '">' + n + ' ' + t('pcs') + '</button>'; }).join('') + '</div></div>' +
      '<div><p class="lab">' + t('box_flavors') + '</p><div class="palette">' + s.flavors.map(function (f) { return '<button type="button" class="pal" data-fl="' + f.id + '"><span class="bb" style="--c:' + f.color + '"></span>' + esc(tl(f.name)) + '</button>'; }).join('') + '</div></div>' +
      '<div><p class="lab">' + t('box_ribbon') + '</p><div class="opts">' + s.ribbons.map(function (r) { return '<button type="button" class="swatch' + (r.id === box.ribbon ? ' on' : '') + '" data-rib="' + r.id + '" style="background:' + r.color + '" aria-label="' + r.id + '"></button>'; }).join('') + '</div></div>' +
      '<div><p class="lab">' + t('box_pack') + '</p><div class="opts">' + s.packaging.map(function (p) { return '<button type="button" class="opt' + (p.id === box.pack ? ' on' : '') + '" data-pack="' + p.id + '">' + esc(tl(p.name)) + (p.price ? ' +' + M.fmt(p.price) : '') + '</button>'; }).join('') + '</div></div>' +
      '<div class="opts"><button type="button" class="opt" data-rand>🎲 ' + t('box_random') + '</button><button type="button" class="opt" data-clear>↺ ' + t('box_clear') + '</button></div>' +
      '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap"><span class="price-big">' + som(price) + '</span><button type="button" class="cta sm drip" data-addbox' + (full ? '' : ' disabled') + '>' + t('box_add') + '</button></div></div></div>';
    if (!el._bound) { el._bound = true; bindBox(el); }
  };
  function saveBox(re) { M.store('mavi_box', box); if (re !== false) M.renderBox(); }
  function bindBox(el) {
    var drag = null;
    el.addEventListener('click', function (e) {
      var b, s = M.set();
      if (drag && drag.moved) return;
      if ((b = e.target.closest('[data-size]'))) { box.size = +b.dataset.size; saveBox(); }
      else if ((b = e.target.closest('[data-fl]'))) { var i = firstEmpty(); if (i >= 0) { box.cells[i] = b.dataset.fl; saveBox(); closeIfFull(); } }
      else if ((b = e.target.closest('[data-cell]'))) { if (box.cells[+b.dataset.cell]) { box.cells[+b.dataset.cell] = null; saveBox(); } }
      else if ((b = e.target.closest('[data-rib]'))) { box.ribbon = b.dataset.rib; saveBox(); }
      else if ((b = e.target.closest('[data-pack]'))) { box.pack = b.dataset.pack; saveBox(); }
      else if (e.target.closest('[data-rand]')) { box.cells = []; for (var k = 0; k < box.size; k++) box.cells.push(s.flavors[Math.floor(Math.random() * s.flavors.length)].id); saveBox(); closeIfFull(); }
      else if (e.target.closest('[data-clear]')) { box.cells = []; saveBox(); }
      else if ((b = e.target.closest('[data-addbox]'))) {
        M.addLine({ type: 'box', size: box.size, cells: box.cells.slice(0, box.size), ribbon: box.ribbon, pack: box.pack, qty: 1 });
        var r = $('#gbox').getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 30);
        box.cells = []; setTimeout(function () { saveBox(); }, 900);
      }
    });
    function firstEmpty() { for (var i = 0; i < box.size; i++) if (!box.cells[i]) return i; return -1; }
    function closeIfFull() { if (firstEmpty() < 0) { var r = $('#gbox').getBoundingClientRect(); setTimeout(function () { FX.burst(r.left + r.width / 2, r.top + r.height / 3, 24); }, 700); } }
    // drag & drop with pointer events (works with touch)
    el.addEventListener('pointerdown', function (e) {
      var p = e.target.closest('.pal'); if (!p) return;
      drag = { fl: p.dataset.fl, x: e.clientX, y: e.clientY, moved: false, ghost: null, over: null };
      p.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
        drag.moved = true; var f = M.findIn(M.set().flavors, drag.fl);
        drag.ghost = document.createElement('span'); drag.ghost.className = 'bb dragghost'; drag.ghost.style.setProperty('--c', f.color); document.body.appendChild(drag.ghost);
      }
      if (drag.moved) {
        drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
        var under = document.elementFromPoint(e.clientX, e.clientY), c = under && under.closest('.cell');
        if (drag.over && drag.over !== c) drag.over.classList.remove('over');
        if (c) c.classList.add('over'); drag.over = c;
      }
    });
    el.addEventListener('pointerup', function () {
      if (!drag) return;
      var d = drag;
      if (d.ghost) d.ghost.remove();
      if (d.moved && d.over) { box.cells[+d.over.dataset.cell] = d.fl; saveBox(); closeIfFull(); }
      setTimeout(function () { drag = null; }, 0);
    });
  }

  /* ---------------- bar builder ---------------- */
  var bar = M.store('mavi_bar') || { base: 'dark', tops: [], pieces: {} };
  M.renderBar = function () {
    var s = M.set(), el = $('#barApp'), b = M.findIn(s.bars, bar.base) || s.bars[0];
    var price = M.linePrice({ type: 'bar', base: bar.base, tops: bar.tops });
    var pieces = bar.tops.map(function (tid) {
      var tp = M.findIn(s.toppings, tid); if (!tp) return '';
      return (bar.pieces[tid] || []).map(function (p, i) { return topPiece(tp, p, i); }).join('');
    }).join('');
    el.innerHTML = '<div class="builder"><div class="stage2"><div class="mold" id="mold"><div class="stream" id="stream" style="--bc:' + b.color + '"></div>' +
      '<div class="barfill poured" id="barfill" style="--bc:' + b.color + '"></div>' + pieces + '</div>' +
      '<p class="hint">' + bar.tops.map(function (x) { return tl((M.findIn(s.toppings, x) || {}).name); }).join(' · ') + '</p></div>' +
      '<div class="panel"><h2 class="h2 serif gold">' + t('bar_title') + '</h2><p class="hint">' + t('bar_lead', s.maxToppings) + '</p>' +
      '<div><p class="lab">' + t('bar_base') + '</p><div class="opts">' + s.bars.map(function (x) { return '<button type="button" class="opt' + (x.id === bar.base ? ' on' : '') + '" data-base="' + x.id + '"><span class="swatch" style="display:inline-block;width:16px;height:16px;vertical-align:-3px;margin-right:6px;background:' + x.color + '"></span>' + esc(tl(x.name)) + ' · ' + M.fmt(x.price) + '</button>'; }).join('') + '</div></div>' +
      '<div><p class="lab">' + t('bar_tops') + ' (' + bar.tops.length + '/' + s.maxToppings + ')</p><div class="opts">' + s.toppings.map(function (x) { return '<button type="button" class="opt' + (bar.tops.indexOf(x.id) >= 0 ? ' on' : '') + '" data-top="' + x.id + '"><span class="swatch" style="display:inline-block;width:14px;height:14px;vertical-align:-2px;margin-right:6px;background:' + x.color + '"></span>' + esc(tl(x.name)) + ' +' + M.fmt(x.price) + '</button>'; }).join('') + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap"><span class="price-big">' + som(price) + '</span><button type="button" class="cta sm drip" data-addbar' + (bar.tops.length ? '' : ' disabled') + '>' + t('bar_add') + '</button></div>' +
      (bar.tops.length ? '' : '<p class="hint">' + t('bar_need') + '</p>') + '</div></div>';
    if (!el._bound) { el._bound = true; bindBar(el); }
  };
  function topPiece(tp, p, i) {
    var shapes = { pista: '<ellipse rx="9" ry="6" fill="#8fae3e"/><ellipse rx="5" ry="3" fill="#b9cf6a"/>', bodom: '<ellipse rx="6" ry="10" fill="#c98b4c" stroke="#8a5328"/>', malina: '<circle r="7" fill="#c2185b"/><circle cx="-2" cy="-2" r="2" fill="#e57399"/>',
      mayiz: '<ellipse rx="6" ry="4" fill="#5a2a3a"/>', atirgul: '<path d="M0 8 C-8 2 -7 -6 -2 -7 C0 -8 0 -5 0 -4 C0 -5 0 -8 2 -7 C7 -6 8 2 0 8Z" fill="#e58aa6"/>', oltin: '<path d="M-7 -5 L6 -7 L8 4 L-4 7Z" fill="#e6c277" opacity=".9"/>' };
    return '<svg class="topp" viewBox="-12 -12 24 24" style="left:' + p[0] + '%;top:' + p[1] + '%;width:26px;height:26px;margin:-13px;transform:rotate(' + p[2] + 'deg);animation-delay:' + (i * .07) + 's" aria-hidden="true">' + (shapes[tp.id] || '<circle r="6" fill="' + tp.color + '"/>') + '</svg>';
  }
  function bindBar(el) {
    el.addEventListener('click', function (e) {
      var b, s = M.set();
      if ((b = e.target.closest('[data-base]'))) {
        bar.base = b.dataset.base; M.store('mavi_bar', bar); M.renderBar();
        var f = $('#barfill'), st = $('#stream'); f.classList.remove('poured'); void f.offsetWidth; st.classList.add('on'); setTimeout(function () { f.classList.add('poured'); }, 80);
      } else if ((b = e.target.closest('[data-top]'))) {
        var id = b.dataset.top, i = bar.tops.indexOf(id);
        if (i >= 0) { bar.tops.splice(i, 1); delete bar.pieces[id]; }
        else { if (bar.tops.length >= s.maxToppings) { M.toast(t('bar_lead', s.maxToppings), true); return; } bar.tops.push(id); bar.pieces[id] = Array.apply(null, Array(7)).map(function () { return [8 + Math.random() * 84, 10 + Math.random() * 80, Math.random() * 360 | 0]; }); }
        M.store('mavi_bar', bar); M.renderBar();
      } else if (e.target.closest('[data-addbar]')) {
        M.addLine({ type: 'bar', base: bar.base, tops: bar.tops.slice(), qty: 1 });
      }
    });
  }

  /* ---------------- wedding / toy calculator ---------------- */
  var toy = M.store('mavi_toy') || { guests: 150, pack: 'trio', ribbon: 'gold' };
  M.renderToy = function () {
    var s = M.set(), el = $('#toyApp');
    toy.guests = Math.max(s.toyMinGuests, Math.min(3000, toy.guests | 0));
    var each = M.toyEach(toy.pack), total = M.toyTotal(toy.pack, toy.guests), rib = (M.findIn(s.ribbons, toy.ribbon) || s.ribbons[0]).color;
    var shown = Math.min(60, toy.guests), per = Math.ceil(toy.guests / 60);
    el.innerHTML = '<div class="builder"><div class="stage2"><div class="table"><div class="tgrid" id="tgrid">' +
      Array.apply(null, Array(shown)).map(function (_, i) { return '<i class="tb" style="--rib:' + rib + ';animation-delay:' + (i * .012).toFixed(3) + 's"></i>'; }).join('') + '</div>' +
      (per > 1 ? '<p class="tnote">1 ◆ ≈ ' + per + ' ' + t('toy_guests').toLowerCase() + '</p>' : '') + '</div></div>' +
      '<div class="panel"><h2 class="h2 serif">' + t('toy_title') + '</h2><p class="hint">' + t('toy_lead') + '</p>' +
      '<div><p class="lab">' + t('toy_guests') + '</p><div style="display:flex;gap:14px;align-items:center"><input class="numin" type="number" id="tgN" min="' + s.toyMinGuests + '" max="3000" value="' + toy.guests + '"><input class="range" type="range" id="tgR" min="' + s.toyMinGuests + '" max="1000" step="10" value="' + Math.min(1000, toy.guests) + '" aria-label="' + t('toy_guests') + '"></div></div>' +
      '<div><p class="lab">' + t('toy_pack') + '</p><div class="opts">' + s.toyPacks.map(function (p) { return '<button type="button" class="opt' + (p.id === toy.pack ? ' on' : '') + '" data-tp="' + p.id + '">' + esc(tl(p.name)) + '</button>'; }).join('') + '</div></div>' +
      '<div><p class="lab">' + t('box_ribbon') + '</p><div class="opts">' + s.ribbons.map(function (r) { return '<button type="button" class="swatch' + (r.id === toy.ribbon ? ' on' : '') + '" data-trib="' + r.id + '" style="background:' + r.color + '" aria-label="' + r.id + '"></button>'; }).join('') + '</div></div>' +
      '<div class="sumrow"><span>' + t('toy_each') + '</span><b>' + som(each) + '</b></div>' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="price-big" id="toyTot">' + som(total) + '</span>' + (toy.guests >= s.toyDiscountFrom ? '<span class="disc">−' + s.toyDiscount + '%</span>' : '<span class="hint">' + t('toy_disc', s.toyDiscountFrom, s.toyDiscount) + '</span>') + '</div>' +
      '<button type="button" class="cta sm drip" data-addtoy>' + t('toy_add') + '</button></div></div>';
    if (!el._bound) { el._bound = true; bindToy(el); }
  };
  function bindToy(el) {
    var deb;
    el.addEventListener('input', function (e) {
      if (e.target.id === 'tgR' || e.target.id === 'tgN') {
        var v = +e.target.value || 0; toy.guests = v;
        if (e.target.id === 'tgR') $('#tgN').value = v;
        clearTimeout(deb); deb = setTimeout(function () { M.store('mavi_toy', toy); var y = scrollY; M.renderToy(); var n = $('#tgN'); scrollTo(0, y); if (e.target.id === 'tgN') { n.focus(); n.setSelectionRange && 0; } }, e.target.id === 'tgN' ? 600 : 120);
      }
    });
    el.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-tp]'))) { toy.pack = b.dataset.tp; M.store('mavi_toy', toy); M.renderToy(); }
      else if ((b = e.target.closest('[data-trib]'))) { toy.ribbon = b.dataset.trib; M.store('mavi_toy', toy); M.renderToy(); }
      else if (e.target.closest('[data-addtoy]')) {
        var s = M.set(); if (toy.guests < s.toyMinGuests) { M.toast(t('toy_min', s.toyMinGuests), true); return; }
        M.addLine({ type: 'toy', pack: toy.pack, guests: toy.guests, ribbon: toy.ribbon, qty: 1 }); M.openCart();
      }
    });
  }

  /* ---------------- Bloom Club ---------------- */
  M.renderClub = function () {
    var s = M.set();
    $('#clubApp').innerHTML = '<div style="text-align:center"><h2 class="h2 serif gold rv">' + t('club_title') + '</h2><p class="lead2 corm rv">' + t('club_lead') + '</p></div>' +
      '<div class="plans">' + s.clubPlans.map(function (p, i) {
        return '<div class="plan rv' + (i === s.clubPlans.length - 1 ? ' best' : '') + '" style="transition-delay:' + i * .1 + 's"><h3 class="serif gold">' + t('club_m', p.months) + '</h3>' +
          '<div class="pp">' + som(p.price) + '</div><p>' + t('club_box', s.clubBoxSize) + (p.discount ? ' · ' + t('club_save', p.discount) : '') + '</p>' +
          '<button type="button" class="cta sm drip" data-club="' + p.months + '">' + t('club_join') + '</button></div>';
      }).join('') + '</div>';
    FX.observe($('#club'));
    if (!M._clubBound) { M._clubBound = true; $('#clubApp').addEventListener('click', function (e) { var b = e.target.closest('[data-club]'); if (b) { M.addLine({ type: 'club', months: +b.dataset.club, qty: 1 }); M.openCart(); } }); }
  };

  /* ---------------- games: chest, wheel, scratch ---------------- */
  var wheelRot = 0;
  M.renderGames = function () {
    var me = S.me, u = me && me.user, now = M.now(), W = S.cat.wheel;
    var seg = 360 / W.length, cols = ['#0a3a32', '#e6c277', '#145247', '#c94b6d', '#0a3a32', '#e6c277', '#145247', '#c94b6d'];
    var wheel = '<svg class="wheel" id="wheel" viewBox="-110 -110 220 220" style="transform:rotate(' + wheelRot + 'deg)">' + W.map(function (w, i) {
      var a0 = (i * seg - 90) * Math.PI / 180, a1 = ((i + 1) * seg - 90) * Math.PI / 180, am = ((i + .5) * seg - 90);
      var lbl = w.t === 'coins' ? '+' + (w.v >= 1000 ? w.v / 1000 + 'k' : w.v) : '−' + w.v + '%';
      return '<path d="M0 0 L' + (100 * Math.cos(a0)).toFixed(2) + ' ' + (100 * Math.sin(a0)).toFixed(2) + ' A100 100 0 0 1 ' + (100 * Math.cos(a1)).toFixed(2) + ' ' + (100 * Math.sin(a1)).toFixed(2) + 'Z" fill="' + cols[i % cols.length] + '" stroke="#e6c277" stroke-width="1.5"/>' +
        '<text transform="rotate(' + am + ') translate(64 0) rotate(90)" text-anchor="middle" dominant-baseline="middle" font-family="Jost, sans-serif" font-size="13" font-weight="500" fill="' + (i % 2 ? '#2b1a0b' : '#f6e6bb') + '">' + lbl + '</text>';
    }).join('') + '<circle r="104" fill="none" stroke="#c99a45" stroke-width="6"/>' + Array.apply(null, Array(16)).map(function (_, i) { var a = i * 22.5 * Math.PI / 180; return '<circle cx="' + (104 * Math.cos(a)).toFixed(1) + '" cy="' + (104 * Math.sin(a)).toFixed(1) + '" r="3" fill="#fff3c4"/>'; }).join('') +
      '<circle r="18" fill="#e6c277" stroke="#9c7128" stroke-width="3"/><text text-anchor="middle" dominant-baseline="middle" font-family="Playfair Display, serif" font-size="9" fill="#2b1a0b">B&amp;C</text></svg>';
    var chestReady = u && now >= u.nextBonusAt, wheelReady = u && now >= u.nextWheelAt;
    $('#gamesApp').innerHTML = '<div style="text-align:center"><h2 class="h2 serif rv">' + t('gifts_title') + '</h2><p class="lead2 corm rv">' + t('gifts_lead') + '</p></div><div class="row3">' +
      '<div class="game rv"><h3 class="serif">' + t('chest_t') + '</h3><p class="sub2">' + M.fmt(S.cat.settings.bonusMin) + '–' + M.fmt(S.cat.settings.bonusMax) + ' ' + t('som') + '</p>' +
      '<svg class="chest" id="chest" viewBox="0 0 180 150" role="img" aria-label="' + t('chest_t') + '"><defs><linearGradient id="chw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5638"/><stop offset="1" stop-color="#4a2a1a"/></linearGradient><radialGradient id="chg"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient></defs>' +
      '<ellipse class="glow" cx="90" cy="70" rx="80" ry="50" fill="url(#chg)"/><rect x="20" y="70" width="140" height="70" rx="8" fill="url(#chw)" stroke="#e6c277" stroke-width="3"/><rect x="20" y="96" width="140" height="8" fill="#e6c277"/>' +
      '<g class="clid"><path d="M20 72 C20 30 160 30 160 72Z" fill="url(#chw)" stroke="#e6c277" stroke-width="3"/><rect x="80" y="58" width="20" height="22" rx="4" fill="#e6c277"/></g><circle cx="90" cy="112" r="6" fill="#2b1a0b"/></svg>' +
      '<button type="button" class="cta sm drip" data-chest' + (u && !chestReady ? ' disabled' : '') + '>' + (u ? t('chest_open') : t('need_login_play')) + '</button>' +
      (u && !chestReady ? '<small class="hint" data-until="' + u.nextBonusAt + '"></small>' : '') + '<div class="won" id="chestWon"></div></div>' +
      '<div class="game rv"><h3 class="serif">' + t('wheel_t') + '</h3><p class="sub2">' + t('wheel_week') + '</p><div class="wheelw"><svg class="wpin" viewBox="0 0 24 30"><path d="M12 30 L2 6 A10 10 0 1 1 22 6Z" fill="#c94b6d" stroke="#fff" stroke-width="2"/></svg>' + wheel + '</div>' +
      '<button type="button" class="cta sm drip" data-spin' + (u && !wheelReady ? ' disabled' : '') + '>' + (u ? t('wheel_spin') : t('need_login_play')) + '</button>' +
      (u && !wheelReady ? '<small class="hint" data-until="' + u.nextWheelAt + '"></small>' : '') + '<div class="won" id="wheelWon"></div></div>' +
      '<div class="game rv"><h3 class="serif">' + t('scratch_t') + '</h3><p class="sub2">' + (u ? (u.scratches ? t('scratch_have', u.scratches) : t('scratch_none')) : t('scratch_none')) + '</p>' +
      '<div class="scratch" id="scratch"><div class="prize" id="sprize">?</div><canvas id="scv"></canvas></div><p class="hint">' + (u ? (u.scratches ? t('scratch_hint') : '') : t('need_login_play')) + '</p><div class="won" id="scratchWon"></div></div></div>';
    FX.observe($('#sovga'));
    paintScratch(u && u.scratches > 0);
    if (!M._gamesBound) { M._gamesBound = true; $('#gamesApp').addEventListener('click', gamesClick); }
  };
  async function gamesClick(e) {
    if (e.target.closest('[data-chest]') || e.target.closest('#chest')) {
      if (!S.me) { M.login(); return; }
      var btn = $('[data-chest]'); if (btn.disabled) return; btn.disabled = true;
      try {
        var r = await API.call('bonus', {});
        $('#chest').classList.add('open');
        setTimeout(function () { FX.coins($('#chest'), $('#accBtn'), 14); var c = $('#chest').getBoundingClientRect(); FX.burst(c.left + c.width / 2, c.top + 40, 26); }, 500);
        $('#chestWon').innerHTML = '<b>' + t('chest_got', M.som(r.amount)) + '</b>';
        await M.loadMe(); M.$('#accBal').textContent = som(S.me.user.balance);
        setTimeout(M.renderGames, 4500);
      } catch (er) { M.err(er); }
      return;
    }
    if (e.target.closest('[data-spin]')) {
      if (!S.me) { M.login(); return; }
      var sb = $('[data-spin]'); if (sb.disabled) return; sb.disabled = true;
      try {
        var w = await API.call('wheel', {}), seg = 360 / S.cat.wheel.length;
        var target = 360 - (w.index * seg + seg / 2);
        wheelRot = wheelRot - (wheelRot % 360) + 360 * 6 + target;
        $('#wheel').style.transform = 'rotate(' + wheelRot + 'deg)';
        setTimeout(async function () {
          var ww = $('#wheelw') || $('.wheelw'), r = ww.getBoundingClientRect();
          FX.burst(r.left + r.width / 2, r.top + r.height / 2, 40);
          $('#wheelWon').innerHTML = t('you_won') + ': <b>' + (w.t === 'coins' ? t('prize_coins', M.fmt(w.v)) : t('prize_promo', w.v)) + '</b>' + (w.code ? ' <span class="code" data-copy="' + esc(w.code) + '">' + esc(w.code) + '</span>' : '');
          if (w.t === 'coins') FX.coins(ww, $('#accBtn'), 10);
          await M.loadMe(); M.$('#accBal').textContent = som(S.me.user.balance);
        }, 5100);
      } catch (er) { M.err(er); sb.disabled = false; }
    }
  }
  function paintScratch(active) {
    var cv = $('#scv'); if (!cv) return;
    var box = $('#scratch'), r = box.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    var w = r.width || 260, h = r.height || 150;
    cv.width = w * dpr; cv.height = h * dpr;
    var g = cv.getContext('2d'); g.scale(dpr, dpr);
    var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#9c7128'); gr.addColorStop(.3, '#f3d98f'); gr.addColorStop(.5, '#fff3c4'); gr.addColorStop(.7, '#e6c277'); gr.addColorStop(1, '#9c7128');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(90,60,20,.35)'; g.font = '700 22px Playfair Display, Georgia, serif'; g.textAlign = 'center';
    for (var y = 30; y < h; y += 40) for (var x = (y / 40 % 2) * 40; x < w + 40; x += 80) g.fillText('B&C', x, y);
    var started = false, revealed = false, prize = null, down = false;
    var scratchAt = function (e) {
      var rr = cv.getBoundingClientRect(), x = e.clientX - rr.left, y = e.clientY - rr.top;
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
    };
    var check = function () {
      if (revealed || !prize) return;
      var d = g.getImageData(0, 0, cv.width, cv.height).data, n = 0;
      for (var i = 3; i < d.length; i += 64) if (d[i] === 0) n++;
      if (n / (d.length / 64) > .45) {
        revealed = true; cv.style.transition = 'opacity .6s'; cv.style.opacity = 0;
        var rr = box.getBoundingClientRect(); FX.burst(rr.left + rr.width / 2, rr.top + rr.height / 2, 34);
        $('#scratchWon').innerHTML = t('you_won') + ': <b>' + (prize.t === 'coins' ? t('prize_coins', M.fmt(prize.v)) : t('prize_promo', prize.v)) + '</b>' + (prize.code ? ' <span class="code" data-copy="' + esc(prize.code) + '">' + esc(prize.code) + '</span>' : '');
        M.loadMe().then(function () { M.$('#accBal').textContent = som(S.me.user.balance); setTimeout(M.renderGames, 6000); });
      }
    };
    cv.onpointerdown = async function (e) {
      if (!S.me) { M.login(); return; }
      if (!active) return;
      down = true; cv.setPointerCapture(e.pointerId);
      if (!started) {
        started = true;
        try { prize = await API.call('scratch', {}); $('#sprize').innerHTML = (prize.t === 'coins' ? '+' + M.fmt(prize.v) + '<br><small>' + t('som') + '</small>' : '−' + prize.v + '%<br><small>' + esc(prize.code) + '</small>'); }
        catch (er) { M.err(er); active = false; return; }
      }
      scratchAt(e);
    };
    cv.onpointermove = function (e) { if (down && active && prize) { scratchAt(e); } };
    cv.onpointerup = function () { down = false; check(); };
  }

  /* ---------------- experience kits (bon-bon kit, movie-night kit) ---------------- */
  var kitSel = M.store('bc_kits') || {};
  M.renderKits = function () {
    var s = M.set(), el = $('#kitsApp'); if (!el) return;
    var cupSvg = function (color, i) {
      return '<svg viewBox="0 0 60 60" width="54" height="54" aria-hidden="true"><ellipse cx="30" cy="48" rx="22" ry="6" fill="rgba(0,0,0,.12)"/><path d="M8 22 L13 46 C14 50 46 50 47 46 L52 22Z" fill="rgba(255,255,255,.7)" stroke="#d9cbb3"/>' +
        '<ellipse class="cupfill" cx="30" cy="26" rx="20" ry="7" fill="' + color + '" style="animation-delay:' + i * .05 + 's"/><ellipse cx="30" cy="22" rx="22" ry="7" fill="none" stroke="#d9cbb3" stroke-width="1.5"/></svg>';
    };
    el.innerHTML = '<div style="text-align:center"><h2 class="h2 serif rv">' + t('kits_title') + '</h2><p class="lead2 corm rv">' + t('kits_lead') + '</p></div><div class="kits">' +
      s.kits.map(function (k) {
        var sel = kitSel[k.id] = (kitSel[k.id] || []).slice(0, k.cups);
        while (sel.length < k.cups) sel.push(s.cupItems[sel.length % s.cupItems.length].id);
        var price = M.linePrice({ type: 'kit', kit: k.id, cups: sel });
        return '<article class="kit rv"><div class="kph"><img src="' + esc(k.img) + '" alt="' + esc(tl(k.name)) + '" loading="lazy"><span class="kshine"></span></div>' +
          '<div class="kin"><h3 class="serif">' + esc(tl(k.name)) + '</h3><p class="hint">' + esc(tl(k.items)) + '</p>' +
          sel.map(function (cid, i) {
            var it = M.findIn(s.cupItems, cid) || s.cupItems[0];
            return '<div class="cuprow"><div class="cupic">' + cupSvg(it.color, i) + '<small>' + t('cup_n', i + 1) + '</small></div><div class="opts">' +
              s.cupItems.map(function (x) { return '<button type="button" class="opt sm' + (x.id === cid ? ' on' : '') + '" data-kit="' + k.id + '" data-cup="' + i + '" data-item="' + x.id + '"><i class="dot" style="background:' + x.color + '"></i>' + esc(tl(x.name)) + (x.price ? ' +' + M.fmt(x.price / 1000) + 'k' : '') + '</button>'; }).join('') + '</div></div>';
          }).join('') +
          '<div class="kfoot"><span class="price-big">' + som(price) + '</span><button type="button" class="cta sm drip" data-addkit="' + k.id + '">' + t('add') + '</button></div></div></article>';
      }).join('') + '</div>';
    FX.observe(el);
    if (!el._bound) {
      el._bound = true;
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-item]');
        if (b) { kitSel[b.dataset.kit][+b.dataset.cup] = b.dataset.item; M.store('bc_kits', kitSel); var y = scrollY; M.renderKits(); $$('.kit', el).forEach(function (k) { k.classList.add('in'); }); scrollTo(0, y); return; }
        var a = e.target.closest('[data-addkit]');
        if (a) { var card = a.closest('.kit'); M.addLine({ type: 'kit', kit: a.dataset.addkit, cups: kitSel[a.dataset.addkit].slice(), qty: 1 }, card.querySelector('img')); }
      });
    }
  };

  M.setKit = function (kit, cups) { kitSel[kit] = cups.slice(); M.store('bc_kits', kitSel); M.renderKits(); $$('.kit').forEach(function (k) { k.classList.add('in'); }); };
  /* ---------------- bon-bon builder (cross-section) ---------------- */
  var bbSel = Object.assign({ shape: 'dome', color: 'ruby', finish: 'splash', shell: 'dark', l1: 'malina', l2: 'pista', dust: 'malina', qty: 6 }, M.store('bc_bb') || {});
  M.setBonbon = function (o) { Object.assign(bbSel, o); M.store('bc_bb', bbSel); M.renderBonbon('shape'); };
  M.renderBonbon = function (changed) {
    var s = M.set(), b = s.bonbon, el = $('#bonbonApp'); if (!el || !b) return;
    var grp = function (key, list, label) {
      return '<div><p class="lab">' + t(label) + '</p><div class="opts">' + list.map(function (x) {
        return '<button type="button" class="opt' + (x.id === bbSel[key] ? ' on' : '') + '" data-bb="' + key + '" data-v="' + x.id + '"><i class="dot" style="background:' + x.color + '"></i>' + esc(tl(x.name)) + '</button>'; }).join('') + '</div></div>';
    };
    var shapeBtns = '<div><p class="lab">' + t('bb_shape') + '</p><div class="shapes">' + (b.shapes || []).map(function (x) {
      return '<button type="button" class="shp' + (x.id === bbSel.shape ? ' on' : '') + '" data-bb="shape" data-v="' + x.id + '">' + M.bonbonSvg({ shape: x.id, color: bbSel.color, finish: 'gloss', shell: bbSel.shell, dust: 'none' }, 46, 'whole') + '<span>' + esc(tl(x.name)) + '</span></button>'; }).join('') + '</div></div>';
    var colorBtns = '<div><p class="lab">' + t('bb_color') + '</p><div class="opts">' + (b.colors || []).map(function (x) {
      var c = x.color || (M.findIn(b.shells, bbSel.shell) || {}).color;
      return '<button type="button" class="swatch' + (x.id === bbSel.color ? ' on' : '') + '" data-bb="color" data-v="' + x.id + '" style="background:radial-gradient(circle at 35% 30%,#fff 0 8%,' + c + ' 35%)" title="' + esc(tl(x.name)) + '" aria-label="' + esc(tl(x.name)) + '"></button>'; }).join('') + '</div></div>';
    el.innerHTML = '<div class="builder"><div class="stage2"><div class="bbstage' + (changed ? ' pour-' + changed : '') + '"><div class="bbback">' + M.bonbonSvg(bbSel, 150, 'whole') + M.bonbonSvg(bbSel, 150, 'whole') + '</div><div class="bbcut">' + M.bonbonSvg(bbSel, 320, 'cut', true) + '</div></div>' +
      '<p class="hint">' + esc(M.lineSub(Object.assign({ type: 'bonbon' }, bbSel))) + '</p></div>' +
      '<div class="panel"><h2 class="h2 serif gold">' + t('bb_title') + '</h2><p class="hint">' + t('bb_lead') + '</p>' +
      shapeBtns + colorBtns + grp('finish', b.finishes || [], 'bb_finish') + grp('shell', b.shells, 'bb_shell') + grp('l1', b.l1, 'bb_l1') + grp('l2', b.l2, 'bb_l2') + grp('dust', b.dust, 'bb_dust') +
      '<div><p class="lab">' + t('bb_qty') + '</p><div class="qty"><button type="button" data-bq="-1">−</button><b style="min-width:40px;text-align:center">' + bbSel.qty + '</b><button type="button" data-bq="1">+</button><span class="hint">× ' + som(b.price) + '</span></div></div>' +
      '<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap"><span class="price-big">' + som(b.price * bbSel.qty) + '</span><button type="button" class="cta sm drip" data-addbb>' + t('add') + '</button></div></div></div>';
    if (!el._bound) {
      el._bound = true;
      el.addEventListener('click', function (e) {
        var x = e.target.closest('[data-bb]');
        if (x) { bbSel[x.dataset.bb] = x.dataset.v; M.store('bc_bb', bbSel); M.renderBonbon(x.dataset.bb); return; }
        var q = e.target.closest('[data-bq]');
        if (q) { bbSel.qty = Math.max(1, Math.min(50, bbSel.qty + +q.dataset.bq)); M.store('bc_bb', bbSel); M.renderBonbon(); return; }
        if (e.target.closest('[data-addbb]')) { M.addLine({ type: 'bonbon', shape: bbSel.shape, color: bbSel.color, finish: bbSel.finish, shell: bbSel.shell, l1: bbSel.l1, l2: bbSel.l2, dust: bbSel.dust, qty: bbSel.qty }); var r = $('.bbcut', el).getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 24); }
      });
    }
  };
})();
