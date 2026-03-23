# ============================================================
# routes/auth.py â€” AutenticaciÃ³n segura con 2FA
# ============================================================
import pyotp
import qrcode
import base64
from io import BytesIO
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies,
    unset_jwt_cookies
)
from app import db, redis_client, limiter
from app.models import Usuario, Empresa, Postulante, SesionActiva, IntentoLogin
from app.utils.seguridad import (
    hashear_password, verificar_password, validar_fortaleza_password,
    sanitizar, generar_otp, generar_token_seguro,
    generar_huella, obtener_ip_real, obtener_pais
)

auth_bp = Blueprint('auth', __name__)


def registrar_intento(email: str, ip: str, exitoso: bool):
    intento = IntentoLogin(email=email, ip=ip, exitoso=exitoso)
    db.session.add(intento)
    db.session.commit()


def crear_sesion(usuario_id: int, jti: str) -> SesionActiva:
    ip      = obtener_ip_real(request)
    huella  = generar_huella(request)
    pais    = obtener_pais(ip)

    sesion = SesionActiva(
        usuario_id      = usuario_id,
        jti             = jti,
        ip_origen       = ip,
        user_agent_hash = huella,
        pais            = pais,
        expira_en       = datetime.utcnow() + timedelta(hours=8)
    )
    db.session.add(sesion)
    db.session.commit()
    return sesion


# â”€â”€ REGISTRO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/registro', methods=['POST'])
@limiter.limit("3 per hour")
def registro():
    data  = request.get_json()
    email = sanitizar(data.get('email', '')).lower().strip()
    password = data.get('password', '')
    rol   = sanitizar(data.get('rol', ''))

    # Validaciones
    if not email or not password or not rol:
        return jsonify({"error": "Todos los campos son requeridos"}), 400

    if rol not in ('empresa', 'postulante'):
        return jsonify({"error": "Rol invÃ¡lido"}), 400

    valida, msg = validar_fortaleza_password(password)
    if not valida:
        return jsonify({"error": msg}), 400

    if Usuario.query.filter_by(email=email).first():
        return jsonify({"error": "El correo ya estÃ¡ registrado"}), 409

    # Crear usuario
    usuario = Usuario(
        email         = email,
        password_hash = hashear_password(password),
        rol           = rol
    )
    db.session.add(usuario)
    db.session.flush()

    # Crear perfil segÃºn rol
    if rol == 'empresa':
        nombre = sanitizar(data.get('nombre_empresa', ''))
        if not nombre:
            return jsonify({"error": "Nombre de empresa requerido"}), 400
        empresa = Empresa(usuario_id=usuario.id, nombre=nombre)
        db.session.add(empresa)

    elif rol == 'postulante':
        nombre    = sanitizar(data.get('nombre', ''))
        apellidos = sanitizar(data.get('apellidos', ''))
        if not nombre or not apellidos:
            return jsonify({"error": "Nombre y apellidos requeridos"}), 400
        postulante = Postulante(
            usuario_id = usuario.id,
            nombre     = nombre,
            apellidos  = apellidos
        )
        db.session.add(postulante)

    db.session.commit()

    return jsonify({
        "mensaje": "Registro exitoso",
        "rol": rol,
        "requiere_validacion": rol == 'empresa'
    }), 201


# â”€â”€ LOGIN â€” Paso 1: Email + Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data     = request.get_json()
    email    = sanitizar(data.get('email', '')).lower().strip()
    password = data.get('password', '')
    ip       = obtener_ip_real(request)

    if not email or not password:
        return jsonify({"error": "Email y contraseÃ±a requeridos"}), 400

    usuario = Usuario.query.filter_by(email=email).first()

    # Usuario no existe o inactivo
    if not usuario or not usuario.activo:
        registrar_intento(email, ip, False)
        return jsonify({"error": "Credenciales incorrectas"}), 401

    # Cuenta bloqueada
    if usuario.esta_bloqueado():
        minutos = int((usuario.bloqueado_hasta - datetime.utcnow()).total_seconds() / 60)
        return jsonify({
            "error": f"Cuenta bloqueada. Intenta en {minutos} minutos"
        }), 423

    # Verificar contraseÃ±a
    if not verificar_password(password, usuario.password_hash):
        usuario.intentos_fallidos += 1

        max_intentos = current_app.config['MAX_LOGIN_ATTEMPTS']
        if usuario.intentos_fallidos >= max_intentos:
            minutos = current_app.config['LOCKOUT_MINUTES']
            usuario.bloqueado_hasta = datetime.utcnow() + timedelta(minutes=minutos)

        db.session.commit()
        registrar_intento(email, ip, False)
        return jsonify({"error": "Credenciales incorrectas"}), 401

    # Reset intentos fallidos
    usuario.intentos_fallidos = 0
    usuario.ultimo_login      = datetime.utcnow()
    db.session.commit()
    registrar_intento(email, ip, True)

    # Si tiene 2FA activo â†’ token temporal
    if usuario.totp_activo:
        token_temp = create_access_token(
            identity=str(usuario.id),
            additional_claims={
                'rol': usuario.rol,
                '2fa_verified': False,
                'temp': True
            },
            expires_delta=timedelta(minutes=5)
        )
        resp = jsonify({
            "mensaje": "Verifica tu cÃ³digo 2FA",
            "requiere_2fa": True,
            "metodo_2fa": "totp"
        })
        set_access_cookies(resp, token_temp)
        return resp, 200

    # Sin 2FA â†’ enviar OTP por correo
    otp = generar_otp()
    redis_client.setex(f"otp:{usuario.id}", 300, otp)

    from app.services.email_service import EmailService
    EmailService.enviar_otp(usuario.email, otp)

    token_temp = create_access_token(
        identity=str(usuario.id),
        additional_claims={
            'rol': usuario.rol,
            '2fa_verified': False,
            'temp': True
        },
        expires_delta=timedelta(minutes=5)
    )
    resp = jsonify({
        "mensaje": "Se enviÃ³ un cÃ³digo a tu correo",
        "requiere_2fa": True,
        "metodo_2fa": "email"
    })
    set_access_cookies(resp, token_temp)
    return resp, 200


# â”€â”€ LOGIN â€” Paso 2: Verificar 2FA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/verificar-2fa', methods=['POST'])
@jwt_required()
def verificar_2fa():
    data       = request.get_json()
    codigo     = sanitizar(data.get('codigo', ''))
    usuario_id = get_jwt_identity()
    claims     = get_jwt()

    if not claims.get('temp'):
        return jsonify({"error": "Token invÃ¡lido para esta operaciÃ³n"}), 400

    usuario = Usuario.query.get(usuario_id)
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    verificado = False

    if usuario.totp_activo:
        totp = pyotp.TOTP(usuario.totp_secret)
        verificado = totp.verify(codigo, valid_window=1)
    else:
        otp_guardado = redis_client.get(f"otp:{usuario_id}")
        if otp_guardado and otp_guardado == codigo:
            redis_client.delete(f"otp:{usuario_id}")
            verificado = True

    if not verificado:
        return jsonify({"error": "CÃ³digo incorrecto o expirado"}), 401

    # Generar tokens finales con 2FA confirmado
    access_token  = create_access_token(
        identity=str(usuario_id),
        additional_claims={'rol': usuario.rol, '2fa_verified': True}
    )
    refresh_token = create_refresh_token(identity=usuario_id)

    # Crear sesiÃ³n activa
    from flask_jwt_extended import decode_token
    jti = decode_token(access_token)['jti']
    crear_sesion(usuario_id, jti)

    # Actividad en Redis
    redis_client.setex(f"actividad:{usuario_id}", 180, "activo")

    resp = jsonify({
        "mensaje": "SesiÃ³n iniciada correctamente",
        "rol": usuario.rol,
        "2fa_verified": True
    })
    set_access_cookies(resp, access_token)
    set_refresh_cookies(resp, refresh_token)
    return resp, 200


# â”€â”€ REFRESH TOKEN (actividad del usuario) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    usuario_id = get_jwt_identity()
    usuario    = Usuario.query.get(usuario_id)

    if not usuario or not usuario.activo:
        return jsonify({"error": "Usuario inactivo"}), 401

    nuevo_token = create_access_token(
        identity=str(usuario_id),
        additional_claims={'rol': usuario.rol, '2fa_verified': True}
    )

    redis_client.setex(f"actividad:{usuario_id}", 180, "activo")

    resp = jsonify({"mensaje": "Token renovado"})
    set_access_cookies(resp, nuevo_token)
    return resp, 200


# â”€â”€ LOGOUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/logout', methods=['DELETE'])
@jwt_required()
def logout():
    jti        = get_jwt()['jti']
    usuario_id = get_jwt_identity()

    # Blacklist del token actual
    redis_client.setex(f"blacklist:{jti}", 86400, "logout")

    # Cerrar sesiÃ³n en BD
    SesionActiva.query.filter_by(jti=jti).update({
        'activa': False,
        'razon_cierre': 'logout_manual'
    })
    db.session.commit()

    # Limpiar actividad
    redis_client.delete(f"actividad:{usuario_id}")

    resp = jsonify({"mensaje": "SesiÃ³n cerrada"})
    unset_jwt_cookies(resp)
    return resp, 200


# â”€â”€ ACTIVAR 2FA (TOTP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/2fa/activar-totp', methods=['POST'])
@jwt_required()
def activar_totp():
    usuario_id = get_jwt_identity()
    usuario    = Usuario.query.get(usuario_id)

    secreto = pyotp.random_base32()
    redis_client.setex(f"totp_temp:{usuario_id}", 300, secreto)

    uri = pyotp.totp.TOTP(secreto).provisioning_uri(
        name=usuario.email,
        issuer_name="BolsaTrabajoUniversitaria"
    )

    img = qrcode.make(uri)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    qr_b64 = base64.b64encode(buffer.getvalue()).decode()

    return jsonify({
        "qr": f"data:image/png;base64,{qr_b64}",
        "secreto": secreto,
        "instruccion": "Escanea el QR con Google Authenticator o Authy"
    })


# â”€â”€ CONFIRMAR 2FA (TOTP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/2fa/confirmar-totp', methods=['POST'])
@jwt_required()
def confirmar_totp():
    data       = request.get_json()
    codigo     = sanitizar(data.get('codigo', ''))
    usuario_id = get_jwt_identity()
    usuario    = Usuario.query.get(usuario_id)

    secreto = redis_client.get(f"totp_temp:{usuario_id}")
    if not secreto:
        return jsonify({"error": "SesiÃ³n de configuraciÃ³n expirada"}), 400

    totp = pyotp.TOTP(secreto)
    if not totp.verify(codigo, valid_window=1):
        return jsonify({"error": "CÃ³digo incorrecto"}), 401

    usuario.totp_secret = secreto
    usuario.totp_activo = True
    db.session.commit()
    redis_client.delete(f"totp_temp:{usuario_id}")

    return jsonify({"mensaje": "2FA activado correctamente"})


# â”€â”€ VERIFICAR SESIÃ“N ACTIVA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@auth_bp.route('/sesion', methods=['GET'])
@jwt_required()
def verificar_sesion():
    usuario_id = get_jwt_identity()
    claims     = get_jwt()
    activo     = redis_client.exists(f"actividad:{usuario_id}")

    if not activo:
        return jsonify({"sesion": "expirada"}), 401

    return jsonify({
        "sesion": "activa",
        "rol": claims.get('rol'),
        "2fa_verified": claims.get('2fa_verified')
    })

