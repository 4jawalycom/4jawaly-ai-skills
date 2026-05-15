"""
4jawaly Python client — minimal, dependency-free (uses stdlib).
Usage:
    export JAWALY_API_KEY=...
    export JAWALY_API_SECRET=...
    python jawaly_client.py
"""
import base64
import json
import os
import urllib.request

API_KEY = os.environ["JAWALY_API_KEY"]
API_SECRET = os.environ["JAWALY_API_SECRET"]
TOKEN = base64.b64encode(f"{API_KEY}:{API_SECRET}".encode()).decode()

SMS_BASE = "https://api-sms.4jawaly.com/api/v1"
WA_URL = "https://api-users.4jawaly.com/api/v1/whatsapp/591"
WA_NAMESPACE = "d62f7444_aa0b_40b8_8f46_0bb55ef2862e"

HEADERS = {
    "accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": f"Basic {TOKEN}",
}


def _request(url, method="GET", body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


# ---------- SMS ----------
def sms_send(text, numbers, sender):
    return _request(f"{SMS_BASE}/account/area/sms/send", "POST", {
        "messages": [{"text": text, "numbers": numbers, "sender": sender}]
    })


def sms_balance():
    return _request(f"{SMS_BASE}/account/area/me/balances")


def sms_senders(status=1):
    return _request(f"{SMS_BASE}/account/area/me/senders?status={status}")


# ---------- WhatsApp ----------
def _wa(payload):
    return _request(WA_URL, "POST", payload)


def wa_text(phone, body):
    return _wa({"path": "message/text", "params": {"phone": phone, "body": body}})


def wa_file(phone, type_, url, caption=None, filename=None):
    params = {"phone": phone, "type": type_, "body": url}
    if caption: params["caption"] = caption
    if filename: params["filename"] = filename
    return _wa({"path": "message/file", "params": params})


def wa_location(phone, lat, lng, address=None, name=None):
    params = {"phone": phone, "lat": lat, "lng": lng}
    if address: params["address"] = address
    if name: params["name"] = name
    return _wa({"path": "message/location", "params": params})


def wa_link(phone, url, title=None, description=None):
    params = {"phone": phone, "body": url}
    if title: params["title"] = title
    if description: params["description"] = description
    return _wa({"path": "message/link", "params": params})


def wa_buttons(phone, body, buttons):
    """buttons: [{'id': ..., 'title': ...}, ...] max 3"""
    return _wa({"path": "global", "params": {
        "url": "messages", "method": "post",
        "data": {
            "messaging_product": "whatsapp", "to": phone, "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body},
                "action": {"buttons": [
                    {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                    for b in buttons
                ]},
            },
        },
    }})


def wa_template(phone, template, params=None, language_code="ar"):
    return _wa({"path": "message/template", "params": {
        "phone": phone, "template": template,
        "language": {"policy": "deterministic", "code": language_code},
        "namespace": WA_NAMESPACE,
        "params": params or [],
    }})


if __name__ == "__main__":
    print(json.dumps(sms_balance(), indent=2, ensure_ascii=False))
