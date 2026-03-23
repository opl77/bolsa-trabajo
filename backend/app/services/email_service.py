# ============================================================
# services/email_service.py - Servicio de correo electronico
# ============================================================
from flask import current_app, render_template_string
from flask_mail import Message
from app import mail


TEMPLATE_OTP = """
<h2>Tu codigo de verificacion</h2>
<p>Usa el siguiente codigo para completar tu inicio de sesion:</p>
<h1 style="letter-spacing:8px;color:#2563eb;">{{ codigo }}</h1>
<p>Este codigo expira en <strong>5 minutos</strong>.</p>
<p>Si no fuiste tu, ignora este mensaje.</p>
"""

TEMPLATE_ALERTA = """
<h2 style="color:red;">Alerta de Seguridad</h2>
<p>Detectamos actividad sospechosa en tu cuenta:</p>
<ul>
{% for anomalia in anomalias %}
  <li>{{ anomalia }}</li>
{% endfor %}
</ul>
<p>IP detectada: <strong>{{ ip }}</strong></p>
<p>Tu sesion fue cerrada automaticamente por seguridad.</p>
<p>Si no reconoces esta actividad, cambia tu contrasena inmediatamente.</p>
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
        EmailService._enviar(email, "Tu codigo de verificacion - Bolsa de Trabajo", html)

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
            "Alerta de seguridad - Bolsa de Trabajo",
            html
        )

    @staticmethod
    def notificar_validacion_empresa(empresa, accion: str):
        from app.models import Usuario
        usuario = Usuario.query.get(empresa.usuario_id)
        if not usuario:
            return
        if accion == 'aprobar':
            html = f"<h2>Tu empresa fue aprobada!</h2><p>{empresa.nombre} ha sido validada.</p>"
            asunto = "Empresa aprobada - Bolsa de Trabajo"
        else:
            html = f"<h2>Empresa no aprobada</h2><p>{empresa.nombre} no fue aprobada.</p>"
            asunto = "Empresa no aprobada - Bolsa de Trabajo"
        EmailService._enviar(usuario.email, asunto, html)

    @staticmethod
    def notificar_estado_postulacion(postulacion):
        from app.models import Usuario
        usuario = Usuario.query.get(postulacion.postulante.usuario_id)
        if not usuario:
            return
        estados = {
            'en_revision': ('Postulacion en revision', 'esta siendo revisada'),
            'aceptada':    ('Postulacion aceptada', 'fue aceptada'),
            'rechazada':   ('Postulacion no seleccionada', 'no fue seleccionada'),
        }
        asunto, msg = estados.get(postulacion.estado, ('Actualizacion', 'fue actualizada'))
        html = f"<h2>{asunto}</h2><p>Tu postulacion para {postulacion.vacante.titulo} {msg}.</p>"
        EmailService._enviar(usuario.email, asunto, html)
