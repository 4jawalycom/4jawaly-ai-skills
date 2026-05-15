---
name: sms-4jawaly
description: إرسال رسائل SMS عبر منصة 4jawaly، الاستعلام عن الرصيد، وجلب أسماء المرسلين المفعّلة. استخدمها عند ذكر "SMS"، "رسالة نصية"، "رصيد"، "اسم مرسل"، "sender name"، أو أي تكامل مع 4jawaly SMS API.
---

# 4jawaly SMS API

## المصادقة
- نوع: `Basic Auth`
- صيغة: `base64(API_KEY:API_SECRET)`
- الترويسة: `Authorization: Basic {{BASE64_TOKEN}}`
- الاعتمادات تُقرأ من متغيرات البيئة: `JAWALY_API_KEY`, `JAWALY_API_SECRET`.

## القاعدة
```
BASE = https://api-sms.4jawaly.com/api/v1
```

## 1) إرسال رسالة نصية
`POST {BASE}/account/area/sms/send`

```json
{
  "messages": [
    {
      "text": "{{MESSAGE_BODY}}",
      "numbers": ["9665XXXXXXXX"],
      "sender": "{{SENDER_NAME}}"
    }
  ]
}
```

مثال curl:
```bash
curl -X POST "$BASE/account/area/sms/send" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $TOKEN" \
  -d '{"messages":[{"text":"مرحبا","numbers":["9665XXXXXXXX"],"sender":"4jawaly"}]}'
```

قواعد:
- رقم الجوال بصيغة دولية بدون `+`.
- `sender` يجب أن يكون اسم مرسل مفعّل (انظر الخطوة 3).
- يمكن إرسال عدة كائنات في `messages` لإرسال جماعي.

## 2) الاستعلام عن الرصيد
`GET {BASE}/account/area/me/balances`

```bash
curl -H "accept: application/json" -H "Authorization: Basic $TOKEN" \
  "$BASE/account/area/me/balances"
```
الرد يحتوي على الباقات المتاحة وعدد الرسائل المتبقية لكل باقة.

## 3) أسماء المرسلين المفعّلة
`GET {BASE}/account/area/me/senders?status=1`

- `status=1` → المرسلون المفعّلون فقط.
- `status=0` → قيد المراجعة.

```bash
curl -H "accept: application/json" -H "Authorization: Basic $TOKEN" \
  "$BASE/account/area/me/senders?status=1"
```

## تلميحات للوكيل
- قبل الإرسال: تحقق من وجود رصيد + من أن `sender` ضمن قائمة المفعّلين.
- عند فشل 401: تأكد من توليد `base64` بدون أسطر جديدة.
- لا تُسجّل التوكن في اللوقات.
