# Zapier — 4jawaly

استخدم action **Webhooks by Zapier > Custom Request**.

## إعداد عام
- Method: `POST` (أو `GET`)
- URL: حسب العملية أدناه
- Headers:
  ```
  accept: application/json
  Content-Type: application/json
  Authorization: Basic {{BASE64_TOKEN}}
  ```
- Data Pass-Through: `No`
- Data: raw JSON body

## الأمثلة

### SMS
- URL: `https://api-sms.4jawaly.com/api/v1/account/area/sms/send`
- Data:
```json
{"messages":[{"text":"{{message}}","numbers":["{{phone}}"],"sender":"{{sender}}"}]}
```

### الرصيد
- `GET https://api-sms.4jawaly.com/api/v1/account/area/me/balances`

### WhatsApp Text
- URL: `https://api-users.4jawaly.com/api/v1/whatsapp/591`
- Data:
```json
{"path":"message/text","params":{"phone":"{{phone}}","body":"{{message}}"}}
```

### WhatsApp Template
```json
{"path":"message/template","params":{"phone":"{{phone}}","template":"{{template_name}}","language":{"policy":"deterministic","code":"ar"},"namespace":"d62f7444_aa0b_40b8_8f46_0bb55ef2862e","params":[]}}
```

## نصائح
- استخدم **Filter** قبل الإرسال للتحقق من صيغة الرقم (regex: `^966\d{9}$`).
- لإرسال جماعي: استخدم **Looping by Zapier**.
- خزّن التوكن في Zapier **Storage** أو في Zap shared variables.
