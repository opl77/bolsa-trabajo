# ============================================================
# models/__init__.py â€” Todos los modelos de la BD
# ============================================================
from datetime import datetime
from app import db
from app.utils.cifrado import TextoCifrado


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# USUARIOS â€” tabla base de autenticaciÃ³n
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id                = db.Column(db.Integer, primary_key=True)
    email             = db.Column(db.String(150), unique=True, nullable=False)
    password_hash     = db.Column(db.String(255), nullable=False)
    rol               = db.Column(db.Enum('admin', 'empresa', 'postulante'), nullable=False)
    activo            = db.Column(db.Boolean, default=True)

    # 2FA
    totp_secret       = db.Column(TextoCifrado, nullable=True)   # Cifrado
    totp_activo       = db.Column(db.Boolean, default=False)
    backup_codes      = db.Column(TextoCifrado, nullable=True)   # JSON cifrado

    # Control de acceso
    intentos_fallidos = db.Column(db.Integer, default=0)
    bloqueado_hasta   = db.Column(db.DateTime, nullable=True)
    ultimo_login      = db.Column(db.DateTime, nullable=True)
    creado_en         = db.Column(db.DateTime, default=datetime.utcnow)

    # Clave pÃºblica RSA para chat E2E
    clave_publica_rsa = db.Column(db.Text, nullable=True)
    clave_privada_rsa = db.Column(TextoCifrado, nullable=True)   # Cifrada

    # Relaciones
    sesiones          = db.relationship('SesionActiva', back_populates='usuario', lazy='dynamic')
    notificaciones    = db.relationship('Notificacion', back_populates='usuario', lazy='dynamic')
    alertas           = db.relationship('AlertaSeguridad', back_populates='usuario', lazy='dynamic')

    def esta_bloqueado(self):
        if self.bloqueado_hasta and self.bloqueado_hasta > datetime.utcnow():
            return True
        return False

    def __repr__(self):
        return f'<Usuario {self.email}>'


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# EMPRESAS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Empresa(db.Model):
    __tablename__ = 'empresas'

    id                  = db.Column(db.Integer, primary_key=True)
    usuario_id          = db.Column(db.Integer, db.ForeignKey('usuarios.id'), unique=True)

    nombre              = db.Column(db.String(150), nullable=False)
    rfc                 = db.Column(TextoCifrado, nullable=True)      # Cifrado
    sector              = db.Column(db.String(100))
    descripcion         = db.Column(db.Text)
    logo_url            = db.Column(db.String(255))
    sitio_web           = db.Column(db.String(255))
    telefono            = db.Column(TextoCifrado, nullable=True)      # Cifrado
    ciudad              = db.Column(db.String(100))

    estado_validacion   = db.Column(
        db.Enum('pendiente', 'aprobada', 'rechazada'),
        default='pendiente'
    )
    validada_por        = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    validada_en         = db.Column(db.DateTime, nullable=True)
    razon_rechazo       = db.Column(db.Text, nullable=True)
    creado_en           = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones
    usuario             = db.relationship('Usuario', foreign_keys=[usuario_id])
    vacantes            = db.relationship('Vacante', back_populates='empresa', lazy='dynamic')

    def __repr__(self):
        return f'<Empresa {self.nombre}>'


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# POSTULANTES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Postulante(db.Model):
    __tablename__ = 'postulantes'

    id              = db.Column(db.Integer, primary_key=True)
    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id'), unique=True)

    nombre          = db.Column(TextoCifrado, nullable=False)     # Cifrado
    apellidos       = db.Column(TextoCifrado, nullable=False)     # Cifrado
    matricula       = db.Column(TextoCifrado, nullable=True)      # Cifrado
    telefono        = db.Column(TextoCifrado, nullable=True)      # Cifrado
    curp            = db.Column(TextoCifrado, nullable=True)      # Cifrado

    carrera         = db.Column(db.String(150))
    semestre        = db.Column(db.Integer)
    foto_url        = db.Column(db.String(255))
    ciudad          = db.Column(db.String(100))
    linkedin        = db.Column(db.String(255))
    creado_en       = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones
    usuario         = db.relationship('Usuario', foreign_keys=[usuario_id])
    curriculum      = db.relationship('Curriculum', back_populates='postulante', uselist=False)
    postulaciones   = db.relationship('Postulacion', back_populates='postulante', lazy='dynamic')

    def __repr__(self):
        return f'<Postulante {self.matricula}>'


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# CURRICULUM
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Curriculum(db.Model):
    __tablename__ = 'curriculum'

    id              = db.Column(db.Integer, primary_key=True)
    postulante_id   = db.Column(db.Integer, db.ForeignKey('postulantes.id'), unique=True)

    resumen         = db.Column(TextoCifrado)     # Cifrado
    pdf_url         = db.Column(TextoCifrado)     # URL cifrada
    actualizado_en  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    postulante      = db.relationship('Postulante', back_populates='curriculum')
    experiencias    = db.relationship('ExperienciaLaboral', back_populates='curriculum', lazy='dynamic')
    educaciones     = db.relationship('Educacion', back_populates='curriculum', lazy='dynamic')
    habilidades     = db.relationship('Habilidad', back_populates='curriculum', lazy='dynamic')


class ExperienciaLaboral(db.Model):
    __tablename__ = 'experiencia_laboral'

    id              = db.Column(db.Integer, primary_key=True)
    curriculum_id   = db.Column(db.Integer, db.ForeignKey('curriculum.id'))
    empresa         = db.Column(db.String(150))
    puesto          = db.Column(db.String(150))
    descripcion     = db.Column(db.Text)
    fecha_inicio    = db.Column(db.Date)
    fecha_fin       = db.Column(db.Date, nullable=True)   # NULL = trabajo actual

    curriculum      = db.relationship('Curriculum', back_populates='experiencias')


class Educacion(db.Model):
    __tablename__ = 'educacion'

    id              = db.Column(db.Integer, primary_key=True)
    curriculum_id   = db.Column(db.Integer, db.ForeignKey('curriculum.id'))
    institucion     = db.Column(db.String(150))
    titulo          = db.Column(db.String(150))
    nivel           = db.Column(db.Enum(
        'preparatoria', 'licenciatura', 'maestria', 'doctorado', 'curso', 'certificacion'
    ))
    fecha_inicio    = db.Column(db.Date)
    fecha_fin       = db.Column(db.Date, nullable=True)

    curriculum      = db.relationship('Curriculum', back_populates='educaciones')


class Habilidad(db.Model):
    __tablename__ = 'habilidades'

    id              = db.Column(db.Integer, primary_key=True)
    curriculum_id   = db.Column(db.Integer, db.ForeignKey('curriculum.id'))
    nombre          = db.Column(db.String(100))
    nivel           = db.Column(db.Enum('basico', 'intermedio', 'avanzado', 'experto'))

    curriculum      = db.relationship('Curriculum', back_populates='habilidades')


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# VACANTES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Vacante(db.Model):
    __tablename__ = 'vacantes'

    id              = db.Column(db.Integer, primary_key=True)
    empresa_id      = db.Column(db.Integer, db.ForeignKey('empresas.id'))
    titulo          = db.Column(db.String(150), nullable=False)
    descripcion     = db.Column(db.Text)
    requisitos      = db.Column(db.Text)
    area            = db.Column(db.String(100))
    tipo_contrato   = db.Column(db.Enum(
        'tiempo_completo', 'medio_tiempo', 'practicas', 'proyecto'
    ))
    modalidad       = db.Column(db.Enum('presencial', 'remoto', 'hibrido'))
    salario_min     = db.Column(db.Numeric(10, 2), nullable=True)
    salario_max     = db.Column(db.Numeric(10, 2), nullable=True)
    ciudad          = db.Column(db.String(100))
    num_vacantes    = db.Column(db.Integer, default=1)
    activa          = db.Column(db.Boolean, default=True)
    creado_en       = db.Column(db.DateTime, default=datetime.utcnow)
    expira_en       = db.Column(db.Date, nullable=True)

    # Relaciones
    empresa         = db.relationship('Empresa', back_populates='vacantes')
    postulaciones   = db.relationship('Postulacion', back_populates='vacante', lazy='dynamic')

    def __repr__(self):
        return f'<Vacante {self.titulo}>'


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# POSTULACIONES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Postulacion(db.Model):
    __tablename__ = 'postulaciones'
    __table_args__ = (
        db.UniqueConstraint('vacante_id', 'postulante_id', name='uq_postulacion'),
    )

    id                  = db.Column(db.Integer, primary_key=True)
    vacante_id          = db.Column(db.Integer, db.ForeignKey('vacantes.id'))
    postulante_id       = db.Column(db.Integer, db.ForeignKey('postulantes.id'))
    estado              = db.Column(
        db.Enum('enviada', 'en_revision', 'aceptada', 'rechazada'),
        default='enviada'
    )
    carta_presentacion  = db.Column(TextoCifrado, nullable=True)   # Cifrada
    postulado_en        = db.Column(db.DateTime, default=datetime.utcnow)
    actualizado_en      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    vacante             = db.relationship('Vacante', back_populates='postulaciones')
    postulante          = db.relationship('Postulante', back_populates='postulaciones')
    mensajes            = db.relationship('Mensaje', back_populates='postulacion', lazy='dynamic')


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# MENSAJES (Chat E2E)
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Mensaje(db.Model):
    __tablename__ = 'mensajes'

    id                  = db.Column(db.Integer, primary_key=True)
    postulacion_id      = db.Column(db.Integer, db.ForeignKey('postulaciones.id'))
    emisor_id           = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    contenido_cifrado   = db.Column(db.Text, nullable=False)   # AES cifrado
    iv                  = db.Column(db.String(50))              # Vector inicializaciÃ³n
    leido               = db.Column(db.Boolean, default=False)
    enviado_en          = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones
    postulacion         = db.relationship('Postulacion', back_populates='mensajes')
    emisor              = db.relationship('Usuario', foreign_keys=[emisor_id])


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# SESIONES ACTIVAS
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class SesionActiva(db.Model):
    __tablename__ = 'sesiones_activas'

    id              = db.Column(db.Integer, primary_key=True)
    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    jti             = db.Column(db.String(255), unique=True)
    ip_origen       = db.Column(db.String(45))
    user_agent_hash = db.Column(db.String(64))
    pais            = db.Column(db.String(10))
    activa          = db.Column(db.Boolean, default=True)
    creado_en       = db.Column(db.DateTime, default=datetime.utcnow)
    ultimo_uso      = db.Column(db.DateTime, default=datetime.utcnow)
    expira_en       = db.Column(db.DateTime)
    razon_cierre    = db.Column(db.String(50), nullable=True)
    alerta_robo     = db.Column(db.Boolean, default=False)

    usuario         = db.relationship('Usuario', back_populates='sesiones')


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# NOTIFICACIONES
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class Notificacion(db.Model):
    __tablename__ = 'notificaciones'

    id          = db.Column(db.Integer, primary_key=True)
    usuario_id  = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    tipo        = db.Column(db.String(50))
    titulo      = db.Column(db.String(150))
    contenido   = db.Column(db.Text)
    leida       = db.Column(db.Boolean, default=False)
    creado_en   = db.Column(db.DateTime, default=datetime.utcnow)

    usuario     = db.relationship('Usuario', back_populates='notificaciones')


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# ALERTAS DE SEGURIDAD
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class AlertaSeguridad(db.Model):
    __tablename__ = 'alertas_seguridad'

    id          = db.Column(db.Integer, primary_key=True)
    usuario_id  = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    tipo        = db.Column(db.String(50))
    detalle     = db.Column(db.Text)
    ip          = db.Column(db.String(45))
    pais        = db.Column(db.String(10))
    atendida    = db.Column(db.Boolean, default=False)
    creado_en   = db.Column(db.DateTime, default=datetime.utcnow)

    usuario     = db.relationship('Usuario', back_populates='alertas')


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# INTENTOS DE LOGIN
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class IntentoLogin(db.Model):
    __tablename__ = 'intentos_login'

    id              = db.Column(db.Integer, primary_key=True)
    email           = db.Column(db.String(150))
    ip              = db.Column(db.String(45))
    exitoso         = db.Column(db.Boolean)
    intentado_en    = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index('idx_email_fecha', 'email', 'intentado_en'),
        db.Index('idx_ip_login', 'ip'),
    )


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
# DISPOSITIVOS DE CONFIANZA
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
class DispositivoConfianza(db.Model):
    __tablename__ = 'dispositivos_confianza'

    id              = db.Column(db.Integer, primary_key=True)
    usuario_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id'))
    huella_hash     = db.Column(db.String(64))
    nombre          = db.Column(db.String(100))
    ip_registro     = db.Column(db.String(45))
    confiable       = db.Column(db.Boolean, default=True)
    creado_en       = db.Column(db.DateTime, default=datetime.utcnow)


