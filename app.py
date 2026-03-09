from flask import Flask, render_template
from extensions import mongo, jwt
from routes.auth import auth_bp
from routes.links import links_bp
from routes.analytics import analytics_bp
from routes.redirect import redirect_bp
import os

def create_app():
    app = Flask(__name__)

    # ── Config ──────────────────────────────────────────────
    app.config["MONGO_URI"] = "mongodb+srv://mananpathak0052_db_user:YPC5vlNEWjqL57O4@cluster4.zjnpftw.mongodb.net/snaplink?retryWrites=true&w=majority"
    app.config["JWT_SECRET_KEY"] = "very-long-random-secret-key"

    # ── Extensions ──────────────────────────────────────────
    mongo.init_app(app)
    jwt.init_app(app)

    # # ── API Blueprints ───────────────────────────────────────
    app.register_blueprint(auth_bp,      url_prefix="/auth")
    app.register_blueprint(links_bp,     url_prefix="/links")
    app.register_blueprint(analytics_bp, url_prefix="/analytics")
    app.register_blueprint(redirect_bp)  # handles /<short_code>

    # ── Serve HTML pages ─────────────────────────────────────
    @app.route("/")
    def home():
        return render_template("index.html")

    @app.route("/auth.html")
    def auth_page():
        return render_template("auth.html")

    @app.route("/dashboard.html")
    def dashboard():
        return render_template("dashboard.html")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)