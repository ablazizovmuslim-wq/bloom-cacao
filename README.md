# Bloom & Cacao — shokolad va gulli choy sayti

Sayt (`site/`) + server (`server/server.js`, hech qanday kutubxonasiz, Node 18+).
Sayt serversiz ham ochiladi — u holda **namuna rejimi** ishlaydi (maʼlumotlar brauzerda saqlanadi).

## Tarkib
- `site/index.html` — asosiy sayt (UZ / RU / EN, kunduz/tun, barcha animatsiyalar)
- `site/admin.html` — admin panel (`/admin`)
- `site/js/logic.js` — biznes mantiq (sayt va server birga ishlatadi)
- `server/server.js` — API, maʼlumotlar bazasi (`db.json`), Telegram bot
- `stickers/` — Telegram stikerlari uchun 512×512 PNG (@Stickers bot orqali yuklang)

## Railway'ga joylash
1. Ushbu papkani GitHub'ga yuklang (masalan `mavi-site`).
2. Railway → New Project → Deploy from GitHub → shu repo. Start buyrugʻi: `npm start`.
3. **Volume** qoʻshing: mount path `/data`.
4. Variables:
   | Nomi | Qiymat |
   |---|---|
   | `DATA_DIR` | `/data` |
   | `ADMIN_PASSWORD` | admin panel paroli (uzun, murakkab) |
   | `BOT_TOKEN` | @BotFather bergan token (MAVİ uchun alohida bot) |
   | `BOT_USERNAME` | botning @nomi (belgisiz) |
   | `ADMIN_CHAT_IDS` | buyurtmalar keladigan Telegram ID'lar, vergul bilan (masalan opangiz va siz) |
   | `PUBLIC_URL` | `https://mavi.uz` (domen ulangandan keyin) |
   | `SESSION_SECRET` | istalgan uzun tasodifiy matn |
   | `ANTHROPIC_API_KEY` | AI yordamchilar va agentlar uchun (busiz ular oddiy rejimda ishlaydi) |
   | `AISHA_API_KEY` | ixtiyoriy — 🎤 ovozli yordamchi (oʻzbekcha ovozni tanish va gapirish). Kalit: voicelab.uz/app |
   | `CHANNEL_ID` | ixtiyoriy — kanal (@kanal_nomi). Admin paneldagi “Telegram kanal” maydoni ham boʻladi |
5. Domen: Railway → Settings → Domains → Custom domain → eskiz.uz'da CNAME yozuvini qoʻshing.
6. @BotFather → `/setdomain` → botni tanlang → domeningizni yozing (Telegram orqali kirish uchun shart).
7. Opangiz botga `/start` yozsin — bot uning ID raqamini koʻrsatadi, uni `ADMIN_CHAT_IDS` ga qoʻshing.

## Telegramda nima keladi
- Yangi buyurtma → tugmalar: Qabul qilish → Yoʻlga chiqdi → Yetkazildi (mijozga ham xabar boradi, keshbek avtomatik tushadi)
- Hamyon toʻldirish soʻrovi → Tasdiqlash / Rad etish
- Yangi sharh → Chiqarish / Yashirish
- Chat xabari → shu xabarga **Reply** qilsangiz, javob saytdagi chatga boradi
- Korporativ soʻrov, master-klassga yozilish
- Mijozlarga: buyurtma holati, “sovgʻa ochildi”, “mahsulot yana sotuvda”, yaqinlarining tugʻilgan kuni (3 kun oldin), oʻz tugʻilgan kuni promokodi

## AI agentlar

**1. Telegram sotuv agenti.** Botga kim yozsa, Claude javob beradi: menyuni rasmlar bilan koʻrsatadi, maslahat beradi, ism/telefon/tuman/manzilni soʻraydi, buyurtmani **mijozga takrorlab tasdiqlatadi** va shundan keyingina rasmiylashtiradi. Buyurtma opaga odatdagidek “Yangi buyurtma” boʻlib keladi.
- Mijoz “💬 Opa bilan” tugmasini bossa, xabarlar toʻgʻridan-toʻgʻri opaga boradi; opa botda shu xabarga *reply* qilsa — javob mijozga ketadi.
- `ANTHROPIC_API_KEY` boʻlmasa yoki agent oʻchirilsa: bot menyu tugmalarini koʻrsatadi va xabarlarni opaga yuboradi.

**2. Kanal agenti.** Har kuni belgilangan soatda (standart 09:00, Toshkent) kanalga “bugungi menyu” posti: kun shokoladi rasmi, narxlar, qolgan miqdor, yaqin bayram va promokod, “🛍 Buyurtma berish” tugmasi.
- Botni kanalga **admin** qilib qoʻshing (xabar joylash huquqi bilan).
- Admin panel → Sozlamalar → “AI agentlar”: yoqish/oʻchirish, soat, “Postni koʻrish”, “Hozir kanalga joylash”.

**3. Ovozli yordamchi (call-markaz oʻrniga).** Mijoz botga ovozli xabar yuborsa yoki saytdagi chatda 🎤 tugmani bossa — Aisha AI ovozni matnga aylantiradi, Claude javob beradi va javob oʻzbekcha ovoz bilan qaytadi (Telegramda ovozli xabar boʻlib). Buning uchun `AISHA_API_KEY` kerak; Telegram ovozli xabari uchun serverda `ffmpeg` boʻlishi kerak — `nixpacks.toml` uni Railway'da avtomatik oʻrnatadi.

Pul bilan bogʻliq ishlar (toʻlovni tasdiqlash, hamyon, qaytarish) agentlarga berilmagan — faqat opa qiladi.

## Admin panelda birinchi qilinadigan ishlar
Sozlamalar: karta raqami, telefon, manzil, Instagram/Telegram, yetkazish narxlari, keshbek, bayram promokodi.
Narxlar va miqdorlar namuna sifatida qoʻyilgan — opangiz bilan tekshirib chiqing.
