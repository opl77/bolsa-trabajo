# ============================================================
# routes/chat.py - Chat en tiempo real con SocketIO
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
    usuario_id  = get_jwt_identity()
    postulacion = Postulacion.query.get_or_404(postulacion_id)
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
    empresa_usuario_id    = postulacion.vacante.empresa.usuario_id
    postulante_usuario_id = postulacion.postulante.usuario_id
    return usuario_id in (empresa_usuario_id, postulante_usuario_id)


def registrar_eventos_socket(socketio):

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
        contenido_cifrado = cifrado_aes.cifrar(contenido)
        mensaje = Mensaje(
            postulacion_id    = postulacion_id,
            emisor_id         = emisor_id,
            contenido_cifrado = contenido_cifrado
        )
        db.session.add(mensaje)
        db.session.commit()
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
