# ============================================================
# routes/chatbot.py — Chatbot IA con Claude (Anthropic)
# ============================================================
import anthropic
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import limiter
from app.models import Usuario, Empresa, Postulante
from app.utils.seguridad import sanitizar
from app.utils.decorators import sesion_segura, dos_fa_requerido

chatbot_bp = Blueprint('chatbot', __name__)

# ── Prompts del sistema por rol ───────────────────────────────
PROMPT_EMPRESA = """
Eres un asistente virtual especializado en recursos humanos para empresas 
que publican vacantes en una bolsa de trabajo universitaria.

Puedes ayudar a:
- Redactar descripciones atractivas y claras de vacantes
- Definir perfiles de candidatos ideales
- Sugerir requisitos apropiados para cada puesto
- Orientar sobre cómo evaluar CVs y postulantes
- Explicar cómo usar la plataforma (publicar vacantes, gestionar postulaciones)
- Dar consejos sobre procesos de selección y entrevistas
- Responder dudas sobre el proceso de validación de la empresa

Responde siempre en español, de forma profesional, concisa y útil.
No reveles información confidencial de otros usuarios o empresas.
Si te preguntan algo fuera de tu área, indica amablemente que no puedes ayudar con eso.
"""

PROMPT_POSTULANTE = """
Eres un asistente virtual de orientación laboral para estudiantes universitarios 
que buscan empleo o prácticas profesionales.

Puedes ayudar a:
- Mejorar y redactar su Curriculum Vitae (CV)
- Escribir cartas de presentación efectivas
- Prepararse para entrevistas de trabajo
- Identificar vacantes adecuadas a su perfil
- Orientar sobre habilidades valoradas en el mercado laboral
- Dar consejos sobre desarrollo profesional
- Explicar cómo usar la plataforma (postularse, ver estado de postulaciones)
- Resolver dudas sobre el proceso de búsqueda de empleo

Responde siempre en español, de forma amigable, motivadora y práctica.
No reveles información confidencial de otras personas o empresas.
Anima al usuario a dar su mejor esfuerzo y a no rendirse.
"""

PROMPT_ADMIN = """
Eres un asistente administrativo para el panel de administración 
de una bolsa de trabajo universitaria.

Puedes ayudar a:
- Orientar sobre el proceso de validación de empresas
- Explicar métricas y estadísticas del sistema
- Dar recomendaciones sobre gestión de la plataforma
- Responder dudas sobre políticas y procedimientos

Responde siempre en español, de forma profesional y técnica.
"""


def obtener_contexto_usuario(usuario_id: int, rol: str) -> str:
    """Agrega contexto personalizado según el rol del usuario"""
    try:
        if rol == 'empresa':
            empresa = Empresa.query.filter_by(usuario_id=usuario_id).first()
            if empresa:
                total_vacantes = empresa.vacantes.count()
                return f"\n[Contexto: Empresa '{empresa.nombre}', sector '{empresa.sector}', " \
                       f"vacantes activas: {total_vacantes}]"

        elif rol == 'postulante':
            postulante = Postulante.query.filter_by(usuario_id=usuario_id).first()
            if postulante:
                habilidades = []
                if postulante.curriculum:
                    habilidades = [h.nombre for h in postulante.curriculum.habilidades]
                return f"\n[Contexto: Postulante en carrera '{postulante.carrera}', " \
                       f"semestre {postulante.semestre}, " \
                       f"habilidades: {', '.join(habilidades[:5]) if habilidades else 'no registradas'}]"
    except Exception:
        pass
    return ""


@chatbot_bp.route('/mensaje', methods=['POST'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def mensaje():
    data       = request.get_json()
    mensaje_usr = sanitizar(data.get('mensaje', ''))
    historial  = data.get('historial', [])   # Lista de mensajes previos

    if not mensaje_usr:
        return jsonify({"error": "Mensaje vacío"}), 400

    if len(mensaje_usr) > 2000:
        return jsonify({"error": "Mensaje demasiado largo (máx 2000 caracteres)"}), 400

    usuario_id = get_jwt_identity()
    claims     = get_jwt()
    rol        = claims.get('rol', 'postulante')

    # Seleccionar prompt según rol
    prompts = {
        'empresa':    PROMPT_EMPRESA,
        'postulante': PROMPT_POSTULANTE,
        'admin':      PROMPT_ADMIN,
    }
    system_prompt = prompts.get(rol, PROMPT_POSTULANTE)

    # Agregar contexto personalizado
    contexto = obtener_contexto_usuario(usuario_id, rol)
    if contexto:
        system_prompt += contexto

    # Construir historial (máx 10 mensajes para no sobrecargar)
    messages = []
    for msg in historial[-10:]:
        if msg.get('rol') in ('user', 'assistant') and msg.get('contenido'):
            messages.append({
                "role": msg['rol'],
                "content": sanitizar(str(msg['contenido']))[:1000]
            })

    messages.append({"role": "user", "content": mensaje_usr})

    # Llamar a Claude API
    try:
        client = anthropic.Anthropic(api_key=current_app.config['ANTHROPIC_API_KEY'])

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=system_prompt,
            messages=messages
        )

        respuesta = response.content[0].text

        return jsonify({
            "respuesta": respuesta,
            "rol_asistente": rol
        })

    except anthropic.APIError as e:
        current_app.logger.error(f"Error API Anthropic: {e}")
        return jsonify({
            "error": "El asistente no está disponible en este momento"
        }), 503
    except Exception as e:
        current_app.logger.error(f"Error chatbot: {e}")
        return jsonify({
            "error": "Error interno del servidor"
        }), 500


@chatbot_bp.route('/historial', methods=['DELETE'])
@jwt_required()
@sesion_segura
def limpiar_historial():
    """El historial se maneja en el frontend — este endpoint es por si se necesita"""
    return jsonify({"mensaje": "Historial limpiado"}), 200
