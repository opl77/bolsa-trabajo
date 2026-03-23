# ============================================================
# utils/seguridad.py â€” Utilidades de seguridad
# ============================================================
import hashlib
import secrets
import string
import bleach
import bcrypt
from flask import request


# â”€â”€ Fingerprinting de cliente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def generar_huella(req=None) -> str:
    """Genera huella digital del cliente para detectar robo de sesiÃ³n"""
    req = req or request
    user_agent  = req.headers.get('User-Agent', '')
    accept_lang = req.headers.get('Accept-Language', '')
    accept_enc  = req.headers.get('Accept-Encoding', '')
    raw = f"{user_agent}|{accept_lang}|{accept_enc}"
    return hashlib.sha256(raw.encode()).hexdigest()


def obtener_ip_real(req=None) -> str:
    """Obtiene IP real del cliente aunque haya proxies"""
    req = req or request
    forwarded = req.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return req.headers.get('X-Real-IP') or req.remote_addr or '0.0.0.0'


def obtener_pais(ip: str) -> str:
    """GeolocalizaciÃ³n bÃ¡sica â€” retorna cÃ³digo de paÃ­s"""
    try:
        import geoip2.database
        with geoip2.database.Reader('GeoLite2-Country.mmdb') as reader:
            return reader.country(ip).country.iso_code or 'XX'
    except Exception:
        return 'XX'


# â”€â”€ SanitizaciÃ³n anti-XSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
TAGS_PERMITIDOS   = []    # Sin HTML
ATTRS_PERMITIDOS  = {}

def sanitizar(texto: str) -> str:
    """Elimina todo HTML/JS malicioso del input"""
    if not texto:
        return texto
    return bleach.clean(str(texto), tags=TAGS_PERMITIDOS,
                        attributes=ATTRS_PERMITIDOS, strip=True)


def sanitizar_html_basico(texto: str) -> str:
    """Permite solo tags seguros (para descripciones de vacantes)"""
    tags   = ['b', 'i', 'u', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em']
    attrs  = {}
    return bleach.clean(str(texto), tags=tags, attributes=attrs, strip=True)


# â”€â”€ Manejo de contraseÃ±as â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
COST_FACTOR = 12

def hashear_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=COST_FACTOR)
    return bcrypt.hashpw(password.encode(), salt).decode()


def verificar_password(password: str, hash_guardado: str) -> bool:
    return bcrypt.checkpw(password.encode(), hash_guardado.encode())


def validar_fortaleza_password(password: str) -> tuple:
    """Retorna (es_valida, mensaje)"""
    if len(password) < 10:
        return False, "MÃ­nimo 10 caracteres"
    if not any(c.isupper() for c in password):
        return False, "Al menos una mayÃºscula"
    if not any(c.islower() for c in password):
        return False, "Al menos una minÃºscula"
    if not any(c.isdigit() for c in password):
        return False, "Al menos un nÃºmero"
    especiales = "!@#$%^&*()_+-=[]{}|;:,.<>?/\~`@"
    if not any(c in especiales for c in password):
        return False, "Al menos un carÃ¡cter especial (!@#$%...)"
    return True, "OK"


# â”€â”€ OTP por email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def generar_otp(longitud: int = 6) -> str:
    """Genera OTP numÃ©rico seguro"""
    return ''.join(secrets.choice(string.digits) for _ in range(longitud))


# â”€â”€ Tokens seguros â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def generar_token_seguro(longitud: int = 32) -> str:
    return secrets.token_urlsafe(longitud)

