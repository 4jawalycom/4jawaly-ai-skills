# @4jawaly/mcp-server

MCP server يعرض أدوات 4jawaly (SMS + WhatsApp) لأي client يدعم MCP (Claude Desktop، Claude Code، Cursor، Cline...).

## التثبيت

```bash
cd mcp-server
npm install
```

## التشغيل المحلي

```bash
export JAWALY_API_KEY="..."
export JAWALY_API_SECRET="..."
npm start
```

## ربطه بـ Claude Desktop

في `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "4jawaly": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/src/index.js"],
      "env": {
        "JAWALY_API_KEY": "your_key",
        "JAWALY_API_SECRET": "your_secret"
      }
    }
  }
}
```

## ربطه بـ Claude Code

```bash
claude mcp add 4jawaly node /absolute/path/to/mcp-server/src/index.js \
  -e JAWALY_API_KEY=... -e JAWALY_API_SECRET=...
```

## ربطه بـ Cursor

في `~/.cursor/mcp.json` نفس صيغة Claude Desktop.

## الأدوات المتاحة

| Tool | الوصف |
|---|---|
| `sms_send` | إرسال SMS |
| `sms_balance` | الرصيد |
| `sms_senders` | أسماء المرسلين |
| `wa_send_text` | نص واتساب |
| `wa_send_file` | صورة/فيديو/صوت/مستند |
| `wa_send_location` | موقع |
| `wa_send_link` | رابط بمعاينة |
| `wa_send_contact` | جهة اتصال |
| `wa_send_buttons` | أزرار تفاعلية |
| `wa_send_list` | قائمة تفاعلية |
| `wa_send_template` | قالب Meta |

## متغيرات البيئة

| Var | إلزامي | الافتراضي |
|---|---|---|
| `JAWALY_API_KEY` | ✅ | — |
| `JAWALY_API_SECRET` | ✅ | — |
| `JAWALY_WA_PROJECT_ID` | ❌ | `591` |
| `JAWALY_WA_NAMESPACE` | ❌ | `d62f7444_aa0b_40b8_8f46_0bb55ef2862e` |
