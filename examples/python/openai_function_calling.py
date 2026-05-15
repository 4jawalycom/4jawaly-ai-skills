"""
OpenAI function-calling example — exposes 4jawaly tools to GPT.
Requires: pip install openai
"""
import json
import os
from openai import OpenAI
import jawaly_client as j

client = OpenAI()

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "sms_send",
            "description": "Send SMS via 4jawaly",
            "parameters": {
                "type": "object",
                "required": ["text", "numbers", "sender"],
                "properties": {
                    "text": {"type": "string"},
                    "numbers": {"type": "array", "items": {"type": "string"}},
                    "sender": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "wa_text",
            "description": "Send WhatsApp text",
            "parameters": {
                "type": "object",
                "required": ["phone", "body"],
                "properties": {
                    "phone": {"type": "string"},
                    "body": {"type": "string"},
                },
            },
        },
    },
]

DISPATCH = {"sms_send": j.sms_send, "wa_text": j.wa_text}


def run(user_message):
    messages = [{"role": "user", "content": user_message}]
    while True:
        resp = client.chat.completions.create(
            model="gpt-4o", messages=messages, tools=TOOLS
        )
        msg = resp.choices[0].message
        messages.append(msg)
        if not msg.tool_calls:
            return msg.content
        for call in msg.tool_calls:
            args = json.loads(call.function.arguments)
            result = DISPATCH[call.function.name](**args)
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": json.dumps(result),
            })


if __name__ == "__main__":
    print(run("ابعت رسالة واتساب للرقم 966501234567 تقول: مرحبا"))
