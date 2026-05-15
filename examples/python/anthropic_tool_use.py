"""
Anthropic tool-use example — exposes 4jawaly tools to Claude.
Requires: pip install anthropic
"""
import os
from anthropic import Anthropic
import jawaly_client as j

client = Anthropic()

TOOLS = [
    {
        "name": "sms_send",
        "description": "Send SMS via 4jawaly",
        "input_schema": {
            "type": "object",
            "required": ["text", "numbers", "sender"],
            "properties": {
                "text": {"type": "string"},
                "numbers": {"type": "array", "items": {"type": "string"}},
                "sender": {"type": "string"},
            },
        },
    },
    {
        "name": "wa_text",
        "description": "Send a WhatsApp text message",
        "input_schema": {
            "type": "object",
            "required": ["phone", "body"],
            "properties": {
                "phone": {"type": "string", "description": "International, no +"},
                "body": {"type": "string"},
            },
        },
    },
]

DISPATCH = {"sms_send": j.sms_send, "wa_text": j.wa_text}


def run(user_message):
    messages = [{"role": "user", "content": user_message}]
    while True:
        resp = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=1024,
            tools=TOOLS,
            messages=messages,
        )
        if resp.stop_reason == "end_turn":
            return "".join(b.text for b in resp.content if b.type == "text")
        messages.append({"role": "assistant", "content": resp.content})
        tool_results = []
        for b in resp.content:
            if b.type == "tool_use":
                result = DISPATCH[b.name](**b.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": b.id,
                    "content": str(result),
                })
        messages.append({"role": "user", "content": tool_results})


if __name__ == "__main__":
    print(run("ابعت رسالة واتساب للرقم 966501234567 تقول: مرحبا"))
