# ============================================================
# routes/vacantes.py
# ============================================================
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app import db
from app.models import Vacante, Empresa, Postulacion, Postulante
from app.utils.seguridad import sanitizar, sanitizar_html_basico
from app.utils.decorators import sesion_segura, dos_fa_requerido

vacantes_bp = Blueprint('vacantes', __name__)


@vacantes_bp.route('', methods=['GET'])
@jwt_required()
@sesion_segura
def listar_vacantes():
    """Vacantes disponibles con filtros"""
    area       = request.args.get('area', '')
    modalidad  = request.args.get('modalidad', '')
    ciudad     = request.args.get('ciudad', '')
    busqueda   = sanitizar(request.args.get('q', ''))
    pagina     = int(request.args.get('pagina', 1))
    por_pagina = min(int(request.args.get('por_pagina', 10)), 50)

    query = Vacante.query.join(Empresa).filter(
        Vacante.activa == True,
        Empresa.estado_validacion == 'aprobada'
    )

    if area:
        query = query.filter(Vacante.area == sanitizar(area))
    if modalidad:
        query = query.filter(Vacante.modalidad == sanitizar(modalidad))
    if ciudad:
        query = query.filter(Vacante.ciudad.ilike(f"%{sanitizar(ciudad)}%"))
    if busqueda:
        query = query.filter(
            db.or_(
                Vacante.titulo.ilike(f"%{busqueda}%"),
                Vacante.descripcion.ilike(f"%{busqueda}%")
            )
        )

    paginacion = query.order_by(Vacante.creado_en.desc()).paginate(
        page=pagina, per_page=por_pagina, error_out=False
    )

    vacantes = [{
        "id":            v.id,
        "titulo":        v.titulo,
        "empresa":       v.empresa.nombre,
        "logo":          v.empresa.logo_url,
        "area":          v.area,
        "modalidad":     v.modalidad,
        "tipo_contrato": v.tipo_contrato,
        "ciudad":        v.ciudad,
        "salario_min":   float(v.salario_min) if v.salario_min else None,
        "salario_max":   float(v.salario_max) if v.salario_max else None,
        "creado_en":     v.creado_en.isoformat(),
    } for v in paginacion.items]

    return jsonify({
        "vacantes":    vacantes,
        "total":       paginacion.total,
        "paginas":     paginacion.pages,
        "pagina_actual": pagina
    })


@vacantes_bp.route('/<int:vacante_id>', methods=['GET'])
@jwt_required()
@sesion_segura
def detalle_vacante(vacante_id):
    vacante = Vacante.query.get_or_404(vacante_id)
    return jsonify({
        "id":            vacante.id,
        "titulo":        vacante.titulo,
        "descripcion":   vacante.descripcion,
        "requisitos":    vacante.requisitos,
        "area":          vacante.area,
        "modalidad":     vacante.modalidad,
        "tipo_contrato": vacante.tipo_contrato,
        "ciudad":        vacante.ciudad,
        "salario_min":   float(vacante.salario_min) if vacante.salario_min else None,
        "salario_max":   float(vacante.salario_max) if vacante.salario_max else None,
        "empresa": {
            "nombre":      vacante.empresa.nombre,
            "logo":        vacante.empresa.logo_url,
            "sector":      vacante.empresa.sector,
            "sitio_web":   vacante.empresa.sitio_web,
            "descripcion": vacante.empresa.descripcion,
        },
        "creado_en":  vacante.creado_en.isoformat(),
        "expira_en":  vacante.expira_en.isoformat() if vacante.expira_en else None,
    })


# ============================================================
# routes/admin.py
# ============================================================
from flask import Blueprint
admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/empresas/pendientes', methods=['GET'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def empresas_pendientes():
    from app.utils.decorators import rol_requerido
    from flask_jwt_extended import get_jwt
    if get_jwt().get('rol') != 'admin':
        return jsonify({"error": "Acceso denegado"}), 403

    empresas = Empresa.query.filter_by(estado_validacion='pendiente').all()
    return jsonify([{
        "id":        e.id,
        "nombre":    e.nombre,
        "sector":    e.sector,
        "ciudad":    e.ciudad,
        "creado_en": e.creado_en.isoformat()
    } for e in empresas])


@admin_bp.route('/empresas/<int:empresa_id>/validar', methods=['PUT'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def validar_empresa(empresa_id):
    if get_jwt().get('rol') != 'admin':
        return jsonify({"error": "Acceso denegado"}), 403

    from datetime import datetime
    data    = request.get_json()
    accion  = sanitizar(data.get('accion', ''))  # 'aprobar' o 'rechazar'
    empresa = Empresa.query.get_or_404(empresa_id)

    if accion == 'aprobar':
        empresa.estado_validacion = 'aprobada'
        empresa.validada_por      = get_jwt_identity()
        empresa.validada_en       = datetime.utcnow()
    elif accion == 'rechazar':
        empresa.estado_validacion = 'rechazada'
        empresa.razon_rechazo     = sanitizar(data.get('razon', ''))
    else:
        return jsonify({"error": "AcciÃ³n invÃ¡lida"}), 400

    db.session.commit()

    from app.services.email_service import EmailService
    EmailService.notificar_validacion_empresa(empresa, accion)

    return jsonify({"mensaje": f"Empresa {accion}da correctamente"})


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def estadisticas():
    if get_jwt().get('rol') != 'admin':
        return jsonify({"error": "Acceso denegado"}), 403

    from app.models import Usuario, Postulacion
    return jsonify({
        "usuarios":     Usuario.query.count(),
        "empresas":     Empresa.query.count(),
        "postulantes":  Postulante.query.count(),
        "vacantes":     Vacante.query.filter_by(activa=True).count(),
        "postulaciones": Postulacion.query.count(),
        "empresas_pendientes": Empresa.query.filter_by(estado_validacion='pendiente').count(),
    })


# ============================================================
# routes/empresa.py
# ============================================================
empresa_bp = Blueprint('empresa', __name__)


@empresa_bp.route('/vacantes', methods=['POST'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def crear_vacante():
    if get_jwt().get('rol') != 'empresa':
        return jsonify({"error": "Acceso denegado"}), 403

    usuario_id = get_jwt_identity()
    empresa    = Empresa.query.filter_by(usuario_id=usuario_id).first()

    if not empresa or empresa.estado_validacion != 'aprobada':
        return jsonify({"error": "Empresa no validada"}), 403

    data = request.get_json()

    vacante = Vacante(
        empresa_id    = empresa.id,
        titulo        = sanitizar(data.get('titulo', '')),
        descripcion   = sanitizar_html_basico(data.get('descripcion', '')),
        requisitos    = sanitizar_html_basico(data.get('requisitos', '')),
        area          = sanitizar(data.get('area', '')),
        tipo_contrato = sanitizar(data.get('tipo_contrato', '')),
        modalidad     = sanitizar(data.get('modalidad', '')),
        salario_min   = data.get('salario_min'),
        salario_max   = data.get('salario_max'),
        ciudad        = sanitizar(data.get('ciudad', '')),
        num_vacantes  = int(data.get('num_vacantes', 1)),
    )
    db.session.add(vacante)
    db.session.commit()

    return jsonify({"mensaje": "Vacante publicada", "id": vacante.id}), 201


@empresa_bp.route('/vacantes/<int:vacante_id>/postulantes', methods=['GET'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def ver_postulantes(vacante_id):
    if get_jwt().get('rol') != 'empresa':
        return jsonify({"error": "Acceso denegado"}), 403

    usuario_id = get_jwt_identity()
    empresa    = Empresa.query.filter_by(usuario_id=usuario_id).first()
    vacante    = Vacante.query.get_or_404(vacante_id)

    if vacante.empresa_id != empresa.id:
        return jsonify({"error": "No autorizado"}), 403

    postulaciones = vacante.postulaciones.all()
    return jsonify([{
        "postulacion_id": p.id,
        "estado":         p.estado,
        "postulado_en":   p.postulado_en.isoformat(),
        "postulante": {
            "nombre":   p.postulante.nombre,
            "apellidos": p.postulante.apellidos,
            "carrera":  p.postulante.carrera,
            "semestre": p.postulante.semestre,
        }
    } for p in postulaciones])


@empresa_bp.route('/postulaciones/<int:postulacion_id>/estado', methods=['PUT'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def actualizar_estado_postulacion(postulacion_id):
    if get_jwt().get('rol') != 'empresa':
        return jsonify({"error": "Acceso denegado"}), 403

    data        = request.get_json()
    nuevo_estado = sanitizar(data.get('estado', ''))

    if nuevo_estado not in ('en_revision', 'aceptada', 'rechazada'):
        return jsonify({"error": "Estado invÃ¡lido"}), 400

    postulacion = Postulacion.query.get_or_404(postulacion_id)
    postulacion.estado = nuevo_estado
    db.session.commit()

    from app.services.email_service import EmailService
    EmailService.notificar_estado_postulacion(postulacion)

    return jsonify({"mensaje": "Estado actualizado"})


# ============================================================
# routes/postulante.py
# ============================================================
postulante_bp = Blueprint('postulante', __name__)


@postulante_bp.route('/postulaciones', methods=['POST'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def postularse():
    if get_jwt().get('rol') != 'postulante':
        return jsonify({"error": "Acceso denegado"}), 403

    usuario_id  = get_jwt_identity()
    postulante  = Postulante.query.filter_by(usuario_id=usuario_id).first()
    data        = request.get_json()
    vacante_id  = data.get('vacante_id')

    if not vacante_id:
        return jsonify({"error": "Vacante requerida"}), 400

    existente = Postulacion.query.filter_by(
        vacante_id=vacante_id,
        postulante_id=postulante.id
    ).first()

    if existente:
        return jsonify({"error": "Ya te postulaste a esta vacante"}), 409

    postulacion = Postulacion(
        vacante_id          = vacante_id,
        postulante_id       = postulante.id,
        carta_presentacion  = sanitizar(data.get('carta_presentacion', ''))
    )
    db.session.add(postulacion)
    db.session.commit()

    return jsonify({"mensaje": "PostulaciÃ³n enviada exitosamente", "id": postulacion.id}), 201


@postulante_bp.route('/postulaciones', methods=['GET'])
@jwt_required()
@sesion_segura
def mis_postulaciones():
    if get_jwt().get('rol') != 'postulante':
        return jsonify({"error": "Acceso denegado"}), 403

    usuario_id = get_jwt_identity()
    postulante = Postulante.query.filter_by(usuario_id=usuario_id).first()

    postulaciones = postulante.postulaciones.all()
    return jsonify([{
        "id":          p.id,
        "estado":      p.estado,
        "postulado_en": p.postulado_en.isoformat(),
        "vacante": {
            "titulo":  p.vacante.titulo,
            "empresa": p.vacante.empresa.nombre,
            "ciudad":  p.vacante.ciudad,
        }
    } for p in postulaciones])


@empresa_bp.route('/vacantes', methods=['GET'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def mis_vacantes():
    if get_jwt().get('rol') != 'empresa':
        return jsonify({"error": "Acceso denegado"}), 403
    usuario_id = get_jwt_identity()
    empresa    = Empresa.query.filter_by(usuario_id=usuario_id).first()
    if not empresa:
        return jsonify([])
    vacantes = Vacante.query.filter_by(empresa_id=empresa.id).order_by(Vacante.creado_en.desc()).all()
    return jsonify([{
        "id":            v.id,
        "titulo":        v.titulo,
        "area":          v.area,
        "modalidad":     v.modalidad,
        "tipo_contrato": v.tipo_contrato,
        "ciudad":        v.ciudad,
        "salario_min":   float(v.salario_min) if v.salario_min else None,
        "salario_max":   float(v.salario_max) if v.salario_max else None,
        "activa":        v.activa,
        "num_vacantes":  v.num_vacantes,
        "creado_en":     v.creado_en.isoformat(),
    } for v in vacantes])


@empresa_bp.route('/vacantes/<int:vacante_id>', methods=['PUT'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def editar_vacante(vacante_id):
    if get_jwt().get('rol') != 'empresa':
        return jsonify({"error": "Acceso denegado"}), 403
    usuario_id = get_jwt_identity()
    empresa    = Empresa.query.filter_by(usuario_id=usuario_id).first()
    vacante    = Vacante.query.get_or_404(vacante_id)
    if vacante.empresa_id != empresa.id:
        return jsonify({"error": "No autorizado"}), 403
    data = request.get_json()
    vacante.titulo        = sanitizar(data.get('titulo', vacante.titulo))
    vacante.descripcion   = sanitizar_html_basico(data.get('descripcion', vacante.descripcion))
    vacante.requisitos    = sanitizar_html_basico(data.get('requisitos', vacante.requisitos))
    vacante.area          = sanitizar(data.get('area', vacante.area))
    vacante.tipo_contrato = sanitizar(data.get('tipo_contrato', vacante.tipo_contrato))
    vacante.modalidad     = sanitizar(data.get('modalidad', vacante.modalidad))
    vacante.ciudad        = sanitizar(data.get('ciudad', vacante.ciudad))
    vacante.salario_min   = data.get('salario_min', vacante.salario_min)
    vacante.salario_max   = data.get('salario_max', vacante.salario_max)
    db.session.commit()
    return jsonify({"mensaje": "Vacante actualizada"})


@empresa_bp.route('/vacantes/<int:vacante_id>', methods=['DELETE'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def eliminar_vacante(vacante_id):
    if get_jwt().get('rol') != 'empresa':
        return jsonify({"error": "Acceso denegado"}), 403
    usuario_id = get_jwt_identity()
    empresa    = Empresa.query.filter_by(usuario_id=usuario_id).first()
    vacante    = Vacante.query.get_or_404(vacante_id)
    if vacante.empresa_id != empresa.id:
        return jsonify({"error": "No autorizado"}), 403
    vacante.activa = False
    db.session.commit()
    return jsonify({"mensaje": "Vacante eliminada"})


