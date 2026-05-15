# Make.com (Integromat) — 4jawaly

استخدم module **HTTP > Make a request**.

## إعداد عام
- Method: `POST` (أو `GET` للاستعلام)
- Headers:
  - `accept`: `application/json`
  - `Content-Type`: `application/json`
  - `Authorization`: `Basic {{BASE64(KEY:SECRET)}}`
- Body type: `Raw` / `application/json`
- Parse response: `Yes`

## السيناريوهات

### SMS Send
- URL: `https://api-sms.4jawaly.com/api/v1/account/area/sms/send`
- Body:
```json
{"messages":[{"text":"{{1.text}}","numbers":["{{1.phone}}"],"sender":"{{1.sender}}"}]}
```

### Balance / Senders
- `GET https://api-sms.4jawaly.com/api/v1/account/area/me/balances`
- `GET https://api-sms.4jawaly.com/api/v1/account/area/me/senders?status=1`

### WhatsApp Text
- URL: `https://api-users.4jawaly.com/api/v1/whatsapp/591`
- Body:
```json
{"path":"message/text","params":{"phone":"{{1.phone}}","body":"{{1.message}}"}}
```

### WhatsApp Template (OTP)
```json
{"path":"message/template","params":{
  "phone":"{{1.phone}}","template":"gocode",
  "language":{"policy":"deterministic","code":"ar"},
  "namespace":"d62f7444_aa0b_40b8_8f46_0bb55ef2862e",
  "params":[
    {"type":"body","parameters":[{"type":"text","text":"{{1.otp}}"}]},
    {"type":"button","index":0,"sub_type":"URL","parameters":[{"type":"text","text":"{{1.otp}}"}]}
  ]
}}
```

## نصائح
- استخدم **Iterator** لإرسال جماعي على أرقام متعددة.
- خزّن التوكن في **Data Store** بدل تكراره في كل module.
