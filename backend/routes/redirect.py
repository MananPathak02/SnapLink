"""
redirect.py
-----------
GET /<code> → redirect to long_url (301)
"""
from flask import Blueprint, redirect, request, jsonify
from extensions import mongo
from datetime import datetime, timezone

redirect_bp = Blueprint("redirect", __name__)


@redirect_bp.route("/<string:code>")
def do_redirect(code):
    doc = mongo.db.links.find_one({"code": code})

    if not doc:
        return jsonify({"error": "short link not found"}), 404

    if doc.get("expires_at"):
        now = datetime.now(timezone.utc)
        exp = doc["expires_at"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            return jsonify({"error": "this link has expired"}), 410

    mongo.db.clicks.insert_one({
        "code": code,
        "timestamp": datetime.now(timezone.utc),
        "ip": request.headers.get("X-Forwarded-For", request.remote_addr),
        "user_agent": request.headers.get("User-Agent", ""),
        "referrer": request.headers.get("Referer", ""),
    })

    mongo.db.links.update_one({"code": code}, {"$inc": {"clicks": 1}})

    return redirect(doc["long_url"], code=301)
