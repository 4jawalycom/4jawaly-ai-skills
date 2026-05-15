# 4jawaly AI Skills

مهارات جاهزة لاستخدام منصة [4jawaly](https://4jawaly.com) مع مساعدات الذكاء الاصطناعي (Claude Code وغيره).

## المهارات المتاحة

| المهارة | الوصف |
|---|---|
| [`sms-4jawaly`](.claude/skills/sms-4jawaly/SKILL.md) | إرسال SMS، الاستعلام عن الرصيد، جلب أسماء المرسلين المفعّلة |
| [`whatsapp-interactive-4jawaly`](.claude/skills/whatsapp-interactive-4jawaly/SKILL.md) | إرسال رسائل واتساب: نص، جهة اتصال، موقع، رابط، ملفات، أزرار، قوائم |
| [`whatsapp-template-4jawaly`](.claude/skills/whatsapp-template-4jawaly/SKILL.md) | إرسال قوالب واتساب المعتمدة من Meta (OTP، إشعارات...) |

## التثبيت في Claude Code

### للمشروع الحالي فقط
```bash
git clone https://github.com/4jawalycom/4jawaly-ai-skills-.git
cp -r 4jawaly-ai-skills-/.claude/skills/* .claude/skills/
```

### لكل المشاريع (عالمياً)
```bash
mkdir -p ~/.claude/skills
cp -r 4jawaly-ai-skills-/.claude/skills/* ~/.claude/skills/
```

## الإعداد

كل المهارات تستخدم `Basic Auth`:
```
Authorization: Basic base64(APP_KEY:API_SECRET)
```

ضع اعتماداتك في متغيرات البيئة:
```bash
export JAWALY_API_KEY="your_app_key"
export JAWALY_API_SECRET="your_api_secret"
export JAWALY_TOKEN=$(echo -n "$JAWALY_API_KEY:$JAWALY_API_SECRET" | base64)
```

## نقاط النهاية الرئيسية

- **SMS**: `https://api-sms.4jawaly.com/api/v1`
- **WhatsApp**: `https://api-users.4jawaly.com/api/v1/whatsapp/{PROJECT_ID}`

## الترخيص

MIT — راجع [LICENSE](LICENSE).

## المساهمة

PRs مرحّب بها. أبلغ عن أي مشكلة في [Issues](https://github.com/4jawalycom/4jawaly-ai-skills-/issues).
