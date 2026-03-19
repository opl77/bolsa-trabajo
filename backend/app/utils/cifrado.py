# ============================================================
# utils/cifrado.py — Cifrado AES-256-GCM para datos sensibles
# ============================================================
import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.fernet import Fernet
from sqlalchemy import TypeDecorator, Text


class CifradoAES:
    """
    AES-256-GCM — cifrado autenticado
    Nonce único por operación (previene ataques de repetición)
    """

    def __init__(self):
        clave_raw  = os.environ.get('ENCRYPTION_KEY', 'clave_default_dev_32chars!!!!!!!').encode()
        self.clave = hashlib.sha256(clave_raw).digest()  # 256 bits exactos

    def cifrar(self, texto: str) -> str:
        if not texto:
            return texto
        aesgcm  = AESGCM(self.clave)
        nonce   = os.urandom(12)                          # Nonce único cada vez
        datos   = texto.encode('utf-8')
        cifrado = aesgcm.encrypt(nonce, datos, None)
        return base64.b64encode(nonce + cifrado).decode('utf-8')

    def descifrar(self, texto_cifrado: str) -> str:
        if not texto_cifrado:
            return texto_cifrado
        try:
            aesgcm  = AESGCM(self.clave)
            raw     = base64.b64decode(texto_cifrado.encode('utf-8'))
            nonce   = raw[:12]
            cifrado = raw[12:]
            datos   = aesgcm.decrypt(nonce, cifrado, None)
            return datos.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Error al descifrar datos: {e}")


class CifradoArchivos:
    """Fernet para cifrado de archivos (CVs, documentos)"""

    def __init__(self):
        clave_raw = os.environ.get('FILE_ENCRYPTION_KEY', '')
        if clave_raw:
            self.fernet = Fernet(clave_raw.encode())
        else:
            # Generar clave temporal en desarrollo
            self.fernet = Fernet(Fernet.generate_key())

    def cifrar_bytes(self, datos: bytes) -> bytes:
        return self.fernet.encrypt(datos)

    def descifrar_bytes(self, datos_cifrados: bytes) -> bytes:
        return self.fernet.decrypt(datos_cifrados)


# ── Instancias globales ───────────────────────────────────────
cifrado_aes     = CifradoAES()
cifrado_archivos = CifradoArchivos()


# ── Tipo personalizado SQLAlchemy ─────────────────────────────
class TextoCifrado(TypeDecorator):
    """
    Columna SQLAlchemy que cifra automáticamente al guardar
    y descifra automáticamente al leer.
    Uso: columna = db.Column(TextoCifrado)
    """
    impl     = Text
    cache_ok = True

    def process_bind_param(self, valor, dialect):
        """Al guardar → cifrar"""
        if valor is not None:
            return cifrado_aes.cifrar(str(valor))
        return valor

    def process_result_value(self, valor, dialect):
        """Al leer → descifrar"""
        if valor is not None:
            try:
                return cifrado_aes.descifrar(valor)
            except ValueError:
                return valor   # Datos sin cifrar (migración)
        return valor
