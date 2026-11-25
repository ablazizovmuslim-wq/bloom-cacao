/* MAVİ — visual effects: loader, ornaments, parallax, stars, seasons, bursts, coins, gold dust */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pref = 'auto'; try { pref = localStorage.getItem('mavi_anim') || 'auto'; } catch (e) {}
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || pref === 'off';
  if (pref === 'off') document.documentElement.classList.add('still');
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var lite = pref === 'lite' || pref === 'off' || (pref !== 'full' && (matchMedia('(max-width: 820px), (pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4));
  var FX = window.FX = { reduce: reduce, lite: lite };
  if (lite) document.documentElement.classList.add('lite');
  /* mobile: fewer falling particles, no blur filters */
  if (lite) Array.prototype.slice.call(document.querySelectorAll('.menu .fall')).forEach(function (f, i) { if (i % 2) f.remove(); else f.style.filter = 'none'; });

  /* loader: show the saved brand name */
  try {
    var BR = localStorage.getItem('bc_brand'), lw = document.querySelector('#loader .lword');
    if (BR && lw && BR !== 'Bloom & Cacao') { var n = 0; lw.innerHTML = BR.split(' ').map(function (w) { return '<span class="wd">' + w.split('').map(function (c) { return '<span class="ld gold" style="--i:' + (n++) + '">' + c.replace(/[<>&]/g, '') + '</span>'; }).join('') + '</span>'; }).join(' '); }
  } catch (e) {}
  /* loader */
  setTimeout(function () { var l = $('#loader'); if (l) l.classList.add('gone'); }, 3700);

  /* ornaments: clone the corner template into every [data-corners] section */
  var POS = [['top:0;left:0', 'none'], ['top:0;right:0', 'scaleX(-1)'], ['bottom:0;left:0', 'scaleY(-1)'], ['bottom:0;right:0', 'scale(-1,-1)']];
  $$('[data-corners]').forEach(function (sec) {
    var tpl = document.getElementById('tpl-' + sec.getAttribute('data-corners'));
    if (!tpl) return;
    (lite ? POS.slice(0, 2) : POS).forEach(function (p, i) {
      var c = document.createElement('div');
      c.className = 'corner'; c.setAttribute('aria-hidden', 'true');
      c.style.cssText = p[0] + ';transform:' + p[1];
      c.innerHTML = '<div class="sc"><div class="orn" style="animation-delay:' + (-i * 1.7) + 's"></div></div>';
      c.querySelector('.orn').appendChild(tpl.content.cloneNode(true));
      sec.insertBefore(c, sec.firstChild);
    });
  });

  /* stars */
  var st = $('#stars');
  if (st) {
    var h = '';
    for (var i = 0; i < (lite ? 28 : 70); i++) {
      var s = Math.random() * 2 + 1;
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 70).toFixed(1) + '%;width:' + s.toFixed(1) + 'px;height:' + s.toFixed(1) +
        'px;animation-delay:' + (-Math.random() * 3).toFixed(1) + 's;animation-duration:' + (2 + Math.random() * 3).toFixed(1) + 's"></i>';
    }
    st.innerHTML = h;
  }

  /* reveal on scroll */
  FX.io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); FX.io.unobserve(en.target); if (en.target._onIn) en.target._onIn(); } });
  }, { threshold: 0.15 });
  FX.observe = function (root) { $$('.rv,.card,.title,.feat', root).forEach(function (e) { if (!e.classList.contains('in')) FX.io.observe(e); }); };

  /* pause animations off screen */
  var heroOn = true;
  var secIO = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      en.target.classList.toggle('off', !en.isIntersecting);
      if (en.target.id === 'top') heroOn = en.isIntersecting;
      if (en.target.id === 'choy' && en.isIntersecting) en.target.classList.add('play');
    });
  }, { rootMargin: '80px' });
  $$('main > section, .ribbon, footer').forEach(function (s) { secIO.observe(s); });

  /* tea steps cycle */
  var stI = 0;
  setInterval(function () {
    var tea = $('#choy'); if (!tea || !tea.classList.contains('play') || tea.classList.contains('off')) return;
    $$('.tea .step').forEach(function (s) { s.classList.toggle('on', +s.dataset.s === stI); }); stI = (stI + 1) % 3;
  }, 2600);

  /* header, progress, parallax, to-top */
  var pars = $$('.par'), ticking = false, lastY = 0;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = scrollY, H = document.documentElement.scrollHeight - innerHeight;
      var tb = $('#topbar'); tb.classList.toggle('solid', y > 40);
      if (lite) { if (y > lastY + 6 && y > 140) tb.classList.add('hide'); else if (y < lastY - 6 || y < 140) tb.classList.remove('hide'); }
      lastY = y;
      $('#prog').style.transform = 'scaleX(' + (H > 0 ? y / H : 0) + ')';
      $('#totop').classList.toggle('show', y > 700);
      if (!reduce && y < innerHeight * 1.3) pars.forEach(function (p) { p.style.translate = '0 ' + (y * +p.dataset.par).toFixed(1) + 'px'; });
      if (FX.onScroll) FX.onScroll(y);
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#totop').addEventListener('click', function () { scrollTo({ top: 0, behavior: 'smooth' }); });

  /* hero tilt + magnetic buttons */
  if (fine && !reduce && !lite) {
    var stage = $('#stage'), hero = $('.hero');
    if (stage && hero) {
      hero.addEventListener('mousemove', function (e) { var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; stage.style.transform = 'rotateY(' + x * 8 + 'deg) rotateX(' + -y * 8 + 'deg)'; });
      hero.addEventListener('mouseleave', function () { stage.style.transform = ''; });
    }
    document.addEventListener('mousemove', function (e) {
      var m = e.target.closest && e.target.closest('.mag'); if (!m) return;
      var r = m.getBoundingClientRect(); m.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * .2 + 'px,' + (e.clientY - r.top - r.height / 2) * .3 + 'px)';
      m.onmouseleave = function () { m.style.transform = ''; };
    });
  }

  /* fx canvas: bursts */
  var fx = $('#fx'), cx = fx.getContext('2d'), W, H, dpr = lite ? 1 : Math.min(2, devicePixelRatio || 1), sp = [], fxOn = false;
  function size() { W = innerWidth; H = innerHeight; fx.width = W * dpr; fx.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); sizeSeason(); }
  FX.burst = function (x, y, n, petals) {
    if (reduce) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, v = Math.random() * 5 + 2; sp.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: 1, r: Math.random() * 3 + 1.5, petal: petals || Math.random() < .35 }); }
    if (!fxOn) { fxOn = true; requestAnimationFrame(loop); }
  };
  function loop() {
    cx.clearRect(0, 0, W, H);
    for (var i = sp.length - 1; i >= 0; i--) {
      var s = sp[i]; s.x += s.vx; s.y += s.vy; s.vy += .08; s.vx *= .98; s.l -= .018;
      if (s.l <= 0) { sp.splice(i, 1); continue; }
      cx.globalAlpha = s.l;
      if (s.petal) { cx.fillStyle = '#e58aa6'; cx.beginPath(); cx.ellipse(s.x, s.y, s.r * 1.6, s.r, s.l * 6, 0, 7); cx.fill(); }
      else { cx.drawImage(sprite, s.x - s.r * 3, s.y - s.r * 3, s.r * 6, s.r * 6); }
    }
    cx.globalAlpha = 1;
    if (sp.length) requestAnimationFrame(loop); else { fxOn = false; cx.clearRect(0, 0, W, H); }
  }
  var sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
  (function () { var g = sprite.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,248,215,1)'); gr.addColorStop(.2, 'rgba(255,222,140,.95)'); gr.addColorStop(.5, 'rgba(240,190,90,.3)'); gr.addColorStop(1, 'rgba(240,190,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); })();

  /* coins flying from a point to an element */
  FX.coins = function (fromEl, toEl, n) {
    if (reduce || !fromEl || !toEl) return;
    var a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    for (var i = 0; i < (n || 10); i++) (function (i) {
      var c = document.createElement('div'); c.className = 'coin'; document.body.appendChild(c);
      var sx = a.left + a.width / 2, sy = a.top + a.height / 2, tx = b.left + b.width / 2, ty = b.top + b.height / 2;
      var mx = (sx + tx) / 2 + (Math.random() - .5) * 200, my = Math.min(sy, ty) - 80 - Math.random() * 120;
      c.animate([{ transform: 'translate(' + sx + 'px,' + sy + 'px) scale(.4)', opacity: 0 },
        { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1.1) rotateY(180deg)', opacity: 1, offset: .5 },
        { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(.5) rotateY(360deg)', opacity: .6 }],
      { duration: 900 + i * 60, delay: i * 50, easing: 'cubic-bezier(.5,0,.5,1)' }).onfinish = function () { c.remove(); };
      c.style.left = '0px'; c.style.top = '0px'; c.style.transform = 'translate(-100px,-100px)';
    })(i);
  };

  /* fly an image into the cart */
  FX.fly = function (img, target, done) {
    if (reduce || !img || !target) { done && done(); return; }
    var r = img.getBoundingClientRect(), t = target.getBoundingClientRect();
    var f = img.cloneNode(); f.style.cssText = 'position:fixed;z-index:110;border-radius:10px;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.4);left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;object-fit:cover';
    document.body.appendChild(f);
    var dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
    f.animate([{ transform: 'none' }, { transform: 'translate(' + dx * .5 + 'px,' + (dy * .5 - 120) + 'px) scale(.6) rotate(-20deg)', offset: .5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.08) rotate(20deg)', opacity: .3 }], { duration: 900, easing: 'cubic-bezier(.5,0,.5,1)' })
      .onfinish = function () { f.remove(); FX.burst(t.left + t.width / 2, t.top + t.height / 2, 16); done && done(); };
  };

  /* hero gold dust */
  var du = $('#dust');
  if (du) {
    var dc = du.getContext('2d'), DW, DH, motes = [], hx = -999, hy = -999;
    var dsize = function () { var r = du.getBoundingClientRect(); DW = r.width; DH = r.height; du.width = DW * dpr; du.height = DH * dpr; dc.setTransform(dpr, 0, 0, dpr, 0, 0); };
    dsize(); addEventListener('resize', dsize);
    for (var k = 0; k < (lite ? 30 : 80); k++) motes.push({ x: Math.random() * DW, y: Math.random() * DH, r: Math.random() * 1.8 + .4, v: Math.random() * .35 + .08, p: Math.random() * 6.28, w: Math.random() * .02 + .005 });
    $('.hero').addEventListener('mousemove', function (e) { var r = du.getBoundingClientRect(); hx = e.clientX - r.left; hy = e.clientY - r.top; });
    (function dl() {
      requestAnimationFrame(dl); if (!heroOn || reduce) return;
      dc.clearRect(0, 0, DW, DH);
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i]; m.y -= m.v; m.p += m.w; m.x += Math.sin(m.p) * .3;
        var dx = m.x - hx, dy = m.y - hy, d = Math.hypot(dx, dy); if (d < 110) { m.x += dx / d * 1.6; m.y += dy / d * 1.6; }
        if (m.y < -10) { m.y = DH + 10; m.x = Math.random() * DW; }
        dc.globalAlpha = .25 + Math.abs(Math.sin(m.p * 3)) * .75; var z = m.r * 7; dc.drawImage(sprite, m.x - z / 2, m.y - z / 2, z, z);
      }
      dc.globalAlpha = 1;
    })();
  }

  /* seasonal effects */
  var sc = $('#season'), sx = sc.getContext('2d'), SW, SH, flakes = [], season = 'off', rockets = [], sparks = [];
  function sizeSeason() { SW = innerWidth; SH = innerHeight; sc.width = SW * dpr; sc.height = SH * dpr; sx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  FX.autoSeason = function (now) {
    var d = new Date((now || Date.now()) + 5 * 3600 * 1000), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    if ((m === 12 && day >= 30) || (m === 1 && day <= 2)) return 'fireworks';
    if (m === 12 || m <= 2) return 'snow';
    if (m <= 5) return 'petals';
    if (m <= 8) return 'sparkle';
    return 'leaves';
  };
  FX.setSeason = function (s) {
    season = reduce ? 'off' : s; flakes = []; rockets = []; sparks = []; sx.clearRect(0, 0, SW || 0, SH || 0);
    var n = { snow: 70, petals: 26, leaves: 22, sparkle: 40, fireworks: 0 }[season] || 0; if (lite) n = Math.round(n * .45);
    for (var i = 0; i < n; i++) flakes.push(newFlake(true));
  };
  var LEAF = ['#c9762b', '#b5541e', '#d9a441', '#8a3b1a'], PET = ['#f4a3bc', '#e58aa6', '#fbd1dc', '#ffffff'];
  function newFlake(any) {
    return { x: Math.random() * SW, y: any ? Math.random() * SH : -20, r: season === 'snow' ? Math.random() * 2.6 + 1 : Math.random() * 6 + 5,
      vy: season === 'snow' ? Math.random() * .8 + .4 : season === 'sparkle' ? -(Math.random() * .3 + .1) : Math.random() * .9 + .5,
      vx: Math.random() * .6 - .3, a: Math.random() * 6.28, va: Math.random() * .04 - .02, p: Math.random() * 6.28,
      c: season === 'leaves' ? LEAF[Math.floor(Math.random() * 4)] : PET[Math.floor(Math.random() * 4)] };
  }
  (function sl() {
    requestAnimationFrame(sl);
    if (season === 'off' || document.hidden) return;
    sx.clearRect(0, 0, SW, SH);
    if (season === 'fireworks') {
      if (Math.random() < .025) rockets.push({ x: SW * (.15 + Math.random() * .7), y: SH, vy: -(7 + Math.random() * 3), t: SH * (.15 + Math.random() * .3), c: ['#e6c277', '#e58aa6', '#7fd3c4', '#fff3c4'][Math.floor(Math.random() * 4)] });
      for (var i = rockets.length - 1; i >= 0; i--) {
        var r = rockets[i]; r.y += r.vy; sx.fillStyle = r.c; sx.fillRect(r.x, r.y, 2, 8);
        if (r.y <= r.t) { for (var k = 0; k < 50; k++) { var a = Math.random() * 6.28, v = Math.random() * 3 + 1; sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, c: r.c }); } rockets.splice(i, 1); }
      }
      for (var j = sparks.length - 1; j >= 0; j--) { var s = sparks[j]; s.x += s.vx; s.y += s.vy; s.vy += .04; s.l -= .012; if (s.l <= 0) { sparks.splice(j, 1); continue; } sx.globalAlpha = s.l; sx.fillStyle = s.c; sx.fillRect(s.x, s.y, 2.2, 2.2); }
      sx.globalAlpha = 1; return;
    }
    for (var q = 0; q < flakes.length; q++) {
      var f = flakes[q]; f.p += .02; f.y += f.vy; f.x += f.vx + Math.sin(f.p) * .5; f.a += f.va;
      if (f.y > SH + 20 || f.y < -30) { var nf = newFlake(false); if (season === 'sparkle') nf.y = SH + 10; flakes[q] = nf; continue; }
      sx.save(); sx.translate(f.x, f.y); sx.rotate(f.a);
      if (season === 'snow') { sx.globalAlpha = .8; sx.fillStyle = '#fff'; sx.beginPath(); sx.arc(0, 0, f.r, 0, 7); sx.fill(); }
      else if (season === 'sparkle') { sx.globalAlpha = .4 + Math.abs(Math.sin(f.p * 2)) * .6; sx.drawImage(sprite, -f.r, -f.r, f.r * 2, f.r * 2); }
      else if (season === 'petals') { sx.globalAlpha = .75; sx.fillStyle = f.c; sx.beginPath(); sx.ellipse(0, 0, f.r, f.r * .6, 0, 0, 7); sx.fill(); }
      else { sx.globalAlpha = .8; sx.fillStyle = f.c; sx.beginPath(); sx.moveTo(0, -f.r); sx.quadraticCurveTo(f.r, 0, 0, f.r); sx.quadraticCurveTo(-f.r, 0, 0, -f.r); sx.fill(); sx.strokeStyle = 'rgba(0,0,0,.25)'; sx.beginPath(); sx.moveTo(0, -f.r); sx.lineTo(0, f.r); sx.stroke(); }
      sx.restore();
    }
  })();

  size(); addEventListener('resize', size);
  FX.$ = $; FX.$$ = $$;
})();
