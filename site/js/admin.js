/* Bloom & Cacao — admin panel (Uzbek) */
(function () {
  'use strict';
  var app = document.getElementById('app'), D = null, tab = 'orders', ofilter = 'active';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var som = function (n) { return fmt(n) + ' soʻm'; };
  var dt = function (ms) { return ms ? new Date(ms).toLocaleString('uz') : ''; };
  var ST = { new: 'Yangi', accepted: 'Tayyorlanmoqda', on_way: 'Yoʻlda', delivered: 'Yetkazildi', cancelled: 'Bekor' };
  var DN = { andijon_sh: 'Andijon shahri', andijon_t: 'Andijon tumani', asaka: 'Asaka', baliqchi: 'Baliqchi', boz: 'Boʻz', buloqboshi: 'Buloqboshi', izboskan: 'Izboskan', jalaquduq: 'Jalaquduq', xojaobod: 'Xoʻjaobod', qorgontepa: 'Qoʻrgʻontepa', marhamat: 'Marhamat', oltinkol: 'Oltinkoʻl', paxtaobod: 'Paxtaobod', shahrixon: 'Shahrixon', ulugnor: 'Ulugʻnor', xonobod: 'Xonobod shahri' };
  var HOL = { newyear: 'Yangi yil', women: '8-mart', navruz: 'Navroʻz', independence: 'Mustaqillik kuni', teachers: 'Ustozlar kuni' };
  function toast(m, err) { var d = document.createElement('div'); d.className = 'toast' + (err ? ' err' : ''); d.textContent = m; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  async function call(r, b) { try { return await API.call(r, b); } catch (e) { toast('Xatolik: ' + (e.code || e.message), true); throw e; } }
  async function load() { D = await call('admin.data', {}); render(); }

  async function start() {
    await API.ready;
    if (!API.adminLoggedIn()) return loginView();
    try { await load(); } catch (e) { API.adminLogout(); loginView(); }
    setInterval(function () { if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; load().catch(function () {}); }, 20000);
  }
  function loginView() {
    app.innerHTML = '<div class="login card"><h2>Bloom & Cacao admin</h2>' + (API.mode === 'demo' ? '<p class="demo">Namuna rejimi: parol — <b>mavi</b>. Maʼlumotlar shu brauzerda saqlanadi.</p>' : '') +
      '<form id="lf"><input type="password" name="p" placeholder="Parol" autocomplete="current-password"><br><br><button class="btn pri" style="width:100%">Kirish</button></form></div>';
    document.getElementById('lf').onsubmit = async function (e) {
      e.preventDefault();
      try { await API.adminLogin(this.p.value); await load(); } catch (er) { toast('Parol notoʻgʻri', true); }
    };
  }
  var TABS = [['orders', 'Buyurtmalar'], ['products', 'Mahsulotlar'], ['topups', 'Toʻldirishlar'], ['users', 'Mijozlar'], ['reviews', 'Sharhlar'], ['promos', 'Promokodlar'],
    ['chat', 'Chat'], ['classes', 'Master-klass'], ['leads', 'Korporativ'], ['settings', 'Sozlamalar']];
  function badge(k) {
    if (k === 'orders') return D.orders.filter(function (o) { return o.status === 'new'; }).length;
    if (k === 'topups') return D.topups.filter(function (o) { return o.status === 'pending'; }).length;
    if (k === 'reviews') return D.reviews.filter(function (o) { return o.status === 'pending'; }).length;
    if (k === 'chat') return D.chats.filter(function (c) { return c.unread; }).length;
    if (k === 'leads') return D.leads.filter(function (c) { return c.status === 'new'; }).length;
    return 0;
  }
  function render() {
    var y = scrollY;
    app.innerHTML = '<header><b>' + esc(D.settings.brand || 'Bloom & Cacao') + '</b><nav>' + TABS.map(function (x) { var n = badge(x[0]); return '<button data-tab="' + x[0] + '" class="' + (tab === x[0] ? 'on' : '') + '">' + x[1] + (n ? '<i>' + n + '</i>' : '') + '</button>'; }).join('') +
      '</nav><a class="btn" href="index.html" style="text-decoration:none;display:inline-flex;align-items:center">Sayt</a><button class="btn" data-out>Chiqish</button></header><main>' +
      (API.mode === 'demo' ? '<p class="demo">Namuna rejimi: oʻzgarishlar faqat shu brauzerda. Sayt serverga qoʻyilgach, hammasi Telegram bilan birga ishlaydi.</p>' : '') + views[tab]() + '</main>';
    scrollTo(0, y);
  }
  /* ---- order photo: shrink -> upload -> customer gets it in Telegram ---- */
  app.addEventListener('change', function (e) {
    var inp = e.target.closest('[data-ophoto]'); if (!inp || !inp.files[0]) return;
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = async function () {
        var k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try {
          var up = await API.upload(c.toDataURL('image/jpeg', .86));
          await call('admin.orderPhoto', { id: +inp.dataset.ophoto, url: up.url });
          toast(API.mode === 'demo' ? 'Surat qoʻshildi ✓ (serverda mijozga Telegram orqali boradi)' : 'Surat mijozga Telegram orqali yuborildi ✓');
          await load();
        } catch (er) {}
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(inp.files[0]);
  });
  /* ---- QR sticker: "chocolate passport" for the box ---- */
  function qrSticker(o) {
    if (!o) return;
    var base = (API.mode === 'demo' ? location.href.replace(/admin\.html.*$/, 'index.html') : location.origin + '/'), url = base + '#pass-' + o.pass;
    var q = qrcode(0, 'M'); q.addData(url); q.make();
    var svg = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    var brand = esc(D.settings.brand || 'Bloom & Cacao');
    var one = '<div class="stk"><div class="stk-b">' + brand + '</div><div class="stk-q">' + svg + '</div><div class="stk-t">Shokolad pasporti</div><div class="stk-s">Skanerlang — ichida nima borligini koʻring 🤍</div><div class="stk-n">#' + o.id + '</div></div>';
    var w = document.createElement('div'); w.id = 'printArea';
    w.innerHTML = '<div class="pa-bar"><b>QR stiker — buyurtma #' + o.id + '</b><span><button class="btn pri" data-pa="print">🖨 Chop etish</button> <button class="btn" data-pa="close">Yopish</button></span></div>' +
      '<p class="muted pa-hint">Stikerni boks ustiga yopishtiring. Mijoz telefon kamerasi bilan skanerlasa, «Shokolad pasporti» ochiladi. Havola: <a href="' + esc(url) + '" target="_blank">' + esc(url) + '</a></p>' +
      '<div class="pa-sheet">' + one + one + one + one + '</div>';
    document.body.appendChild(w);
    w.addEventListener('click', function (ev) { var b = ev.target.closest('[data-pa]'); if (!b) return; if (b.dataset.pa === 'print') window.print(); else w.remove(); });
  }
  app.addEventListener('click', async function (e) {
    var b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; render(); return; }
    if (e.target.closest('[data-out]')) { API.adminLogout(); loginView(); return; }
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.dataset.act, id = a.dataset.id;
    try {
      if (act === 'status') { await call('admin.status', { id: +id, status: a.dataset.s }); }
      else if (act === 'ophotoDel') { await call('admin.orderPhoto', { id: +id, remove: +a.dataset.i }); }
      else if (act === 'qr') { qrSticker(D.orders.find(function (o) { return o.id === +id; })); return; }
      else if (act === 'postPreview' || act === 'postNow') {
        var pv = document.getElementById('postPv');
        if (act === 'postNow' && API.mode === 'demo') { toast('Kanalga joylash sayt serverga qoʻyilgach ishlaydi'); act = 'postPreview'; }
        var r = await call(act === 'postNow' ? 'admin.postNow' : 'admin.postPreview', { url: location.origin });
        pv.style.display = 'block'; pv.textContent = (r && r.text) || '';
        if (act === 'postNow') toast(r && r.ok ? 'Kanalga joylandi ✓' : 'Joylab boʻlmadi: botni kanalga admin qiling', !(r && r.ok));
        return;
      }
      else if (act === 'ofilter') { ofilter = a.dataset.f; render(); return; }
      else if (act === 'topup') { await call('admin.topup', { id: +id, ok: a.dataset.ok === '1' }); }
      else if (act === 'review') { await call('admin.review', { id: +id, ok: a.dataset.ok === '1' }); }
      else if (act === 'promoDel') { if (!confirmBox(a)) return; await call('admin.promoDelete', { code: id }); }
      else if (act === 'prodDel') { if (!confirmBox(a)) return; await call('admin.productDelete', { id: id }); }
      else if (act === 'prodEdit') { editProduct(id); return; }
      else if (act === 'prodNew') { editProduct(null); return; }
      else if (act === 'classDel') { if (!confirmBox(a)) return; await call('admin.classDelete', { id: +id }); }
      else if (act === 'lead') { await call('admin.lead', { id: +id, status: 'done' }); }
      else return;
      await load(); toast('Saqlandi ✓');
    } catch (er) {}
  });
  function confirmBox(a) { if (a.dataset.sure) return true; a.dataset.sure = '1'; a.textContent = 'Aniqmi? Yana bosing'; return false; }

  function lineText(l) {
    var s = D.settings, nm = function (list, id) { var x = list.find(function (y) { return y.id === id; }); return x ? (x.name ? x.name.uz : id) : id; };
    if (l.type === 'box') return 'Boks ' + l.size + ' ta (' + nm(s.packaging, l.pack) + ', lenta: ' + l.ribbon + '): ' + l.cells.map(function (c) { return nm(s.flavors, c); }).join(', ');
    if (l.type === 'bar') return 'Plitka: ' + nm(s.bars, l.base) + ' + ' + l.tops.map(function (c) { return nm(s.toppings, c); }).join(', ');
    if (l.type === 'toy') return 'TOʻY: ' + l.guests + ' mehmon, ' + nm(s.toyPacks, l.pack) + ', lenta: ' + l.ribbon;
    if (l.type === 'club') return 'Club: ' + l.months + ' oy';
    if (l.type === 'kit') return 'BOKS ' + nm(s.kits, l.kit) + ' — idishchalar: ' + l.cups.map(function (c) { return nm(s.cupItems, c); }).join(', ');
    if (l.type === 'bonbon') { var b = s.bonbon; return 'Bon-bon: ' + nm(b.shapes || [], l.shape) + ', ' + nm(b.colors || [], l.color) + ' rang, ' + nm(b.finishes || [], l.finish) + ' bezak, ' + nm(b.shells, l.shell) + ' qobiq, ' + nm(b.l1, l.l1) + ' + ' + nm(b.l2, l.l2) + ', ustiga ' + nm(b.dust, l.dust); }
    return (l.name ? l.name.uz : l.id) + (l.deal ? ' (kun shokoladi)' : '');
  }
  var views = {
    orders: function () {
      var f = { active: function (o) { return o.status !== 'delivered' && o.status !== 'cancelled'; }, all: function () { return true; }, delivered: function (o) { return o.status === 'delivered'; }, cancelled: function (o) { return o.status === 'cancelled'; } }[ofilter];
      var list = D.orders.filter(f);
      return '<h2>Buyurtmalar</h2><div class="row" style="justify-content:flex-start;margin-bottom:12px">' + [['active', 'Faol'], ['all', 'Hammasi'], ['delivered', 'Yetkazilgan'], ['cancelled', 'Bekor']].map(function (x) { return '<button class="btn' + (ofilter === x[0] ? ' on' : '') + '" data-act="ofilter" data-f="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
        (list.map(function (o) {
          var next = { new: [['accepted', 'Qabul qilish'], ['cancelled', 'Bekor']], accepted: [['on_way', 'Yoʻlga chiqdi'], ['cancelled', 'Bekor']], on_way: [['delivered', 'Yetkazildi'], ['cancelled', 'Bekor']] }[o.status] || [];
          return '<div class="card"><div class="row"><b>#' + o.id + ' · ' + esc(o.name) + ' · <a href="tel:' + esc(o.phone) + '">' + esc(o.phone) + '</a></b><span class="st ' + o.status + '">' + ST[o.status] + '</span></div>' +
            '<div class="muted">' + dt(o.created) + ' · Sana: <b>' + o.date + '</b> ' + esc(o.time) + (o.preorder ? ' · OLDINDAN' : '') + ' · ' + DN[o.district] + ', ' + esc(o.address) + '</div>' +
            (o.gift ? '<div>🎁 Sovgʻa: <b>' + esc(o.gift.to) + '</b> ' + esc(o.gift.phone) + (o.gift.secret ? ' (kimdanligi sir)' : '') + (o.gift.opened ? ' · ochildi ✓' + (o.gift.thanks ? ' «' + esc(o.gift.thanks) + '»' : '') : '') + '</div>' : '') +
            '<ul class="lines">' + o.lines.map(function (l) { return '<li>' + esc(lineText(l)) + ' × ' + l.qty + ' = ' + som(l.sum) + '</li>'; }).join('') + '</ul>' +
            (o.engrave ? '<div>✍ Shokoladga ism: <b>' + esc(o.engrave) + '</b></div>' : '') +
            (o.card && o.card.text ? '<div>💌 Tabriknoma (' + esc(o.card.design) + '): «' + esc(o.card.text) + '»</div>' : '') +
            (o.card && o.card.voice ? '<div>🎙 <audio controls src="' + esc(o.card.voice) + '"></audio></div>' : '') +
            (o.comment ? '<div>💬 ' + esc(o.comment) + '</div>' : '') +
            '<div class="muted">Mahsulotlar ' + som(o.items) + (o.discount ? ' · chegirma −' + som(o.discount) + ' (' + esc(o.promo) + ')' : '') + (o.extras ? ' · qoʻshimcha ' + som(o.extras) : '') + ' · yetkazish ' + som(o.delivery) + (o.wallet ? ' · hamyondan −' + som(o.wallet) : '') + '</div>' +
            '<div class="ophotos">' + (o.photos || []).map(function (u, i) { return '<span><img src="' + esc(u) + '" alt=""><button type="button" data-act="ophotoDel" data-id="' + o.id + '" data-i="' + i + '" title="Oʻchirish">×</button></span>'; }).join('') +
            '<label class="btn">📸 Tayyor boks surati<input type="file" accept="image/*" hidden data-ophoto="' + o.id + '"></label>' +
            '<button class="btn" data-act="qr" data-id="' + o.id + '">🏷 QR stiker</button></div>' +
            '<div class="row"><b>Toʻlanadi: ' + som(o.toPay) + ' (' + (o.pay === 'card' ? 'karta' : 'naqd') + ')</b><div style="display:flex;gap:6px;flex-wrap:wrap">' + next.map(function (n) { return '<button class="btn' + (n[0] === 'cancelled' ? ' red' : ' pri') + '" data-act="status" data-id="' + o.id + '" data-s="' + n[0] + '">' + n[1] + '</button>'; }).join('') + '</div></div></div>';
        }).join('') || '<p class="muted">Buyurtma yoʻq</p>');
    },
    products: function () {
      return '<div class="row"><h2>Mahsulotlar</h2><button class="btn pri" data-act="prodNew">+ Yangi mahsulot</button></div><p class="muted">“Bugunga qoldi” har kuni yarim tunda “kunlik miqdor”ga qaytadi. Kun shokoladi: ' + esc((D.products.find(function (p) { return p.id === D.dealId; }) || { name: { uz: '—' } }).name.uz) + '</p><div id="pform"></div>' +
        D.products.map(function (p) {
          return '<div class="card row"><div style="display:flex;gap:12px;align-items:center"><img class="thumb" src="' + esc(p.img) + '" alt=""><div><b>' + esc(p.name.uz) + '</b>' + (p.active ? '' : ' <span class="st cancelled">yashirin</span>') + (p.holiday ? ' <span class="st">' + esc(HOL[p.holiday] || p.holiday) + '</span>' : '') + (p.dropAt ? ' <span class="st new">drop: ' + dt(p.dropAt) + '</span>' : '') +
            '<div class="muted">' + som(p.price) + ' · bugun ' + p.left + '/' + p.total + '</div></div></div><div style="display:flex;gap:6px"><button class="btn" data-act="prodEdit" data-id="' + p.id + '">Tahrirlash</button><button class="btn red" data-act="prodDel" data-id="' + p.id + '">Oʻchirish</button></div></div>';
        }).join('');
    },
    topups: function () {
      return '<h2>Hamyon toʻldirish soʻrovlari</h2><p class="muted">Pul kartaga tushganini tekshirib, keyin tasdiqlang.</p>' + (D.topups.map(function (t) {
        var u = D.users.find(function (x) { return x.id === t.user; }) || {};
        return '<div class="card row"><div><b>' + som(t.amount) + '</b> — ' + esc(u.name) + ' ' + esc(u.phone || '') + '<div class="muted">' + dt(t.at) + '</div></div>' +
          (t.status === 'pending' ? '<div style="display:flex;gap:6px"><button class="btn pri" data-act="topup" data-id="' + t.id + '" data-ok="1">Tasdiqlash</button><button class="btn red" data-act="topup" data-id="' + t.id + '" data-ok="0">Rad etish</button></div>' : '<span class="st ' + (t.status === 'done' ? 'delivered' : 'cancelled') + '">' + (t.status === 'done' ? 'Tasdiqlangan' : 'Rad etilgan') + '</span>') + '</div>';
      }).join('') || '<p class="muted">Soʻrov yoʻq</p>');
    },
    users: function () {
      return '<h2>Mijozlar (' + D.users.length + ')</h2><div class="card"><table><tr><th>Ism</th><th>Telefon</th><th>Daraja</th><th class="n">Xarid</th><th class="n">Balans</th><th></th></tr>' + D.users.map(function (u) {
        return '<tr><td>' + esc(u.name) + (u.username ? ' @' + esc(u.username) : '') + '</td><td>' + esc(u.phone) + '</td><td>' + u.level.id + '</td><td class="n">' + fmt(u.spent) + '</td><td class="n"><b>' + fmt(u.balance) + '</b></td>' +
          '<td><form class="adj" data-u="' + u.id + '" style="display:flex;gap:4px"><input name="a" type="number" placeholder="±summa" style="width:110px;min-height:32px"><button class="btn">OK</button></form></td></tr>';
      }).join('') + '</table></div>';
    },
    reviews: function () {
      return '<h2>Sharhlar</h2>' + (D.reviews.map(function (r) {
        return '<div class="card"><div class="row"><b>' + '★★★★★'.slice(0, r.stars) + ' ' + esc(r.name) + ' · #' + r.order + '</b><span class="st ' + (r.status === 'approved' ? 'delivered' : r.status === 'rejected' ? 'cancelled' : 'new') + '">' + r.status + '</span></div>' +
          (r.photo ? '<img src="' + esc(r.photo) + '" style="max-width:220px;border-radius:12px;margin:8px 0">' : '') + '<p>' + esc(r.text) + '</p>' +
          (r.status === 'pending' ? '<button class="btn pri" data-act="review" data-id="' + r.id + '" data-ok="1">Chiqarish</button> <button class="btn red" data-act="review" data-id="' + r.id + '" data-ok="0">Yashirish</button>' : '') + '</div>';
      }).join('') || '<p class="muted">Sharh yoʻq</p>');
    },
    promos: function () {
      var h = D.settings.holidayPromo;
      return '<h2>Promokodlar</h2><form class="card g2" id="promoF"><label>Kod<input name="code" required placeholder="MAVI20"></label><label>Turi<select name="kind"><option value="percent">Foiz %</option><option value="amount">Summa</option></select></label>' +
        '<label>Qiymat<input name="value" type="number" required></label><label>Muddat (gacha)<input name="until" type="date"></label><label>Necha marta (0 = cheksiz)<input name="maxUses" type="number" value="0"></label><label>Izoh<input name="note"></label><button class="btn pri">Yaratish</button></form>' +
        '<p class="muted">Bayram promokodi: <b>' + esc(h.code) + '</b> −' + h.percent + '%, bayramdan ' + h.daysBefore + ' kun oldin ishlaydi (' + (h.on ? 'yoqilgan' : 'oʻchirilgan') + ') — Sozlamalarda oʻzgartiriladi.</p>' +
        '<div class="card"><table><tr><th>Kod</th><th>Chegirma</th><th>Ishlatilgan</th><th>Muddat</th><th>Kimga</th><th></th></tr>' + D.promos.map(function (p) {
          var u = p.user ? (D.users.find(function (x) { return x.id === p.user; }) || {}).name : 'hammaga';
          return '<tr><td><b>' + esc(p.code) + '</b></td><td>' + (p.kind === 'percent' ? p.value + '%' : som(p.value)) + '</td><td>' + p.used + (p.maxUses ? '/' + p.maxUses : '') + '</td><td>' + (p.until ? new Date(p.until).toLocaleDateString('uz') : '—') + '</td><td>' + esc(u) + ' <span class="muted">' + esc(p.note) + '</span></td><td><button class="btn red" data-act="promoDel" data-id="' + esc(p.code) + '">×</button></td></tr>';
        }).join('') + '</table></div>';
    },
    chat: function () {
      return '<h2>Chat</h2>' + (D.chats.map(function (c) {
        return '<div class="card"><b>' + esc(c.name) + '</b> <span class="muted">' + dt(c.at) + '</span><div class="msgs">' + c.msgs.map(function (m) { return '<div class="m ' + (m.from === 'admin' ? 'a' : '') + '">' + esc(m.text) + '</div>'; }).join('') + '</div>' +
          '<form class="reply" data-c="' + c.id + '" style="display:flex;gap:6px"><input name="t" placeholder="Javob…"><button class="btn pri">Yuborish</button></form></div>';
      }).join('') || '<p class="muted">Xabar yoʻq</p>');
    },
    classes: function () {
      return '<h2>Master-klasslar</h2><form class="card g2" id="clsF"><label>Nomi (uz)<input name="uz" required></label><label>Nomi (ru)<input name="ru"></label><label>Nomi (en)<input name="en"></label>' +
        '<label>Sana<input name="date" type="date" required></label><label>Vaqt<input name="time" type="time"></label><label>Joy<input name="place"></label><label>Narx<input name="price" type="number"></label><label>Joylar soni<input name="seats" type="number" value="10"></label><button class="btn pri">Qoʻshish</button></form>' +
        D.classes.map(function (c) {
          var bk = D.bookings.filter(function (b) { return b.cls === c.id; });
          return '<div class="card"><div class="row"><b>' + esc(c.title.uz) + ' · ' + c.date + ' ' + esc(c.time) + '</b><button class="btn red" data-act="classDel" data-id="' + c.id + '">Oʻchirish</button></div><div class="muted">' + esc(c.place) + ' · ' + som(c.price) + ' · band: ' + c.booked + '/' + c.seats + '</div>' +
            (bk.length ? '<ul class="lines">' + bk.map(function (b) { return '<li>' + esc(b.name) + ' · ' + esc(b.phone) + ' · ' + b.seats + ' joy</li>'; }).join('') + '</ul>' : '') + '</div>';
        }).join('');
    },
    leads: function () {
      return '<h2>Korporativ soʻrovlar</h2>' + (D.leads.map(function (l) {
        return '<div class="card"><div class="row"><b>' + esc(l.company) + ' · ' + esc(l.name) + ' · <a href="tel:' + esc(l.phone) + '">' + esc(l.phone) + '</a></b><span class="st ' + (l.status === 'done' ? 'delivered' : 'new') + '">' + (l.status === 'done' ? 'Bajarildi' : 'Yangi') + '</span></div>' +
          '<div class="muted">' + dt(l.at) + ' · ' + (l.qty || '?') + ' ta · budjet: ' + esc(l.budget) + ' · sana: ' + esc(l.date) + '</div>' + (l.comment ? '<p>' + esc(l.comment) + '</p>' : '') +
          (l.logo ? '<img src="' + esc(l.logo) + '" style="max-width:160px;max-height:90px;background:#fff;padding:6px;border-radius:8px">' : '') + (l.status !== 'done' ? '<div><button class="btn pri" data-act="lead" data-id="' + l.id + '">Bajarildi</button></div>' : '') + '</div>';
      }).join('') || '<p class="muted">Soʻrov yoʻq</p>');
    },
    settings: function () {
      var yn = function (k, lab, on) { return '<label>' + lab + '<select name="' + k + '"><option value="1"' + (on ? ' selected' : '') + '>Yoqilgan</option><option value="0"' + (on ? '' : ' selected') + '>Oʻchiq</option></select></label>'; };
      var s = D.settings, inp = function (k, lab, type) { return '<label>' + lab + '<input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(s[k]) + '"></label>'; };
      var dealOpts = '<option value="">Avtomatik (har kuni boshqa)</option>' + D.products.map(function (p) { return '<option value="' + p.id + '"' + (s.dealPin === p.id ? ' selected' : '') + '>' + esc(p.name.uz) + '</option>'; }).join('');
      return '<h2>Sozlamalar</h2><form id="setF">' +
        '<div class="card"><h3>Brend</h3><label>Doʻkon nomi (butun saytda chiqadi)<input name="brand" value="' + esc(s.brand || 'Bloom & Cacao') + '"></label></div>' +
        '<div class="card"><h3>🏷 Shokolad pasporti (QR)</h3><p class="muted">Boksdagi QR skanerlansa chiqadigan sahifa uchun.</p><div class="g2"><label>Kim tayyorlaydi (ixtiyoriy, masalan «Dilnoza opa»)<input name="maker" maxlength="40" value="' + esc(s.maker || '') + '"></label><label>Saqlash boʻyicha maslahat<textarea name="storage" maxlength="400" rows="3">' + esc(s.storage || '') + '</textarea></label></div></div>' +
        '<div class="card"><h3>🤖 AI agentlar</h3><p class="muted">Ular faqat sayt serverga qoʻyilgach ishlaydi (bot tokeni va ANTHROPIC_API_KEY kerak). Pul bilan bogʻliq ishlar — toʻlovni tasdiqlash, qaytarish — doim sizda qoladi.</p><div class="g2">' +
        yn('ag_sales', 'Telegram sotuv agenti — mijozlar bilan 24/7 gaplashadi, buyurtma qabul qilib sizga yuboradi', (s.agents || {}).sales) +
        yn('ag_auto', 'Kanal agenti — har kuni ertalab kanalga «bugungi menyu» posti', (s.agents || {}).autopost) +
        '<label>Post vaqti (Toshkent, soat)<input name="ag_hour" type="number" min="5" max="22" value="' + ((s.agents || {}).postHour || 9) + '"></label></div>' +
        '<div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-act="postPreview">👁 Postni koʻrish</button><button type="button" class="btn pri" data-act="postNow">📣 Hozir kanalga joylash</button></div><pre id="postPv" class="muted" style="font-family:inherit;white-space:pre-wrap;display:none;margin-top:10px;background:rgba(0,0,0,.04);padding:12px;border-radius:10px"></pre></div>' +
        '<div class="card"><h3>Tajriba bokslari</h3>' + (s.kits || []).map(function (k) { return '<div class="g2" style="margin-bottom:10px"><label>Nomi (uz)<input name="kn_' + k.id + '" value="' + esc(k.name.uz) + '"></label><label>Narx<input name="kp_' + k.id + '" type="number" value="' + k.price + '"></label><label style="grid-column:1/-1">Ichida nima bor (uz)<input name="ki_' + k.id + '" value="' + esc(k.items.uz) + '"></label></div>'; }).join('') +
        '<p class="muted">Idishchalarga solinadiganlar (qoʻshimcha narx):</p><div class="g2">' + (s.cupItems || []).map(function (c) { return '<label>' + esc(c.name.uz) + '<input name="cu_' + c.id + '" type="number" value="' + c.price + '"></label>'; }).join('') +
        '<label>Yangi: nomi<input name="nc_name" placeholder="Masalan: Kokos"></label><label>Yangi: narx<input name="nc_price" type="number" value="0"></label><label>Yangi: rang<input name="nc_color" type="color" value="#c98a3c"></label></div>' +
        '<div class="g2" style="margin-top:10px"><label>Bitta bon-bon narxi (konstruktor)<input name="bonbonPrice" type="number" value="' + (s.bonbon ? s.bonbon.price : 0) + '"></label></div></div>' +
        '<div class="card"><h3>Aloqa va karta</h3><div class="g2">' + inp('cardNumber', 'Karta raqami (hamyon toʻldirish uchun)') + inp('cardOwner', 'Karta egasi') + inp('phone', 'Telefon') + inp('address', 'Manzil') + inp('instagram', 'Instagram (@nom yoki havola)') + inp('telegram', 'Telegram (@nom)') + inp('channel', 'Telegram kanal (@kanal)') + inp('stickers', 'Stikerlar havolasi (t.me/addstickers/...)') + '</div></div>' +
        '<div class="card"><h3>Keshbek, bonus, narxlar</h3><div class="g2">' + inp('cashbackPercent', 'Keshbek %', 'number') + inp('bonusMin', 'Kunlik bonus min', 'number') + inp('bonusMax', 'Kunlik bonus max', 'number') + inp('piecePrice', 'Bitta bon-bon narxi (boks/toʻy uchun)', 'number') +
        inp('engravePrice', 'Shokoladga ism yozish narxi', 'number') + inp('dealPercent', 'Kun shokoladi chegirmasi %', 'number') + '<label>Kun shokoladi<select name="dealPin">' + dealOpts + '</select></label>' + inp('birthdayPercent', 'Tugʻilgan kun sovgʻasi %', 'number') + '</div>' +
        '<p class="muted">Darajalar (yetkazilgan xarid summasi / qoʻshimcha keshbek %):</p><div class="g2">' + s.levels.map(function (l) { return '<label>' + l.id + ' — dan<input name="lv_min_' + l.id + '" type="number" value="' + l.min + '"></label><label>' + l.id + ' — +%<input name="lv_b_' + l.id + '" type="number" value="' + l.bonus + '"></label>'; }).join('') + '</div></div>' +
        '<div class="card"><h3>Konstruktorlar</h3><div class="g2">' + s.packaging.map(function (p) { return '<label>Qadoq: ' + esc(p.name.uz) + '<input name="pk_' + p.id + '" type="number" value="' + p.price + '"></label>'; }).join('') +
        s.bars.map(function (p) { return '<label>Plitka asosi: ' + esc(p.name.uz) + '<input name="bar_' + p.id + '" type="number" value="' + p.price + '"></label>'; }).join('') +
        s.toppings.map(function (p) { return '<label>Qoʻshimcha: ' + esc(p.name.uz) + '<input name="tp_' + p.id + '" type="number" value="' + p.price + '"></label>'; }).join('') +
        s.toyPacks.map(function (p) { return '<label>Toʻy: ' + esc(p.name.uz) + ' — qadoq narxi<input name="toy_' + p.id + '" type="number" value="' + p.wrap + '"></label>'; }).join('') +
        inp('toyMinGuests', 'Toʻy: kamida mehmon', 'number') + inp('toyDiscountFrom', 'Toʻy: chegirma ... mehmondan', 'number') + inp('toyDiscount', 'Toʻy: chegirma %', 'number') +
        s.clubPlans.map(function (p) { return '<label>Club ' + p.months + ' oy — chegirma %<input name="club_' + p.months + '" type="number" value="' + p.discount + '"></label>'; }).join('') + '</div></div>' +
        '<div class="card"><h3>Bayramlar</h3><div class="g2"><label>Bayram promokodi<input name="hp_code" value="' + esc(s.holidayPromo.code) + '"></label><label>Chegirma %<input name="hp_pct" type="number" value="' + s.holidayPromo.percent + '"></label><label>Necha kun oldin<input name="hp_days" type="number" value="' + s.holidayPromo.daysBefore + '"></label><label>Yoqilgan<select name="hp_on"><option value="1"' + (s.holidayPromo.on ? ' selected' : '') + '>Ha</option><option value="0"' + (s.holidayPromo.on ? '' : ' selected') + '>Yoʻq</option></select></label></div>' +
        '<p class="muted">Sanalar (OY-KUN). Hayitlar har yili oʻzgaradi — qoʻshing: nomi va sana.</p><div class="g2">' + s.holidays.map(function (h, i) { return '<label>' + esc(HOL[h.id] || (h.name && h.name.uz) || h.id) + '<input name="hol_' + i + '" value="' + h.md + '"></label>'; }).join('') +
        '<label>Yangi bayram nomi<input name="hol_new_name" placeholder="Ramazon hayit"></label><label>Sana (OY-KUN)<input name="hol_new_md" placeholder="03-10"></label></div></div>' +
        '<div class="card"><h3>Yetkazish narxlari</h3><div class="g2">' + Object.keys(DN).map(function (d) { return '<label>' + DN[d] + '<input name="df_' + d + '" type="number" value="' + s.deliveryFees[d] + '"></label>'; }).join('') + '</div></div>' +
        '<div class="card"><h3>Mavsumiy effekt</h3><select name="season">' + [['auto', 'Avtomatik (sanaga qarab)'], ['snow', 'Qor'], ['petals', 'Gul barglari'], ['leaves', 'Kuzgi barglar'], ['sparkle', 'Oltin uchqunlar'], ['fireworks', 'Salyut'], ['off', 'Oʻchiq']].map(function (x) { return '<option value="' + x[0] + '"' + (s.season === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="card"><h3>Qoʻshimcha savol-javob</h3>' + (s.faq || []).concat([{ q: { uz: '' }, a: { uz: '' } }]).map(function (f, i) { return '<div class="g2" style="margin-bottom:8px"><label>Savol<input name="fq_' + i + '" value="' + esc(f.q.uz) + '"></label><label>Javob<input name="fa_' + i + '" value="' + esc(f.a.uz) + '"></label></div>'; }).join('') + '</div>' +
        '<button class="btn pri" style="position:sticky;bottom:12px;width:100%;min-height:48px">Saqlash</button></form>';
    }
  };

  app.addEventListener('submit', async function (e) {
    e.preventDefault(); var f = e.target;
    try {
      if (f.id === 'promoF') await call('admin.promo', { code: f.code.value, kind: f.kind.value, value: +f.value.value, until: f.until.value, maxUses: +f.maxUses.value, note: f.note.value });
      else if (f.id === 'clsF') await call('admin.class', { title: { uz: f.uz.value, ru: f.ru.value, en: f.en.value }, date: f.date.value, time: f.time.value, place: f.place.value, price: +f.price.value, seats: +f.seats.value });
      else if (f.classList.contains('adj')) await call('admin.adjust', { user: f.dataset.u, amount: +f.a.value, note: 'admin' });
      else if (f.classList.contains('reply')) await call('admin.chatReply', { id: +f.dataset.c, text: f.t.value });
      else if (f.id === 'setF') await saveSettings(f);
      else if (f.id === 'prodF') await saveProduct(f);
      else return;
      await load(); toast('Saqlandi ✓');
    } catch (er) {}
  });
  async function saveSettings(f) {
    var s = D.settings, v = function (n) { return f[n] ? f[n].value : undefined; }, b = {};
    ['cardNumber', 'cardOwner', 'phone', 'address', 'instagram', 'telegram', 'channel', 'stickers', 'cashbackPercent', 'bonusMin', 'bonusMax', 'piecePrice', 'engravePrice', 'dealPercent', 'dealPin', 'birthdayPercent', 'toyMinGuests', 'toyDiscountFrom', 'toyDiscount', 'season'].forEach(function (k) { b[k] = v(k); });
    b.brand = v('brand');
    b.maker = v('maker'); b.storage = v('storage');
    b.agents = { sales: v('ag_sales') === '1', autopost: v('ag_auto') === '1', postHour: +v('ag_hour') || 9 };
    b.kits = (s.kits || []).map(function (k) { return { id: k.id, price: v('kp_' + k.id), name: { uz: v('kn_' + k.id), ru: k.name.ru, en: k.name.en }, items: { uz: v('ki_' + k.id), ru: k.items.ru, en: k.items.en } }; });
    b.cupItems = (s.cupItems || []).map(function (c) { return { id: c.id, price: v('cu_' + c.id) }; });
    if ((v('nc_name') || '').trim()) b.newCup = { name: v('nc_name').trim(), price: v('nc_price'), color: v('nc_color') };
    b.bonbonPrice = v('bonbonPrice');
    b.levels = s.levels.map(function (l) { return { id: l.id, min: v('lv_min_' + l.id), bonus: v('lv_b_' + l.id) }; });
    b.packaging = s.packaging.map(function (p) { return { id: p.id, price: v('pk_' + p.id) }; });
    b.bars = s.bars.map(function (p) { return { id: p.id, price: v('bar_' + p.id) }; });
    b.toppings = s.toppings.map(function (p) { return { id: p.id, price: v('tp_' + p.id) }; });
    b.toyPacks = s.toyPacks.map(function (p) { return { id: p.id, wrap: v('toy_' + p.id) }; });
    b.clubPlans = s.clubPlans.map(function (p) { return { months: p.months, discount: v('club_' + p.months) }; });
    b.holidayPromo = { code: v('hp_code'), percent: v('hp_pct'), daysBefore: v('hp_days'), on: v('hp_on') === '1' };
    b.holidays = s.holidays.map(function (h, i) { return { id: h.id, md: v('hol_' + i), name: h.name }; });
    var nn = (v('hol_new_name') || '').trim(), nmd = (v('hol_new_md') || '').trim();
    if (nn && nmd) b.holidays.push({ id: 'h' + Date.now().toString(36), md: nmd, name: { uz: nn } });
    b.deliveryFees = {}; Object.keys(DN).forEach(function (d) { b.deliveryFees[d] = v('df_' + d); });
    b.faq = []; for (var i = 0; f['fq_' + i]; i++) if (f['fq_' + i].value.trim() && f['fa_' + i].value.trim()) b.faq.push({ q: { uz: f['fq_' + i].value }, a: { uz: f['fa_' + i].value } });
    await call('admin.settings', b);
  }
  var pendingImg = null;
  function editProduct(id) {
    var p = id ? D.products.find(function (x) { return x.id === id; }) : { cat: 'shok', price: 0, total: 10, active: true, name: {}, sub: {}, img: '', holiday: '', dropAt: 0 };
    pendingImg = null;
    var hol = '<option value="">— (doimiy menyu)</option>' + D.settings.holidays.map(function (h) { return '<option value="' + h.id + '"' + (p.holiday === h.id ? ' selected' : '') + '>' + esc(HOL[h.id] || (h.name && h.name.uz) || h.id) + ' kolleksiyasi</option>'; }).join('');
    var drop = p.dropAt ? new Date(p.dropAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    document.getElementById('pform').innerHTML = '<form class="card" id="prodF" data-id="' + (id || '') + '"><h3>' + (id ? 'Tahrirlash' : 'Yangi mahsulot') + '</h3><div class="g2">' +
      '<label>Nomi (uz)<input name="nuz" required value="' + esc(p.name.uz) + '"></label><label>Nomi (ru)<input name="nru" value="' + esc(p.name.ru) + '"></label><label>Nomi (en)<input name="nen" value="' + esc(p.name.en) + '"></label>' +
      '<label>Qisqa (uz) — masalan 100 g<input name="suz" value="' + esc(p.sub.uz) + '"></label><label>Qisqa (ru)<input name="sru" value="' + esc(p.sub.ru) + '"></label><label>Qisqa (en)<input name="sen" value="' + esc(p.sub.en) + '"></label>' +
      '<label>Turi<select name="cat"><option value="shok"' + (p.cat === 'shok' ? ' selected' : '') + '>Shokolad</option><option value="choy"' + (p.cat === 'choy' ? ' selected' : '') + '>Gulli choy</option><option value="boks"' + (p.cat === 'boks' ? ' selected' : '') + '>Boks</option></select></label>' +
      '<label>Narx<input name="price" type="number" value="' + p.price + '"></label><label>Kunlik miqdor<input name="total" type="number" value="' + p.total + '"></label><label>Bugun qoldi<input name="left" type="number" value="' + (p.left != null ? p.left : '') + '"></label>' +
      '<label>Kolleksiya<select name="holiday">' + hol + '</select></label><label>Cheklangan chiqish (drop) vaqti<input name="drop" type="datetime-local" value="' + drop + '"></label>' +
      '<label>Rasm<input name="img" type="file" accept="image/*"></label><label>Koʻrinadi<select name="active"><option value="1"' + (p.active ? ' selected' : '') + '>Ha</option><option value="0"' + (p.active ? '' : ' selected') + '>Yoʻq</option></select></label></div>' +
      '<div class="row" style="margin-top:10px"><img id="pimg" class="thumb" src="' + esc(p.img) + '" alt=""><div><button class="btn pri">Saqlash</button> <button type="button" class="btn" onclick="this.closest(\'form\').remove()">Bekor</button></div></div></form>';
    var f = document.getElementById('prodF');
    f.img.onchange = function () {
      var file = this.files[0]; if (!file) return;
      var fr = new FileReader(); fr.onload = function () { var img = new Image(); img.onload = function () { var k = Math.min(1, 1000 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); pendingImg = c.toDataURL('image/jpeg', .88); document.getElementById('pimg').src = pendingImg; }; img.src = fr.result; }; fr.readAsDataURL(file);
    };
    f.scrollIntoView({ behavior: 'smooth' });
  }
  async function saveProduct(f) {
    var img;
    if (pendingImg) img = (await API.upload(pendingImg)).url;
    await call('admin.product', { id: f.dataset.id || undefined, name: { uz: f.nuz.value, ru: f.nru.value, en: f.nen.value }, sub: { uz: f.suz.value, ru: f.sru.value, en: f.sen.value },
      cat: f.cat.value, price: +f.price.value, total: +f.total.value, left: f.left.value, holiday: f.holiday.value, dropAt: f.drop.value ? new Date(f.drop.value).getTime() : 0, img: img, active: f.active.value === '1' });
    pendingImg = null;
  }
  start();
})();
