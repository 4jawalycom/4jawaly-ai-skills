#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const {
  JAWALY_API_KEY,
  JAWALY_API_SECRET,
  JAWALY_WA_PROJECT_ID = "591",
  JAWALY_WA_NAMESPACE = "d62f7444_aa0b_40b8_8f46_0bb55ef2862e",
} = process.env;

if (!JAWALY_API_KEY || !JAWALY_API_SECRET) {
  console.error("Missing JAWALY_API_KEY or JAWALY_API_SECRET env vars");
  process.exit(1);
}

const TOKEN = Buffer.from(`${JAWALY_API_KEY}:${JAWALY_API_SECRET}`).toString("base64");
const SMS_BASE = "https://api-sms.4jawaly.com/api/v1";
const WA_URL = `https://api-users.4jawaly.com/api/v1/whatsapp/${JAWALY_WA_PROJECT_ID}`;

async function smsRequest(path, method = "GET", body) {
  const res = await fetch(`${SMS_BASE}${path}`, {
    method,
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function waRequest(payload) {
  const res = await fetch(WA_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const tools = [
  {
    name: "sms_send",
    description: "Send an SMS message via 4jawaly to one or more numbers.",
    inputSchema: {
      type: "object",
      required: ["text", "numbers", "sender"],
      properties: {
        text: { type: "string" },
        numbers: { type: "array", items: { type: "string" } },
        sender: { type: "string", description: "Approved sender name" },
      },
    },
  },
  {
    name: "sms_balance",
    description: "Get current SMS balance / packages.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "sms_senders",
    description: "List sender names. status=1 active, status=0 pending.",
    inputSchema: {
      type: "object",
      properties: { status: { type: "integer", enum: [0, 1], default: 1 } },
    },
  },
  {
    name: "wa_send_text",
    description: "Send a WhatsApp text message (inside 24h session window).",
    inputSchema: {
      type: "object",
      required: ["phone", "body"],
      properties: {
        phone: { type: "string", description: "International, no +" },
        body: { type: "string" },
      },
    },
  },
  {
    name: "wa_send_file",
    description: "Send WhatsApp media (image/video/audio/document) via URL.",
    inputSchema: {
      type: "object",
      required: ["phone", "type", "body"],
      properties: {
        phone: { type: "string" },
        type: { type: "string", enum: ["image", "video", "audio", "document"] },
        body: { type: "string", description: "HTTPS direct URL" },
        caption: { type: "string" },
        filename: { type: "string", description: "Required for document" },
      },
    },
  },
  {
    name: "wa_send_location",
    description: "Send a WhatsApp location pin.",
    inputSchema: {
      type: "object",
      required: ["phone", "lat", "lng"],
      properties: {
        phone: { type: "string" },
        lat: { type: "number" },
        lng: { type: "number" },
        address: { type: "string" },
        name: { type: "string" },
      },
    },
  },
  {
    name: "wa_send_link",
    description: "Send a WhatsApp link with preview.",
    inputSchema: {
      type: "object",
      required: ["phone", "body"],
      properties: {
        phone: { type: "string" },
        body: { type: "string", description: "URL" },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
  },
  {
    name: "wa_send_contact",
    description: "Send a WhatsApp contact card.",
    inputSchema: {
      type: "object",
      required: ["phone", "contacts"],
      properties: {
        phone: { type: "string" },
        contacts: { type: "array" },
      },
    },
  },
  {
    name: "wa_send_buttons",
    description: "Send WhatsApp interactive buttons (max 3, title ≤ 20 chars).",
    inputSchema: {
      type: "object",
      required: ["phone", "body", "buttons"],
      properties: {
        phone: { type: "string" },
        body: { type: "string" },
        buttons: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            required: ["id", "title"],
            properties: { id: { type: "string" }, title: { type: "string" } },
          },
        },
      },
    },
  },
  {
    name: "wa_send_list",
    description: "Send WhatsApp interactive list (≤ 10 rows total).",
    inputSchema: {
      type: "object",
      required: ["phone", "body", "button", "sections"],
      properties: {
        phone: { type: "string" },
        body: { type: "string" },
        button: { type: "string" },
        header: { type: "string" },
        footer: { type: "string" },
        sections: { type: "array" },
      },
    },
  },
  {
    name: "wa_send_template",
    description: "Send a Meta-approved WhatsApp template (works outside 24h).",
    inputSchema: {
      type: "object",
      required: ["phone", "template"],
      properties: {
        phone: { type: "string" },
        template: { type: "string" },
        language_code: { type: "string", default: "ar" },
        params: {
          type: "array",
          description: "Template components (body/button). Pass [] if none.",
        },
      },
    },
  },
];

const handlers = {
  sms_send: ({ text, numbers, sender }) =>
    smsRequest("/account/area/sms/send", "POST", {
      messages: [{ text, numbers, sender }],
    }),
  sms_balance: () => smsRequest("/account/area/me/balances"),
  sms_senders: ({ status = 1 } = {}) =>
    smsRequest(`/account/area/me/senders?status=${status}`),

  wa_send_text: ({ phone, body }) =>
    waRequest({ path: "message/text", params: { phone, body } }),

  wa_send_file: ({ phone, type, body, caption, filename }) =>
    waRequest({
      path: "message/file",
      params: {
        phone,
        type,
        body,
        ...(caption && { caption }),
        ...(filename && { filename }),
      },
    }),

  wa_send_location: ({ phone, lat, lng, address, name }) =>
    waRequest({
      path: "message/location",
      params: { phone, lat, lng, ...(address && { address }), ...(name && { name }) },
    }),

  wa_send_link: ({ phone, body, title, description }) =>
    waRequest({
      path: "message/link",
      params: { phone, body, ...(title && { title }), ...(description && { description }) },
    }),

  wa_send_contact: ({ phone, contacts }) =>
    waRequest({ path: "message/contact", params: { phone, contacts } }),

  wa_send_buttons: ({ phone, body, buttons }) =>
    waRequest({
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
    }),

  wa_send_list: ({ phone, body, button, sections, header, footer }) =>
    waRequest({
      path: "global",
      params: {
        url: "messages",
        method: "post",
        data: {
          messaging_product: "whatsapp",
          to: phone,
          type: "interactive",
          interactive: {
            type: "list",
            ...(header && { header: { type: "text", text: header } }),
            body: { text: body },
            ...(footer && { footer: { text: footer } }),
            action: { button, sections },
          },
        },
      },
    }),

  wa_send_template: ({ phone, template, language_code = "ar", params = [] }) =>
    waRequest({
      path: "message/template",
      params: {
        phone,
        template,
        language: { policy: "deterministic", code: language_code },
        namespace: JAWALY_WA_NAMESPACE,
        params,
      },
    }),
};

const server = new Server(
  { name: "4jawaly-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const handler = handlers[req.params.name];
  if (!handler) throw new Error(`Unknown tool: ${req.params.name}`);
  const result = await handler(req.params.arguments || {});
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: result.status >= 400,
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("4jawaly MCP server running on stdio");
