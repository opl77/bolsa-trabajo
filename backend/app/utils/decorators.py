# ============================================================
# utils/decorators.py â€” Decoradores de seguridad y roles
# ============================================================
from functools import wraps
from datetime import datetime
from flask import jsonify, request, current_app
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from app.utils.seguridad import generar_huella, obtener_ip_real, obtener_pais


def rol_requerido(*roles):
    """Decorador que verifica que el usuario tenga el rol correcto"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('rol') not in roles:
                return jsonify({
                    "error": "Acceso denegado",
                    "detalle": f"Se requiere rol: {', '.join(roles)}"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def dos_fa_requerido(f):
    """Verifica que el usuario haya completado el 2FA"""
    @wraps(f)
    def decorated(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if not claims.get('2fa_verified'):
            return jsonify({
                "error": "Se requiere verificaciÃ³n 2FA",
                "codigo": "2FA_REQUIRED"
            }), 403
        return f(*args, **kwargs)
    return decorated


def sesion_segura(f):
    """
    Valida integridad de sesiÃ³n en cada request:
    - Verifica huella digital (User-Agent)
    - Detecta cambio de IP sospechoso
    - Detecta cambio de paÃ­s
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        verify_jwt_in_request()

        from app.models.sesion import SesionActiva
        from app import db, redis_client
        from app.services.email_service import EmailService

        jti        = get_jwt().get('jti')
        usuario_id = get_jwt_identity()

        sesion = SesionActiva.query.filter_by(jti=jti, activa=True).first()
        if not sesion:
            return jsonify({
                "error": "SesiÃ³n invÃ¡lida o expirada",
                "codigo": "SESSION_INVALID"
            }), 401

        ip_actual     = obtener_ip_real(request)
        huella_actual = generar_huella(request)
        pais_actual   = obtener_pais(ip_actual)

        anomalias = []


        # Detectar acceso desde paÃ­s diferente
        if sesion.pais and sesion.pais != pais_actual:
            anomalias.append('pais_inusual')

        if anomalias:
            # Destruir TODAS las sesiones del usuario
            SesionActiva.query.filter_by(
                usuario_id=usuario_id, activa=True
            ).update({
                'activa': False,
                'razon_cierre': 'posible_robo'
            })
            db.session.commit()

            # Invalidar en Redis
            redis_client.setex(f"blacklist:{jti}", 86400, "robado")

            # Registrar alerta
            from app.models.alerta import AlertaSeguridad
            alerta = AlertaSeguridad(
                usuario_id=usuario_id,
                tipo='posible_robo_sesion',
                detalle=str(anomalias),
                ip=ip_actual,
                pais=pais_actual
            )
            db.session.add(alerta)
            db.session.commit()

            # Notificar al usuario
            EmailService.enviar_alerta_seguridad(usuario_id, anomalias, ip_actual)

            return jsonify({
                "error": "SesiÃ³n terminada por seguridad. Revisa tu correo.",
                "codigo": "SESSION_HIJACK_DETECTED"
            }), 401

        # âœ… Actualizar Ãºltimo uso
        sesion.ultimo_uso = datetime.utcnow()
        db.session.commit()

        # Renovar actividad en Redis
        redis_client.setex(f"actividad:{usuario_id}", 180, "activo")

        return f(*args, **kwargs)
    return decorated


