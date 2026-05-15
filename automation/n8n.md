# n8n Integration — 4jawaly

استخدم **HTTP Request** node لكل العمليات. لا حاجة لـ custom node.

## 1) Credentials (مرة واحدة)
أنشئ **Header Auth** credential:
- Name: `4jawaly Basic`
- Header Name: `Authorization`
- Header Value: `Basic {{BASE64(API_KEY:API_SECRET)}}`

> ولّد البيز64: `echo -n "$KEY:$SECRET" | base64`

## 2) إرسال SMS
- **Method**: `POST`
- **URL**: `https://api-sms.4jawaly.com/api/v1/account/area/sms/send`
- **Auth**: 4jawaly Basic
- **Body** (JSON):
```json
{
  "messages": [
    {
      "text": "{{$json.message}}",
      "numbers": ["{{$json.phone}}"],
      "sender": "{{$json.sender}}"
    }
  ]
}
```

## 3) الرصيد
- `GET https://api-sms.4jawaly.com/api/v1/account/area/me/balances`

## 4) أسماء المرسلين
- `GET https://api-sms.4jawaly.com/api/v1/account/area/me/senders?status=1`

## 5) WhatsApp — نص
- `POST https://api-users.4jawaly.com/api/v1/whatsapp/591`
```json
{
  "path": "message/text",
  "params": { "phone": "{{$json.phone}}", "body": "{{$json.message}}" }
}
```

## 6) WhatsApp — قالب
```json
{
  "path": "message/template",
  "params": {
    "phone": "{{$json.phone}}",
    "template": "{{$json.template}}",
    "language": {"policy":"deterministic","code":"ar"},
    "namespace": "d62f7444_aa0b_40b8_8f46_0bb55ef2862e",
    "params": []
  }
}
```

## نصائح
- لإرسال جماعي: مرّر `numbers` كمصفوفة أرقام، أو استخدم **Split In Batches** + Loop.
- استخدم **IF** node بعد كل طلب للتحقق من `$json.code === 200`.
- خزّن نتائج الاستعلام (الرصيد/المرسلين) في **Set** node لإعادة استخدامها.
