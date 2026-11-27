/* Bloom & Cacao — shared business logic.
   The same file runs in the browser (demo mode, data in localStorage) and on the Node server (data in db.json).
   handle(db, route, body, ctx) is the single entry point; ctx = { user, admin, now, rnd, events: [] }. */
(function (root) {
  'use strict';

  var DISTRICTS = ['andijon_sh', 'andijon_t', 'asaka', 'baliqchi', 'boz', 'buloqboshi', 'izboskan', 'jalaquduq',
    'xojaobod', 'qorgontepa', 'marhamat', 'oltinkol', 'paxtaobod', 'shahrixon', 'ulugnor', 'xonobod'];
  var STATUSES = ['new', 'accepted', 'on_way', 'delivered', 'cancelled'];
  var DAY = 24 * 3600 * 1000;
  var WHEEL = [
    { t: 'coins', v: 500, w: 20 }, { t: 'promo', v: 5, w: 20 }, { t: 'coins', v: 1000, w: 15 }, { t: 'promo', v: 10, w: 12 },
    { t: 'coins', v: 2000, w: 10 }, { t: 'promo', v: 15, w: 5 }, { t: 'coins', v: 5000, w: 3 }, { t: 'promo', v: 7, w: 15 }
  ];
  var SCRATCH = [
    { t: 'promo', v: 5, w: 30 }, { t: 'coins', v: 1000, w: 25 }, { t: 'promo', v: 10, w: 20 },
    { t: 'coins', v: 3000, w: 15 }, { t: 'promo', v: 15, w: 10 }
  ];

  function L(uz, ru, en) { return { uz: uz, ru: ru, en: en }; }

  function seed() {
    var fees = {}; DISTRICTS.forEach(function (d) { fees[d] = d === 'andijon_sh' ? 15000 : 30000; });
    return {
      v: 2,
      seq: { order: 1000, user: 0, tx: 0, topup: 0, review: 0, lead: 0, chat: 0, booking: 0, cls: 0 },
      stockDay: '',
      settings: {
        brand: 'Bloom & Cacao',
        agents: { sales: true, autopost: true, postHour: 9 },
      maker: '', storage: 'Salqin va quruq joyda (16–20°C), quyosh nuridan uzoqda saqlang. Muzlatgichga qoʻymang. Eng mazali — 14 kun ichida.',
        kits: [
          { id: 'bonbon', price: 149000, cups: 2, img: 'img/kit-bonbon.jpg', name: L('Bon-bon yasash boksi', 'Бокс «Сделай бон-бон»', 'Make-your-bonbon kit'),
            items: L('Silikon qolip, shokolad tomchilari, 2 ta idishcha, retsept kartasi', 'Силиконовая форма, шоколадные капли, 2 баночки, карточка с рецептом', 'Silicone mould, chocolate drops, 2 cups, recipe card') },
          { id: 'kino', price: 179000, cups: 2, img: 'img/kit-kino.jpg', name: L('«Kino vaqti» boksi', 'Бокс «Время кино»', '“Movie time” kit'),
            items: L('Shokolad isitgich va sham, sanchqi, shokolad tomchilari, pechenye, 2 ta idishcha', 'Подогреватель со свечой, вилочка, шоколадные капли, печенье, 2 баночки', 'Warmer with a candle, fork, chocolate drops, cookies, 2 cups') }
        ],
        luck: { on: true, prizes: [
          { id: 'shokolad', kind: 'shokolad', w: 3, name: L('Shokolad tomchilari (kichik idishcha)', 'Шоколадные капли (маленькая баночка)', 'Chocolate drops (small cup)') },
          { id: 'bodom', kind: 'bezak', w: 3, name: L('Bodom (kichik idishcha)', 'Миндаль (маленькая баночка)', 'Almonds (small cup)') },
          { id: 'mayiz', kind: 'bezak', w: 3, name: L('Mayiz (kichik idishcha)', 'Изюм (маленькая баночка)', 'Raisins (small cup)') },
          { id: 'pista', kind: 'bezak', w: 2, name: L('Pista (kichik idishcha)', 'Фисташка (маленькая баночка)', 'Pistachio (small cup)') },
          { id: 'qolip', kind: 'qolip', w: 2, name: L('2 talik silikon qolip', 'Силиконовая форма на 2 шт', '2-piece silicone mould') }
        ] },
        cupItems: [
          { id: 'choksous', price: 0, color: '#4a2a1a', name: L('Shokolad sousi', 'Шоколадный соус', 'Chocolate sauce') },
          { id: 'karamel', price: 0, color: '#c98a3c', name: L('Karamel sousi', 'Карамельный соус', 'Caramel sauce') },
          { id: 'malina', price: 5000, color: '#b3123b', name: L('Malina qiyomi', 'Малиновый конфитюр', 'Raspberry jam') },
          { id: 'olcha', price: 5000, color: '#6e0f22', name: L('Olcha qiyomi', 'Вишнёвый конфитюр', 'Cherry jam') },
          { id: 'pista', price: 10000, color: '#8fae3e', name: L('Pista', 'Фисташка', 'Pistachio') },
          { id: 'bodom', price: 6000, color: '#c98b4c', name: L('Bodom', 'Миндаль', 'Almond') },
          { id: 'yongoq', price: 5000, color: '#a8783e', name: L('Yongʻoq', 'Грецкий орех', 'Walnut') },
          { id: 'mayiz', price: 3000, color: '#5a2a3a', name: L('Mayiz', 'Изюм', 'Raisins') }
        ],
        bonbon: {
          price: 18000,
          shapes: [{ id: 'dome', name: L('Gumbaz', 'Купол', 'Dome') }, { id: 'heart', name: L('Yurak', 'Сердце', 'Heart') }, { id: 'sphere', name: L('Shar', 'Шар', 'Sphere') },
            { id: 'square', name: L('Kvadrat', 'Квадрат', 'Square') }, { id: 'flower', name: L('Gul', 'Цветок', 'Flower') }, { id: 'star', name: L('Yulduz', 'Звезда', 'Star') }, { id: 'gem', name: L('Olmos', 'Бриллиант', 'Gem') }],
          colors: [{ id: 'natural', color: '', name: L('Tabiiy', 'Натуральный', 'Natural') }, { id: 'ruby', color: '#c2185b', name: L('Yoqut', 'Рубин', 'Ruby') }, { id: 'pink', color: '#e889a8', name: L('Pushti', 'Розовый', 'Pink') },
            { id: 'sky', color: '#1e88a8', name: L('Moviy', 'Голубой', 'Sky blue') }, { id: 'emerald', color: '#2e8b57', name: L('Zumrad', 'Изумруд', 'Emerald') }, { id: 'gold', color: '#d4a53a', name: L('Oltin', 'Золото', 'Gold') },
            { id: 'violet', color: '#6a3fa0', name: L('Binafsha', 'Фиолетовый', 'Violet') }, { id: 'orange', color: '#e07a2e', name: L('Apelsin', 'Оранжевый', 'Orange') }, { id: 'pearl', color: '#f1e9da', name: L('Marvarid', 'Жемчуг', 'Pearl') }],
          finishes: [{ id: 'gloss', name: L('Yaltiroq', 'Глянец', 'Gloss') }, { id: 'splash', name: L('Sachratqi', 'Брызги', 'Splash') }, { id: 'marble', name: L('Marmar', 'Мрамор', 'Marble') },
            { id: 'ombre', name: L('Ombre', 'Омбре', 'Ombré') }, { id: 'metal', name: L('Metall', 'Металлик', 'Metallic') }],
          shells: [{ id: 'dark', color: '#3b2216', name: L('Qora', 'Тёмный', 'Dark') }, { id: 'milk', color: '#8a5a3b', name: L('Sutli', 'Молочный', 'Milk') }, { id: 'white', color: '#efe3c8', name: L('Oq', 'Белый', 'White') }],
          l1: [{ id: 'malina', color: '#b3123b', name: L('Malina qiyomi', 'Малиновый конфитюр', 'Raspberry jam') }, { id: 'olcha', color: '#6e0f22', name: L('Olcha qiyomi', 'Вишнёвый конфитюр', 'Cherry jam') },
            { id: 'karamel', color: '#c98a3c', name: L('Karamel', 'Карамель', 'Caramel') }, { id: 'asal', color: '#d9a52b', name: L('Asal', 'Мёд', 'Honey') }],
          l2: [{ id: 'pista', color: '#cfe0b0', name: L('Pista kremi', 'Фисташковый крем', 'Pistachio cream') }, { id: 'yalpiz', color: '#d8eee0', name: L('Yalpiz kremi', 'Мятный крем', 'Mint cream') },
            { id: 'yongoq', color: '#b98a5a', name: L('Yongʻoq pastasi', 'Ореховая паста', 'Nut paste') }, { id: 'vanil', color: '#f4ead2', name: L('Vanil krem', 'Ванильный крем', 'Vanilla cream') }],
          dust: [{ id: 'malina', color: '#c2185b', name: L('Malina kukuni', 'Малиновая пудра', 'Raspberry dust') }, { id: 'oltin', color: '#e6c277', name: L('Oltin', 'Золото', 'Gold') },
            { id: 'kakao', color: '#5b3423', name: L('Kakao', 'Какао', 'Cocoa') }, { id: 'none', color: 'transparent', name: L('Siz', 'Без', 'None') }]
        },
        cashbackPercent: 5,
        levels: [{ id: 'bronze', min: 0, bonus: 0 }, { id: 'silver', min: 1000000, bonus: 2 }, { id: 'gold', min: 3000000, bonus: 5 }],
        bonusMin: 500, bonusMax: 3000,
        piecePrice: 15000, boxSizes: [6, 9, 12],
        packaging: [{ id: 'std', price: 0, name: L('Standart', 'Стандарт', 'Standard') },
          { id: 'premium', price: 20000, name: L('Premium baxmal', 'Премиум бархат', 'Premium velvet') }],
        ribbons: [{ id: 'gold', color: '#d9b056' }, { id: 'rose', color: '#c94b6d' }, { id: 'emerald', color: '#1f6b5c' }, { id: 'ivory', color: '#efe3c8' }],
        flavors: [
          { id: 'pista', color: '#8fae3e', name: L('Pista', 'Фисташка', 'Pistachio') },
          { id: 'bodom', color: '#c98b4c', name: L('Bodom', 'Миндаль', 'Almond') },
          { id: 'malina', color: '#c2185b', name: L('Malina', 'Малина', 'Raspberry') },
          { id: 'asal', color: '#c9a227', name: L('Asal', 'Мёд', 'Honey') },
          { id: 'qora', color: '#4a2a1a', name: L('Qora shokolad', 'Тёмный шоколад', 'Dark chocolate') },
          { id: 'oq', color: '#efe3c8', name: L('Oq shokolad', 'Белый шоколад', 'White chocolate') },
          { id: 'moviy', color: '#1e88a8', name: L('Moviy bon-bon', 'Голубой бон-бон', 'Blue bonbon') }
        ],
        bars: [
          { id: 'dark', color: '#3b2216', price: 45000, name: L('Qora', 'Тёмный', 'Dark') },
          { id: 'milk', color: '#8a5a3b', price: 45000, name: L('Sutli', 'Молочный', 'Milk') },
          { id: 'white', color: '#f1e6cf', price: 45000, name: L('Oq', 'Белый', 'White') },
          { id: 'ruby', color: '#e58aa6', price: 55000, name: L('Pushti (ruby)', 'Розовый (руби)', 'Ruby pink') }
        ],
        toppings: [
          { id: 'pista', color: '#8fae3e', price: 5000, name: L('Pista', 'Фисташка', 'Pistachio') },
          { id: 'bodom', color: '#c98b4c', price: 5000, name: L('Bodom', 'Миндаль', 'Almond') },
          { id: 'malina', color: '#c2185b', price: 5000, name: L('Malina', 'Малина', 'Raspberry') },
          { id: 'mayiz', color: '#5a2a3a', price: 4000, name: L('Mayiz', 'Изюм', 'Raisins') },
          { id: 'atirgul', color: '#e58aa6', price: 6000, name: L('Atirgul barglari', 'Лепестки розы', 'Rose petals') },
          { id: 'oltin', color: '#e6c277', price: 10000, name: L('Oltin varaq', 'Сусальное золото', 'Gold leaf') }
        ],
        maxToppings: 4,
        toyPacks: [
          { id: 'duo', pieces: 2, wrap: 5000, name: L('Duo — 2 bon-bon', 'Дуо — 2 бон-бона', 'Duo — 2 bonbons') },
          { id: 'trio', pieces: 3, wrap: 6000, name: L('Trio — 3 bon-bon', 'Трио — 3 бон-бона', 'Trio — 3 bonbons') },
          { id: 'lux', pieces: 5, wrap: 10000, name: L('Lux — 5 bon-bon', 'Люкс — 5 бон-бонов', 'Lux — 5 bonbons') }
        ],
        toyMinGuests: 20, toyDiscountFrom: 200, toyDiscount: 10,
        clubPlans: [{ months: 1, discount: 0 }, { months: 3, discount: 10 }, { months: 6, discount: 15 }],
        clubBoxSize: 9,
        engravePrice: 10000,
        dealPercent: 15, dealPin: '',
        birthdayPercent: 15,
        holidays: [
          { id: 'newyear', md: '01-01' }, { id: 'women', md: '03-08' }, { id: 'navruz', md: '03-21' },
          { id: 'independence', md: '09-01' }, { id: 'teachers', md: '10-01' }
        ],
        holidayPromo: { code: 'BAYRAM10', percent: 10, daysBefore: 14, on: true },
        deliveryFees: fees,
        cardNumber: '', cardOwner: '', phone: '', address: '', instagram: '', telegram: '', channel: '', stickers: '',
        season: 'auto',
        faq: []
      },
      products: [
        P('p1', 'shok', 185000, 30, 'img/p1.jpg', ['Premium bon-bonlar toʻplami', 'Премиум набор бон-бонов', 'Premium bonbon set'], ['12 dona', '12 шт', '12 pcs']),
        P('p5', 'boks', 250000, 20, 'img/p5.jpg', ['Shokolad va gulli choy boks', 'Бокс: шоколад и цветочный чай', 'Chocolate & flower tea box'], ['Mini toʻplam', 'Мини-набор', 'Mini set'])
      ],
      users: [], orders: [], txs: [], topups: [], reviews: [], promos: [], leads: [], chats: [],
      classes: [], bookings: [], wishlists: [], notify: [], luckCodes: [], mig: 4
    };
    function P(id, cat, price, total, img, n, s) {
      return { id: id, cat: cat, price: price, total: total, left: total, img: img, active: true, holiday: '', dropAt: 0,
        name: L(n[0], n[1], n[2]), sub: L(s[0], s[1], s[2]) };
    }
  }

  /* ---------- helpers ---------- */
  function tkNow(now) { return new Date((now || Date.now()) + 5 * 3600 * 1000); }
  function tkDay(now) { return tkNow(now).toISOString().slice(0, 10); }
  function msToMidnight(now) { var t = tkNow(now); var m = new Date(t); m.setUTCHours(24, 0, 0, 0); return m - t; }
  function addDays(day, n) { var d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function err(code, extra) { var e = new Error(code); e.code = code; e.extra = extra; return e; }
  function int(x) { x = Math.round(Number(x)); return isFinite(x) ? x : 0; }
  function str(x, n) { return String(x == null ? '' : x).trim().slice(0, n || 200); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function code(prefix, rnd) {
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = prefix || '';
    for (var i = 0; i < 6; i++) s += a[Math.floor((rnd ? rnd() : Math.random()) * a.length)];
    return s;
  }
  function pick(list, r) {
    var tot = list.reduce(function (a, x) { return a + x.w; }, 0), x = r * tot;
    for (var i = 0; i < list.length; i++) { x -= list[i].w; if (x < 0) return i; }
    return list.length - 1;
  }
  function L3(o, n) { o = o || {}; var uz = str(o.uz, n); return { uz: uz, ru: str(o.ru, n) || uz, en: str(o.en, n) || uz }; }
  function mdOk(md) { return /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(md); }

  function ensureDay(db, ctx) {
    var d = tkDay(ctx && ctx.now);
    if (db.stockDay !== d) {
      db.products.forEach(function (p) {
        var was = p.left; p.left = p.total;
        if (was <= 0 && p.left > 0 && ctx) restocked(db, p, ctx);
      });
      db.stockDay = d;
    }
  }
  function restocked(db, p, ctx) {
    var subs = db.notify.filter(function (n) { return n.product === p.id; });
    if (!subs.length) return;
    db.notify = db.notify.filter(function (n) { return n.product !== p.id; });
    ctx.events.push({ type: 'restock', product: p, users: subs.map(function (n) { return n.user; }) });
  }

  function findUser(db, id) { return db.users.find(function (u) { return u.id === id; }); }
  function level(db, u) {
    var lv = db.settings.levels.slice().sort(function (a, b) { return a.min - b.min; }), cur = lv[0], next = null;
    lv.forEach(function (l) { if ((u.spent || 0) >= l.min) cur = l; });
    var i = lv.indexOf(cur); if (i < lv.length - 1) next = lv[i + 1];
    return { id: cur.id, bonus: cur.bonus, spent: u.spent || 0, next: next ? next.id : null, nextMin: next ? next.min : null, min: cur.min };
  }
  function cashbackPct(db, u) { return db.settings.cashbackPercent + (u ? level(db, u).bonus : 0); }

  function upsertUser(db, data, ctx) {
    var u = data.tgId ? db.users.find(function (x) { return x.tgId && x.tgId === data.tgId; }) : null;
    if (!u && data.phone && !data.tgId) u = db.users.find(function (x) { return !x.tgId && x.phone === data.phone; });
    if (!u) {
      u = { id: 'u' + (++db.seq.user), tgId: data.tgId || null, name: str(data.name, 60) || 'Mehmon', username: str(data.username, 60),
        photo: str(data.photo, 400), phone: str(data.phone, 20), balance: 0, spent: 0, created: (ctx && ctx.now) || Date.now(),
        lastBonus: 0, lastWheel: 0, scratches: 1, dates: [], birthday: '', fav: [], bdayYear: 0 };
      db.users.push(u);
    } else {
      ['name', 'photo', 'username', 'phone'].forEach(function (k) { if (data[k]) u[k] = str(data[k], k === 'photo' ? 400 : 60); });
    }
    return u;
  }

  function tx(db, user, amount, kind, note, now) {
    user.balance = int(user.balance + amount);
    var t = { id: 't' + (++db.seq.tx), user: user.id, amount: int(amount), kind: kind, note: note || '', at: now || Date.now(), balance: user.balance };
    db.txs.push(t);
    return t;
  }

  function issuePromo(db, user, percent, note, now, days) {
    var p = { code: code('MV'), kind: 'percent', value: percent, until: (now || Date.now()) + (days || 14) * DAY, maxUses: 1, used: 0,
      user: user ? user.id : null, note: note || '' };
    db.promos.push(p);
    return p;
  }

  /* ---------- deals, holidays, promos ---------- */
  function dealId(db, now) {
    var s = db.settings, act = db.products.filter(function (p) { return p.active && !(p.dropAt > (now || Date.now())) && p.left > 0; });
    if (s.dealPin && act.some(function (p) { return p.id === s.dealPin; })) return s.dealPin;
    if (!act.length) return null;
    act.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    return act[hash(tkDay(now)) % act.length].id;
  }
  function unitPrice(db, p, now) {
    return p.id === dealId(db, now) ? Math.round(p.price * (100 - db.settings.dealPercent) / 100 / 100) * 100 : p.price;
  }
  function nextHoliday(db, now) {
    var today = tkDay(now), y = +today.slice(0, 4), best = null;
    db.settings.holidays.forEach(function (h) {
      [y, y + 1].forEach(function (yy) {
        var d = yy + '-' + h.md;
        if (d >= today && (!best || d < best.date)) best = { id: h.id, date: d, name: h.name || null };
      });
    });
    if (best) best.days = Math.round((Date.parse(best.date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY);
    return best;
  }
  function findPromo(db, c, user, now) {
    c = str(c, 20).toUpperCase(); if (!c) return null;
    var hp = db.settings.holidayPromo, nh = nextHoliday(db, now);
    if (hp.on && c === hp.code.toUpperCase()) {
      if (nh && nh.days <= hp.daysBefore) return { code: hp.code, kind: 'percent', value: hp.percent, holiday: true };
      throw err('promo_expired');
    }
    var p = db.promos.find(function (x) { return x.code.toUpperCase() === c; });
    if (!p) throw err('promo_bad');
    if (p.user && (!user || p.user !== user.id)) throw err('promo_bad');
    if (p.until && (now || Date.now()) > p.until) throw err('promo_expired');
    if (p.maxUses && p.used >= p.maxUses) throw err('promo_used');
    return p;
  }

  /* ---------- pricing ---------- */
  function boxPrice(db, size, pack) {
    var s = db.settings, p = s.packaging.find(function (x) { return x.id === pack; }) || s.packaging[0];
    return int(size) * s.piecePrice + (p ? p.price : 0);
  }
  function barPrice(db, base, tops) {
    var s = db.settings, b = s.bars.find(function (x) { return x.id === base; });
    return (b ? b.price : 0) + tops.reduce(function (a, t) { var x = s.toppings.find(function (y) { return y.id === t; }); return a + (x ? x.price : 0); }, 0);
  }
  function toyPrice(db, pack, guests) {
    var s = db.settings, p = s.toyPacks.find(function (x) { return x.id === pack; });
    if (!p) return 0;
    var each = p.pieces * s.piecePrice + p.wrap, sum = each * guests;
    if (guests >= s.toyDiscountFrom) sum = Math.round(sum * (100 - s.toyDiscount) / 100 / 1000) * 1000;
    return sum;
  }
  function clubPrice(db, months) {
    var s = db.settings, pl = s.clubPlans.find(function (x) { return x.months === int(months); });
    if (!pl) return 0;
    return Math.round(boxPrice(db, s.clubBoxSize, 'premium') * pl.months * (100 - pl.discount) / 100 / 1000) * 1000;
  }

  function quote(db, payload, user, ctx) {
    ensureDay(db, ctx);
    var s = db.settings, now = (ctx && ctx.now) || Date.now(), lines = [], items = 0;
    var isToday = !payload.date || payload.date === tkDay(now);
    (payload.lines || []).slice(0, 30).forEach(function (l) {
      var qty = Math.max(1, Math.min(50, int(l.qty) || 1)), price, line;
      if (l.type === 'box') {
        var size = int(l.size);
        if (s.boxSizes.indexOf(size) < 0) throw err('bad_box');
        var cells = (l.cells || []).slice(0, size);
        if (cells.length !== size || cells.some(function (c) { return !s.flavors.some(function (f) { return f.id === c; }); })) throw err('box_incomplete');
        var ribbon = s.ribbons.some(function (r) { return r.id === l.ribbon; }) ? l.ribbon : s.ribbons[0].id;
        var pack = s.packaging.some(function (p) { return p.id === l.pack; }) ? l.pack : s.packaging[0].id;
        price = boxPrice(db, size, pack);
        line = { type: 'box', size: size, cells: cells, ribbon: ribbon, pack: pack };
      } else if (l.type === 'bar') {
        if (!s.bars.some(function (b) { return b.id === l.base; })) throw err('bad_bar');
        var tops = (l.tops || []).filter(function (t, i, a) { return a.indexOf(t) === i && s.toppings.some(function (x) { return x.id === t; }); }).slice(0, s.maxToppings);
        if (!tops.length) throw err('bar_empty');
        price = barPrice(db, l.base, tops);
        line = { type: 'bar', base: l.base, tops: tops };
      } else if (l.type === 'toy') {
        var g = int(l.guests);
        if (g < s.toyMinGuests || g > 3000) throw err('toy_guests');
        if (!s.toyPacks.some(function (p) { return p.id === l.pack; })) throw err('bad_toy');
        price = toyPrice(db, l.pack, g); qty = 1;
        line = { type: 'toy', pack: l.pack, guests: g, ribbon: s.ribbons.some(function (r) { return r.id === l.ribbon; }) ? l.ribbon : s.ribbons[0].id };
      } else if (l.type === 'kit') {
        var kit = (s.kits || []).find(function (k) { return k.id === l.kit; });
        if (!kit) throw err('bad_kit');
        var cups = (l.cups || []).slice(0, kit.cups);
        if (cups.length !== kit.cups || cups.some(function (c) { return !s.cupItems.some(function (x) { return x.id === c; }); })) throw err('kit_cups');
        price = kit.price + cups.reduce(function (a, c) { return a + s.cupItems.find(function (x) { return x.id === c; }).price; }, 0);
        line = { type: 'kit', kit: kit.id, cups: cups };
        if (l.dear) line.dear = true;
      } else if (l.type === 'bonbon') {
        var bb = s.bonbon, ok = function (list, id) { return list.some(function (x) { return x.id === id; }); };
        if (!ok(bb.shells, l.shell) || !ok(bb.l1, l.l1) || !ok(bb.l2, l.l2) || !ok(bb.dust, l.dust)) throw err('bad_bonbon');
        var shape = ok(bb.shapes || [], l.shape) ? l.shape : 'dome', color = ok(bb.colors || [], l.color) ? l.color : 'natural', finish = ok(bb.finishes || [], l.finish) ? l.finish : 'gloss';
        price = bb.price;
        line = { type: 'bonbon', shape: shape, color: color, finish: finish, shell: l.shell, l1: l.l1, l2: l.l2, dust: l.dust };
      } else if (l.type === 'club') {
        price = clubPrice(db, l.months); qty = 1;
        if (!price) throw err('bad_club');
        line = { type: 'club', months: int(l.months) };
      } else {
        var p = db.products.find(function (x) { return x.id === l.id && x.active; });
        if (!p) throw err('no_product');
        if (p.dropAt && p.dropAt > now) throw err('not_yet', p.id);
        if (isToday && qty > p.left) throw err('no_stock', p.id);
        price = unitPrice(db, p, now);
        line = { type: 'product', id: p.id, name: p.name, deal: price !== p.price };
      }
      line.qty = qty; line.price = price; line.sum = price * qty;
      lines.push(line); items += line.sum;
    });
    if (!lines.length) throw err('empty');
    var extras = 0;
    var engrave = str(payload.engrave, 24);
    if (engrave) extras += s.engravePrice;
    var discount = 0, promo = null;
    if (payload.promo) {
      promo = findPromo(db, payload.promo, user, now);
      discount = promo.kind === 'amount' ? Math.min(items, int(promo.value)) : Math.round(items * promo.value / 100 / 100) * 100;
    }
    var district = DISTRICTS.indexOf(payload.district) >= 0 ? payload.district : null;
    var delivery = district ? int(s.deliveryFees[district]) : 0;
    var total = items - discount + extras + delivery;
    var wallet = payload.useWallet && user ? Math.max(0, Math.min(user.balance, total)) : 0;
    var cashback = user ? Math.floor((items - discount) * cashbackPct(db, user) / 100 / 100) * 100 : 0;
    return { lines: lines, items: items, extras: extras, engrave: engrave, discount: discount, promo: promo ? promo.code : '',
      delivery: delivery, total: total, wallet: wallet, toPay: total - wallet, cashback: cashback, isToday: isToday, district: district };
  }

  function createOrder(db, payload, user, ctx) {
    var now = ctx.now;
    var name = str(payload.name, 80), phone = str(payload.phone, 20).replace(/[^\d+]/g, '');
    if (!name) throw err('need_name');
    if (phone.replace(/\D/g, '').length < 9) throw err('need_phone');
    var today = tkDay(now), date = payload.date || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > addDays(today, 90)) throw err('bad_date');
    payload.date = date;
    var q = quote(db, payload, user, ctx);
    if (!q.district) throw err('need_district');
    var address = str(payload.address, 200);
    if (!address) throw err('need_address');
    var gift = null;
    if (payload.gift && payload.gift.on) {
      gift = { to: str(payload.gift.to, 60), phone: str(payload.gift.phone, 20), secret: !!payload.gift.secret, code: code('G'), opened: 0, thanks: '' };
      if (!gift.to) throw err('need_gift_to');
    }
    if (q.isToday) q.lines.forEach(function (l) {
      if (l.type === 'product') { var p = db.products.find(function (x) { return x.id === l.id; }); p.left -= l.qty; }
    });
    if (q.promo) {
      var pr = db.promos.find(function (x) { return x.code.toUpperCase() === q.promo.toUpperCase(); });
      if (pr) pr.used++;
    }
    var o = {
      id: ++db.seq.order, user: user ? user.id : null, name: name, phone: phone, district: q.district, address: address, date: date,
      time: str(payload.time, 20), comment: str(payload.comment, 300), pay: ['cash', 'card'].indexOf(payload.pay) >= 0 ? payload.pay : 'cash',
      lines: q.lines, items: q.items, extras: q.extras, engrave: q.engrave, discount: q.discount, promo: q.promo,
      delivery: q.delivery, total: q.total, wallet: q.wallet, toPay: q.toPay, cashback: q.cashback,
      card: { text: str(payload.cardText, 400), design: str(payload.cardDesign, 20), voice: str(payload.voice, 3000000) },
      gift: gift, preorder: !q.isToday, status: 'new', created: now, history: [{ s: 'new', at: now }], reviewed: false,
      pass: code('', ctx.rnd) + code('', ctx.rnd), photos: []
    };
    if (user) {
      if (q.wallet > 0) tx(db, user, -q.wallet, 'pay', '#' + o.id, now);
      if (!user.phone) user.phone = phone;
      user.scratches = (user.scratches || 0) + 1;
      var lk = (user.luck || []).filter(function (x) { return !x.order; });
      if (lk.length) { o.bonus = lk.map(function (x) { return luckName(db, x.prize); }); lk.forEach(function (x) { x.order = o.id; }); }
    }
    db.orders.push(o);
    ctx.events.push({ type: 'order_new', order: o, user: user || null });
    return o;
  }

  function setStatus(db, id, status, ctx) {
    var o = db.orders.find(function (x) { return x.id === int(id); });
    if (!o) throw err('no_order');
    if (STATUSES.indexOf(status) < 0) throw err('bad_status');
    if (o.status === status) return o;
    if (o.status === 'delivered' || o.status === 'cancelled') throw err('final');
    var u = o.user ? findUser(db, o.user) : null;
    if (status === 'cancelled') {
      if (u && o.wallet > 0) tx(db, u, o.wallet, 'refund', '#' + o.id, ctx.now);
      if (!o.preorder && o.date === db.stockDay) o.lines.forEach(function (l) {
        if (l.type === 'product') { var p = db.products.find(function (x) { return x.id === l.id; }); if (p) p.left += l.qty; }
      });
    }
    if (status === 'delivered' && u) {
      u.spent = (u.spent || 0) + o.total;
      if (o.cashback > 0) tx(db, u, o.cashback, 'cashback', '#' + o.id, ctx.now);
    }
    o.status = status;
    o.history.push({ s: status, at: ctx.now });
    ctx.events.push({ type: 'order_status', order: o, user: u });
    return o;
  }

  /* ---------- public views ---------- */
  function publicUser(db, u, now) {
    if (!u) return null;
    return { id: u.id, name: u.name, username: u.username, photo: u.photo, phone: u.phone, balance: u.balance, tg: !!u.tgId,
      nextBonusAt: (u.lastBonus || 0) + DAY, nextWheelAt: (u.lastWheel || 0) + 7 * DAY, scratches: u.scratches || 0,
      level: level(db, u), cashback: cashbackPct(db, u), dates: u.dates || [], birthday: u.birthday || '', fav: u.fav || [],
      isBirthday: !!(u.birthday && tkDay(now).slice(5) === u.birthday) };
  }

  function badges(db, u) {
    var os = db.orders.filter(function (o) { return o.user === u.id; }), del = os.filter(function (o) { return o.status === 'delivered'; });
    var has = function (f) { return os.some(f); }, lines = function (f) { return os.some(function (o) { return o.lines.some(f); }); };
    return [
      { id: 'first', on: del.length >= 1 },
      { id: 'regular', on: os.length >= 5 },
      { id: 'boxmaster', on: lines(function (l) { return l.type === 'box'; }) },
      { id: 'barmaker', on: lines(function (l) { return l.type === 'bar'; }) },
      { id: 'tea', on: lines(function (l) { return l.type === 'product' && (db.products.find(function (p) { return p.id === l.id; }) || {}).cat === 'choy'; }) },
      { id: 'giver', on: has(function (o) { return !!o.gift; }) },
      { id: 'reviewer', on: db.reviews.some(function (r) { return r.user === u.id; }) },
      { id: 'lucky', on: !!u.lastWheel },
      { id: 'early', on: has(function (o) { return o.preorder; }) },
      { id: 'golden', on: level(db, u).id === 'gold' }
    ];
  }

  function catalog(db, ctx) {
    ensureDay(db, ctx);
    var s = db.settings, now = ctx.now, did = dealId(db, now);
    return {
      products: db.products.filter(function (p) { return p.active; }).map(function (p) {
        var o = Object.assign({}, p); o.deal = p.id === did; o.dealPrice = unitPrice(db, p, now);
        o.locked = !!(p.dropAt && p.dropAt > now); return o;
      }),
      settings: {
        brand: s.brand || 'Bloom & Cacao', kits: s.kits || [], cupItems: s.cupItems || [], bonbon: s.bonbon, luckOn: !!(s.luck && s.luck.on),
        cashbackPercent: s.cashbackPercent, levels: s.levels, piecePrice: s.piecePrice, boxSizes: s.boxSizes, packaging: s.packaging,
        ribbons: s.ribbons, flavors: s.flavors, bars: s.bars, toppings: s.toppings, maxToppings: s.maxToppings,
        toyPacks: s.toyPacks, toyMinGuests: s.toyMinGuests, toyDiscountFrom: s.toyDiscountFrom, toyDiscount: s.toyDiscount,
        clubPlans: s.clubPlans.map(function (p) { return { months: p.months, discount: p.discount, price: clubPrice(db, p.months) }; }),
        clubBoxSize: s.clubBoxSize, engravePrice: s.engravePrice, dealPercent: s.dealPercent, birthdayPercent: s.birthdayPercent,
        deliveryFees: s.deliveryFees, cardNumber: s.cardNumber, cardOwner: s.cardOwner, phone: s.phone, address: s.address,
        instagram: s.instagram, telegram: s.telegram, channel: s.channel, stickers: s.stickers, season: s.season, faq: s.faq,
        bonusMin: s.bonusMin, bonusMax: s.bonusMax,
        holidayPromo: s.holidayPromo.on ? { code: s.holidayPromo.code, percent: s.holidayPromo.percent, daysBefore: s.holidayPromo.daysBefore } : null
      },
      holiday: nextHoliday(db, now),
      dealId: did,
      classes: db.classes.filter(function (c) { return c.date >= tkDay(now); }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }),
      reviews: db.reviews.filter(function (r) { return r.status === 'approved'; }).slice(-30).reverse()
        .map(function (r) { return { id: r.id, name: r.name, stars: r.stars, text: r.text, photo: r.photo, at: r.at }; }),
      today: tkDay(now), msToMidnight: msToMidnight(now), now: now,
      wheel: WHEEL.map(function (w) { return { t: w.t, v: w.v }; })
    };
  }

  /* ---- "omad qogʻozchasi": courier's paper notes -> bonus added to the next order; collect shokolad + bezak + qolip = own bon-bon set ---- */
  var LUCK_KINDS = ['shokolad', 'bezak', 'qolip'];
  function luckPrize(db, id) { return ((db.settings.luck || {}).prizes || []).find(function (x) { return x.id === id; }); }
  function luckName(db, id) { var p = luckPrize(db, id); return p ? p.name.uz : id; }
  function luckInfo(db, u) {
    var list = (u.luck || []).map(function (x) { var p = luckPrize(db, x.prize) || { kind: '', name: { uz: x.prize, ru: x.prize, en: x.prize } }; return { prize: x.prize, kind: p.kind, name: p.name, at: x.at, order: x.order || null }; });
    var have = LUCK_KINDS.filter(function (k) { return list.some(function (x) { return x.kind === k; }); });
    return { list: list.reverse(), have: have, kinds: LUCK_KINDS, complete: have.length === LUCK_KINDS.length };
  }
  function luckGen(db, n, rnd) {
    var ps = ((db.settings.luck || {}).prizes || []).filter(function (p) { return (p.w || 0) > 0; }), out = [];
    if (!ps.length) throw err('luck_none');
    var tot = ps.reduce(function (a, p) { return a + p.w; }, 0);
    for (var i = 0; i < n; i++) {
      var r = rnd() * tot, p = ps[0];
      for (var j = 0; j < ps.length; j++) { r -= ps[j].w; if (r < 0) { p = ps[j]; break; } }
      var c; do { c = code('L', rnd); } while (db.luckCodes.some(function (x) { return x.code === c; }));
      var it = { code: c, prize: p.id, made: Date.now(), used: null, at: 0 }; db.luckCodes.push(it); out.push(it);
    }
    return out;
  }
  function me(db, u, ctx) {
    // birthday gift: issue once per year within the birthday day
    var now = ctx.now;
    if (u.birthday && tkDay(now).slice(5) === u.birthday) {
      var yr = +tkDay(now).slice(0, 4);
      if (u.bdayYear !== yr) { u.bdayYear = yr; issuePromo(db, u, db.settings.birthdayPercent, 'birthday', now, 7); ctx.events.push({ type: 'birthday', user: u }); }
    }
    return {
      user: publicUser(db, u, now),
      orders: db.orders.filter(function (o) { return o.user === u.id; }).slice(-30).reverse().map(function (o) {
        var c = Object.assign({}, o); c.card = { text: o.card.text, design: o.card.design, voice: !!o.card.voice }; return c;
      }),
      txs: db.txs.filter(function (t) { return t.user === u.id; }).slice(-50).reverse(),
      topups: db.topups.filter(function (t) { return t.user === u.id; }).slice(-10).reverse(),
      promos: db.promos.filter(function (p) { return p.user === u.id && (!p.maxUses || p.used < p.maxUses) && (!p.until || p.until > now); }),
      badges: badges(db, u),
      wish: db.wishlists.find(function (w) { return w.user === u.id; }) || null,
      notify: db.notify.filter(function (n) { return n.user === u.id; }).map(function (n) { return n.product; }),
      luck: luckInfo(db, u)
    };
  }

  /* ---------- AI gift helper (rule-based fallback; server may replace with Claude) ---------- */
  function suggest(db, text, ctx) {
    var t = String(text || '').toLowerCase(), now = ctx.now;
    var m = t.replace(/\s/g, '').match(/(\d{2,7})(000|k|ming|тыс)?/);
    var budget = m ? int(m[1]) * (m[2] ? 1000 : 1) : 0;
    if (budget && budget < 1000) budget *= 1000;
    var prods = db.products.filter(function (p) { return p.active && !(p.dropAt > now) && p.left > 0; })
      .map(function (p) { return { id: p.id, price: unitPrice(db, p, now), cat: p.cat }; });
    var tea = /choy|чай|tea/.test(t), choc = /shokolad|шоколад|chocolate|bon/.test(t);
    prods.sort(function (a, b) {
      var sa = (tea && a.cat === 'choy' ? -1 : 0) + (choc && a.cat !== 'choy' ? -1 : 0);
      var sb = (tea && b.cat === 'choy' ? -1 : 0) + (choc && b.cat !== 'choy' ? -1 : 0);
      return sa - sb || b.price - a.price;
    });
    var pickList = [], sum = 0, cap = budget || 300000;
    prods.forEach(function (p) { if (sum + p.price <= cap && pickList.length < 4) { pickList.push(p.id); sum += p.price; } });
    if (!pickList.length && prods.length) { var c = prods.slice().sort(function (a, b) { return a.price - b.price; })[0]; pickList.push(c.id); sum = c.price; }
    return { items: pickList, sum: sum, budget: budget, reason: '' };
  }

  /* ---------- daily channel post (template; the server may let Claude write it) ---------- */
  function postData(db, ctx) {
    ensureDay(db, ctx);
    var now = ctx.now, did = dealId(db, now), hol = nextHoliday(db, now);
    var prods = db.products.filter(function (p) { return p.active && !(p.dropAt > now); }).map(function (p) { return { id: p.id, name: p.name.uz, price: unitPrice(db, p, now), old: p.price, left: p.left, deal: p.id === did, img: p.img }; });
    return { brand: db.settings.brand, products: prods, deal: prods.find(function (p) { return p.deal; }) || null, holiday: hol, holidayPromo: db.settings.holidayPromo, kits: (db.settings.kits || []).map(function (k) { return { name: k.name.uz, price: k.price }; }) };
  }
  var HOLN = { newyear: 'Yangi yil', women: '8-mart', navruz: 'Navroʻz', independence: 'Mustaqillik kuni', teachers: 'Ustozlar kuni' };
  function fmtN(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function postText(d, url) {
    var lines = ['☀️ Xayrli tong! ' + d.brand + ' bugungi menyusi:', ''];
    d.products.forEach(function (p) { if (p.left > 0) lines.push((p.deal ? '✨ ' : '🍫 ') + p.name + ' — ' + fmtN(p.price) + ' soʻm' + (p.deal ? ' (oʻrniga ' + fmtN(p.old) + ')' : '') + ' · qoldi ' + p.left + ' ta'); });
    if (d.deal) lines.push('', '✨ Kun shokoladi: ' + d.deal.name + ' — bugun arzonroq!');
    if (d.kits.length) lines.push('', '🎁 Tajriba bokslari: ' + d.kits.map(function (k) { return k.name + ' (' + fmtN(k.price) + ')'; }).join(', '));
    if (d.holiday && d.holiday.days <= 30) {
      var hn = HOLN[d.holiday.id] || (d.holiday.name && d.holiday.name.uz) || 'Bayram';
      lines.push('', '🎉 ' + hn + 'gacha ' + d.holiday.days + ' kun qoldi' + (d.holidayPromo && d.holidayPromo.on && d.holiday.days <= d.holidayPromo.daysBefore ? ' — ' + d.holidayPromo.code + ' promokodi bilan −' + d.holidayPromo.percent + '%' : '') + '!');
    }
    lines.push('', '🛍 Buyurtma: ' + (url || 'saytimizda'));
    return lines.join('\n');
  }
  /* ---------- AI assistants: rule-based fallback (server replaces with Claude when a key is set) ---------- */
  var KW = {
    color: [['pink', /pushti|розов|pink/], ['ruby', /qizil|yoqut|красн|рубин|red|ruby/], ['sky', /moviy|ko.k|голуб|син|blue/], ['emerald', /yashil|зел[её]н|green|zumrad/],
      ['gold', /oltin|золот|gold/], ['violet', /binafsha|фиолет|сирен|purple|violet/], ['orange', /apelsin|оранж|orange/], ['pearl', /\boq\b|marvarid|бел|жемч|white|pearl/]],
    shape: [['heart', /yurak|серд|heart|sevgi|любов|love/], ['star', /yulduz|звезд|star/], ['flower', /\bgul|цвет|flower/], ['sphere', /\bshar|шар|sphere|ball/],
      ['square', /kvadrat|квадрат|square/], ['gem', /olmos|бриллиант|алмаз|gem|diamond/], ['dome', /gumbaz|купол|dome/]],
    finish: [['marble', /marmar|мрамор|marble/], ['splash', /sachrat|брызг|splash/], ['metal', /metall|металл|metal|shiny/], ['ombre', /ombre|омбре|ombr/], ['gloss', /yaltiroq|глянц|gloss/]],
    l1: [['malina', /malina|малин|raspberr/], ['olcha', /olcha|вишн|cherr/], ['karamel', /karamel|карамел|caramel/], ['asal', /asal|м[её]д|honey/]],
    l2: [['pista', /pista|фисташ|pistach/], ['yalpiz', /yalpiz|мят|mint/], ['yongoq', /yong.oq|орех|nut|walnut/], ['vanil', /vanil|ванил/]],
    shell: [['white', /oq shokolad|бел.. шокол|white chocolate/], ['milk', /sutli|молочн|milk/], ['dark', /qora|т[её]мн|горьк|dark/]]
  };
  function pickKw(list, t) { for (var i = 0; i < list.length; i++) if (list[i][1].test(t)) return list[i][0]; return null; }
  function aiRule(db, b, ctx) {
    var t = String(b.text || '').toLowerCase(), s = db.settings;
    if (b.mode === 'craft') {
      if (/kino|кино|фильм|movie|film|fondu|фондю|botir|макат/.test(t)) {
        var cups = []; s.cupItems.forEach(function (c) { var re = new RegExp(c.name.uz.toLowerCase().slice(0, 4) + '|' + c.name.ru.toLowerCase().slice(0, 4) + '|' + c.name.en.toLowerCase().slice(0, 4)); if (re.test(t) && cups.length < 2) cups.push(c.id); });
        while (cups.length < 2) cups.push(cups.length ? 'karamel' : 'choksous');
        return { kind: 'kit', kit: { kit: 'kino', cups: cups } };
      }
      if (/(boks|набор|kit|to.plam).*(yasa|сдела|make)|(yasa|сдела|make).*(boks|набор|kit)/.test(t)) return { kind: 'kit', kit: { kit: 'bonbon', cups: ['malina', 'pista'] } };
      var o = { shape: pickKw(KW.shape, t), color: pickKw(KW.color, t), finish: pickKw(KW.finish, t), l1: pickKw(KW.l1, t), l2: pickKw(KW.l2, t), shell: pickKw(KW.shell, t) };
      var occ = /onam|ona|мам|mum|mom/.test(t) ? { shape: 'heart', color: 'pink', finish: 'marble' } : /sevgil|любим|girlfriend|wife|xotin|жен/.test(t) ? { shape: 'heart', color: 'ruby', finish: 'gloss' }
        : /tug.ilgan|день рожд|birthday/.test(t) ? { shape: 'star', color: 'gold', finish: 'metal' } : /dada|отец|пап|dad|erkak|муж|boss|rahbar|начальн/.test(t) ? { shape: 'square', color: 'natural', finish: 'metal', shell: 'dark' }
        : /ustoz|учител|teacher/.test(t) ? { shape: 'flower', color: 'emerald', finish: 'splash' } : {};
      var d = { shape: 'dome', color: 'ruby', finish: 'splash', shell: 'dark', l1: 'malina', l2: 'pista', dust: 'malina' };
      Object.keys(d).forEach(function (k) { if (o[k]) d[k] = o[k]; else if (occ[k]) d[k] = occ[k]; });
      if (d.color === 'gold' || d.finish === 'metal') d.dust = 'oltin';
      var m = t.match(/(\d{1,3})\s*(ta|dona|шт|pcs|штук)?/); d.qty = m ? Math.max(1, Math.min(50, +m[1])) : 6;
      return { kind: 'bonbon', bonbon: d };
    }
    var faq = [/yetkaz|достав|deliver|tuman|район/, /to.lov|оплат|pay|karta|карт/, /oldindan|заран|предзаказ|pre-?order/, /keshbek|кешб|cashback|bonus|бонус/, /saqla|хран|store|keep/, /sovg.a.*(yubor|odamga)|подар.*(друг|отправ)|send.*gift/];
    for (var i = 0; i < faq.length; i++) if (faq[i].test(t)) return { kind: 'faq', idx: i };
    var sg = suggest(db, b.text, ctx);
    return { kind: 'products', items: sg.items, sum: sg.sum, budget: sg.budget };
  }

  /* ---------- dispatcher ---------- */
  function needUser(ctx) { if (!ctx.user) throw err('need_login'); return ctx.user; }
  function needAdmin(ctx) { if (!ctx.admin) throw err('forbidden'); }

  var R = {
    catalog: function (db, b, ctx) { return catalog(db, ctx); },
    quote: function (db, b, ctx) { return quote(db, b, ctx.user, ctx); },
    order: function (db, b, ctx) { return createOrder(db, b, ctx.user, ctx); },
    me: function (db, b, ctx) { return me(db, needUser(ctx), ctx); },
    demoLogin: function (db, b, ctx) {
      var name = str(b.name, 60); if (!name) throw err('need_name');
      var u = upsertUser(db, { name: name, phone: str(b.phone, 20) }, ctx); return { uid: u.id };
    },
    bonus: function (db, b, ctx) {
      var u = needUser(ctx), s = db.settings;
      if (ctx.now < (u.lastBonus || 0) + DAY) throw err('wait', (u.lastBonus || 0) + DAY);
      var amount = Math.round((s.bonusMin + ctx.rnd() * (s.bonusMax - s.bonusMin)) / 100) * 100;
      u.lastBonus = ctx.now; tx(db, u, amount, 'bonus', 'daily', ctx.now);
      return { amount: amount, balance: u.balance };
    },
    wheel: function (db, b, ctx) {
      var u = needUser(ctx);
      if (ctx.now < (u.lastWheel || 0) + 7 * DAY) throw err('wait', (u.lastWheel || 0) + 7 * DAY);
      var i = pick(WHEEL, ctx.rnd()), w = WHEEL[i], res = { index: i, t: w.t, v: w.v };
      u.lastWheel = ctx.now;
      if (w.t === 'coins') { tx(db, u, w.v, 'wheel', '', ctx.now); res.balance = u.balance; }
      else res.code = issuePromo(db, u, w.v, 'wheel', ctx.now, 14).code;
      return res;
    },
    scratch: function (db, b, ctx) {
      var u = needUser(ctx);
      if (!(u.scratches > 0)) throw err('no_scratch');
      u.scratches--;
      var w = SCRATCH[pick(SCRATCH, ctx.rnd())], res = { t: w.t, v: w.v, left: u.scratches };
      if (w.t === 'coins') { tx(db, u, w.v, 'scratch', '', ctx.now); res.balance = u.balance; }
      else res.code = issuePromo(db, u, w.v, 'scratch', ctx.now, 14).code;
      return res;
    },
    topup: function (db, b, ctx) {
      var u = needUser(ctx), amount = int(b.amount);
      if (amount < 10000 || amount > 10000000) throw err('bad_amount');
      var t = { id: ++db.seq.topup, user: u.id, amount: amount, status: 'pending', at: ctx.now };
      db.topups.push(t); ctx.events.push({ type: 'topup_new', topup: t, user: u });
      return t;
    },
    review: function (db, b, ctx) {
      var u = needUser(ctx), o = db.orders.find(function (x) { return x.id === int(b.order) && x.user === u.id; });
      if (!o || o.status !== 'delivered') throw err('no_order');
      if (o.reviewed) throw err('already');
      var r = { id: ++db.seq.review, user: u.id, order: o.id, name: u.name, stars: Math.max(1, Math.min(5, int(b.stars))),
        text: str(b.text, 600), photo: str(b.photo, 900000), status: 'pending', at: ctx.now };
      if (!r.text) throw err('need_text');
      o.reviewed = true; db.reviews.push(r); ctx.events.push({ type: 'review_new', review: r });
      return { id: r.id };
    },
    notify: function (db, b, ctx) {
      var u = needUser(ctx), p = db.products.find(function (x) { return x.id === b.product; });
      if (!p) throw err('no_product');
      if (!db.notify.some(function (n) { return n.user === u.id && n.product === p.id; })) db.notify.push({ user: u.id, product: p.id, at: ctx.now });
      return { ok: true };
    },
    profile: function (db, b, ctx) {
      var u = needUser(ctx);
      if (b.birthday != null) { if (b.birthday && !mdOk(b.birthday)) throw err('bad_date'); u.birthday = b.birthday; }
      if (b.dates) u.dates = b.dates.filter(function (d) { return d && str(d.name, 40) && mdOk(d.md); }).slice(0, 12).map(function (d) { return { name: str(d.name, 40), md: d.md }; });
      if (b.fav) u.fav = b.fav.filter(function (id) { return db.products.some(function (p) { return p.id === id; }); }).slice(0, 50);
      if (b.phone != null) u.phone = str(b.phone, 20);
      return publicUser(db, u, ctx.now);
    },
    wishSave: function (db, b, ctx) {
      var u = needUser(ctx), w = db.wishlists.find(function (x) { return x.user === u.id; });
      var items = (b.items || []).filter(function (id) { return db.products.some(function (p) { return p.id === id; }); }).slice(0, 20);
      if (!w) { w = { code: code('W').toLowerCase(), user: u.id }; db.wishlists.push(w); }
      w.items = items; w.name = u.name; w.note = str(b.note, 140); w.at = ctx.now;
      return w;
    },
    wishView: function (db, b, ctx) {
      var w = db.wishlists.find(function (x) { return x.code === str(b.code, 20).toLowerCase(); });
      if (!w) throw err('not_found');
      return { name: w.name, note: w.note, items: w.items };
    },
    giftView: function (db, b, ctx) {
      var c = str(b.code, 12).toUpperCase(), o = db.orders.find(function (x) { return x.gift && x.gift.code === c; });
      if (!o) throw err('not_found');
      return { to: o.gift.to, from: o.gift.secret ? null : o.name, text: o.card.text, design: o.card.design, voice: o.card.voice || '',
        opened: o.gift.opened, thanks: o.gift.thanks, lines: o.lines.map(function (l) { return { type: l.type, id: l.id, name: l.name, size: l.size, qty: l.qty }; }) };
    },
    passport: function (db, b, ctx) {
      var o = db.orders.find(function (x) { return x.pass && x.pass === str(b.code, 16).toUpperCase(); });
      if (!o || o.status === 'cancelled') throw err('not_found');
      var made = (o.history || []).filter(function (h) { return h.s === 'accepted'; })[0];
      return { id: o.id, brand: db.settings.brand, maker: db.settings.maker, storage: db.settings.storage, made: made ? made.at : o.created, date: o.date,
        lines: o.lines.map(function (l) { var c = Object.assign({}, l); delete c.sum; delete c.price; return c; }),
        photos: o.photos || [], engrave: o.engrave || '', rated: !!o.reviewed, first: String(o.name || '').split(' ')[0] };
    },
    passportRate: function (db, b, ctx) {
      var o = db.orders.find(function (x) { return x.pass && x.pass === str(b.code, 16).toUpperCase(); });
      if (!o || o.status === 'cancelled') throw err('not_found');
      if (o.reviewed) throw err('already');
      var r = { id: ++db.seq.review, user: o.user, order: o.id, name: str(b.name, 40) || String(o.name || '').split(' ')[0], stars: Math.max(1, Math.min(5, int(b.stars))),
        text: str(b.text, 600), photo: '', status: 'pending', at: ctx.now, via: 'qr' };
      if (!r.text) r.text = '★'.repeat(r.stars);
      o.reviewed = true; db.reviews.push(r); ctx.events.push({ type: 'review_new', review: r });
      return { id: r.id };
    },
    giftThanks: function (db, b, ctx) {
      var c = str(b.code, 12).toUpperCase(), o = db.orders.find(function (x) { return x.gift && x.gift.code === c; });
      if (!o) throw err('not_found');
      if (!o.gift.opened) o.gift.opened = ctx.now;
      if (b.text) o.gift.thanks = str(b.text, 300);
      ctx.events.push({ type: 'gift_opened', order: o, user: o.user ? findUser(db, o.user) : null });
      return { ok: true };
    },
    lead: function (db, b, ctx) {
      var l = { id: ++db.seq.lead, company: str(b.company, 100), name: str(b.name, 60), phone: str(b.phone, 20), qty: int(b.qty),
        budget: str(b.budget, 40), date: str(b.date, 10), comment: str(b.comment, 600), logo: str(b.logo, 900000), status: 'new', at: ctx.now };
      if (!l.company || !l.phone) throw err('need_fields');
      db.leads.push(l); ctx.events.push({ type: 'lead_new', lead: l });
      return { id: l.id };
    },
    book: function (db, b, ctx) {
      var c = db.classes.find(function (x) { return x.id === int(b.cls); });
      if (!c) throw err('not_found');
      var seats = Math.max(1, Math.min(10, int(b.seats) || 1));
      if (c.booked + seats > c.seats) throw err('full');
      var name = str(b.name, 60), phone = str(b.phone, 20);
      if (!name || phone.replace(/\D/g, '').length < 9) throw err('need_fields');
      c.booked += seats;
      var bk = { id: ++db.seq.booking, cls: c.id, name: name, phone: phone, seats: seats, user: ctx.user ? ctx.user.id : null, at: ctx.now };
      db.bookings.push(bk); ctx.events.push({ type: 'booking_new', booking: bk, cls: c });
      return bk;
    },
    chatSend: function (db, b, ctx) {
      var key = ctx.user ? ctx.user.id : 'g:' + str(b.guest, 40);
      if (key === 'g:') throw err('need_guest');
      var text = str(b.text, 1000); if (!text) throw err('empty');
      var c = db.chats.find(function (x) { return x.key === key; });
      if (!c) { c = { id: ++db.seq.chat, key: key, name: ctx.user ? ctx.user.name : str(b.name, 60) || 'Mehmon', msgs: [], unread: 0 }; db.chats.push(c); }
      c.msgs.push({ from: 'user', text: text, at: ctx.now }); c.msgs = c.msgs.slice(-200); c.unread++; c.at = ctx.now;
      ctx.events.push({ type: 'chat_msg', chat: c, text: text });
      return { msgs: c.msgs };
    },
    chatGet: function (db, b, ctx) {
      var key = ctx.user ? ctx.user.id : 'g:' + str(b.guest, 40);
      var c = db.chats.find(function (x) { return x.key === key; });
      return { msgs: c ? c.msgs : [] };
    },
    luck: function (db, b, ctx) {
      var u = needUser(ctx), c = str(b.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c && c.charAt(0) !== 'L') c = 'L' + c;
      var it = (db.luckCodes || []).find(function (x) { return x.code === c; });
      if (!it) throw err('luck_bad');
      if (it.used) throw err(it.used === u.id ? 'luck_mine' : 'luck_used');
      it.used = u.id; it.at = ctx.now;
      u.luck = u.luck || []; u.luck.push({ prize: it.prize, code: it.code, at: ctx.now, order: null });
      var info = luckInfo(db, u), p = luckPrize(db, it.prize);
      ctx.events.push({ type: 'luck', user: u, prize: p ? p.name.uz : it.prize, complete: info.complete });
      return { prize: p ? p.name : { uz: it.prize, ru: it.prize, en: it.prize }, kind: p ? p.kind : '', luck: info };
    },
    suggest: function (db, b, ctx) { return suggest(db, b.text, ctx); },
    ai: function (db, b, ctx) { return aiRule(db, b, ctx); },

    /* ----- admin ----- */
    'admin.data': function (db, b, ctx) {
      needAdmin(ctx); ensureDay(db, ctx);
      return { settings: db.settings, products: db.products, orders: db.orders.slice(-300).reverse(), topups: db.topups.slice(-200).reverse(),
        users: db.users.map(function (u) { return Object.assign({}, publicUser(db, u, ctx.now), { created: u.created, spent: u.spent || 0 }); }),
        reviews: db.reviews.slice(-200).reverse(), promos: db.promos.slice(-300).reverse(), leads: db.leads.slice(-200).reverse(),
        chats: db.chats.slice().sort(function (a, b2) { return (b2.at || 0) - (a.at || 0); }).slice(0, 100),
        classes: db.classes, bookings: db.bookings.slice(-300).reverse(), today: tkDay(ctx.now), dealId: dealId(db, ctx.now),
        holiday: nextHoliday(db, ctx.now), luckCodes: (db.luckCodes || []).slice(-400).reverse() };
    },
    'admin.luckGen': function (db, b, ctx) { needAdmin(ctx); return luckGen(db, Math.max(1, Math.min(60, int(b.n) || 6)), ctx.rnd); },
    'admin.luckPrizes': function (db, b, ctx) {
      needAdmin(ctx); var L3 = function (o) { return { uz: str(o && o.uz, 80), ru: str(o && o.ru, 80) || str(o && o.uz, 80), en: str(o && o.en, 80) || str(o && o.uz, 80) }; };
      if (typeof b.on === 'boolean') db.settings.luck.on = b.on;
      if (Array.isArray(b.prizes)) db.settings.luck.prizes = b.prizes.slice(0, 20).filter(function (p) { return p && p.id && p.name && p.name.uz; }).map(function (p) {
        return { id: str(p.id, 20).replace(/[^a-z0-9_]/gi, ''), kind: LUCK_KINDS.indexOf(p.kind) >= 0 ? p.kind : 'bezak', w: Math.max(0, Math.min(10, int(p.w))), name: L3(p.name) };
      });
      return db.settings.luck;
    },
    'admin.product': function (db, b, ctx) {
      needAdmin(ctx);
      var ex = b.id && db.products.find(function (x) { return x.id === b.id; }), wasLeft = ex ? ex.left : 0;
      var clean = { id: ex ? ex.id : 'p' + ctx.now.toString(36), cat: ['shok', 'choy', 'boks', 'zefir'].indexOf(b.cat) >= 0 ? b.cat : 'shok',
        price: Math.max(0, int(b.price)), total: Math.max(0, int(b.total)), img: str(b.img || (ex && ex.img) || 'img/p1.jpg', 2000000),
        active: b.active !== false, name: L3(b.name, 120), sub: L3(b.sub, 120), holiday: str(b.holiday, 20), dropAt: Math.max(0, int(b.dropAt)) };
      clean.left = ex ? Math.max(0, Math.min(ex.left + (clean.total - ex.total), clean.total)) : clean.total;
      if (b.left != null && b.left !== '') clean.left = Math.max(0, Math.min(int(b.left), clean.total));
      if (ex) Object.assign(ex, clean); else { db.products.push(clean); ex = clean; }
      if (wasLeft <= 0 && ex.left > 0) restocked(db, ex, ctx);
      return ex;
    },
    'admin.productDelete': function (db, b, ctx) { needAdmin(ctx); db.products = db.products.filter(function (p) { return p.id !== b.id; }); return { ok: true }; },
    'admin.settings': function (db, b, ctx) {
      needAdmin(ctx); var t = db.settings;
      ['cashbackPercent', 'bonusMin', 'bonusMax', 'piecePrice', 'engravePrice', 'dealPercent', 'birthdayPercent', 'toyMinGuests', 'toyDiscountFrom', 'toyDiscount']
        .forEach(function (k) { if (b[k] != null && b[k] !== '') t[k] = Math.max(0, int(b[k])); });
      if (t.bonusMax < t.bonusMin) t.bonusMax = t.bonusMin;
      t.cashbackPercent = Math.min(t.cashbackPercent, 50); t.dealPercent = Math.min(t.dealPercent, 90);
      ['cardNumber', 'cardOwner', 'phone', 'address', 'instagram', 'telegram', 'channel', 'stickers', 'dealPin'].forEach(function (k) { if (b[k] != null) t[k] = str(b[k], 200); });
      if (['auto', 'snow', 'petals', 'leaves', 'fireworks', 'sparkle', 'off'].indexOf(b.season) >= 0) t.season = b.season;
      if (b.deliveryFees) DISTRICTS.forEach(function (d) { if (b.deliveryFees[d] != null) t.deliveryFees[d] = Math.max(0, int(b.deliveryFees[d])); });
      if (b.packaging) b.packaging.forEach(function (p) { var x = t.packaging.find(function (y) { return y.id === p.id; }); if (x) x.price = Math.max(0, int(p.price)); });
      if (b.bars) b.bars.forEach(function (p) { var x = t.bars.find(function (y) { return y.id === p.id; }); if (x) x.price = Math.max(0, int(p.price)); });
      if (b.toppings) b.toppings.forEach(function (p) { var x = t.toppings.find(function (y) { return y.id === p.id; }); if (x) x.price = Math.max(0, int(p.price)); });
      if (b.brand != null && str(b.brand, 40)) t.brand = str(b.brand, 40);
      if (b.maker != null) t.maker = str(b.maker, 40);
      if (b.storage != null) t.storage = str(b.storage, 400);
      if (b.kits) b.kits.forEach(function (p) { var x = (t.kits || []).find(function (y) { return y.id === p.id; }); if (x) { x.price = Math.max(0, int(p.price)); if (p.name) x.name = L3(p.name, 80); if (p.items) x.items = L3(p.items, 300); } });
      if (b.cupItems) b.cupItems.forEach(function (p) { var x = (t.cupItems || []).find(function (y) { return y.id === p.id; }); if (x) { x.price = Math.max(0, int(p.price)); if (p.name && p.name.uz) x.name = L3(p.name, 60); } });
      if (b.newCup && str(b.newCup.name, 60)) t.cupItems.push({ id: 'c' + ctx.now.toString(36), price: Math.max(0, int(b.newCup.price)), color: /^#[0-9a-f]{6}$/i.test(b.newCup.color) ? b.newCup.color : '#c98a3c', name: L3({ uz: b.newCup.name }, 60) });
      if (b.bonbonPrice != null && b.bonbonPrice !== '') t.bonbon.price = Math.max(0, int(b.bonbonPrice));
      if (b.agents) { t.agents = t.agents || {}; t.agents.sales = !!b.agents.sales; t.agents.autopost = !!b.agents.autopost; t.agents.postHour = Math.max(0, Math.min(23, int(b.agents.postHour))); }
      if (b.toyPacks) b.toyPacks.forEach(function (p) { var x = t.toyPacks.find(function (y) { return y.id === p.id; }); if (x) x.wrap = Math.max(0, int(p.wrap)); });
      if (b.clubPlans) b.clubPlans.forEach(function (p) { var x = t.clubPlans.find(function (y) { return y.months === int(p.months); }); if (x) x.discount = Math.max(0, Math.min(90, int(p.discount))); });
      if (b.levels) b.levels.forEach(function (p) { var x = t.levels.find(function (y) { return y.id === p.id; }); if (x) { x.min = Math.max(0, int(p.min)); x.bonus = Math.max(0, Math.min(30, int(p.bonus))); } });
      if (b.holidayPromo) { var h = t.holidayPromo; h.code = str(b.holidayPromo.code, 20).toUpperCase() || h.code; h.percent = Math.max(0, Math.min(90, int(b.holidayPromo.percent))); h.daysBefore = Math.max(1, Math.min(60, int(b.holidayPromo.daysBefore))); h.on = !!b.holidayPromo.on; }
      if (b.holidays) t.holidays = b.holidays.filter(function (h) { return h && mdOk(h.md) && str(h.id, 30); }).slice(0, 20).map(function (h) { return { id: str(h.id, 30), md: h.md, name: h.name ? L3(h.name, 40) : undefined }; });
      if (b.faq) t.faq = b.faq.slice(0, 30).map(function (f) { return { q: L3(f.q, 200), a: L3(f.a, 1000) }; }).filter(function (f) { return f.q.uz && f.a.uz; });
      return t;
    },
    'admin.orderPhoto': function (db, b, ctx) {
      needAdmin(ctx);
      var o = db.orders.find(function (x) { return x.id === int(b.id); });
      if (!o) throw err('no_order');
      o.photos = o.photos || [];
      if (b.remove != null) { o.photos.splice(int(b.remove), 1); return o; }
      var url = str(b.url, 3000000); if (!url) throw err('need_photo');
      if (o.photos.length >= 6) throw err('too_many');
      o.photos.push(url);
      ctx.events.push({ type: 'order_photo', order: o, url: url, user: o.user ? findUser(db, o.user) : null });
      return o;
    },
    'admin.status': function (db, b, ctx) { needAdmin(ctx); return setStatus(db, b.id, b.status, ctx); },
    'admin.topup': function (db, b, ctx) {
      needAdmin(ctx);
      var t = db.topups.find(function (x) { return x.id === int(b.id); });
      if (!t) throw err('not_found');
      if (t.status === 'pending') {
        t.status = b.ok ? 'done' : 'rejected';
        var u = findUser(db, t.user);
        if (b.ok && u) tx(db, u, t.amount, 'topup', 'T' + t.id, ctx.now);
        ctx.events.push({ type: 'topup_done', topup: t, user: u });
      }
      return t;
    },
    'admin.adjust': function (db, b, ctx) {
      needAdmin(ctx); var u = findUser(db, b.user); if (!u) throw err('no_user');
      return tx(db, u, int(b.amount), 'admin', str(b.note, 100), ctx.now);
    },
    'admin.review': function (db, b, ctx) {
      needAdmin(ctx);
      var r = db.reviews.find(function (x) { return x.id === int(b.id); }); if (!r) throw err('not_found');
      r.status = b.ok ? 'approved' : 'rejected';
      return r;
    },
    'admin.promo': function (db, b, ctx) {
      needAdmin(ctx);
      var c = str(b.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!c) throw err('need_fields');
      if (db.promos.some(function (p) { return p.code === c; })) throw err('exists');
      var p = { code: c, kind: b.kind === 'amount' ? 'amount' : 'percent', value: Math.max(1, int(b.value)), until: b.until ? Date.parse(b.until + 'T23:59:59+05:00') : 0,
        maxUses: Math.max(0, int(b.maxUses)), used: 0, user: null, note: str(b.note, 100) };
      if (p.kind === 'percent') p.value = Math.min(90, p.value);
      db.promos.push(p); return p;
    },
    'admin.promoDelete': function (db, b, ctx) { needAdmin(ctx); db.promos = db.promos.filter(function (p) { return p.code !== b.code; }); return { ok: true }; },
    'admin.chatReply': function (db, b, ctx) {
      needAdmin(ctx);
      var c = db.chats.find(function (x) { return x.id === int(b.id); }); if (!c) throw err('not_found');
      var text = str(b.text, 1000); if (!text) throw err('empty');
      c.msgs.push({ from: 'admin', text: text, at: ctx.now }); c.unread = 0; c.at = ctx.now;
      ctx.events.push({ type: 'chat_reply', chat: c, text: text });
      return c;
    },
    'admin.class': function (db, b, ctx) {
      needAdmin(ctx);
      var ex = b.id && db.classes.find(function (x) { return x.id === int(b.id); });
      var c = { id: ex ? ex.id : ++db.seq.cls, title: L3(b.title, 120), date: str(b.date, 10), time: str(b.time, 5), place: str(b.place, 120),
        price: Math.max(0, int(b.price)), seats: Math.max(1, int(b.seats)), booked: ex ? ex.booked : 0 };
      if (!c.title.uz || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) throw err('need_fields');
      if (ex) Object.assign(ex, c); else db.classes.push(c);
      return c;
    },
    'admin.classDelete': function (db, b, ctx) { needAdmin(ctx); db.classes = db.classes.filter(function (c) { return c.id !== int(b.id); }); return { ok: true }; },
    'admin.postPreview': function (db, b, ctx) { needAdmin(ctx); return { text: postText(postData(db, ctx), b.url) }; },
    'admin.lead': function (db, b, ctx) { needAdmin(ctx); var l = db.leads.find(function (x) { return x.id === int(b.id); }); if (l) l.status = b.status === 'done' ? 'done' : 'new'; return l; }
  };

  function migrate(db) {
    var sd = seed().settings;
    Object.keys(sd).forEach(function (k) { if (db.settings[k] === undefined) db.settings[k] = sd[k]; });
    if (!db.settings.agents) db.settings.agents = sd.agents;
    ['shapes', 'colors', 'finishes'].forEach(function (k) { if (!db.settings.bonbon[k]) db.settings.bonbon[k] = sd.bonbon[k]; });
    db.products = db.products.filter(function (p) { return !(['p2', 'p3', 'p4'].indexOf(p.id) >= 0 && p.img === 'img/' + p.id + '.jpg'); });
    (db.orders || []).forEach(function (o) { if (!o.pass) o.pass = code('') + code(''); if (!o.photos) o.photos = []; });
    if (!db.luckCodes) db.luckCodes = [];
    (db.settings.kits || []).forEach(function (k) {
      if (k.id === 'kino' && /Kino kechasi/.test(k.name.uz)) { k.name = sd.kits[1].name; }
      if (k.id === 'bonbon' && k.price === 220000) k.price = 149000;
      if (k.id === 'kino' && k.price === 260000) k.price = 179000;
    });
  }
  function handle(db, route, body, ctx) {
    if ((db.mig || 0) < 4) { migrate(db); db.mig = 4; }
    ctx.now = ctx.now || Date.now();
    ctx.rnd = ctx.rnd || Math.random;
    ctx.events = ctx.events || [];
    var f = R[route];
    if (!f) throw err('no_route');
    return f(db, body || {}, ctx);
  }

  var api = { DISTRICTS: DISTRICTS, STATUSES: STATUSES, WHEEL: WHEEL, seed: seed, handle: handle, upsertUser: upsertUser, findUser: findUser,
    postData: postData, postText: postText, tkDay: tkDay, msToMidnight: msToMidnight, addDays: addDays, nextHoliday: nextHoliday, publicUser: publicUser, level: level,
    boxPrice: boxPrice, barPrice: barPrice, toyPrice: toyPrice, clubPrice: clubPrice, routes: Object.keys(R) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MaviLogic = api;
})(typeof window !== 'undefined' ? window : this);
