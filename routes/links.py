"""
links.py
--------
POST   /links/shorten        → create a short link       (auth required)
GET    /links/               → list all your short links  (auth required)
DELETE /links/<code>         → delete a short link        (auth required)

Rate limit: 10 shortens per hour per user.
Expiry:     optional `expire_hours` field in JSON body (default = never).
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import mongo
from datetime import datetime, timedelta, timezone
import string, random

links_bp = Blueprint("links", __name__)

# ── helpers ──────────────────────────────────────────────────────────────────

ALPHABET = string.ascii_letters + string.digits   # a-z A-Z 0-9

def _generate_code(length=6):
    """Return a random 6-char alphanumeric string."""
    return "".join(random.choices(ALPHABET, k=length))

def _unique_code():
    """Keep generating until we find a code not already in DB."""
    for _ in range(10):
        code = _generate_code()
        if not mongo.db.links.find_one({"code": code}):
            return code
    raise RuntimeError("Could not generate unique code – try again")

def _check_rate_limit(email):
    """
    Allow max 10 shortens per rolling 60-minute window per user.
    Returns (allowed: bool, remaining: int)
    """
    window_start = datetime.now(timezone.utc) - timedelta(hours=1)
    count = mongo.db.links.count_documents({
        "owner": email,
        "created_at": {"$gte": window_start}
    })
    return count < 10, max(0, 10 - count)

# ── routes ───────────────────────────────────────────────────────────────────

@links_bp.route("/shorten", methods=["POST"])
@jwt_required()
def shorten():
    email = get_jwt_identity()

    # Rate limit check
    allowed, remaining = _check_rate_limit(email)
    if not allowed:
        return jsonify({
            "error": "Rate limit exceeded. Max 10 shortens per hour.",
            "retry_after": "1 hour"
        }), 429   # HTTP 429 Too Many Requests

    data        = request.get_json()
    long_url    = data.get("url", "").strip()
    custom_code = data.get("custom_code", "").strip()
    expire_hrs  = data.get("expire_hours")   # None means never expires

    if not long_url:
        return jsonify({"error": "url is required"}), 400
    if not long_url.startswith(("http://", "https://")):
        long_url = "https://" + long_url

    # Custom code or auto-generate
    if custom_code:
        if mongo.db.links.find_one({"code": custom_code}):
            return jsonify({"error": "custom code already taken"}), 409
        code = custom_code
    else:
        code = _unique_code()

    now       = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=expire_hrs) if expire_hrs else None

    mongo.db.links.insert_one({
        "code":       code,
        "long_url":   long_url,
        "owner":      email,
        "created_at": now,
        "expires_at": expires_at,   # None = never expires
        "clicks":     0,            # total click counter
    })

    return jsonify({
        "short_code":  code,
        "short_url":   f"{request.host_url}{code}",
        "long_url":    long_url,
        "expires_at":  expires_at.isoformat() if expires_at else None,
        "remaining_shortens_this_hour": remaining - 1
    }), 201


@links_bp.route("/", methods=["GET"])
@jwt_required()
def list_links():
    email = get_jwt_identity()
    cursor = mongo.db.links.find(
        {"owner": email},
        {"_id": 0, "code": 1, "long_url": 1, "clicks": 1,
         "created_at": 1, "expires_at": 1}
    ).sort("created_at", -1)

    links = []
    for doc in cursor:
        # convert datetime to ISO string for JSON
        doc["created_at"] = doc["created_at"].isoformat()
        if doc.get("expires_at"):
            doc["expires_at"] = doc["expires_at"].isoformat()
        links.append(doc)

    return jsonify({"links": links, "total": len(links)}), 200


@links_bp.route("/<code>", methods=["DELETE"])
@jwt_required()
def delete_link(code):
    email  = get_jwt_identity()
    result = mongo.db.links.delete_one({"code": code, "owner": email})
    if result.deleted_count == 0:
        return jsonify({"error": "link not found or not yours"}), 404
    return jsonify({"message": f"/{code} deleted"}), 200