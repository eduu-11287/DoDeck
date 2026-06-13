from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_name='default'):
    app = Flask(__name__)

    from app.config import config
    app.config.from_object(config[config_name])

    db.init_app(app)
    migrate.init_app(app, db)

    cors_origins = app.config.get('CORS_ORIGINS', 'http://localhost:5173')
    if isinstance(cors_origins, str):
        cors_origins = [origin.strip() for origin in cors_origins.split(',')]
    CORS(app, supports_credentials=True, origins=cors_origins)

    from app.routes.auth import auth_bp
    from app.routes.tasks import tasks_bp
    from app.routes.notes import notes_bp
    from app.routes.export import export_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(export_bp)

    return app
