# ============================================================
# routes/cv.py — CRUD de CV + exportación a PDF
# ============================================================
from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from app import db
from app.models import (
    Postulante, Curriculum, ExperienciaLaboral,
    Educacion, Habilidad
)
from app.utils.seguridad import sanitizar
from app.utils.decorators import sesion_segura, dos_fa_requerido

cv_bp = Blueprint('cv', __name__)


def _get_postulante(usuario_id):
    return Postulante.query.filter_by(usuario_id=usuario_id).first()


@cv_bp.route('', methods=['GET'])
@jwt_required()
@sesion_segura
def obtener_cv():
    usuario_id = get_jwt_identity()
    postulante = _get_postulante(usuario_id)
    if not postulante:
        return jsonify({"error": "Perfil no encontrado"}), 404

    cv = postulante.curriculum
    return jsonify({
        "personal": {
            "nombre":    postulante.nombre,
            "apellidos": postulante.apellidos,
            "telefono":  postulante.telefono,
            "carrera":   postulante.carrera,
            "semestre":  postulante.semestre,
            "ciudad":    postulante.ciudad,
            "linkedin":  postulante.linkedin,
            "email":     postulante.usuario.email if postulante.usuario else '',
        },
        "resumen":     cv.resumen if cv else '',
        "experiencia": [{
            "empresa":      e.empresa,
            "puesto":       e.puesto,
            "descripcion":  e.descripcion,
            "fecha_inicio": e.fecha_inicio.isoformat() if e.fecha_inicio else '',
            "fecha_fin":    e.fecha_fin.isoformat() if e.fecha_fin else '',
            "actual":       e.fecha_fin is None
        } for e in (cv.experiencias.all() if cv else [])],
        "educacion": [{
            "institucion":  edu.institucion,
            "titulo":       edu.titulo,
            "nivel":        edu.nivel,
            "fecha_inicio": edu.fecha_inicio.isoformat() if edu.fecha_inicio else '',
            "fecha_fin":    edu.fecha_fin.isoformat() if edu.fecha_fin else '',
        } for edu in (cv.educaciones.all() if cv else [])],
        "habilidades": [{
            "nombre": h.nombre,
            "nivel":  h.nivel
        } for h in (cv.habilidades.all() if cv else [])],
    })


@cv_bp.route('', methods=['POST'])
@jwt_required()
@dos_fa_requerido
@sesion_segura
def guardar_cv():
    if get_jwt().get('rol') != 'postulante':
        return jsonify({"error": "Acceso denegado"}), 403

    usuario_id = get_jwt_identity()
    postulante = _get_postulante(usuario_id)
    if not postulante:
        return jsonify({"error": "Perfil no encontrado"}), 404

    data = request.get_json()

    # ── Actualizar datos personales ───────────────────────────
    personal = data.get('personal', {})
    postulante.nombre    = sanitizar(personal.get('nombre', postulante.nombre or ''))
    postulante.apellidos = sanitizar(personal.get('apellidos', postulante.apellidos or ''))
    postulante.telefono  = sanitizar(personal.get('telefono', ''))
    postulante.carrera   = sanitizar(personal.get('carrera', ''))
    postulante.semestre  = personal.get('semestre') or postulante.semestre
    postulante.ciudad    = sanitizar(personal.get('ciudad', ''))
    postulante.linkedin  = sanitizar(personal.get('linkedin', ''))

    # ── Crear o actualizar CV ─────────────────────────────────
    cv = postulante.curriculum
    if not cv:
        cv = Curriculum(postulante_id=postulante.id)
        db.session.add(cv)
        db.session.flush()

    cv.resumen         = sanitizar(data.get('resumen', ''))
    cv.actualizado_en  = datetime.utcnow()

    # ── Experiencia: reemplazar completa ──────────────────────
    ExperienciaLaboral.query.filter_by(curriculum_id=cv.id).delete()
    for exp in data.get('experiencia', []):
        if not exp.get('empresa') or not exp.get('puesto'):
            continue
        e = ExperienciaLaboral(
            curriculum_id = cv.id,
            empresa       = sanitizar(exp.get('empresa', '')),
            puesto        = sanitizar(exp.get('puesto', '')),
            descripcion   = sanitizar(exp.get('descripcion', '')),
            fecha_inicio  = _parse_fecha(exp.get('fecha_inicio')),
            fecha_fin     = None if exp.get('actual') else _parse_fecha(exp.get('fecha_fin'))
        )
        db.session.add(e)

    # ── Educación: reemplazar completa ────────────────────────
    Educacion.query.filter_by(curriculum_id=cv.id).delete()
    for edu in data.get('educacion', []):
        if not edu.get('institucion'):
            continue
        ed = Educacion(
            curriculum_id = cv.id,
            institucion   = sanitizar(edu.get('institucion', '')),
            titulo        = sanitizar(edu.get('titulo', '')),
            nivel         = edu.get('nivel', 'licenciatura'),
            fecha_inicio  = _parse_fecha(edu.get('fecha_inicio')),
            fecha_fin     = _parse_fecha(edu.get('fecha_fin'))
        )
        db.session.add(ed)

    # ── Habilidades: reemplazar completa ──────────────────────
    Habilidad.query.filter_by(curriculum_id=cv.id).delete()
    for hab in data.get('habilidades', []):
        if not hab.get('nombre'):
            continue
        h = Habilidad(
            curriculum_id = cv.id,
            nombre        = sanitizar(hab.get('nombre', '')),
            nivel         = hab.get('nivel', 'intermedio')
        )
        db.session.add(h)

    db.session.commit()
    return jsonify({"mensaje": "CV guardado correctamente"})


@cv_bp.route('/pdf', methods=['GET'])
@jwt_required()
@sesion_segura
def exportar_pdf():
    """Genera el CV en PDF con WeasyPrint"""
    usuario_id = get_jwt_identity()
    postulante = _get_postulante(usuario_id)
    if not postulante:
        return jsonify({"error": "Perfil no encontrado"}), 404

    cv = postulante.curriculum
    if not cv:
        return jsonify({"error": "CV no encontrado. Crea tu CV primero."}), 404

    try:
        from weasyprint import HTML, CSS
        html_content = _generar_html_cv(postulante, cv)
        pdf_bytes    = HTML(string=html_content).write_pdf()

        response = make_response(pdf_bytes)
        response.headers['Content-Type']        = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=cv_{postulante.id}.pdf'
        return response

    except Exception as e:
        return jsonify({"error": f"Error generando PDF: {str(e)}"}), 500


def _parse_fecha(fecha_str):
    if not fecha_str:
        return None
    try:
        return datetime.strptime(fecha_str[:10], '%Y-%m-%d').date()
    except ValueError:
        return None


def _generar_html_cv(postulante, cv):
    """Genera HTML limpio para WeasyPrint"""
    from app.utils.seguridad import sanitizar

    nombre_completo = f"{postulante.nombre or ''} {postulante.apellidos or ''}".strip()

    experiencias_html = ''
    for e in cv.experiencias.all():
        fecha_fin = 'Presente' if not e.fecha_fin else e.fecha_fin.strftime('%b %Y')
        fecha_ini = e.fecha_inicio.strftime('%b %Y') if e.fecha_inicio else ''
        experiencias_html += f"""
        <div class="item">
            <div class="item-header">
                <span class="item-title">{e.puesto}</span>
                <span class="item-date">{fecha_ini} — {fecha_fin}</span>
            </div>
            <p class="item-sub">{e.empresa}</p>
            {f'<p class="item-desc">{e.descripcion}</p>' if e.descripcion else ''}
        </div>"""

    educacion_html = ''
    for edu in cv.educaciones.all():
        fecha_fin = edu.fecha_fin.strftime('%Y') if edu.fecha_fin else 'Presente'
        fecha_ini = edu.fecha_inicio.strftime('%Y') if edu.fecha_inicio else ''
        educacion_html += f"""
        <div class="item">
            <div class="item-header">
                <span class="item-title">{edu.titulo}</span>
                <span class="item-date">{fecha_ini} — {fecha_fin}</span>
            </div>
            <p class="item-sub">{edu.institucion} · {edu.nivel}</p>
        </div>"""

    colores_nivel = {
        'basico': '#94a3b8', 'intermedio': '#3b82f6',
        'avanzado': '#22c55e', 'experto': '#a855f7'
    }
    habilidades_html = ''.join([
        f'<span class="habilidad" style="border-color:{colores_nivel.get(h.nivel,"#64748b")}40;color:{colores_nivel.get(h.nivel,"#64748b")}">'
        f'{h.nombre} <small>· {h.nivel}</small></span>'
        for h in cv.habilidades.all()
    ])

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Serif+4:wght@400;600&display=swap');
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Source Serif 4', Georgia, serif; font-size: 11pt; color: #1e293b; line-height: 1.5; padding: 40px; }}
  h1 {{ font-family: 'Playfair Display', Georgia, serif; font-size: 26pt; font-weight: 900; color: #0f172a; margin-bottom: 4px; }}
  .subtitulo {{ color: #64748b; font-size: 11pt; margin-bottom: 6px; }}
  .contacto {{ display: flex; gap: 20px; font-size: 9pt; color: #64748b; flex-wrap: wrap; }}
  .separador {{ border: none; border-top: 2px solid #0f172a; margin: 16px 0; }}
  .seccion-titulo {{ font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 10px; margin-top: 20px; }}
  .resumen {{ color: #334155; font-size: 10.5pt; line-height: 1.6; }}
  .item {{ margin-bottom: 12px; }}
  .item-header {{ display: flex; justify-content: space-between; align-items: baseline; }}
  .item-title {{ font-weight: 600; color: #0f172a; font-size: 11pt; }}
  .item-date {{ font-size: 9pt; color: #94a3b8; }}
  .item-sub {{ font-size: 9.5pt; color: #64748b; margin-top: 1px; }}
  .item-desc {{ font-size: 9.5pt; color: #475569; margin-top: 4px; }}
  .habilidades {{ display: flex; flex-wrap: wrap; gap: 6px; }}
  .habilidad {{ font-size: 9pt; padding: 3px 10px; border-radius: 20px; border: 1.5px solid; }}
</style>
</head>
<body>
  <h1>{nombre_completo}</h1>
  <p class="subtitulo">{postulante.carrera or ''}{(' · Semestre ' + str(postulante.semestre)) if postulante.semestre else ''}</p>
  <div class="contacto">
    {f'<span>✉ {postulante.usuario.email}</span>' if postulante.usuario else ''}
    {f'<span>📞 {postulante.telefono}</span>' if postulante.telefono else ''}
    {f'<span>📍 {postulante.ciudad}</span>' if postulante.ciudad else ''}
    {f'<span>🔗 {postulante.linkedin}</span>' if postulante.linkedin else ''}
  </div>
  <hr class="separador">

  {f'<p class="seccion-titulo">Perfil Profesional</p><p class="resumen">{cv.resumen}</p>' if cv.resumen else ''}

  {f'<p class="seccion-titulo">Experiencia Laboral</p>{experiencias_html}' if experiencias_html else ''}

  {f'<p class="seccion-titulo">Educación</p>{educacion_html}' if educacion_html else ''}

  {f'<p class="seccion-titulo">Habilidades</p><div class="habilidades">{habilidades_html}</div>' if habilidades_html else ''}
</body>
</html>"""
