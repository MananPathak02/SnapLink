from flask import Flask, render_template
from extensions import mongo, jwt
from routes.auth import auth_bp
from routes.links import links_bp
from routes.analytics import analytics_bp
from routes.redirect import redirect_bp
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)

    # Config from .env
    app.config["MONGO_URI"] = os.getenv("MONGO_URI")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

    mongo.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(links_bp, url_prefix="/links")
    app.register_blueprint(analytics_bp, url_prefix="/analytics")
    app.register_blueprint(redirect_bp)

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