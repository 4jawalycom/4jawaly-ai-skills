// 4jawaly Node.js client — zero dependencies (uses native fetch, Node ≥ 18)
const { JAWALY_API_KEY, JAWALY_API_SECRET } = process.env;
const TOKEN = Buffer.from(`${JAWALY_API_KEY}:${JAWALY_API_SECRET}`).toString("base64");

const SMS_BASE = "https://api-sms.4jawaly.com/api/v1";
const WA_URL = "https://api-users.4jawaly.com/api/v1/whatsapp/591";
const WA_NAMESPACE = "d62f7444_aa0b_40b8_8f46_0bb55ef2862e";

const HEADERS = {
  accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Basic ${TOKEN}`,
};

async function request(url, method = "GET", body) {
  const r = await fetch(url, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

// SMS
export const smsSend = (text, numbers, sender) =>
  request(`${SMS_BASE}/account/area/sms/send`, "POST", {
    messages: [{ text, numbers, sender }],
  });
export const smsBalance = () => request(`${SMS_BASE}/account/area/me/balances`);
export const smsSenders = (status = 1) =>
  request(`${SMS_BASE}/account/area/me/senders?status=${status}`);

// WhatsApp
const wa = (payload) => request(WA_URL, "POST", payload);

export const waText = (phone, body) =>
  wa({ path: "message/text", params: { phone, body } });

export const waFile = (phone, type, body, { caption, filename } = {}) =>
  wa({
    path: "message/file",
    params: { phone, type, body, ...(caption && { caption }), ...(filename && { filename }) },
  });

export const waLocation = (phone, lat, lng, { address, name } = {}) =>
  wa({
    path: "message/location",
    params: { phone, lat, lng, ...(address && { address }), ...(name && { name }) },
  });

export const waLink = (phone, url, { title, description } = {}) =>
  wa({
    path: "message/link",
    params: { phone, body: url, ...(title && { title }), ...(description && { description }) },
  });

export const waButtons = (phone, body, buttons) =>
  wa({
    path: "global",
    params: {
      url: "messages",
      method: "post",
      data: {
        messaging_product: "whatsapp",
        to: phone,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      },
    },
  });

export const waTemplate = (phone, template, params = [], languageCode = "ar") =>
  wa({
    path: "message/template",
    params: {
      phone,
      template,
      language: { policy: "deterministic", code: languageCode },
      namespace: WA_NAMESPACE,
      params,
    },
  });
