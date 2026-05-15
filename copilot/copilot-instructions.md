# 4jawaly — GitHub Copilot Instructions

ضع هذا الملف في `.github/copilot-instructions.md` داخل مشروعك حتى يتبنّى Copilot قواعد التكامل.

## Authentication
All 4jawaly endpoints use Basic Auth: `Authorization: Basic base64(JAWALY_API_KEY:JAWALY_API_SECRET)`. Read credentials from environment, never hardcode.

## SMS API
- Base: `https://api-sms.4jawaly.com/api/v1`
- Send: `POST /account/area/sms/send` with `{"messages":[{"text":"...","numbers":["9665..."],"sender":"..."}]}`
- Balance: `GET /account/area/me/balances`
- Active senders: `GET /account/area/me/senders?status=1`

## WhatsApp API
- Endpoint: `POST https://api-users.4jawaly.com/api/v1/whatsapp/{PROJECT_ID}` (PROJECT_ID is account-specific, read from env)
- Body shape: `{ "path": "...", "params": {...} }`
- Paths:
  - `message/text` — `{phone, body}`
  - `message/file` — `{phone, type: image|video|audio|document, body: <url>, caption?, filename?}`
  - `message/location` — `{phone, lat, lng, address?, name?}`
  - `message/link` — `{phone, body: <url>, title?, description?}`
  - `message/contact` — `{phone, contacts: [...]}`
  - `message/template` — `{phone, template, language: {policy:"deterministic", code:"ar"}, namespace, params: []}`
  - `global` — wraps Meta Graph API for interactive buttons/list

## Rules
- Phone format: international without `+` (e.g., `966501234567`).
- Media URLs must be HTTPS direct links.
- Interactive messages (buttons/list) only work within a 24h customer-session window.
- For out-of-session sends, use `message/template` with a Meta-approved template.
- Buttons: max 3, title ≤ 20 chars. List: ≤ 10 rows total.
- Never log Authorization header.
