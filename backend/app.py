from flask import Flask, jsonify
from flask_cors import CORS
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

    # Enable CORS for all routes (allows Vercel frontend to query Render backend)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    mongo.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(links_bp, url_prefix="/links")
    app.register_blueprint(analytics_bp, url_prefix="/analytics")
    app.register_blueprint(redirect_bp)

    @app.route("/")
    def health_check():
        return jsonify({
            "name": "SnapLink API",
            "status": "online",
            "version": "1.0.0"
        }), 200

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
