/* Bloom & Cacao server — zero dependencies (Node 18+).
   Serves the site, keeps data in DATA_DIR/db.json, runs the shared logic, talks to Telegram. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SITE = process.env.SITE_DIR || path.join(ROOT, 'site');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const PORT = +process.env.PORT || 3000;
const BOT = process.env.BOT_TOKEN || '';
const BOT_USERNAME = (process.env.BOT_USERNAME || '').replace(/^@/, '');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
// several admins: ADMIN_PASSWORD (opa), ADMIN_PASSWORD_2 (uka) ...
const ADMIN_PASSWORDS = [ADMIN_PASSWORD, process.env.ADMIN_PASSWORD_2, process.env.ADMIN_PASSWORD_3].filter((p) => p && p.length >= 4);
const ADMIN_CHATS = (process.env.ADMIN_CHAT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
// session secret: env, or a random one generated once and kept on the data disk
const SECRET = process.env.SESSION_SECRET || (() => {
  const f = path.join(DATA, 'secret.key');
  try { return fs.readFileSync(f, 'utf8').trim(); } catch (e) {}
  const k = crypto.randomBytes(32).toString('hex');
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(f, k, { mode: 0o600 }); } catch (e) {}
  return k;
})();
const AI_KEY = process.env.ANTHROPIC_API_KEY || '';
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';
const L = require(path.join(SITE, 'js', 'logic.js'));

fs.mkdirSync(UPLOADS, { recursive: true });

/* ---------------- storage ---------------- */
const DB_FILE = path.join(DATA, 'db.json');
let db;
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { db = L.seed(); }
if (db.v !== 2) db = L.seed();
db.tgMap = db.tgMap || {};
db.reminded = db.reminded || {};
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 200);
}
function backup() {
  const f = path.join(DATA, 'backup-' + L.tkDay() + '.json');
  if (!fs.existsSync(f)) { try { fs.writeFileSync(f, JSON.stringify(db)); } catch (e) {} }
  fs.readdirSync(DATA).filter((n) => /^backup-/.test(n)).sort().slice(0, -14).forEach((n) => fs.unlinkSync(path.join(DATA, n)));
}

/* ---------------- tokens ---------------- */
function sign(payload) { const b = Buffer.from(JSON.stringify(payload)).toString('base64url'); return b + '.' + crypto.createHmac('sha256', SECRET).update(b).digest('base64url'); }
function verify(tok) {
  if (!tok) return null;
  const [b, s] = String(tok).split('.');
  if (!b || !s) return null;
  const good = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  if (s.length !== good.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(good))) return null;
  try { const p = JSON.parse(Buffer.from(b, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch (e) { return null; }
}
function checkWebApp(initData) {
  if (!BOT || !initData) return null;
  const p = new URLSearchParams(String(initData)), hash = p.get('hash'); if (!hash) return null;
  p.delete('hash');
  const str = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n');
  const key = crypto.createHmac('sha256', 'WebAppData').update(BOT).digest();
  const h = crypto.createHmac('sha256', key).update(str).digest('hex');
  if (h.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash))) return null;
  if (Date.now() / 1000 - +p.get('auth_date') > 86400) return null;
  try { return JSON.parse(p.get('user')); } catch (e) { return null; }
}
function checkTelegram(d) {
  if (!BOT || !d || !d.hash) return false;
  const str = Object.keys(d).filter((k) => k !== 'hash').sort().map((k) => k + '=' + d[k]).join('\n');
  const key = crypto.createHash('sha256').update(BOT).digest();
  const h = crypto.createHmac('sha256', key).update(str).digest('hex');
  return h === d.hash && Date.now() / 1000 - +d.auth_date < 86400;
}

/* ---------------- files from data URLs ---------------- */
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3' };
function storeDataUrl(s, maxBytes) {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+)(;[^,]*)?;base64,(.+)$/i.exec(String(s || ''));
  if (!m) return s && /^\/uploads\/|^img\//.test(s) ? s : '';
  const type = m[1].toLowerCase().split(';')[0], ext = EXT[type];
  if (!ext) return '';
  const buf = Buffer.from(m[3], 'base64');
  if (buf.length > (maxBytes || 3e6)) return '';
  const name = crypto.randomBytes(10).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  return '/uploads/' + name;
}

/* ---------------- Telegram ---------------- */
async function tg(method, body) {
  if (!BOT) return null;
  try {
    const r = await fetch('https://api.telegram.org/bot' + BOT + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json(); if (!j.ok) console.warn('tg', method, j.description); return j.result;
  } catch (e) { console.warn('tg error', e.message); return null; }
}
const h = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const fmt = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const ST = { new: '🆕 Yangi', accepted: '♨️ Tayyorlanmoqda', on_way: '🚚 Yoʻlda', delivered: '✅ Yetkazildi', cancelled: '✖️ Bekor qilindi' };
const NEXT = { new: [['accepted', '✅ Qabul qilish'], ['cancelled', '✖️ Bekor']], accepted: [['on_way', '🚚 Yoʻlga chiqdi'], ['cancelled', '✖️ Bekor']], on_way: [['delivered', '🎁 Yetkazildi'], ['cancelled', '✖️ Bekor']] };
function nm(list, id) { const x = (list || []).find((y) => y.id === id); return x ? (x.name ? x.name.uz : id) : id; }
function lineText(l) {
  const s = db.settings;
  if (l.type === 'box') return 'Boks ' + l.size + ' (' + nm(s.packaging, l.pack) + ', ' + l.ribbon + '): ' + l.cells.map((c) => nm(s.flavors, c)).join(', ');
  if (l.type === 'bar') return 'Plitka ' + nm(s.bars, l.base) + ' + ' + l.tops.map((c) => nm(s.toppings, c)).join(', ');
  if (l.type === 'toy') return 'TOʻY ' + l.guests + ' mehmon, ' + nm(s.toyPacks, l.pack);
  if (l.type === 'club') return 'Club ' + l.months + ' oy';
  if (l.type === 'kit') return 'BOKS ' + nm(s.kits, l.kit) + ' — ' + l.cups.map((c) => nm(s.cupItems, c)).join(', ') + (l.dear ? ' · «Qadrli insonimga» yozuvi' : '');
  if (l.type === 'bonbon') return 'Bon-bon: ' + nm(s.bonbon.shapes, l.shape) + ', ' + nm(s.bonbon.colors, l.color) + ' rang, ' + nm(s.bonbon.finishes, l.finish) + ', ' + nm(s.bonbon.shells, l.shell) + ', ' + nm(s.bonbon.l1, l.l1) + ' + ' + nm(s.bonbon.l2, l.l2) + ', ' + nm(s.bonbon.dust, l.dust);
  return (l.name ? l.name.uz : l.id) + (l.deal ? ' (kun shokoladi)' : '');
}
function orderText(o) {
  const site = PUBLIC_URL || '';
  return '<b>Buyurtma #' + o.id + '</b> — ' + ST[o.status] + '\n' +
    '👤 ' + h(o.name) + ' · ' + h(o.phone) + '\n📍 ' + h(DN[o.district] || o.district) + ', ' + h(o.address) + '\n📅 ' + o.date + ' ' + h(o.time) + (o.preorder ? ' (oldindan)' : '') + '\n' +
    (o.gift ? '🎁 Sovgʻa: ' + h(o.gift.to) + ' ' + h(o.gift.phone) + (o.gift.secret ? ' (sir)' : '') + '\n' : '') +
    o.lines.map((l) => '• ' + h(lineText(l)) + ' × ' + l.qty + ' = ' + fmt(l.sum)).join('\n') + '\n' +
    (o.bonus && o.bonus.length ? '🍀 Qoʻshib bering (omad sovgʻasi): ' + h(o.bonus.join(', ')) + '\n' : '') +
    (o.engrave ? '✍️ Ism: ' + h(o.engrave) + '\n' : '') + (o.card && o.card.text ? '💌 «' + h(o.card.text) + '»\n' : '') + (o.card && o.card.voice ? '🎙 Ovozli tabrik: ' + site + o.card.voice + '\n' : '') +
    (o.comment ? '💬 ' + h(o.comment) + '\n' : '') +
    (o.discount ? 'Chegirma: −' + fmt(o.discount) + ' (' + h(o.promo) + ')\n' : '') + (o.wallet ? 'Hamyondan: −' + fmt(o.wallet) + '\n' : '') +
    'Yetkazish: ' + fmt(o.delivery) + '\n<b>Toʻlanadi: ' + fmt(o.toPay) + ' soʻm</b> (' + (o.pay === 'card' ? 'karta' : 'naqd') + ')';
}
const kb = (rows) => ({ inline_keyboard: rows });
async function toAdmins(text, markup, mapKey) {
  for (const id of ADMIN_CHATS) {
    const m = await tg('sendMessage', { chat_id: id, text, parse_mode: 'HTML', reply_markup: markup, disable_web_page_preview: true });
    if (m && mapKey) { db.tgMap[id + ':' + m.message_id] = mapKey; save(); }
  }
}
function toUser(u, text) { if (u && u.tgId) tg('sendMessage', { chat_id: u.tgId, text, parse_mode: 'HTML', disable_web_page_preview: true }); }
function statusButtons(o) { return kb([(NEXT[o.status] || []).map(([s, t]) => ({ text: t, callback_data: 'st:' + o.id + ':' + s }))]); }

function onEvents(events) {
  for (const e of events) {
    if (e.type === 'order_new') { toAdmins(orderText(e.order), statusButtons(e.order)); toUser(e.user, '🍫 Rahmat! Buyurtmangiz <b>#' + e.order.id + '</b> qabul qilindi. Tez orada bogʻlanamiz.'); }
    else if (e.type === 'order_status') toUser(e.user, 'Buyurtma <b>#' + e.order.id + '</b>: ' + ST[e.order.status] + (e.order.status === 'delivered' && e.order.cashback ? '\n✨ Hamyoningizga +' + fmt(e.order.cashback) + ' soʻm keshbek!' : ''));
    else if (e.type === 'topup_new') toAdmins('💳 Hamyon toʻldirish: <b>' + fmt(e.topup.amount) + ' soʻm</b>\n' + h(e.user.name) + ' ' + h(e.user.phone || '') + '\nPul tushganini tekshiring.', kb([[{ text: '✅ Tasdiqlash', callback_data: 'tu:' + e.topup.id + ':1' }, { text: '✖️ Rad', callback_data: 'tu:' + e.topup.id + ':0' }]]));
    else if (e.type === 'topup_done') toUser(e.user, e.topup.status === 'done' ? '💰 Hamyoningiz +' + fmt(e.topup.amount) + ' soʻmga toʻldirildi!' : 'Toʻldirish soʻrovi tasdiqlanmadi. Savollar boʻlsa, yozing.');
    else if (e.type === 'order_photo') {
      const to = e.user && e.user.tgId, url = String(e.url || '');
      if (to && /^\//.test(url) && PUBLIC_URL) tg('sendPhoto', { chat_id: to, photo: PUBLIC_URL + url, parse_mode: 'HTML',
        caption: '📸 <b>Buyurtmangiz #' + e.order.id + ' tayyor!</b>\nOpamiz uni siz uchun qadoqladi 🤍',
        reply_markup: kb([[{ text: '🏷 Shokolad pasporti', url: PUBLIC_URL + '/#pass-' + e.order.pass }]]) });
    }
    else if (e.type === 'review_new') toAdmins('⭐ Yangi sharh (' + e.review.stars + '/5) — ' + h(e.review.name) + '\n«' + h(e.review.text) + '»', kb([[{ text: '✅ Chiqarish', callback_data: 'rv:' + e.review.id + ':1' }, { text: '🙈 Yashirish', callback_data: 'rv:' + e.review.id + ':0' }]]));
    else if (e.type === 'lead_new') toAdmins('🏢 Korporativ soʻrov: <b>' + h(e.lead.company) + '</b>\n' + h(e.lead.name) + ' ' + h(e.lead.phone) + '\n' + (e.lead.qty || '?') + ' ta, budjet: ' + h(e.lead.budget) + ', sana: ' + h(e.lead.date) + '\n' + h(e.lead.comment) + (e.lead.logo ? '\nLogo: ' + PUBLIC_URL + e.lead.logo : ''));
    else if (e.type === 'booking_new') toAdmins('🧑‍🍳 Master-klassga yozilish: ' + h(e.cls.title.uz) + ' (' + e.cls.date + ' ' + h(e.cls.time) + ')\n' + h(e.booking.name) + ' ' + h(e.booking.phone) + ' · ' + e.booking.seats + ' joy');
    else if (e.type === 'chat_msg') toAdmins('💬 <b>' + h(e.chat.name) + '</b>:\n' + h(e.text) + '\n\n<i>Javob berish uchun shu xabarga “Reply” qiling.</i>', undefined, e.chat.id);
    else if (e.type === 'chat_reply' && String(e.chat.key).startsWith('tg:')) tg('sendMessage', { chat_id: e.chat.key.slice(3), text: '💬 ' + h(brandName()) + ': ' + h(e.text), parse_mode: 'HTML' });
    else if (e.type === 'chat_reply') { const u = L.findUser(db, e.chat.key); toUser(u, '💬 ' + h(db.settings.brand || 'Bloom & Cacao') + ': ' + h(e.text)); }
    else if (e.type === 'gift_opened') { if (e.order.gift.thanks || !e.order.gift._told) { e.order.gift._told = 1; toUser(e.user, '🎁 ' + h(e.order.gift.to) + ' sovgʻangizni ochdi!' + (e.order.gift.thanks ? '\n❤️ «' + h(e.order.gift.thanks) + '»' : '')); } }
    else if (e.type === 'restock') e.users.forEach((uid) => toUser(L.findUser(db, uid), '🍫 <b>' + h(e.product.name.uz) + '</b> yana sotuvda! ' + (PUBLIC_URL ? PUBLIC_URL + '/#menu' : '')));
    else if (e.type === 'luck') { toAdmins('🍀 Omad qogʻozchasi faollashtirildi: <b>' + h(e.prize) + '</b>\n👤 ' + h(e.user.name) + ' ' + h(e.user.phone || '') + (e.complete ? '\n🎉 Toʻplam yigʻildi (shokolad + bezak + qolip)!' : '') + '\nKeyingi buyurtmasiga qoʻshib beriladi.'); toUser(e.user, '🍀 Tabriklaymiz! <b>' + h(e.prize) + '</b> keyingi buyurtmangizga qoʻshib beriladi.' + (e.complete ? '\n🎉 Bon-bon toʻplamingiz toʻliq yigʻildi — endi oʻzingiz bon-bon tayyorlay olasiz!' : '')); }
    else if (e.type === 'birthday') toUser(e.user, '🎂 Tugʻilgan kuningiz bilan, ' + h(e.user.name) + '! Sizga −' + db.settings.birthdayPercent + '% sovgʻa promokodi kabinetda kutmoqda.');
  }
}

async function onUpdate(u) {
  if (u.callback_query) {
    const q = u.callback_query, from = String(q.from.id);
    if (String(q.data).startsWith('c:')) {
      tg('answerCallbackQuery', { callback_query_id: q.id });
      if (q.data === 'c:menu') { delete humanMode[from]; return sendMenu(from); }
      if (q.data === 'c:human') { humanMode[from] = true; return tg('sendMessage', { chat_id: from, text: '💬 Yozing — xabaringizni toʻgʻridan-toʻgʻri opamizga yetkazaman.' }); }
      return;
    }
    if (ADMIN_CHATS.indexOf(from) < 0) return tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Ruxsat yoʻq' });
    const [k, id, v] = String(q.data).split(':'), ctx = { admin: true, events: [] };
    try {
      if (k === 'st') {
        const o = L.handle(db, 'admin.status', { id: +id, status: v }, ctx);
        await tg('editMessageText', { chat_id: q.message.chat.id, message_id: q.message.message_id, text: orderText(o), parse_mode: 'HTML', reply_markup: statusButtons(o) });
      } else if (k === 'tu') {
        const t = L.handle(db, 'admin.topup', { id: +id, ok: v === '1' }, ctx);
        await tg('editMessageReplyMarkup', { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: kb([[{ text: t.status === 'done' ? '✅ Tasdiqlandi' : '✖️ Rad etildi', callback_data: 'noop' }]]) });
      } else if (k === 'rv') {
        L.handle(db, 'admin.review', { id: +id, ok: v === '1' }, ctx);
        await tg('editMessageReplyMarkup', { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: kb([[{ text: v === '1' ? '✅ Chiqarildi' : '🙈 Yashirildi', callback_data: 'noop' }]]) });
      }
      save(); onEvents(ctx.events);
      tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Saqlandi ✓' });
    } catch (e) { tg('answerCallbackQuery', { callback_query_id: q.id, text: 'Xato: ' + (e.code || e.message) }); }
    return;
  }
  const m = u.message; if (!m) return;
  const from = String(m.chat.id);
  if (m.reply_to_message && ADMIN_CHATS.indexOf(from) >= 0) {
    const chatId = db.tgMap[from + ':' + m.reply_to_message.message_id];
    if (chatId && m.text) {
      const ctx = { admin: true, events: [] };
      try { L.handle(db, 'admin.chatReply', { id: chatId, text: m.text }, ctx); save(); onEvents(ctx.events); tg('sendMessage', { chat_id: from, text: '✓ Yuborildi' }); } catch (e) {}
      return;
    }
  }
  if (/^\/start/.test(m.text || '')) {
    tg('sendMessage', { chat_id: from, text: '🍫 <b>' + h(db.settings.brand || 'Bloom & Cacao') + '</b> — premium shokolad va gulli choy sanʼati.\nBuyurtma holati va bonuslar haqida shu yerda xabar beramiz.' + (ADMIN_CHATS.indexOf(from) >= 0 ? '\n\n(Siz adminsiz: yangi buyurtmalar shu yerga keladi.)' : '\nSizning ID: <code>' + from + '</code>'),
      parse_mode: 'HTML', reply_markup: customerMenu() });
    return;
  }
  if (ADMIN_CHATS.indexOf(from) < 0 && m.chat.type === 'private' && (m.text || m.voice || m.audio)) salesAgent(m).catch((e) => console.error('agent', e));
}

/* daily jobs: reminders 3 days before loved ones' birthdays, backups */
function daily() {
  const now = Date.now(), day = L.tkDay(now), hour = new Date(now + 5 * 3600e3).getUTCHours();
  backup();
  if (hour < 9 || db.reminded._day === day) return;
  db.reminded._day = day;
  const in3 = L.addDays(day, 3).slice(5);
  db.users.forEach((u) => (u.dates || []).forEach((d) => {
    if (d.md === in3) toUser(u, '🔔 3 kundan keyin — <b>' + h(d.name) + '</b>ning tugʻilgan kuni! Chiroyli ' + h(db.settings.brand || 'Bloom & Cacao') + ' sovgʻasini oldindan buyurtma qiling: ' + (PUBLIC_URL || ''));
  }));
  save();
}
setInterval(daily, 10 * 60 * 1000); setTimeout(daily, 5000);

/* ---------------- AI gift helper ---------------- */
async function aiSuggest(text, lang) {
  const ctx = { events: [] }, base = L.handle(db, 'suggest', { text }, ctx);
  if (!AI_KEY) return base;
  try {
    const cat = L.handle(db, 'catalog', {}, { events: [] });
    const list = cat.products.filter((p) => !p.locked && p.left > 0).map((p) => ({ id: p.id, name: p.name.uz, sub: p.sub.uz, price: p.dealPrice, cat: p.cat }));
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 400,
        system: 'You are the gift helper of Bloom & Cacao, a premium chocolate and flower tea shop in Andijan. Pick 1-4 products from the catalog that fit the customer request and budget (prices in UZS). Reply with JSON only: {"items":["id",...],"reason":"one warm sentence in ' + ({ ru: 'Russian', en: 'English' }[lang] || 'Uzbek (Latin)') + '"}.',
        messages: [{ role: 'user', content: 'Catalog: ' + JSON.stringify(list) + '\nRequest: ' + String(text).slice(0, 300) }] })
    });
    const j = await r.json(), out = JSON.parse(((j.content || [])[0] || {}).text.match(/\{[\s\S]*\}/)[0]);
    const items = (out.items || []).filter((id) => list.some((p) => p.id === id)).slice(0, 4);
    if (!items.length) return base;
    return { items, sum: items.reduce((a, id) => a + list.find((p) => p.id === id).price, 0), reason: String(out.reason || '').slice(0, 300) };
  } catch (e) { return base; }
}

/* ---------------- AI seller & box maker (Claude) ---------------- */
async function aiChat(b) {
  const base = L.handle(db, 'ai', b, { events: [] });
  if (!AI_KEY) return base;
  const st = db.settings, lang = { ru: 'Russian', en: 'English' }[b.lang] || 'Uzbek (Latin script)';
  const ids = (list) => (list || []).map((x) => x.id + '=' + (x.name ? x.name.uz : x.id)).join(', ');
  let system;
  if (b.mode === 'craft') {
    system = 'You design custom chocolates for ' + st.brand + ', a handmade chocolate & flower-tea shop in Andijan. Turn the customer wish into ONE design.\n' +
      'Bonbon options (use ids): shape [' + ids(st.bonbon.shapes) + '], color [' + ids(st.bonbon.colors) + '], finish [' + ids(st.bonbon.finishes) + '], shell [' + ids(st.bonbon.shells) + '], l1 [' + ids(st.bonbon.l1) + '], l2 [' + ids(st.bonbon.l2) + '], dust [' + ids(st.bonbon.dust) + ']. Price per bonbon ' + st.bonbon.price + ' UZS.\n' +
      'Kits: [' + (st.kits || []).map((k) => k.id + '=' + k.name.uz + ' (' + k.price + ' UZS, ' + k.cups + ' cups)').join('; ') + ']; cup fillings [' + (st.cupItems || []).map((c) => c.id + '=' + c.name.uz + ' +' + c.price).join(', ') + '].\n' +
      'Reply with JSON only: {"text":"1-2 warm sentences in ' + lang + ' explaining the design","kind":"bonbon","bonbon":{"shape":"","color":"","finish":"","shell":"","l1":"","l2":"","dust":"","qty":6}} or {"text":"...","kind":"kit","kit":{"kit":"","cups":["",""]}}.';
  } else {
    const cat = L.handle(db, 'catalog', {}, { events: [] });
    system = 'You are the friendly seller of ' + st.brand + ', a handmade chocolate & flower-tea shop in Andijan, Uzbekistan. Answer briefly in ' + lang + '. Never invent facts.\n' +
      'Products: ' + JSON.stringify(cat.products.filter((p) => !p.locked).map((p) => ({ id: p.id, name: p.name.uz, sub: p.sub.uz, price: p.dealPrice, left_today: p.left }))) + '\n' +
      'Experience kits: ' + JSON.stringify((st.kits || []).map((k) => ({ name: k.name.uz, price: k.price, contents: k.items.uz }))) + '. Custom bonbon builder on the site, ' + st.bonbon.price + ' UZS each.\n' +
      'Delivery: Andijan city ' + st.deliveryFees.andijon_sh + ' UZS, other districts about ' + st.deliveryFees.asaka + ' UZS; pre-order up to 90 days ahead. Payment: cash, card transfer or wallet coins. Cashback ' + st.cashbackPercent + '% after delivery. Store chocolate cool (16-20C), dry, not in the fridge.\n' +
      (st.phone ? 'Phone: ' + st.phone + '. ' : '') + (st.address ? 'Address: ' + st.address + '. ' : '') +
      'Reply with JSON only: {"text":"your answer","kind":"products","items":["product ids you recommend, max 4"]} or {"text":"your answer","kind":"none"}.';
  }
  try {
    const msgs = (b.history || []).slice(-8).filter((m) => m.text).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text).slice(0, 600) }));
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: String(b.text).slice(0, 600) });
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 500, system, messages: msgs }) });
    const j = await r.json(), out = JSON.parse(((j.content || [])[0] || {}).text.match(/\{[\s\S]*\}/)[0]);
    const text = String(out.text || '').slice(0, 800);
    if (out.kind === 'bonbon' && out.bonbon) {
      const d = Object.assign({}, base.bonbon || { shape: 'dome', color: 'ruby', finish: 'gloss', shell: 'dark', l1: 'malina', l2: 'pista', dust: 'malina', qty: 6 });
      const ok = (list, v) => (list || []).some((x) => x.id === v);
      [['shape', st.bonbon.shapes], ['color', st.bonbon.colors], ['finish', st.bonbon.finishes], ['shell', st.bonbon.shells], ['l1', st.bonbon.l1], ['l2', st.bonbon.l2], ['dust', st.bonbon.dust]].forEach(([k, list]) => { if (ok(list, out.bonbon[k])) d[k] = out.bonbon[k]; });
      d.qty = Math.max(1, Math.min(50, parseInt(out.bonbon.qty, 10) || d.qty || 6));
      return { kind: 'bonbon', bonbon: d, text };
    }
    if (out.kind === 'kit' && out.kit) {
      const k = (st.kits || []).find((x) => x.id === out.kit.kit); if (!k) return Object.assign(base, { text });
      const cups = (out.kit.cups || []).filter((c) => st.cupItems.some((x) => x.id === c)).slice(0, k.cups);
      while (cups.length < k.cups) cups.push(st.cupItems[cups.length].id);
      return { kind: 'kit', kit: { kit: k.id, cups }, text };
    }
    if (out.kind === 'products') {
      const items = (out.items || []).filter((id) => db.products.some((p) => p.id === id && p.active)).slice(0, 4);
      const cat = L.handle(db, 'catalog', {}, { events: [] });
      return { kind: 'products', items, sum: items.reduce((a, id) => a + cat.products.find((p) => p.id === id).dealPrice, 0), text };
    }
    return text ? { kind: 'none', text } : base;
  } catch (e) { return base; }
}



/* ================= VOICE (Aisha AI: Uzbek STT/TTS) ================= */
const AISHA_KEY = process.env.AISHA_API_KEY || '';
const AISHA = 'https://back.aisha.group';
const { execFile } = require('child_process');
let FFMPEG = null; execFile('ffmpeg', ['-version'], (e) => { FFMPEG = !e; console.log('ffmpeg', FFMPEG ? 'ok' : 'missing (voice replies in Telegram will be text only)'); });
async function stt(buf, filename, lang) {
  if (!AISHA_KEY) throw Object.assign(new Error('no_voice'), { code: 'no_voice' });
  const fd = new FormData();
  fd.append('audio', new Blob([buf]), filename);
  fd.append('language', ['uz', 'ru', 'en'].includes(lang) ? lang : 'uz');
  fd.append('has_diarization', 'false');
  const r = await fetch(AISHA + '/api/v1/stt/post/', { method: 'POST', headers: { 'X-Api-Key': AISHA_KEY, 'Accept-Language': 'uz' }, body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.warn('stt', r.status, JSON.stringify(j).slice(0, 200)); throw Object.assign(new Error('voice_fail'), { code: 'voice_fail' }); }
  return String(j.transcript || '').trim();
}
const speakable = (t) => String(t || '').replace(/https?:\/\/\S+/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/[*_#<>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 950);
async function tts(text, lang) {
  if (!AISHA_KEY) return null;
  const say = speakable(text); if (!say) return null;
  lang = ['uz', 'ru', 'en'].includes(lang) ? lang : 'uz';
  const fd = new FormData();
  fd.append('transcript', say); fd.append('language', lang);
  if (lang === 'uz') { fd.append('model', 'Gulnoza'); fd.append('mood', 'Cheerful'); }
  try {
    const r = await fetch(AISHA + '/api/v1/tts/post/', { method: 'POST', headers: { 'X-Api-Key': AISHA_KEY, 'Accept-Language': 'uz' }, body: fd });
    const j = await r.json().catch(() => ({}));
    const pth = j.audio_path || j.audio_url; if (!pth) { console.warn('tts', r.status, JSON.stringify(j).slice(0, 200)); return null; }
    const a = await fetch(/^https?:/.test(pth) ? pth : AISHA + pth);
    if (!a.ok) return null;
    const name = 'tts-' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex') + '.wav';
    fs.writeFileSync(path.join(UPLOADS, name), Buffer.from(await a.arrayBuffer()));
    return name;
  } catch (e) { console.warn('tts', e.message); return null; }
}
function toOgg(wavName) {
  return new Promise((ok) => {
    if (!FFMPEG) return ok(null);
    const src = path.join(UPLOADS, wavName), out = src.replace(/\.wav$/, '.ogg');
    execFile('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-c:a', 'libopus', '-b:a', '32k', out], (e) => ok(e ? null : out));
  });
}
// old voice files are removed once a day
setInterval(() => { try { const now = Date.now(); for (const f of fs.readdirSync(UPLOADS)) if (/^tts-/.test(f) && now - fs.statSync(path.join(UPLOADS, f)).mtimeMs > 864e5) fs.unlinkSync(path.join(UPLOADS, f)); } catch (e) {} }, 3600e3);

// Telegram: voice message -> text
async function tgVoiceText(m) {
  const v = m.voice || m.audio; if (!v) return null;
  if ((v.duration || 0) > 120) return { error: 'long' };
  const f = await tg('getFile', { file_id: v.file_id }); if (!f || !f.file_path) return { error: 'fail' };
  const r = await fetch('https://api.telegram.org/file/bot' + BOT + '/' + f.file_path);
  const buf = Buffer.from(await r.arrayBuffer());
  try { return { text: await stt(buf, 'voice.ogg', (m.from.language_code || 'uz').slice(0, 2)) }; } catch (e) { return { error: e.code || 'fail' }; }
}
async function tgSendVoice(chatId, text, lang) {
  const wav = await tts(text, lang); if (!wav) return false;
  const ogg = await toOgg(wav); if (!ogg) return false;
  const fd = new FormData();
  fd.append('chat_id', String(chatId)); fd.append('voice', new Blob([fs.readFileSync(ogg)], { type: 'audio/ogg' }), 'javob.ogg');
  try { const r = await fetch('https://api.telegram.org/bot' + BOT + '/sendVoice', { method: 'POST', body: fd }); return (await r.json()).ok; } catch (e) { return false; }
}

/* ================= AGENTS ================= */
const CHANNEL = () => (process.env.CHANNEL_ID || db.settings.channel || '').trim();
const brandName = () => db.settings.brand || 'Bloom & Cacao';
const imgUrl = (img) => (PUBLIC_URL && img ? PUBLIC_URL + (img.startsWith('/') ? '' : '/') + img : null);
async function claude(system, messages, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens || 600, system, messages }) });
  const j = await r.json();
  return ((j.content || [])[0] || {}).text || '';
}

/* ---- 1) Telegram channel agent: morning post ---- */
async function channelPost(force) {
  const ch = CHANNEL(); if (!BOT || !ch) return { ok: false, error: 'no_channel' };
  const ctx = { events: [], now: Date.now() }, d = L.postData(db, ctx);
  let text = L.postText(d, PUBLIC_URL);
  if (AI_KEY) {
    try {
      const t = await claude('You write the morning Telegram channel post for ' + d.brand + ', a handmade chocolate & flower-tea shop in Andijan. Write in Uzbek (Latin script), warm and premium, with a few emojis, max 900 characters, plain text (no markdown, no HTML). Use ONLY the facts given: product names, prices in soʻm, how many are left today, the deal of the day, upcoming holiday and promo code if present. End with the order link exactly as given.',
        [{ role: 'user', content: 'Facts: ' + JSON.stringify(d) + '\nOrder link: ' + (PUBLIC_URL || 'sayt') + '\nToday: ' + L.tkDay() }], 700);
      if (t && t.length > 80) text = t.slice(0, 1000);
    } catch (e) {}
  }
  const photo = imgUrl((d.deal && d.deal.img) || 'img/hero.jpg');
  const markup = PUBLIC_URL ? kb([[{ text: '🛍 Buyurtma berish', url: PUBLIC_URL + '/#menu' }]]) : undefined;
  const m = photo ? await tg('sendPhoto', { chat_id: ch, photo, caption: text.slice(0, 1024), reply_markup: markup })
    : await tg('sendMessage', { chat_id: ch, text, reply_markup: markup, disable_web_page_preview: true });
  return { ok: !!m, text };
}
function channelCron() {
  const a = db.settings.agents || {}, now = Date.now(), day = L.tkDay(now), hour = new Date(now + 5 * 3600e3).getUTCHours();
  if (!a.autopost || db.reminded._post === day || hour < (a.postHour || 9)) return;
  db.reminded._post = day; save();
  channelPost().then((r) => { if (!r.ok) console.warn('channel post failed', r.error || ''); });
}
setInterval(channelCron, 5 * 60 * 1000);

/* ---- 2) Telegram sales agent: talks to customers, takes orders ---- */
db.tgConvos = db.tgConvos || {};
const DN = { andijon_sh: 'Andijon shahri', andijon_t: 'Andijon tumani', asaka: 'Asaka', baliqchi: 'Baliqchi', boz: 'Boʻz', buloqboshi: 'Buloqboshi', izboskan: 'Izboskan', jalaquduq: 'Jalaquduq', xojaobod: 'Xoʻjaobod', qorgontepa: 'Qoʻrgʻontepa', marhamat: 'Marhamat', oltinkol: 'Oltinkoʻl', paxtaobod: 'Paxtaobod', shahrixon: 'Shahrixon', ulugnor: 'Ulugʻnor', xonobod: 'Xonobod shahri' };
function customerMenu() {
  const row1 = [{ text: '🍫 Menyu', callback_data: 'c:menu' }, { text: '💬 Opa bilan', callback_data: 'c:human' }];
  if (!PUBLIC_URL) return kb([row1]);
  const shop = /^https:/.test(PUBLIC_URL) ? { text: '🛍 Doʻkonni ochish', web_app: { url: PUBLIC_URL } } : { text: '🛍 Saytda buyurtma', url: PUBLIC_URL };
  return kb([[shop], row1]);
}
async function sendMenu(chatId) {
  const cat = L.handle(db, 'catalog', {}, { events: [] });
  const list = cat.products.filter((p) => !p.locked && p.left > 0).slice(0, 8);
  for (const p of list.slice(0, 4)) {
    const cap = '🍫 <b>' + h(p.name.uz) + '</b> — ' + h(p.sub.uz) + '\n' + fmt(p.dealPrice) + ' soʻm' + (p.deal ? ' ✨ kun shokoladi' : '') + ' · bugun ' + p.left + ' ta';
    const ph = imgUrl(p.img);
    if (ph) await tg('sendPhoto', { chat_id: chatId, photo: ph, caption: cap, parse_mode: 'HTML' }); else await tg('sendMessage', { chat_id: chatId, text: cap, parse_mode: 'HTML' });
  }
  const rest = list.slice(4).map((p) => '• ' + h(p.name.uz) + ' — ' + fmt(p.dealPrice) + ' soʻm').join('\n');
  await tg('sendMessage', { chat_id: chatId, text: (rest ? rest + '\n\n' : '') + 'Nima yoqdi? Yozing — buyurtmani shu yerda qabul qilaman 😊', parse_mode: 'HTML', reply_markup: customerMenu() });
}
const humanMode = {};
async function salesAgent(m) {
  const chatId = String(m.chat.id);
  let text = String(m.text || '').slice(0, 800), heard = false;
  if (!text && (m.voice || m.audio)) {
    if (limited(chatId, 'tgvoice', 8)) return;
    tg('sendChatAction', { chat_id: chatId, action: 'typing' });
    const v = await tgVoiceText(m);
    if (!v || !v.text) {
      const why = v && v.error === 'long' ? 'Ovozli xabar 2 daqiqadan qisqa boʻlsin 🙏' : v && v.error === 'no_voice' ? 'Hozircha ovozli xabarni tushuna olmayman — iltimos, yozib yuboring 🙏' : 'Ovozni aniq eshitmadim, yana bir bor aytib bering yoki yozing 🙏';
      return tg('sendMessage', { chat_id: chatId, text: why, reply_markup: customerMenu() });
    }
    text = v.text.slice(0, 800); heard = true;
  }
  if (!text) return;
  if (limited(chatId, 'tgagent', 20)) return;
  const a = db.settings.agents || {};
  // human mode or no AI: forward to the shop like the site chat
  if (humanMode[chatId] || !a.sales || !AI_KEY) {
    if (heard) text = '🎤 ' + text;
    const ctx = { events: [], now: Date.now() };
    const name = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ');
    let c = db.chats.find((x) => x.key === 'tg:' + chatId);
    if (!c) { c = { id: ++db.seq.chat, key: 'tg:' + chatId, name: name + ' (Telegram)', msgs: [], unread: 0 }; db.chats.push(c); }
    c.msgs.push({ from: 'user', text, at: ctx.now }); c.unread++; c.at = ctx.now; save();
    onEvents([{ type: 'chat_msg', chat: c, text }]);
    if (!humanMode[chatId]) tg('sendMessage', { chat_id: chatId, text: 'Rahmat! Xabaringizni yetkazdim, tez orada javob beramiz. Menyuni koʻrish uchun tugmani bosing 👇', reply_markup: customerMenu() });
    return;
  }
  const conv = db.tgConvos[chatId] = (db.tgConvos[chatId] || []).slice(-14);
  conv.push({ role: 'user', content: text });
  const cat = L.handle(db, 'catalog', {}, { events: [] }), st = db.settings, today = L.tkDay();
  const system = 'You are the Telegram sales assistant of ' + st.brand + ', a handmade chocolate & flower-tea shop in Andijan, Uzbekistan. Reply in the customer\'s language (Uzbek, Russian or English), short and warm, plain text with a few emojis. Never invent products, prices or facts.\n' +
    'Today: ' + today + '. Products (id, name, size, price UZS, left today): ' + JSON.stringify(cat.products.filter((p) => !p.locked).map((p) => [p.id, p.name.uz, p.sub.uz, p.dealPrice, p.left])) + '\n' +
    'Experience kits are ordered on the website. Custom bonbons are designed on the website too.\n' +
    'Delivery districts (id=name fee): ' + Object.keys(DN).map((k) => k + '=' + DN[k] + ' ' + st.deliveryFees[k]).join(', ') + '. Pre-order up to 90 days. Payment: cash or card transfer on delivery.\n' +
    'To take an order collect: items with quantities, name, phone, district, address, date (YYYY-MM-DD, default today), optional time and comment. Before placing, repeat the order with the total (items + delivery) and ask the customer to confirm. Only after a clear "yes" set "confirmed": true.\n' +
    (heard ? 'The customer sent a VOICE message (transcribed automatically, may contain small recognition errors — if something important like a phone number is unclear, ask again). Keep the reply short and natural to be read aloud.\n' : '') +
    'Answer with JSON only: {"lang":"uz|ru|en (language of your reply)","reply":"text to send","photos":["up to 3 product ids to show, optional"],"order":null or {"confirmed":true/false,"lines":[{"id":"p1","qty":1}],"name":"","phone":"","district":"","address":"","date":"","time":"","comment":""}}';
  let out;
  try { const raw = await claude(system, conv, 700); out = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]); }
  catch (e) { out = { reply: 'Kechirasiz, hozir javob bera olmadim. Opamizga yozib qoʻyaman 🙏' }; humanMode[chatId] = true; }
  let reply = String(out.reply || '').slice(0, 1500);
  if (out.order && out.order.confirmed) {
    const o = out.order, ctx = { events: [], now: Date.now() };
    ctx.user = L.upsertUser(db, { tgId: chatId, name: o.name || m.from.first_name, username: m.from.username, phone: o.phone }, ctx);
    try {
      const order = L.handle(db, 'order', { lines: (o.lines || []).map((l) => ({ type: 'product', id: l.id, qty: l.qty })), name: o.name, phone: o.phone, district: o.district, address: o.address, date: o.date || today, time: o.time, comment: '[Telegram agent] ' + (o.comment || ''), pay: 'cash' }, ctx);
      save(); onEvents(ctx.events);
      reply += '\n\n✅ Buyurtma #' + order.id + ' qabul qilindi. Toʻlanadi: ' + fmt(order.toPay) + ' soʻm. Opamiz tez orada bogʻlanadi!';
      conv.push({ role: 'assistant', content: JSON.stringify({ reply, placed: order.id }) });
      db.tgConvos[chatId] = [];
    } catch (e) {
      const why = { need_phone: 'telefon raqami', need_district: 'tuman', need_address: 'manzil', need_name: 'ism', no_stock: 'bugun yetarli mahsulot yoʻq', bad_date: 'sana notoʻgʻri', empty: 'mahsulot tanlanmagan', no_product: 'mahsulot topilmadi' }[e.code] || e.code;
      reply = 'Buyurtmani rasmiylashtirishda muammo: ' + why + '. Iltimos, aniqlashtiring 🙏';
      conv.push({ role: 'assistant', content: JSON.stringify({ reply }) });
    }
  } else conv.push({ role: 'assistant', content: JSON.stringify({ reply: out.reply, order: out.order || null }) });
  save();
  for (const id of (out.photos || []).slice(0, 3)) { const p = db.products.find((x) => x.id === id); const ph = p && imgUrl(p.img); if (ph) await tg('sendPhoto', { chat_id: chatId, photo: ph, caption: p.name.uz + ' — ' + fmt(p.price) + ' soʻm' }); }
  if (heard && await tgSendVoice(chatId, reply, out.lang)) {
    await tg('sendMessage', { chat_id: chatId, text: '🎤 «' + text.slice(0, 200) + '»\n\n' + (reply || '🙂'), reply_markup: customerMenu() });
  } else await tg('sendMessage', { chat_id: chatId, text: (heard ? '🎤 «' + text.slice(0, 200) + '»\n\n' : '') + (reply || '🙂'), reply_markup: customerMenu() });
}

/* ---------------- HTTP ---------------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webm': 'audio/webm', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };
function send(res, code, obj) { const b = JSON.stringify(obj); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(b); }
function readBody(req, limit) {
  return new Promise((ok, bad) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > limit) { bad(new Error('too_big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); } catch (e) { bad(new Error('bad_json')); } });
  });
}
const hits = new Map();
function limited(ip, key, max) {
  const k = ip + ':' + key, now = Date.now(), arr = (hits.get(k) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(k, arr); return arr.length > max;
}
function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': cache || 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  let url, p;
  try { url = new URL(req.url, 'http://x'); p = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); return res.end('bad request'); }
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    if (p === '/healthz') return send(res, 200, { ok: true });
    if (p.startsWith('/tg/') && req.method === 'POST') {
      if (req.headers['x-telegram-bot-api-secret-token'] !== SECRET.slice(0, 32)) { res.writeHead(403); return res.end(); }
      const u = await readBody(req, 1e6); res.writeHead(200); res.end('ok'); onUpdate(u).catch((e) => console.error(e)); return;
    }
    if (p.startsWith('/api/')) {
      const route = p.slice(5);
      if (route === 'config') return send(res, 200, { mode: 'server', botUsername: BOT_USERNAME, voice: !!AISHA_KEY });
      if (req.method !== 'POST') return send(res, 405, { error: 'method' });
      const body = await readBody(req, 8e6);
      if (route === 'auth/telegram') {
        if (!checkTelegram(body)) return send(res, 401, { error: 'bad_auth' });
        const u = L.upsertUser(db, { tgId: String(body.id), name: [body.first_name, body.last_name].filter(Boolean).join(' '), username: body.username, photo: body.photo_url }, { now: Date.now() });
        save(); return send(res, 200, { data: { token: sign({ u: u.id, exp: Date.now() + 90 * 864e5 }) } });
      }
      if (route === 'auth/webapp') {
        const wu = checkWebApp(body.initData);
        if (!wu || !wu.id) return send(res, 401, { error: 'bad_auth' });
        const u = L.upsertUser(db, { tgId: String(wu.id), name: [wu.first_name, wu.last_name].filter(Boolean).join(' '), username: wu.username, photo: wu.photo_url }, { now: Date.now() });
        save(); return send(res, 200, { data: { token: sign({ u: u.id, exp: Date.now() + 90 * 864e5 }) } });
      }
      if (route === 'admin/login') {
        if (limited(ip, 'alogin', 8)) return send(res, 429, { error: 'slow_down' });
        const a = Buffer.from(String(body.password || ''));
        const ok = ADMIN_PASSWORDS.some((pw) => { const b = Buffer.from(pw); return a.length === b.length && crypto.timingSafeEqual(a, b); });
        if (!ok) return send(res, 401, { error: 'bad_password' });
        return send(res, 200, { data: { token: sign({ a: 1, exp: Date.now() + 30 * 864e5 }) } });
      }
      const tok = verify((req.headers.authorization || '').replace(/^Bearer /, ''));
      const ctx = { events: [], now: Date.now() };
      if (tok && tok.u) ctx.user = L.findUser(db, tok.u) || null;
      if (tok && tok.a) ctx.admin = true;
      if (route === 'demoLogin') return send(res, 403, { error: 'forbidden' });
      if (['order', 'chatSend', 'lead', 'book', 'review', 'topup', 'suggest', 'ai', 'giftThanks'].includes(route) && limited(ip, route, route === 'suggest' || route === 'ai' ? 15 : 20)) return send(res, 429, { error: 'slow_down' });
      if (route === 'admin.upload') { if (!ctx.admin) return send(res, 403, { error: 'forbidden' }); return send(res, 200, { data: { url: storeDataUrl(body.dataUrl, 4e6) } }); }
      if (route === 'order' && body.voice) body.voice = storeDataUrl(body.voice, 3e6);
      if (route === 'review' && body.photo) body.photo = storeDataUrl(body.photo, 2e6);
      if (route === 'lead' && body.logo) body.logo = storeDataUrl(body.logo, 2e6);
      if (route === 'admin.product' && body.img && /^data:/.test(body.img)) body.img = storeDataUrl(body.img, 4e6);
      if (route === 'suggest') return send(res, 200, { data: await aiSuggest(body.text, body.lang) });
      if (route === 'ai') return send(res, 200, { data: await aiChat(body) });
      if (route === 'voice') {
        if (limited(ip, 'voice', 10)) return send(res, 429, { error: 'slow_down' });
        const mt = /^data:audio\/(wav|x-wav|ogg|mpeg|mp4|m4a);base64,/.exec(String(body.audio || ''));
        if (!mt) return send(res, 400, { error: 'bad_audio' });
        const buf = Buffer.from(String(body.audio).slice(mt[0].length), 'base64');
        if (buf.length > 4e6) return send(res, 400, { error: 'too_big' });
        const lang = ['uz', 'ru', 'en'].includes(body.lang) ? body.lang : 'uz';
        let text;
        try { text = await stt(buf, 'voice.' + ({ 'x-wav': 'wav', mpeg: 'mp3', mp4: 'm4a' }[mt[1]] || mt[1]), lang); } catch (e) { return send(res, 400, { error: e.code || 'voice_fail' }); }
        if (!text) return send(res, 400, { error: 'voice_empty' });
        if (body.mode !== 'sell' && body.mode !== 'craft') return send(res, 200, { data: { transcript: text } });
        const hist = (Array.isArray(body.history) ? body.history : []).slice(-8).concat([{ role: 'user', text }]);
        const r = await aiChat({ mode: body.mode, text, history: hist, lang });
        const spoken = r.text || (r.kind === 'faq' ? '' : '');
        const wav = spoken ? await tts(spoken, lang) : null;
        return send(res, 200, { data: { transcript: text, r, audio: wav ? '/uploads/' + wav : null } });
      }
      if (route === 'admin.postNow') { if (!ctx.admin) return send(res, 403, { error: 'forbidden' }); return send(res, 200, { data: await channelPost(true) }); }
      if (route === 'admin.backup') { if (!ctx.admin) return send(res, 403, { error: 'forbidden' }); return send(res, 200, { data: db }); }
      let data;
      try { data = L.handle(db, route, body, ctx); }
      catch (e) { return send(res, e.code === 'forbidden' ? 403 : 400, { error: e.code || 'error', extra: e.extra }); }
      if (!/^(catalog|quote|me|chatGet|wishView|giftView|admin\.data)$/.test(route) || ctx.events.length) save();
      onEvents(ctx.events);
      return send(res, 200, { data });
    }
    if (p.startsWith('/uploads/')) return serveFile(res, path.join(UPLOADS, path.basename(p)), 'public, max-age=31536000, immutable');
    let file = path.normalize(path.join(SITE, p === '/' ? 'index.html' : p));
    if (!file.startsWith(SITE)) { res.writeHead(403); return res.end(); }
    if (p === '/admin') file = path.join(SITE, 'admin.html');
    return serveFile(res, file, /\.(jpg|png|webp)$/.test(file) ? 'public, max-age=86400' : 'no-cache');
  } catch (e) {
    console.error(e); if (!res.headersSent) send(res, 500, { error: e.message === 'too_big' ? 'too_big' : 'server' });
  }
});

server.listen(PORT, async () => {
  console.log('Bloom & Cacao on :' + PORT + ' data=' + DATA);
  if (BOT && PUBLIC_URL) {
    const ok = await tg('setWebhook', { url: PUBLIC_URL + '/tg/hook', secret_token: SECRET.slice(0, 32), allowed_updates: ['message', 'callback_query'] });
    console.log('webhook', ok ? 'set' : 'not set');
    // Telegram Mini App: the shop opens inside the bot from the menu button
    if (/^https:/.test(PUBLIC_URL)) tg('setChatMenuButton', { menu_button: { type: 'web_app', text: '🛍 Doʻkon', web_app: { url: PUBLIC_URL } } });
  }
});
process.on('SIGTERM', () => { clearTimeout(saveTimer); try { fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch (e) {} process.exit(0); });
