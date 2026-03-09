"""
analytics.py
------------
GET /analytics/<code>
  →  total clicks, daily breakdown, top 5 referrers
  →  only the link owner can view (JWT required)
  →  uses MongoDB aggregation pipeline (resume highlight)
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import mongo
from datetime import datetime, timezone

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/<string:code>")
@jwt_required()
def get_analytics(code):
    email = get_jwt_identity()

    # Verify the caller owns this link
    link = mongo.db.links.find_one({"code": code, "owner": email})
    if not link:
        return jsonify({"error": "link not found or access denied"}), 404

    # ── Pipeline 1: total clicks ──────────────────────────────────────────────
    total = mongo.db.clicks.count_documents({"code": code})

    # ── Pipeline 2: per-day breakdown ─────────────────────────────────────────
    # Group by YYYY-MM-DD string derived from the timestamp field
    daily_pipeline = [
        {"$match": {"code": code}},
        {"$group": {
            "_id": {
                "$dateToString": {
                    "format": "%Y-%m-%d",
                    "date":   "$timestamp"
                }
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}   # chronological order
    ]
    daily_raw    = list(mongo.db.clicks.aggregate(daily_pipeline))
    daily_clicks = [{"date": d["_id"], "clicks": d["count"]} for d in daily_raw]

    # ── Pipeline 3: top 5 referrers ───────────────────────────────────────────
    referrer_pipeline = [
        {"$match": {"code": code, "referrer": {"$ne": ""}}},
        {"$group": {
            "_id":   "$referrer",
            "count": {"$sum": 1}
        }},
        {"$sort":  {"count": -1}},
        {"$limit": 5}
    ]
    referrer_raw  = list(mongo.db.clicks.aggregate(referrer_pipeline))
    top_referrers = [{"referrer": r["_id"], "clicks": r["count"]} for r in referrer_raw]

    return jsonify({
        "code":          code,
        "long_url":      link["long_url"],
        "created_at":    link["created_at"].isoformat(),
        "total_clicks":  total,
        "daily_clicks":  daily_clicks,
        "top_referrers": top_referrers,
    }), 200