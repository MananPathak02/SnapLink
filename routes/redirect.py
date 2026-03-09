"""
redirect.py
-----------
GET /<code>  →  redirect to long_url (301)
              →  410 Gone  if expired
              →  404 Not Found if code doesn't exist

On every successful redirect, logs a click event:
  { code, timestamp, ip, user_agent }
"""
from flask import Blueprint, redirect, request, jsonify, abort
from extensions import mongo
from datetime import datetime, timezone

redirect_bp = Blueprint("redirect", __name__)


@redirect_bp.route("/<string:code>")
def do_redirect(code):
    doc = mongo.db.links.find_one({"code": code})

    # ── 404 – code doesn't exist ──────────────────────────
    if not doc:
        return jsonify({"error": "short link not found"}), 404

    # ── 410 – link has expired ────────────────────────────
    if doc.get("expires_at"):
        now = datetime.now(timezone.utc)
        # Make expires_at timezone-aware if stored naive
        exp = doc["expires_at"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            return jsonify({"error": "this link has expired"}), 410  # HTTP 410 Gone

    # ── Log the click ─────────────────────────────────────
    mongo.db.clicks.insert_one({
        "code":       code,
        "timestamp":  datetime.now(timezone.utc),
        "ip":         request.headers.get("X-Forwarded-For", request.remote_addr),
        "user_agent": request.headers.get("User-Agent", ""),
        "referrer":   request.headers.get("Referer", ""),
    })

    # Increment the denormalised click counter on the link doc
    mongo.db.links.update_one({"code": code}, {"$inc": {"clicks": 1}})

    # ── 301 Permanent redirect ────────────────────────────
    return redirect(doc["long_url"], code=301)