# ============================================================
# app/__init__.py — Factory de Flask con seguridad completa
# ============================================================
import os
import redis
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_talisman import Talisman

# ── Extensiones globales ──────────────────────────────────────
db         = SQLAlchemy()
migrate    = Migrate()
jwt        = JWTManager()
mail       = Mail()
socketio   = SocketIO()
limiter    = Limiter(key_func=get_remote_address)
redis_client = None


def create_app(config_name: str = None) -> Flask:
    global redis_client

    app = Flask(__name__)

    # ── Configuración ─────────────────────────────────────────
    from app.config import config
    env = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config.get(env, config['default']))

    # ── Redis ─────────────────────────────────────────────────
    redis_client = redis.from_url(
        app.config['REDIS_URL'],
        decode_responses=True
    )

    # ── Extensiones ───────────────────────────────────────────
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)

    socketio.init_app(
        app,
        cors_allowed_origins=app.config['FRONTEND_URL'],
        async_mode='gevent',
        manage_session=False
    )

    # ── CORS ──────────────────────────────────────────────────
    CORS(app,
         origins=[app.config['FRONTEND_URL']],
         supports_credentials=True,
         allow_headers=['Content-Type', 'X-CSRF-TOKEN'])

    # ── Headers de seguridad (Talisman) ───────────────────────
    if not app.debug:
        Talisman(
            app,
            force_https=True,
            strict_transport_security=True,
            strict_transport_security_max_age=31536000,
            content_security_policy=app.config.get('CSP'),
            frame_options='DENY',
            referrer_policy='strict-origin-when-cross-origin'
        )

    # ── JWT Callbacks ─────────────────────────────────────────
    @jwt.token_in_blocklist_loader
    def verificar_blacklist(jwt_header, jwt_payload):
        jti = jwt_payload.get('jti')
        return bool(redis_client.exists(f"blacklist:{jti}"))

    @jwt.revoked_token_loader
    def token_revocado(jwt_header, jwt_payload):
        return jsonify({
            "error": "Sesión expirada",
            "codigo": "SESSION_EXPIRED"
        }), 401

    @jwt.expired_token_loader
    def token_expirado(jwt_header, jwt_payload):
        return jsonify({
            "error": "Token expirado por inactividad",
            "codigo": "TOKEN_EXPIRED"
        }), 401

    @jwt.unauthorized_loader
    def sin_autorizacion(razon):
        return jsonify({
            "error": "No autorizado",
            "detalle": razon
        }), 401

    # ── Registrar Blueprints ──────────────────────────────────
    from app.routes.auth      import auth_bp
    from app.routes.admin     import admin_bp
    from app.routes.empresa   import empresa_bp
    from app.routes.postulante import postulante_bp
    from app.routes.vacantes  import vacantes_bp
    from app.routes.chat      import chat_bp
    from app.routes.chatbot   import chatbot_bp
    from app.routes.cv        import cv_bp

    app.register_blueprint(auth_bp,       url_prefix='/api/auth')
    app.register_blueprint(admin_bp,      url_prefix='/api/admin')
    app.register_blueprint(empresa_bp,    url_prefix='/api/empresa')
    app.register_blueprint(postulante_bp, url_prefix='/api/postulante')
    app.register_blueprint(vacantes_bp,   url_prefix='/api/vacantes')
    app.register_blueprint(chat_bp,       url_prefix='/api/chat')
    app.register_blueprint(chatbot_bp,    url_prefix='/api/chatbot')
    app.register_blueprint(cv_bp,         url_prefix='/api/postulante/cv')

    # ── Registrar eventos de SocketIO ─────────────────────────
    from app.routes.chat import registrar_eventos_socket
    registrar_eventos_socket(socketio)

    # ── Importar modelos (para Migrate) ───────────────────────
    from app.models import (
        Usuario, Empresa, Postulante, Curriculum,
        ExperienciaLaboral, Educacion, Habilidad,
        Vacante, Postulacion, Mensaje, SesionActiva,
        Notificacion, AlertaSeguridad, IntentoLogin,
        DispositivoConfianza
    )

    # ── Health check ──────────────────────────────────────────
    @app.route('/api/health')
    def health():
        return jsonify({"status": "ok", "version": "1.0.0"})

    return app
