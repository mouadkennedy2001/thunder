# ⚡ thunder — بحث خاص / super private search

**مطوّر: zerouki ahmed mouad · زروقي أحمد معاذ** — ترخيص [MIT](LICENSE)

محرّك بحث جامع (metasearch) يستعلم عدة محركات مستقلة بالتوازي عنك وبمجهولية كاملة، ويدمج النتائج في صفحة واحدة نظيفة. **بدون سجلات، بدون متتبعات، بدون ملفات تعريف، بدون إعلانات — ولا دخل مالي أبداً.**

---

## العربية

### المميزات

| | |
|---|---|
| 🔎 **بحث ويب متعدد المحركات** | DuckDuckGo (عادي/خفيف)، Bing (مع فكّ تتبّع الروابط)، Mojeek، وإجابات فورية — بالتوازي مع دمج وترتيب حسب الاتفاق بين المحركات |
| 🖼️ **بحث صور** | Openverse (رخص مفتوحة تُعرض مع كل صورة) + DuckDuckGo صور |
| ▶️ **بحث فيديو** | Invidious + DuckDuckGo فيديو، مع زر **«شاهد بهوية مجهولة»** يفتح الفيديو عبر Invidious (بلا إعلانات ولا تتبع) |
| 📰 **بحث أخبار** | عناوين حديثة بمصادرها وتواريخها، بلغة واجهتك |
| 🎭 **قارئ مجهول** | افتح أي نتيجة عبر بروكسي thunder: تُقتل السكربتات والإعلانات والمتتبعات |
| 🧮 **إجابات فورية** | اكتب عملية حسابية واحصل على النتيجة مباشرة |
| 🌙 **ثيم فاتح/داكن/تلقائي** | مع زر تبديل سريع في الشريط العلوي |
| ⚙️ **إعدادات كاملة** | اللغة، الثيم، البحث الآمن، فتح النتائج بتبويب جديد، بحث حديث، **واختيار المحركات التي يعمل بها thunder** |
| 🏠 **اجعله محركك الافتراضي** | زر في الرئيسية يفتح دليلاً لكل متصفح (كروم/بريف/فايرفوكس/إيدج) + دعم OpenSearch لاكتشاف تلقائي |
| 🌐 **ثلاث لغات** | العربية (RTL كامل)، الإنجليزية، الفرنسية |
| 🍀 **حظوظ** | «أنا محظوظ!» ينقل لأول نتيجة مباشرة، و«اقترح لي شيئاً» يفتح مقالاً عشوائياً من ويكيبيديا |
| ✏️ **اقتراحات + مشاركة** | اقتراحات أثناء الكتابة (مجهولة)، ونسخ رابط بحث نظيف بلا تتبع |

### الخصوصية

- لا نُسجل عنوان IP — أبداً.
- لا نخزّن عمليات بحثك: توجد فقط أثناء الإجابة على طلبك.
- لا كوكي تتبّع ولا إعلانات، ولا شيء يُرسل لطرف ثالث.
- البحث الحديث (إن فعّلته) يعيش في متصفحك فقط (localStorage) ويُمسح بضغطة واحدة.
- القارئ المجهول يجرد كل صفحة من السكربتات والمتتبعات قبل عرضها لك.
- CSP صارمة، `Referrer-Policy: no-referrer`، وقفل Dark Reader للحفاظ على ثيمنا.

### التشغيل محلياً

```bash
npm install
npm start        # ⚡ http://localhost:3000
npm run dev      # وضع التطوير مع إعادة التحميل
```

متغيرات البيئة (اختياري — انظر `.env.example`):
- `PORT` — المنفذ (3000 افتراضياً)
- `TH_UPSTREAM_PROXY` — تمرير كل طلبات المحركات عبر بروكسي (مثل جسر Tor)

### النشر على Vercel

المشروع مهيأ للنشر مباشرة: استورد المستودع في Vercel وسيشتغل تلقائياً (`vercel.json` يضبط الدالة بحد 30 ثانية). المحركات مُحسّنة للإجابة خلال ≤8.5 ثوانٍ: أسرع المحركات أولاً، إرجاع مبكر بمجرد كفاية النتائج، وذاكرة مؤقتة داخلية 5 دقائق.

> ملاحظة: خطّة Hobby في Vercel تفرض حد زمني على الدوال؛ أخذناه في الحساب. لتجربة أغنى محلياً (بلا حدود زمنية)، شغّل `npm start` على حاسوبك.

### بنية المشروع

```
server.js          تطبيق express — المسارات، الكوكي، اللغة، الأمان
lib/engines.js     محولات المحركات + الدمج والترتيب + الكاش + قائمة المحركات
lib/render.js      قوالب كل الصفحات
lib/icons.js       سجل أيقونات SVG مضمّنة
lib/proxy.js       قارئ مجهول (جرْد الصفحات)
lib/i18n.js        تحميل الترجمات
lang/*.json        الترجمات (ar / en / fr)
public/            css + js + أيقونات + خطوط + favicon
```

### الدخل

**لا يوجد — أبداً.** لا إعلانات، لا تبرعات، لا خدمات مدفوعة، لا تتبع. المشروع هواية مجتمعية مرخصة MIT.

---

## English

**Developer: zerouki ahmed mouad · زروقي أحمد معاذ** — [MIT licensed](LICENSE)

thunder is a metasearch engine: it asks many independent engines on your behalf, anonymously, and stitches the answers into one clean page. **No logs, no trackers, no profiles, no ads — and no income, ever.**

### Features

- **Multi-engine web search** — DuckDuckGo (regular/lite), Bing (with tracking redirects unwrapped), Mojeek and instant answers in parallel, merged and ranked by cross-engine agreement.
- **Image search** — Openverse (open licenses shown per image) + DuckDuckGo images.
- **Video search** — Invidious + DuckDuckGo videos, with a **“watch anonymously”** button opening videos through Invidious (no ads, no tracking).
- **News search** — fresh headlines with dates and sources, localized to your interface language.
- **Anonymous reader** — open any result through thunder's proxy: scripts, ads and trackers stripped.
- **Instant answers** — type a math expression, get the answer without leaving the box.
- **Light/dark/auto theme** with a quick toggle in the top bar.
- **Full settings** — language, theme, safe search, open-in-new-tab, recent searches, **and which engines thunder queries**.
- **Make it your default engine** — a home button opening a per-browser guide (Chrome/Brave/Firefox/Edge) plus OpenSearch auto-discovery.
- **Three languages** — arabic (full RTL), english, french.
- **Lucky extras** — “i'm feeling lucky” jumps straight to the first result, “surprise me!” opens a random wikipedia article, live suggestions and a clean shareable search link.

### Privacy

- We do not log your ip address, ever.
- We do not store your searches — they exist only while your request is being answered.
- No tracking cookies, no ads, nothing sent to third parties.
- Recent searches (if enabled) live only in your browser's local storage.
- The anonymous reader strips scripts and trackers from every proxied page.
- Strict CSP, `no-referrer`, and a darkreader-lock so extensions leave our theme alone.

### Run locally

```bash
npm install
npm start        # ⚡ http://localhost:3000
npm run dev      # dev mode with auto-reload
```

Optional environment (see `.env.example`): `PORT`, `TH_UPSTREAM_PROXY` (route all engine traffic through an http proxy, e.g. a tor bridge).

### Deploy on Vercel

Import the repository into Vercel — `vercel.json` is included (serverless function, 30s budget). Engines are tuned to answer within ~8.5s: fastest first, early return once enough engines answered, and a 5-minute in-memory cache. For the richest experience run `npm start` locally.

### License & income

MIT — free forever. **No income, ever**: no ads, no donations, no paid tiers.

---

<div dir="rtl">صُنع بحب — <b>zerouki ahmed mouad · زروقي أحمد معاذ</b></div>
