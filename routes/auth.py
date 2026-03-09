from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from extensions import mongo
import bcrypt

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    if mongo.db.users.find_one({"email": email}):
        return jsonify({"error": "email already registered"}), 409

    # bcrypt hashes the password – never store plain text
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    mongo.db.users.insert_one({
        "email": email,
        "password": hashed,          # stored as bytes in MongoDB
    })
    return jsonify({"message": "registered successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = mongo.db.users.find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode(), user["password"]):
        return jsonify({"error": "invalid credentials"}), 401

    # identity = email string; embed into JWT payload
    token = create_access_token(identity=email)
    return jsonify({"access_token": token}), 200