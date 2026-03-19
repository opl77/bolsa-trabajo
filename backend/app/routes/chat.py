# ============================================================
# routes/chat.py — importado desde email_service.py
# Este archivo re-exporta el Blueprint para el registro en __init__
# ============================================================
from app.services.email_service import chat_bp, registrar_eventos_socket

__all__ = ['chat_bp', 'registrar_eventos_socket']
