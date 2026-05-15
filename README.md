# 4jawaly AI Skills

تكاملات جاهزة لـ [4jawaly](https://4jawaly.com) (SMS + WhatsApp) لكل أدوات الذكاء الاصطناعي الحديثة.

## ماذا يضم هذا الريبو؟

| المجلد | الاستخدام |
|---|---|
| [`.claude/skills/`](.claude/skills/) | مهارات Claude Code / Claude Desktop |
| [`mcp-server/`](mcp-server/) | **MCP Server رسمي** يعمل مع Claude/Cursor/Cline |
| [`cursor/`](cursor/) | قواعد `.cursorrules` لـ Cursor |
| [`cline/`](cline/) | قواعد `.clinerules` لـ Cline |
| [`windsurf/`](windsurf/) | قواعد `.windsurfrules` لـ Windsurf |
| [`copilot/`](copilot/) | تعليمات GitHub Copilot |
| [`examples/python/`](examples/python/) | عميل Python + أمثلة OpenAI/Anthropic function calling |
| [`examples/nodejs/`](examples/nodejs/) | عميل Node.js |
| [`automation/`](automation/) | وصفات n8n / Make / Zapier |

## الاختيار السريع

| تستخدم... | استعمل |
|---|---|
| Claude Code / Desktop | `.claude/skills/` أو `mcp-server/` |
| Cursor / Cline / Windsurf | `mcp-server/` (الأقوى) أو ملفات rules |
| تبني agent بنفسك (OpenAI/Anthropic SDK) | `examples/` |
| أتمتة بدون كود | `automation/` |

## المهارات الثلاث

1. **SMS** — إرسال، رصيد، أسماء المرسلين
2. **WhatsApp Messages** — نص، ملفات، موقع، رابط، جهة اتصال، أزرار، قوائم
3. **WhatsApp Templates** — قوالب Meta المعتمدة (OTP، إشعارات...)

## الإعداد

```bash
export JAWALY_API_KEY="your_app_key"
export JAWALY_API_SECRET="your_api_secret"
```

كل التكاملات تستخدم Basic Auth: `Authorization: Basic base64(KEY:SECRET)`.

### نقاط النهاية
- **SMS**: `https://api-sms.4jawaly.com/api/v1`
- **WhatsApp**: `https://api-users.4jawaly.com/api/v1/whatsapp/{PROJECT_ID}` (افتراضي `591`)

## التثبيت

### Claude Code (Skills)
```bash
git clone https://github.com/4jawalycom/4jawaly-ai-skills-.git
cp -r 4jawaly-ai-skills-/.claude/skills/* ~/.claude/skills/
```

### MCP Server (الأقوى — يعمل مع كل العملاء)
```bash
cd mcp-server && npm install && npm start
```
راجع [`mcp-server/README.md`](mcp-server/README.md) لربطه بـ Claude / Cursor.

### Cursor / Cline / Windsurf
انسخ ملف الـ rules من المجلد المقابل لجذر مشروعك.

## الترخيص

[MIT](LICENSE)

## المساهمة

PRs مرحّب بها. أبلغ عن أي مشكلة في [Issues](https://github.com/4jawalycom/4jawaly-ai-skills-/issues).
