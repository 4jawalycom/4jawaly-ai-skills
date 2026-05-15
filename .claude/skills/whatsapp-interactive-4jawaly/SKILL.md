---
name: whatsapp-interactive-4jawaly
description: إرسال رسائل واتساب عبر 4jawaly — نص، جهة اتصال، موقع، رابط، ملفات (صورة/مستند/صوت/فيديو)، وأزرار/قوائم تفاعلية. استخدمها عند ذكر "واتساب"، "buttons"، "list"، "interactive"، أو إرسال وسائط واتساب.
---

# 4jawaly WhatsApp Messages

## الثابت
- Endpoint: `POST https://api-users.4jawaly.com/api/v1/whatsapp/591`
- Headers:
  - `accept: application/json`
  - `Content-Type: application/json`
  - `Authorization: Basic {{TOKEN}}`  ← `base64(APP_KEY:API_SECRET)`
- شكل الجسم دائماً: `{ "path": "...", "params": {...} }`
- رقم الجوال: دولي بدون `+` (مثل `966501234567`). داخل `contacts[].phones[].phone` يُسمح بـ `+`.

---

## 1) نص — `message/text`
```json
{"path":"message/text","params":{
  "phone":"966501234567",
  "body":"Hello! This is a test message."}}
```

## 2) جهة اتصال — `message/contact`
```json
{"path":"message/contact","params":{
  "phone":"966501234567",
  "contacts":[{
    "name":{"formatted_name":"John Doe","first_name":"John","last_name":"Doe"},
    "phones":[{"phone":"+966501234567","type":"CELL"}]
  }]}}
```

## 3) موقع — `message/location`
```json
{"path":"message/location","params":{
  "phone":"966501234567",
  "lat":24.7136,"lng":46.6753,
  "address":"Riyadh, Saudi Arabia","name":"My Office"}}
```

## 4) رابط مع معاينة — `message/link`
```json
{"path":"message/link","params":{
  "phone":"966501234567",
  "body":"http://www.example.com",
  "title":"Example Website",
  "description":"This is an example website description"}}
```

## 5) ملفات — `message/file`
نفس المسار للأربعة، يتغيّر `type` وحقول إضافية:

### صورة
```json
{"path":"message/file","params":{
  "phone":"966501234567","type":"image",
  "body":"https://example.com/image.jpg",
  "caption":"Check this image!"}}
```

### مستند (يتطلب `filename`)
```json
{"path":"message/file","params":{
  "phone":"966501234567","type":"document",
  "filename":"document.pdf",
  "body":"https://example.com/document.pdf",
  "caption":"Here is the document"}}
```

### صوت (بدون caption)
```json
{"path":"message/file","params":{
  "phone":"966501234567","type":"audio",
  "body":"https://example.com/audio.mp3"}}
```

### فيديو
```json
{"path":"message/file","params":{
  "phone":"966501234567","type":"video",
  "body":"https://example.com/video.mp4",
  "caption":"Watch this video!"}}
```

ملاحظات للملفات:
- `body` = رابط HTTPS مباشر (لا Drive/Dropbox).
- الحدود من Meta: صورة/فيديو/صوت ≤ 16MB، مستند ≤ 100MB.

---

## 6) رسائل تفاعلية — `path: "global"`
الرسائل التفاعلية (Buttons / List) تمرّ عبر Graph API الخام داخل `global`.
- شكل ثابت: `params.url = "messages"`, `params.method = "post"`, ثم `data` كما تتطلبه Meta.
- صالحة فقط داخل نافذة 24 ساعة من آخر رسالة عميل.

### أزرار — `interactive.type = "button"` (≤ 3 أزرار، عنوان ≤ 20 حرف)
```json
{"path":"global","params":{
  "url":"messages","method":"post",
  "data":{
    "messaging_product":"whatsapp","to":"966501234567","type":"interactive",
    "interactive":{
      "type":"button",
      "body":{"text":"Welcome! How can we help you?"},
      "action":{"buttons":[
        {"type":"reply","reply":{"id":"sales_button","title":"Sales"}},
        {"type":"reply","reply":{"id":"support_button","title":"Support"}}
      ]}
    }}}}
```

### قائمة — `interactive.type = "list"` (≤ 10 صفوف إجمالاً)
```json
{"path":"global","params":{
  "url":"messages","method":"post",
  "data":{
    "messaging_product":"whatsapp","to":"966501234567","type":"interactive",
    "interactive":{
      "type":"list",
      "body":{"text":"Please choose an option from the list below"},
      "action":{
        "button":"View Options",
        "sections":[{
          "title":"Our Services",
          "rows":[
            {"id":"option_1","title":"Sales","description":"Contact our sales team"},
            {"id":"option_2","title":"Support","description":"Get technical support"},
            {"id":"option_3","title":"Billing","description":"Billing inquiries"}
          ]
        }]
      }
    }}}}
```

اختياري للقائمة: `header: {"type":"text","text":"..."}` و `footer: {"text":"..."}`.

---

## curl موحّد
```bash
curl -X POST "https://api-users.4jawaly.com/api/v1/whatsapp/591" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $TOKEN" \
  -d @payload.json
```

## خلاصة المسارات
| النوع | path | ملاحظات |
|---|---|---|
| نص | `message/text` | `body` |
| جهة اتصال | `message/contact` | `contacts[]` |
| موقع | `message/location` | `lat/lng/address/name` |
| رابط | `message/link` | `body/title/description` |
| صورة/فيديو/صوت/مستند | `message/file` | `type` + `body` + (`caption`/`filename`) |
| أزرار/قائمة | `global` | تغليف Graph API |

## قواعد للوكيل
- لا تستخدم `global` لإرسال نص/وسائط — استخدم مسارات `message/*` المخصّصة.
- لا تُسجّل `Authorization` في اللوقات.
- `id` للأزرار/الصفوف يجب أن يكون فريداً لسهولة معالجة الرد في webhook.
