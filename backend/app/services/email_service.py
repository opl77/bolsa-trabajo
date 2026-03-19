# ============================================================
# services/email_service.py — Servicio de correo electrónico
# ============================================================
from flask import current_app, render_template_string
from flask_mail import Message
from app import mail


TEMPLATE_OTP = """
<h2>Tu código de verificación</h2>
<p>Usa el siguiente código para completar tu inicio de sesión:</p>
<h1 style="letter-spacing:8px;color:#2563eb;">{{ codigo }}</h1>
<p>Este código expira en <strong>5 minutos</strong>.</p>
<p>Si no fuiste tú, ignora este mensaje.</p>
"""

TEMPLATE_ALERTA = """
<h2 style="color:red;">⚠️ Alerta de Seguridad</h2>
<p>Detectamos actividad sospechosa en tu cuenta:</p>
<ul>
{% for anomalia in anomalias %}
  <li>{{ anomalia }}</li>
{% endfor %}
</ul>
<p>IP detectada: <strong>{{ ip }}</strong></p>
<p>Tu sesión fue cerrada automáticamente por seguridad.</p>
<p>Si no reconoces esta actividad, cambia tu contraseña inmediatamente.</p>
"""


class EmailService:

    @staticmethod
    def _enviar(destinatario: str, asunto: str, html: str):
        try:
            msg = Message(
                subject    = asunto,
                recipients = [destinatario],
                html       = html
            )
            mail.send(msg)
        except Exception as e:
            current_app.logger.error(f"Error enviando email a {destinatario}: {e}")

    @staticmethod
    def enviar_otp(email: str, otp: str):
        from jinja2 import Template
        html = Template(TEMPLATE_OTP).render(codigo=otp)
        EmailService._enviar(email, "Tu código de verificación — Bolsa de Trabajo", html)

    @staticmethod
    def enviar_alerta_seguridad(usuario_id: int, anomalias: list, ip: str):
        from app.models import Usuario
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return
        from jinja2 import Template
        html = Template(TEMPLATE_ALERTA).render(anomalias=anomalias, ip=ip)
        EmailService._enviar(
            usuario.email,
            "⚠️ Alerta de seguridad — Bolsa de Trabajo",
            html
        )

    @staticmethod
    def notificar_validacion_empresa(empresa, accion: str):
        from app.models import Usuario
        usuario = Usuario.query.get(empresa.usuario_id)
        if not usuario:
            return
        if accion == 'aprobar':
            html = f"""
            <h2>¡Tu empresa fue aprobada!</h2>
            <p>La empresa <strong>{empresa.nombre}</strong> ha sido validada.</p>
            <p>Ya puedes publicar vacantes en la plataforma.</p>
            """
            asunto = "✅ Empresa aprobada — Bolsa de Trabajo"
        else:
            html = f"""
            <h2>Empresa no aprobada</h2>
            <p>Tu empresa <strong>{empresa.nombre}</strong> no fue aprobada.</p>
            <p>Razón: {empresa.razon_rechazo or 'No especificada'}</p>
            <p>Puedes contactar al administrador para más información.</p>
            """
            asunto = "❌ Empresa no aprobada — Bolsa de Trabajo"
        EmailService._enviar(usuario.email, asunto, html)

    @staticmethod
    def notificar_estado_postulacion(postulacion):
        from app.models import Usuario
        usuario = Usuario.query.get(postulacion.postulante.usuario_id)
        if not usuario:
            return
        estados = {
            'en_revision': ('📋 Tu postulación está en revisión', 'está siendo revisada'),
            'aceptada':    ('🎉 ¡Felicidades! Tu postulación fue aceptada', 'fue aceptada'),
            'rechazada':   ('Tu postulación no fue seleccionada', 'no fue seleccionada en esta ocasión'),
        }
        asunto, msg = estados.get(postulacion.estado, ('Actualización de postulación', 'fue actualizada'))
        html = f"""
        <h2>{asunto}</h2>
        <p>Tu postulación para <strong>{postulacion.vacante.titulo}</strong>
        en <strong>{postulacion.vacante.empresa.nombre}</strong> {msg}.</p>
        <p>Ingresa a la plataforma para más detalles.</p>
        """
        EmailService._enviar(usuario.email, asunto, html)


# ============================================================
# routes/chat.py — Chat en tiempo real con SocketIO
# ============================================================
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_socketio import join_room, leave_room, emit
from app import db
from app.models import Mensaje, Postulacion
from app.utils.cifrado import cifrado_aes
from app.utils.seguridad import sanitizar
from app.utils.decorators import sesion_segura

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('/<int:postulacion_id>', methods=['GET'])
@jwt_required()
@sesion_segura
def historial_chat(postulacion_id):
    """Obtiene historial de mensajes de una postulación"""
    usuario_id  = get_jwt_identity()
    postulacion = Postulacion.query.get_or_404(postulacion_id)

    # Verificar que el usuario pertenece a esta conversación
    if not _tiene_acceso_chat(usuario_id, postulacion):
        return jsonify({"error": "Sin acceso"}), 403

    mensajes = postulacion.mensajes.order_by(Mensaje.enviado_en.asc()).all()

    return jsonify([{
        "id":         m.id,
        "emisor_id":  m.emisor_id,
        "contenido":  cifrado_aes.descifrar(m.contenido_cifrado),
        "leido":      m.leido,
        "enviado_en": m.enviado_en.isoformat()
    } for m in mensajes])


def _tiene_acceso_chat(usuario_id: int, postulacion: Postulacion) -> bool:
    """Verifica que solo empresa y postulante de esta postulación accedan"""
    empresa_usuario_id    = postulacion.vacante.empresa.usuario_id
    postulante_usuario_id = postulacion.postulante.usuario_id
    return usuario_id in (empresa_usuario_id, postulante_usuario_id)


def registrar_eventos_socket(socketio):
    """Registra eventos de SocketIO para el chat"""

    @socketio.on('unirse_chat')
    def unirse_chat(data):
        postulacion_id = data.get('postulacion_id')
        room = f"chat_{postulacion_id}"
        join_room(room)
        emit('conectado', {"sala": room})

    @socketio.on('enviar_mensaje')
    def enviar_mensaje(data):
        from app import db
        postulacion_id = data.get('postulacion_id')
        contenido      = sanitizar(data.get('contenido', ''))
        emisor_id      = data.get('emisor_id')

        if not contenido or not postulacion_id:
            return

        # Cifrar mensaje antes de guardar
        contenido_cifrado = cifrado_aes.cifrar(contenido)

        mensaje = Mensaje(
            postulacion_id   = postulacion_id,
            emisor_id        = emisor_id,
            contenido_cifrado = contenido_cifrado
        )
        db.session.add(mensaje)
        db.session.commit()

        # Emitir a la sala (mensaje descifrado solo en tránsito por WSS)
        room = f"chat_{postulacion_id}"
        emit('nuevo_mensaje', {
            "id":         mensaje.id,
            "emisor_id":  emisor_id,
            "contenido":  contenido,
            "enviado_en": mensaje.enviado_en.isoformat()
        }, room=room)

    @socketio.on('salir_chat')
    def salir_chat(data):
        postulacion_id = data.get('postulacion_id')
        leave_room(f"chat_{postulacion_id}")
