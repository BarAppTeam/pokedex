from flask import Flask
from flask_cors import CORS

from .config import get_client_origins
from .routes import api


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, origins=get_client_origins())
    app.register_blueprint(api)
    return app
