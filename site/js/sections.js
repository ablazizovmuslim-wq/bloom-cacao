/* Bloom & Cacao — content sections: reviews, workshops, corporate, FAQ, stickers, footer, chat, gift & wishlist pages */
(function () {
  'use strict';
  var M = window.MAVI, t = M.t, tl = M.tl, $ = M.$, $$ = M.$$, esc = M.esc, som = M.som, S = M.state;

  function resizeImg(file, max, cb) {
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', .85));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  M.resizeImg = resizeImg;

  /* ---------------- reviews ---------------- */
  M.renderReviews = function () {
    var r = S.cat.reviews || [];
    $('#reviewsApp').innerHTML = '<div style="text-align:center"><h2 class="h2 serif gold rv">' + t('reviews_title') + '</h2></div>' +
      (r.length ? '<div class="rlist">' + r.map(function (x) {
        return '<div class="rcard rv">' + (x.photo ? '<img src="' + esc(x.photo) + '" alt="" loading="lazy">' : '') + '<div class="stars5" aria-label="' + x.stars + '/5">' + '★★★★★'.slice(0, x.stars) + '<span style="opacity:.25">' + '★★★★★'.slice(x.stars) + '</span></div>' +
          '<p>' + esc(x.text) + '</p><small>— ' + esc(x.name) + ' · ' + new Date(x.at).toLocaleDateString() + '</small></div>';
      }).join('') + '</div>' : '<p class="lead2 corm" style="text-align:center">' + t('reviews_none') + '</p>');
    FX.observe($('#sharhlar'));
  };
  M.reviewForm = function (orderId) {
    var stars = 5, photo = '';
    var b = M.modal('<h2 class="serif">' + t('review_t') + ' #' + orderId + '</h2><div class="stars5" id="rs" style="font-size:34px;cursor:pointer">' +
      [1, 2, 3, 4, 5].map(function (i) { return '<span data-st="' + i + '">★</span>'; }).join('') + '</div>' +
      '<form class="stack" id="rf"><textarea class="ta" name="tx" maxlength="600" placeholder="' + t('review_ph') + '"></textarea>' +
      '<label class="ghost" style="display:grid;place-items:center;cursor:pointer">📷 ' + t('review_photo') + '<input type="file" accept="image/*" hidden id="rph"></label><div id="rpv"></div>' +
      '<button class="order" type="submit">' + t('send') + '</button></form>');
    var paint = function () { $$('#rs span', b).forEach(function (s) { s.style.opacity = +s.dataset.st <= stars ? 1 : .25; }); };
    $('#rs', b).onclick = function (e) { var s = e.target.closest('[data-st]'); if (s) { stars = +s.dataset.st; paint(); } };
    $('#rph', b).onchange = function () { var f = this.files[0]; if (f) resizeImg(f, 900, function (d) { photo = d; $('#rpv', b).innerHTML = '<img src="' + d + '" style="width:100%;border-radius:12px">'; }); };
    $('#rf', b).onsubmit = async function (e) {
      e.preventDefault();
      try { await M.call('review', { order: orderId, stars: stars, text: this.tx.value, photo: photo }); M.closeModal(); M.toast(t('review_thanks')); await M.loadMe(); M.renderAcc(); } catch (er) {}
    };
  };

  /* ---------------- workshops ---------------- */
  M.renderClasses = function () {
    var cl = S.cat.classes || [];
    $('#classesApp').innerHTML = '<div style="text-align:center"><h2 class="h2 serif rv">' + t('cls_title') + '</h2><p class="lead2 corm rv">' + t('cls_lead') + '</p></div>' +
      (cl.length ? '<div class="clist">' + cl.map(function (c) {
        var d = new Date(c.date + 'T00:00:00'), left = c.seats - c.booked;
        return '<div class="ccard rv"><div class="when"><div class="day"><div><b>' + d.getDate() + '</b><br><small>' + d.toLocaleDateString(I18N.lang === 'en' ? 'en' : I18N.lang === 'ru' ? 'ru' : 'uz', { month: 'short' }) + '</small></div></div>' +
          '<div><h3 class="serif">' + esc(tl(c.title)) + '</h3><p>' + esc(c.time) + ' · ' + esc(c.place) + '</p></div></div>' +
          '<p><b>' + som(c.price) + '</b> · ' + (left > 0 ? t('cls_seats', left) : t('cls_full')) + '</p>' +
          '<button type="button" class="cta sm drip" data-book="' + c.id + '"' + (left > 0 ? '' : ' disabled') + '>' + t('cls_book') + '</button></div>';
      }).join('') + '</div>' : '<p class="hint" style="text-align:center">' + t('cls_none') + '</p>');
    FX.observe($('#master'));
    if (!M._clsBound) { M._clsBound = true; $('#classesApp').addEventListener('click', function (e) { var b = e.target.closest('[data-book]'); if (b) book(+b.dataset.book); }); }
  };
  function book(id) {
    var c = S.cat.classes.find(function (x) { return x.id === id; }), u = S.me && S.me.user;
    var b = M.modal('<h2 class="serif">' + esc(tl(c.title)) + '</h2><p>' + esc(c.date) + ' ' + esc(c.time) + ' · ' + esc(c.place) + ' · ' + som(c.price) + '</p>' +
      '<form class="stack" id="bf"><label class="field">' + t('f_name') + '<input name="n" value="' + esc(u ? u.name : '') + '" required></label>' +
      '<label class="field">' + t('f_phone') + '<input name="p" type="tel" value="' + esc(u ? u.phone : '') + '" placeholder="+998" required></label>' +
      '<label class="field">' + t('seats') + '<input name="s" type="number" min="1" max="' + Math.min(10, c.seats - c.booked) + '" value="1"></label>' +
      '<button class="order" type="submit">' + t('cls_book') + '</button></form>');
    $('#bf', b).onsubmit = async function (e) {
      e.preventDefault();
      try { await M.call('book', { cls: id, name: this.n.value, phone: this.p.value, seats: +this.s.value }); M.closeModal(); M.toast(t('cls_done')); await M.refresh(); } catch (er) {}
    };
  }

  /* ---------------- corporate ---------------- */
  M.renderCorp = function () {
    var logo = M._corpLogo || '';
    $('#corpApp').innerHTML = '<div class="split"><div><h2 class="h2 serif gold rv">' + t('corp_title') + '</h2><p class="lead2 corm rv">' + t('corp_lead') + '</p>' +
      '<div class="gbox rv"><svg viewBox="0 0 400 400" aria-hidden="true"><defs><linearGradient id="cbx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b3423"/><stop offset="1" stop-color="#24130b"/></linearGradient><linearGradient id="crb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c7128"/><stop offset=".5" stop-color="#fff0bd"/><stop offset="1" stop-color="#9c7128"/></linearGradient></defs>' +
      '<ellipse cx="200" cy="370" rx="160" ry="14" fill="#000" opacity=".3"/><g class="floaty"><rect x="50" y="150" width="300" height="210" rx="14" fill="url(#cbx)" stroke="#c99a45" stroke-width="2"/><rect x="40" y="120" width="320" height="50" rx="10" fill="url(#cbx)" stroke="#c99a45" stroke-width="2"/>' +
      '<rect x="188" y="120" width="24" height="240" fill="url(#crb)"/><path d="M200 120 C170 82 140 92 150 112 C156 124 186 122 200 120 C214 122 244 124 250 112 C260 92 230 82 200 120Z" fill="url(#crb)"/>' +
      '<rect x="105" y="205" width="190" height="96" rx="10" fill="#fffaf0" opacity=".92"/></g></svg><div class="logo-on" id="logoOn">' + (logo ? '<img src="' + logo + '" alt="">' : '<span style="color:#8a6a3e;font-family:Playfair Display,serif;font-size:20px">LOGO</span>') + '</div></div></div>' +
      '<form id="corpF" class="rv" novalidate><label class="field full">' + t('f_company') + ' *<input name="company" required></label>' +
      '<label class="field">' + t('f_name') + '<input name="name"></label><label class="field">' + t('f_phone') + ' *<input name="phone" type="tel" placeholder="+998" required></label>' +
      '<label class="field">' + t('f_qty') + '<input name="qty" type="number" min="1"></label><label class="field">' + t('f_budget') + '<input name="budget"></label>' +
      '<label class="field">' + t('f_date') + '<input name="date" type="date"></label><label class="field">' + t('f_logo') + '<input name="logo" type="file" accept="image/*"></label>' +
      '<label class="field full">' + t('f_comment') + '<textarea name="comment"></textarea></label><button class="order full drip" type="submit" style="grid-column:1/-1">' + t('corp_send') + '</button></form></div>';
    FX.observe($('#korporativ'));
    var f = $('#corpF');
    f.logo.onchange = function () { var fl = this.files[0]; if (fl) resizeImg(fl, 600, function (d) { M._corpLogo = d; $('#logoOn').innerHTML = '<img src="' + d + '" alt="" style="animation:pop2 .6s both">'; }); };
    f.onsubmit = async function (e) {
      e.preventDefault();
      try {
        await M.call('lead', { company: f.company.value, name: f.name.value, phone: f.phone.value, qty: +f.qty.value, budget: f.budget.value, date: f.date.value, comment: f.comment.value, logo: M._corpLogo || '' });
        f.reset(); M._corpLogo = ''; M.toast(t('corp_done')); var r = f.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, 30);
      } catch (er) {}
    };
  };

  /* ---------------- FAQ + stickers ---------------- */
  var STICKERS = [
    '<svg viewBox="0 0 120 120"><circle cx="60" cy="64" r="44" fill="#c2185b"/><circle cx="44" cy="48" r="10" fill="#fff" opacity=".5"/><circle cx="46" cy="66" r="5" fill="#2b1a0b"/><circle cx="74" cy="66" r="5" fill="#2b1a0b"/><path d="M48 80 Q60 92 72 80" stroke="#2b1a0b" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="38" cy="78" r="6" fill="#ff8fae" opacity=".7"/><circle cx="82" cy="78" r="6" fill="#ff8fae" opacity=".7"/></svg>',
    '<svg viewBox="0 0 120 120"><path d="M60 108 C30 90 14 64 20 44 C26 24 50 22 60 40 C70 22 94 24 100 44 C106 64 90 90 60 108Z" fill="#4a2a1a"/><path d="M40 44 C44 38 52 38 56 44" stroke="#e6c277" stroke-width="4" fill="none"/><text x="60" y="78" text-anchor="middle" font-family="Playfair Display,serif" font-size="16" fill="#f3d98f">Rahmat</text></svg>',
    '<svg viewBox="0 0 120 120"><ellipse cx="60" cy="74" rx="40" ry="32" fill="#bfe8dc" opacity=".5" stroke="#fff" stroke-width="3"/><circle cx="60" cy="74" r="16" fill="#f39bb4"/><circle cx="60" cy="74" r="7" fill="#f7d36b"/><path d="M94 66 C112 62 112 88 94 86" fill="none" stroke="#fff" stroke-width="5"/><path d="M50 38 C44 28 54 22 48 12 M70 38 C64 28 74 22 68 12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/></svg>',
    '<svg viewBox="0 0 120 120"><rect x="16" y="50" width="88" height="56" rx="8" fill="#5b3423" stroke="#e6c277" stroke-width="3"/><rect x="10" y="36" width="100" height="20" rx="6" fill="#5b3423" stroke="#e6c277" stroke-width="3"/><rect x="54" y="36" width="12" height="70" fill="#e6c277"/><path d="M60 36 C46 18 30 22 36 32 C40 40 54 38 60 36 C66 38 80 40 84 32 C90 22 74 18 60 36Z" fill="#e6c277"/></svg>',
    '<svg viewBox="0 0 120 120"><g fill="none" stroke="#e6c277" stroke-width="4" stroke-linecap="round"><path d="M60 100 C54 76 54 46 60 20 C66 46 66 76 60 100Z" fill="#e6c277" fill-opacity=".25"/><path d="M56 100 C40 82 30 62 26 38 C46 48 56 70 58 96"/><path d="M64 100 C80 82 90 62 94 38 C74 48 64 70 62 96"/><path d="M24 104 H96"/></g><circle cx="26" cy="32" r="4" fill="#e6c277"/><circle cx="94" cy="32" r="4" fill="#e6c277"/></svg>',
    '<svg viewBox="0 0 120 120"><ellipse cx="60" cy="60" rx="34" ry="22" fill="#d9c29b" stroke="#a98a5c" stroke-width="3" transform="rotate(-20 60 60)"/><path d="M32 66 Q60 36 88 56 Q60 78 32 66Z" fill="#8fae3e" transform="rotate(-20 60 60)"/><circle cx="52" cy="58" r="3" fill="#2b1a0b"/><circle cx="68" cy="52" r="3" fill="#2b1a0b"/><path d="M54 68 Q62 72 70 64" stroke="#2b1a0b" stroke-width="3" fill="none"/></svg>'
  ];
  M.STICKERS = STICKERS;
  M.renderFaq = function () {
    var s = M.set(), list = I18N.faq().concat((s.faq || []).map(function (f) { return { q: tl(f.q), a: tl(f.a) }; }));
    $('#faqApp').innerHTML = '<div style="text-align:center"><h2 class="h2 serif rv">' + t('faq_title') + '</h2></div><div class="faqgrid"><div>' +
      list.map(function (q, i) { return '<div class="qa rv"><button type="button" aria-expanded="false" data-qa="' + i + '">' + esc(q.q) + '<i aria-hidden="true">+</i></button><div class="ans"><div><p>' + esc(q.a) + '</p></div></div></div>'; }).join('') + '</div>' +
      '<div class="game rv"><h3 class="serif">' + t('stickers_t') + '</h3><p class="hint">' + t('stickers_p') + '</p><div class="stk">' + STICKERS.join('') + '</div>' +
      (s.stickers ? '<a class="cta sm drip" href="' + esc(s.stickers) + '" target="_blank" rel="noopener">' + t('stickers_add') + '</a>' : '<span class="hint">' + t('stickers_soon') + '</span>') +
      '<button type="button" class="cta sm" data-chat style="margin-top:8px">💬 ' + t('chat_t') + '</button></div></div>';
    FX.observe($('#faq'));
    if (!M._faqBound) {
      M._faqBound = true;
      $('#faqApp').addEventListener('click', function (e) {
        var b = e.target.closest('[data-qa]'); if (b) { var q = b.parentNode, o = !q.classList.contains('open'); q.classList.toggle('open', o); b.setAttribute('aria-expanded', o); }
        if (e.target.closest('[data-chat]')) openChat('human');
      });
    }
  };

  /* ---------------- footer ---------------- */
  M.renderFooter = function () {
    var s = M.set(), ig = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
      tg = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M21 4 L3 11 L9.5 13.5 L18 7 L11 15 L11 20 L14 16.5 L18 19.5 Z"/></svg>';
    var link = function (u, base) { if (!u) return '#'; if (/^https?:/.test(u)) return u; return base + u.replace(/^@/, ''); };
    $('#footApp').innerHTML = '<div style="display:flex;align-items:center;gap:14px">' + document.getElementById('tpl-crown').innerHTML + '<span class="serif gold" style="font-size:34px;font-weight:700;letter-spacing:.03em">' + esc(M.brand()) + '</span></div>' +
      '<div class="ci">' + (s.phone || s.address ? (s.phone ? '<a href="tel:' + esc(s.phone.replace(/\s/g, '')) + '">' + esc(s.phone) + '</a>' : '') + (s.address ? '<p>' + esc(s.address) + '</p>' : '') : '<p>' + t('contacts_soon') + '</p>') + '</div>' +
      '<div class="soc"><a href="' + esc(link(s.instagram, 'https://instagram.com/')) + '" target="_blank" rel="noopener" aria-label="Instagram">' + ig + '</a><a href="' + esc(link(s.telegram || s.channel, 'https://t.me/')) + '" target="_blank" rel="noopener" aria-label="Telegram">' + tg + '</a></div>';
  };

  /* ---------------- chat panel: AI seller, AI box maker, human manager ---------------- */
  var guest = M.store('mavi_guest'); if (!guest) { guest = Math.random().toString(36).slice(2, 12); M.store('mavi_guest', guest); }
  var chatTimer = null, lastN = -1, tab = 'sell', aiLog = { sell: [], craft: [] };
  function openChat(which) {
    if (which) tab = which;
    $('#chat').hidden = false; $('#chatDot').hidden = true;
    $$('.ctabs [data-ct]').forEach(function (b) { b.classList.toggle('on', b.dataset.ct === tab); });
    clearInterval(chatTimer); lastN = -1;
    if (tab === 'human') { loadChat(); chatTimer = setInterval(loadChat, 5000); } else paintAI();
    paintSug();
    setTimeout(function () { $('#chatIn').focus(); }, 100);
  }
  function closeChat() { $('#chat').hidden = true; clearInterval(chatTimer); }
  function paintSug() {
    var list = tab === 'human' ? [] : t(tab === 'sell' ? 'ai_sug_sell' : 'ai_sug_craft');
    $('#chatSug').innerHTML = list.map(function (x) { return '<button type="button" class="chip" data-sug="' + esc(x) + '">' + esc(x) + '</button>'; }).join('');
  }
  async function loadChat() {
    try { var r = await API.call('chatGet', { guest: guest }); paintHuman(r.msgs); } catch (e) {}
  }
  function paintHuman(msgs) {
    var l = $('#chatL'); if (msgs.length === lastN) return;
    l.innerHTML = '<div class="msg a">' + t('chat_hello') + '</div>' + msgs.map(function (m) { return '<div class="msg ' + (m.from === 'user' ? 'u' : 'a') + '">' + esc(m.text) + '</div>'; }).join('');
    l.scrollTop = l.scrollHeight; lastN = msgs.length;
  }
  function aiCard(r) {
    var s = M.set();
    if (r.kind === 'faq') return '';
    if (r.kind === 'products') {
      var items = (r.items || []).map(M.prod).filter(Boolean);
      if (!items.length) return '';
      return '<div class="aires" style="justify-content:flex-start">' + items.map(function (p) {
        return '<div class="mini"><img src="' + esc(p.img) + '" alt=""><b>' + esc(tl(p.name)) + '</b><span>' + som(p.dealPrice) + '</span><button type="button" class="ghost" data-aiadd="' + p.id + '" style="width:100%;margin-top:6px;font-size:13px;min-height:38px">' + t('add') + '</button></div>';
      }).join('') + '</div>';
    }
    if (r.kind === 'bonbon') {
      var o = r.bonbon;
      return '<div class="aidesign"><div class="aibb">' + M.bonbonSvg(o, 110, 'whole') + M.bonbonSvg(o, 130, 'cut') + '</div><p>' + esc(M.lineSub(Object.assign({ type: 'bonbon' }, o))) + ' × ' + o.qty + '</p>' +
        '<b>' + som(s.bonbon.price * o.qty) + '</b><div class="acts"><button type="button" class="ghost" data-aiopen="bonbon">' + t('ai_open') + '</button><button type="button" class="order" data-aiaddbb>' + t('add') + '</button></div></div>';
    }
    if (r.kind === 'kit') {
      var k = M.findIn(s.kits, r.kit.kit); if (!k) return '';
      return '<div class="aidesign"><img src="' + esc(k.img) + '" alt="" style="width:100%;border-radius:12px"><p><b>' + esc(tl(k.name)) + '</b><br>' + esc(M.lineSub({ type: 'kit', kit: k.id, cups: r.kit.cups })) + '</p>' +
        '<b>' + som(M.linePrice({ type: 'kit', kit: k.id, cups: r.kit.cups })) + '</b><div class="acts"><button type="button" class="ghost" data-aiopen="kit">' + t('ai_open') + '</button><button type="button" class="order" data-aiaddkit>' + t('add') + '</button></div></div>';
    }
    return '';
  }
  function aiText(r) {
    if (r.text) return esc(r.text).replace(/\n/g, '<br>');
    if (r.kind === 'faq') { var f = I18N.faq()[r.idx]; return f ? '<b>' + esc(f.q) + '</b><br>' + esc(f.a) : ''; }
    if (r.kind === 'products') return (r.items || []).length ? t('ai_found', som(r.sum)) : t('err_generic');
    if (r.kind === 'bonbon') return t('ai_design');
    if (r.kind === 'kit') return t('ai_kit');
    return '';
  }
  function paintAI() {
    var l = $('#chatL'), log = aiLog[tab];
    l.innerHTML = '<div class="msg a">' + t(tab === 'sell' ? 'ai_hello_sell' : 'ai_hello_craft') + '</div>' + log.map(function (m, i) {
      if (m.from === 'user') return '<div class="msg u">' + esc(m.text) + '</div>';
      if (m.typing) return '<div class="msg a typing">' + t('ai_thinking') + '</div>';
      return '<div class="msg a ai" data-i="' + i + '">' + aiText(m.r) + aiCard(m.r) + (m.audio ? '<button type="button" class="vplay" data-vplay="' + esc(m.audio) + '">▶ ' + t('voice_play') + '</button>' : '') + '</div>';
    }).join('');
    l.scrollTop = l.scrollHeight;
  }
  async function askAI(text) {
    var log = aiLog[tab], mode = tab;
    log.push({ from: 'user', text: text }); log.push({ from: 'ai', typing: true }); paintAI();
    var hist = log.filter(function (m) { return !m.typing; }).slice(-10).map(function (m) { return { role: m.from === 'user' ? 'user' : 'assistant', text: m.from === 'user' ? m.text : (m.r && (m.r.text || m.r.kind)) || '' }; });
    var r;
    try { r = await API.call('ai', { mode: mode, text: text, history: hist, lang: I18N.lang }); await new Promise(function (ok) { setTimeout(ok, 500); }); }
    catch (e) { r = { kind: 'none', text: t('err_generic') }; }
    log.pop(); log.push({ from: 'ai', r: r });
    if (tab === mode) paintAI();
    if (r.kind === 'bonbon' || r.kind === 'kit') { var lr = $('#chatL').getBoundingClientRect(); FX.burst(lr.left + lr.width / 2, lr.bottom - 120, 18); }
  }
  $('#chatL').addEventListener('click', function (e) {
    var a, m, r;
    if ((a = e.target.closest('[data-aiadd]'))) { M.addLine({ type: 'product', id: a.dataset.aiadd, qty: 1 }, a.parentNode.querySelector('img')); return; }
    m = e.target.closest('.msg.ai'); if (!m) return; r = aiLog[tab][+m.dataset.i].r;
    if (e.target.closest('[data-aiaddbb]')) M.addLine(Object.assign({ type: 'bonbon' }, r.bonbon));
    else if (e.target.closest('[data-aiaddkit]')) M.addLine({ type: 'kit', kit: r.kit.kit, cups: r.kit.cups.slice(), qty: 1 });
    else if (e.target.closest('[data-aiopen=bonbon]')) { M.setBonbon(r.bonbon); closeChat(); document.getElementById('bonbon').scrollIntoView({ behavior: 'smooth' }); }
    else if (e.target.closest('[data-aiopen=kit]')) { M.setKit(r.kit.kit, r.kit.cups); closeChat(); document.getElementById('bokslar').scrollIntoView({ behavior: 'smooth' }); }
  });
  $('#chatSug').addEventListener('click', function (e) { var b = e.target.closest('[data-sug]'); if (b) send(b.dataset.sug); });
  $$('.ctabs [data-ct]').forEach(function (b) { b.addEventListener('click', function () { openChat(b.dataset.ct); }); });
  $('#chatBtn').addEventListener('click', function () { if ($('#chat').hidden) openChat(); else closeChat(); });
  $('#chatX').addEventListener('click', closeChat);
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-openai]'); if (b) openChat(b.dataset.openai); });
  async function send(v) {
    if (tab !== 'human') { askAI(v); return; }
    try {
      var r = await API.call('chatSend', { guest: guest, text: v, name: S.me ? S.me.user.name : '' });
      lastN = -1; paintHuman(r.msgs);
      if (API.mode === 'demo' && r.msgs.length === 1) setTimeout(function () { var l = $('#chatL'); l.insertAdjacentHTML('beforeend', '<div class="msg a">' + t('chat_auto') + '</div>'); l.scrollTop = l.scrollHeight; }, 900);
    } catch (er) { M.err(er); }
  }
  /* ---- voice: record -> 16 kHz mono WAV -> server (Aisha STT) -> AI -> spoken answer ---- */
  var rec = null, recTimer = null, player = null;
  function wavFrom(buf) {
    var rate = 16000, ch = buf.getChannelData(0), ratio = buf.sampleRate / rate, n = Math.floor(ch.length / ratio);
    var dv = new DataView(new ArrayBuffer(44 + n * 2)), w = function (o, str) { for (var i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var x = Math.max(-1, Math.min(1, ch[Math.floor(i * ratio)])); dv.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    return new Blob([dv], { type: 'audio/wav' });
  }
  function dataUrl(blob) { return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(blob); }); }
  function play(src) { try { if (player) player.pause(); player = new Audio(src); player.play().catch(function () {}); } catch (e) {} }
  async function stopRec() {
    if (!rec) return; var r = rec; rec = null; clearTimeout(recTimer);
    $('#chatMic').classList.remove('on'); $('#chatIn').placeholder = t('chat_ph');
    r.mr.stop();
  }
  async function onVoice(blob, mode) {
    var log = mode === 'human' ? null : aiLog[mode];
    if (log) { log.push({ from: 'user', text: '🎤 …' }); log.push({ from: 'ai', typing: true }); paintAI(); }
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var buf = await ctx.decodeAudioData(await blob.arrayBuffer()); ctx.close && ctx.close();
      if (buf.duration < 0.6) throw new Error('short');
      var hist = log ? log.filter(function (m) { return !m.typing && m.text !== '🎤 …'; }).slice(-10).map(function (m) { return { role: m.from === 'user' ? 'user' : 'assistant', text: m.from === 'user' ? m.text : (m.r && (m.r.text || m.r.kind)) || '' }; }) : [];
      var res = await API.call('voice', { audio: await dataUrl(wavFrom(buf)), mode: mode, history: hist, lang: I18N.lang });
      if (!log) { send(res.transcript); return; }
      log.splice(log.length - 2, 2, { from: 'user', text: '🎤 ' + res.transcript }, { from: 'ai', r: res.r, audio: res.audio });
      if (tab === mode) paintAI();
      if (res.audio) play(res.audio);
    } catch (e) {
      if (log) { log.splice(log.length - 2, 2); if (tab === mode) paintAI(); }
      M.toast(t('voice_err'), true);
    }
  }
  $('#chatMic').addEventListener('click', async function () {
    if (rec) return stopRec();
    if (API.mode === 'demo' || (API.config && API.config.voice === false)) return M.toast(t('voice_demo'));
    if (!navigator.mediaDevices || !window.MediaRecorder) return M.toast(t('voice_nomic'), true);
    var stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return M.toast(t('voice_nomic'), true); }
    var chunks = [], mr = new MediaRecorder(stream), mode = tab;
    mr.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
    mr.onstop = function () { stream.getTracks().forEach(function (tr) { tr.stop(); }); if (chunks.length) onVoice(new Blob(chunks, { type: mr.mimeType }), mode); };
    mr.start(); rec = { mr: mr };
    this.classList.add('on'); $('#chatIn').placeholder = t('voice_rec');
    recTimer = setTimeout(stopRec, 30000);
  });
  // mic shows only when the server has a voice key (AISHA_API_KEY)
  $('#chatMic').hidden = true; API.ready.then(function () { $('#chatMic').hidden = !(API.config && API.config.voice); });
  $('#chatL').addEventListener('click', function (e) { var b = e.target.closest('[data-vplay]'); if (b) play(b.dataset.vplay); });
  $('#chatF').addEventListener('submit', function (e) { e.preventDefault(); var i = $('#chatIn'), v = i.value.trim(); if (!v) return; i.value = ''; send(v); });
  M.openChat = openChat;

  /* ---------------- gift page (#gift-CODE) ---------------- */
  var DES = { cream: '#fffaf0', rose: '#fde4ea', mint: '#e3f3ec', gold: '#f8eccb', night: '#e9e4f5' };
  M.giftView = async function (code) {
    var g;
    try { g = await API.call('giftView', { code: code }); } catch (e) { M.err(e); return; }
    var b = M.modal('<div class="giftview"><h2 class="serif gold" style="font-size:34px">' + t('gift_for', esc(g.to)) + '</h2>' +
      '<p>' + (g.from ? t('gift_from', esc(g.from)) : t('gift_secret')) + '</p>' +
      '<svg class="gv-box" id="gvb" viewBox="0 0 220 200" role="button" aria-label="' + t('gift_open') + '"><defs><linearGradient id="gvx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b3423"/><stop offset="1" stop-color="#24130b"/></linearGradient><linearGradient id="gvr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c7128"/><stop offset=".5" stop-color="#fff0bd"/><stop offset="1" stop-color="#9c7128"/></linearGradient></defs>' +
      '<rect x="30" y="90" width="160" height="100" rx="8" fill="url(#gvx)" stroke="#c99a45" stroke-width="2"/><rect x="98" y="90" width="24" height="100" fill="url(#gvr)"/>' +
      '<g class="glid"><rect x="20" y="66" width="180" height="30" rx="6" fill="url(#gvx)" stroke="#c99a45" stroke-width="2"/><rect x="98" y="66" width="24" height="30" fill="url(#gvr)"/><path d="M110 66 C86 36 62 44 70 60 C76 70 100 68 110 66 C120 68 144 70 150 60 C158 44 134 36 110 66Z" fill="url(#gvr)"/></g></svg>' +
      '<button type="button" class="cta sm drip" id="gvOpen" style="margin-top:10px">' + t('gift_open') + '</button><div id="gvIn"></div></div>', true);
    var open = async function () {
      if ($('#gvb').classList.contains('open')) return;
      $('#gvb').classList.add('open'); $('#gvOpen').remove();
      var r = $('#gvb').getBoundingClientRect();
      for (var k = 0; k < 4; k++) setTimeout(function () { FX.burst(r.left + r.width / 2, r.top + 40, 34, Math.random() < .5); }, k * 180);
      $('#gvIn').innerHTML = (g.text ? '<div class="gv-letter" style="--cardbg:' + (DES[g.design] || DES.cream) + '">' + esc(g.text) + '</div>' : '') +
        (g.voice ? '<p><b>🎙 ' + t('gift_voice') + '</b></p><audio controls autoplay src="' + esc(g.voice) + '" style="width:100%"></audio>' : '') +
        (g.thanks ? '<p class="hint">❤ «' + esc(g.thanks) + '»</p>' : '<form class="stack" id="gvF"><textarea class="ta" name="tx" maxlength="300" placeholder="' + t('gift_thanks_ph') + '"></textarea><button class="order" type="submit">' + t('gift_thanks') + '</button></form>');
      try { await API.call('giftThanks', { code: code }); } catch (e) {}
      var f = $('#gvF');
      if (f) f.onsubmit = async function (e) { e.preventDefault(); try { await M.call('giftThanks', { code: code, text: this.tx.value }); f.outerHTML = '<p class="hint">' + t('gift_sent') + '</p>'; FX.burst(innerWidth / 2, innerHeight / 2, 30, true); } catch (er) {} };
    };
    $('#gvb').onclick = open; $('#gvOpen').onclick = open;
    M._modalClose = function () { history.replaceState(null, '', location.pathname); };
  };

  /* ---------------- chocolate passport (#pass-CODE, from the QR on the box) ---------------- */
  M.passView = async function (code) {
    var p;
    try { p = await API.call('passport', { code: code }); } catch (e) { M.err(e); return; }
    var d = new Date(p.made), made = ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
    var items = p.lines.map(function (l) {
      return '<li><span class="pth">' + M.lineThumb(l) + '</span><span><b>' + esc(M.lineName(l)) + '</b><small>' + esc(M.lineSub(l) || '') + '</small></span><em>× ' + l.qty + '</em></li>';
    }).join('');
    var stars = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-st="' + n + '" aria-label="' + n + '">★</button>'; }).join('');
    M.modal('<div class="passv"><div class="pv-top"><span class="pv-seal">' + document.getElementById('tpl-crown').innerHTML + '</span><p class="pv-brand serif gold">' + esc(p.brand) + '</p><h2 class="serif">' + t('pass_title') + '</h2>' +
      '<p class="hint">' + t('pass_order', p.id) + (p.first ? ' · ' + t('pass_for', esc(p.first)) : '') + '</p></div>' +
      '<div class="pv-meta"><div><small>' + t('pass_made') + '</small><b>' + made + '</b></div>' + (p.maker ? '<div><small>' + t('pass_maker') + '</small><b>' + esc(p.maker) + '</b></div>' : '') + '</div>' +
      (p.photos.length ? '<h4>📸 ' + t('pass_photos') + '</h4><div class="ophs big">' + p.photos.map(function (u) { return '<img src="' + esc(u) + '" alt="">'; }).join('') + '</div>' : '') +
      '<h4>🍫 ' + t('pass_inside') + '</h4><ul class="pv-list">' + items + '</ul>' +
      (p.engrave ? '<p>✍ ' + t('pass_engr') + ': <b>' + esc(p.engrave) + '</b></p>' : '') +
      (p.storage ? '<h4>❄ ' + t('pass_store') + '</h4><p class="pv-store">' + esc(p.storage) + '</p>' : '') +
      '<div class="pv-rate" id="pvRate">' + (p.rated ? '<p class="hint">' + t('pass_rated') + '</p>' :
        '<h4>' + t('pass_rate') + '</h4><div class="pv-stars" id="pvStars">' + stars + '</div><form class="stack" id="pvF" hidden><textarea class="ta" name="tx" maxlength="600" placeholder="' + t('pass_rate_ph') + '"></textarea><button class="order" type="submit">' + t('pass_send') + '</button></form>') + '</div></div>', true);
    var chosen = 0, sw = $('#pvStars');
    if (sw) sw.onclick = function (e) {
      var b = e.target.closest('[data-st]'); if (!b) return; chosen = +b.dataset.st;
      $$('#pvStars button').forEach(function (x) { x.classList.toggle('on', +x.dataset.st <= chosen); });
      $('#pvF').hidden = false;
    };
    var f = $('#pvF');
    if (f) f.onsubmit = async function (e) {
      e.preventDefault(); if (!chosen) return;
      try { await M.call('passportRate', { code: code, stars: chosen, text: this.tx.value }); $('#pvRate').innerHTML = '<p class="hint">' + t('pass_thanks') + '</p>'; FX.burst(innerWidth / 2, innerHeight / 2, 30, true); } catch (er) {}
    };
    M._modalClose = function () { if (/^#pass-/.test(location.hash)) history.replaceState(null, '', location.pathname); };
  };

  /* ---------------- wishlist page (#wish-code) ---------------- */
  M.wishView = async function (code) {
    var w;
    try { w = await API.call('wishView', { code: code }); } catch (e) { M.err(e); return; }
    var items = w.items.map(M.prod).filter(Boolean);
    var b = M.modal('<h2 class="serif">' + t('wish_of', esc(w.name)) + '</h2>' + (w.note ? '<p>' + esc(w.note) + '</p>' : '') +
      '<div class="aires" style="justify-content:flex-start">' + items.map(function (p, i) {
        return '<div class="mini" style="animation-delay:' + i * .1 + 's"><img src="' + esc(p.img) + '" alt=""><b>' + esc(tl(p.name)) + '</b><span>' + som(p.dealPrice) + '</span><button type="button" class="ghost" data-wg="' + p.id + '" style="width:100%;margin-top:8px;font-size:13px">🎁 ' + t('wish_gift') + '</button></div>';
      }).join('') + '</div>', true);
    b.addEventListener('click', function (e) {
      var g = e.target.closest('[data-wg]'); if (!g) return;
      M.addLine({ type: 'product', id: g.dataset.wg, qty: 1 });
      S.co = S.co || null; M.closeModal();
      setTimeout(function () { if (!S.co) M.openCart(); S.co.gift = { on: true, to: w.name, phone: '', secret: false }; S.coStep = 1; M.renderCart(); M.drawer('cartD', true); }, 50);
    });
    M._modalClose = function () { history.replaceState(null, '', location.pathname); };
  };
})();
