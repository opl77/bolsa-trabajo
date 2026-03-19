-- ============================================================
-- schema.sql — Base de datos completa
-- Bolsa de Trabajo Universitaria
-- ============================================================

CREATE DATABASE IF NOT EXISTS bolsa_trabajo_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bolsa_trabajo_db;

-- ── USUARIOS ──────────────────────────────────────────────────
CREATE TABLE usuarios (
    id                INT PRIMARY KEY AUTO_INCREMENT,
    email             VARCHAR(150) UNIQUE NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    rol               ENUM('admin','empresa','postulante') NOT NULL,
    activo            BOOLEAN DEFAULT TRUE,
    totp_secret       TEXT NULL,              -- AES cifrado
    totp_activo       BOOLEAN DEFAULT FALSE,
    backup_codes      TEXT NULL,              -- JSON cifrado
    intentos_fallidos INT DEFAULT 0,
    bloqueado_hasta   DATETIME NULL,
    ultimo_login      DATETIME NULL,
    clave_publica_rsa TEXT NULL,
    clave_privada_rsa TEXT NULL,              -- AES cifrado
    creado_en         DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_rol   (rol)
);

-- ── EMPRESAS ──────────────────────────────────────────────────
CREATE TABLE empresas (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id          INT UNIQUE,
    nombre              VARCHAR(150) NOT NULL,
    rfc                 TEXT NULL,            -- AES cifrado
    sector              VARCHAR(100),
    descripcion         TEXT,
    logo_url            VARCHAR(255),
    sitio_web           VARCHAR(255),
    telefono            TEXT NULL,            -- AES cifrado
    ciudad              VARCHAR(100),
    estado_validacion   ENUM('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
    validada_por        INT NULL,
    validada_en         DATETIME NULL,
    razon_rechazo       TEXT NULL,
    creado_en           DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id)   REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (validada_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_estado_validacion (estado_validacion)
);

-- ── POSTULANTES ───────────────────────────────────────────────
CREATE TABLE postulantes (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id      INT UNIQUE,
    nombre          TEXT NOT NULL,            -- AES cifrado
    apellidos       TEXT NOT NULL,            -- AES cifrado
    matricula       TEXT NULL,                -- AES cifrado
    telefono        TEXT NULL,                -- AES cifrado
    curp            TEXT NULL,                -- AES cifrado
    carrera         VARCHAR(150),
    semestre        INT,
    foto_url        VARCHAR(255),
    ciudad          VARCHAR(100),
    linkedin        VARCHAR(255),
    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── CURRICULUM ────────────────────────────────────────────────
CREATE TABLE curriculum (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    postulante_id   INT UNIQUE,
    resumen         TEXT,                     -- AES cifrado
    pdf_url         TEXT,                     -- AES cifrado
    actualizado_en  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE
);

CREATE TABLE experiencia_laboral (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    curriculum_id   INT,
    empresa         VARCHAR(150),
    puesto          VARCHAR(150),
    descripcion     TEXT,
    fecha_inicio    DATE,
    fecha_fin       DATE NULL,
    FOREIGN KEY (curriculum_id) REFERENCES curriculum(id) ON DELETE CASCADE
);

CREATE TABLE educacion (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    curriculum_id   INT,
    institucion     VARCHAR(150),
    titulo          VARCHAR(150),
    nivel           ENUM('preparatoria','licenciatura','maestria','doctorado','curso','certificacion'),
    fecha_inicio    DATE,
    fecha_fin       DATE NULL,
    FOREIGN KEY (curriculum_id) REFERENCES curriculum(id) ON DELETE CASCADE
);

CREATE TABLE habilidades (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    curriculum_id   INT,
    nombre          VARCHAR(100),
    nivel           ENUM('basico','intermedio','avanzado','experto'),
    FOREIGN KEY (curriculum_id) REFERENCES curriculum(id) ON DELETE CASCADE
);

-- ── VACANTES ──────────────────────────────────────────────────
CREATE TABLE vacantes (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    empresa_id      INT,
    titulo          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    requisitos      TEXT,
    area            VARCHAR(100),
    tipo_contrato   ENUM('tiempo_completo','medio_tiempo','practicas','proyecto'),
    modalidad       ENUM('presencial','remoto','hibrido'),
    salario_min     DECIMAL(10,2) NULL,
    salario_max     DECIMAL(10,2) NULL,
    ciudad          VARCHAR(100),
    activa          BOOLEAN DEFAULT TRUE,
    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
    expira_en       DATE NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    INDEX idx_activa  (activa),
    INDEX idx_area    (area),
    INDEX idx_ciudad  (ciudad)
);

-- ── POSTULACIONES ─────────────────────────────────────────────
CREATE TABLE postulaciones (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    vacante_id          INT,
    postulante_id       INT,
    estado              ENUM('enviada','en_revision','aceptada','rechazada') DEFAULT 'enviada',
    carta_presentacion  TEXT NULL,            -- AES cifrado
    postulado_en        DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_postulacion (vacante_id, postulante_id),
    FOREIGN KEY (vacante_id)    REFERENCES vacantes(id)    ON DELETE CASCADE,
    FOREIGN KEY (postulante_id) REFERENCES postulantes(id) ON DELETE CASCADE,
    INDEX idx_estado (estado)
);

-- ── MENSAJES (Chat E2E) ───────────────────────────────────────
CREATE TABLE mensajes (
    id                  INT PRIMARY KEY AUTO_INCREMENT,
    postulacion_id      INT,
    emisor_id           INT,
    contenido_cifrado   TEXT NOT NULL,        -- AES cifrado
    iv                  VARCHAR(50),
    leido               BOOLEAN DEFAULT FALSE,
    enviado_en          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postulacion_id) REFERENCES postulaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (emisor_id)      REFERENCES usuarios(id)      ON DELETE CASCADE,
    INDEX idx_postulacion_chat (postulacion_id, enviado_en)
);

-- ── SESIONES ACTIVAS ──────────────────────────────────────────
CREATE TABLE sesiones_activas (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id      INT,
    jti             VARCHAR(255) UNIQUE,
    ip_origen       VARCHAR(45),
    user_agent_hash VARCHAR(64),
    pais            VARCHAR(10),
    activa          BOOLEAN DEFAULT TRUE,
    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso      DATETIME DEFAULT CURRENT_TIMESTAMP,
    expira_en       DATETIME,
    razon_cierre    VARCHAR(50) NULL,
    alerta_robo     BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_jti     (jti),
    INDEX idx_activa  (activa)
);

-- ── INTENTOS DE LOGIN ─────────────────────────────────────────
CREATE TABLE intentos_login (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    email           VARCHAR(150),
    ip              VARCHAR(45),
    exitoso         BOOLEAN,
    intentado_en    DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_fecha (email, intentado_en),
    INDEX idx_ip_login    (ip)
);

-- ── ALERTAS DE SEGURIDAD ──────────────────────────────────────
CREATE TABLE alertas_seguridad (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id  INT,
    tipo        VARCHAR(50),
    detalle     TEXT,
    ip          VARCHAR(45),
    pais        VARCHAR(10),
    atendida    BOOLEAN DEFAULT FALSE,
    creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── NOTIFICACIONES ────────────────────────────────────────────
CREATE TABLE notificaciones (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id  INT,
    tipo        VARCHAR(50),
    titulo      VARCHAR(150),
    contenido   TEXT,
    leida       BOOLEAN DEFAULT FALSE,
    creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_leida (usuario_id, leida)
);

-- ── DISPOSITIVOS DE CONFIANZA ─────────────────────────────────
CREATE TABLE dispositivos_confianza (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id      INT,
    huella_hash     VARCHAR(64),
    nombre          VARCHAR(100),
    ip_registro     VARCHAR(45),
    confiable       BOOLEAN DEFAULT TRUE,
    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── USUARIO ADMIN INICIAL ─────────────────────────────────────
-- Cambia el password_hash por uno generado con bcrypt
INSERT INTO usuarios (email, password_hash, rol, activo)
VALUES ('admin@universidad.edu.mx', '$2b$12$CAMBIA_ESTE_HASH', 'admin', TRUE);
