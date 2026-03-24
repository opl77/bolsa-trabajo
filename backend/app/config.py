# ============================================================
# config.py â€” ConfiguraciÃ³n central de Flask
# ============================================================
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # â”€â”€ Core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    SECRET_KEY                        = os.environ.get('SECRET_KEY')
    DEBUG                             = False
    TESTING                           = False

    # â”€â”€ Base de Datos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    SQLALCHEMY_DATABASE_URI           = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS    = False
    SQLALCHEMY_ENGINE_OPTIONS         = {
        'pool_pre_ping': True,
        'pool_recycle':  300,
    }

    # â”€â”€ JWT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    JWT_SECRET_KEY                    = os.environ.get('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES          = timedelta(minutes=30)   # Timeout inactividad
    JWT_REFRESH_TOKEN_EXPIRES         = timedelta(hours=8)
    JWT_TOKEN_LOCATION                = ['cookies']
    JWT_COOKIE_SECURE                 = True                   # Solo HTTPS
    JWT_COOKIE_HTTPONLY               = True                   # JS no puede leer
    JWT_COOKIE_SAMESITE               = 'None'               # Anti-CSRF
    JWT_ACCESS_COOKIE_NAME            = '_sid'                 # Nombre no descriptivo
    JWT_REFRESH_COOKIE_NAME           = '_srid'
    JWT_COOKIE_CSRF_PROTECT           = False

    # â”€â”€ Redis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    REDIS_URL                         = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

    # â”€â”€ Email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    MAIL_SERVER                       = os.environ.get('MAIL_SERVER')
    MAIL_PORT                         = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS                      = os.environ.get('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USERNAME                     = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD                     = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER               = os.environ.get('MAIL_DEFAULT_SENDER')

    # â”€â”€ Cloudinary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    CLOUDINARY_CLOUD_NAME             = os.environ.get('CLOUDINARY_CLOUD_NAME')
    CLOUDINARY_API_KEY                = os.environ.get('CLOUDINARY_API_KEY')
    CLOUDINARY_API_SECRET             = os.environ.get('CLOUDINARY_API_SECRET')

    # â”€â”€ Seguridad â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    MAX_LOGIN_ATTEMPTS                = int(os.environ.get('MAX_LOGIN_ATTEMPTS', 5))
    LOCKOUT_MINUTES                   = int(os.environ.get('LOCKOUT_MINUTES', 15))
    SESSION_TIMEOUT_MINUTES           = int(os.environ.get('SESSION_TIMEOUT_MINUTES', 3))

    # â”€â”€ Cifrado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ENCRYPTION_KEY                    = os.environ.get('ENCRYPTION_KEY')
    FILE_ENCRYPTION_KEY               = os.environ.get('FILE_ENCRYPTION_KEY')
    RSA_PASSPHRASE                    = os.environ.get('RSA_PASSPHRASE')

    # â”€â”€ Anthropic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ANTHROPIC_API_KEY                 = os.environ.get('ANTHROPIC_API_KEY')

    # â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    FRONTEND_URL                      = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

    # â”€â”€ Content Security Policy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    CSP = {
        'default-src': "'self'",
        'script-src':  "'self'",
        'style-src':   "'self' 'unsafe-inline'",
        'img-src':     "'self' data: res.cloudinary.com",
        'connect-src': "'self' wss:",
        'font-src':    "'self'",
        'frame-ancestors': "'none'",
    }


class DevelopmentConfig(Config):
    DEBUG                  = True
    JWT_COOKIE_SECURE      = False   # Permitir HTTP en desarrollo
    SQLALCHEMY_ECHO        = False


class ProductionConfig(Config):
    DEBUG                  = False
    JWT_COOKIE_SECURE      = True


config = {
    'development': DevelopmentConfig,
    'production':  ProductionConfig,
    'default':     DevelopmentConfig,
}


