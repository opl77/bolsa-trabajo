// ============================================================
// pages/postulante/CVBuilder.jsx — Constructor de CV completo
// ============================================================
import { useState, useEffect } from 'react';
import { api } from '../../services/api';

// ── Secciones del CV ──────────────────────────────────────────
const SECCION_ICONS = {
  personal: '👤', resumen: '📝', experiencia: '💼',
  educacion: '🎓', habilidades: '⚡', idiomas: '🌐'
};

// ── Componente: Campo de formulario ──────────────────────────
function Campo({ label, name, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div>
      <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} required={required}
        className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl
                   px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500
                   focus:ring-1 focus:ring-blue-500/30 transition placeholder-slate-600" />
    </div>
  );
}

function Textarea({ label, name, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">{label}</label>
      <textarea name={name} value={value} onChange={onChange}
        placeholder={placeholder} rows={rows}
        className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl
                   px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500
                   focus:ring-1 focus:ring-blue-500/30 transition placeholder-slate-600 resize-none" />
    </div>
  );
}

// ── Sección: Experiencia Laboral ──────────────────────────────
function SeccionExperiencia({ items, onChange }) {
  const agregar = () => onChange([...items, { empresa:'', puesto:'', descripcion:'', fecha_inicio:'', fecha_fin:'', actual: false }]);
  const eliminar = i => onChange(items.filter((_,idx) => idx !== i));
  const actualizar = (i, campo, val) => {
    const copia = [...items];
    copia[i] = { ...copia[i], [campo]: val };
    onChange(copia);
  };

  return (
    <div className="space-y-4">
      {items.map((exp, i) => (
        <div key={i} className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 relative">
          <button onClick={() => eliminar(i)}
            className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition text-lg">×</button>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Campo label="Empresa" name="empresa" value={exp.empresa}
              onChange={e => actualizar(i, 'empresa', e.target.value)} placeholder="Google, BBVA..." />
            <Campo label="Puesto" name="puesto" value={exp.puesto}
              onChange={e => actualizar(i, 'puesto', e.target.value)} placeholder="Desarrollador Jr." />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Campo label="Fecha inicio" name="fecha_inicio" value={exp.fecha_inicio}
              onChange={e => actualizar(i, 'fecha_inicio', e.target.value)} type="date" />
            <Campo label="Fecha fin" name="fecha_fin" value={exp.fecha_fin}
              onChange={e => actualizar(i, 'fecha_fin', e.target.value)} type="date" />
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={exp.actual}
                  onChange={e => actualizar(i, 'actual', e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500" />
                <span className="text-slate-400 text-sm">Trabajo actual</span>
              </label>
            </div>
          </div>
          <Textarea label="Descripción" name="descripcion" value={exp.descripcion}
            onChange={e => actualizar(i, 'descripcion', e.target.value)}
            placeholder="Describe tus responsabilidades y logros..." rows={2} />
        </div>
      ))}
      <button onClick={agregar}
        className="w-full border-2 border-dashed border-slate-700 hover:border-blue-500/50
                   text-slate-500 hover:text-blue-400 rounded-2xl py-4 text-sm transition flex items-center justify-center gap-2">
        + Agregar experiencia
      </button>
    </div>
  );
}

// ── Sección: Educación ────────────────────────────────────────
function SeccionEducacion({ items, onChange }) {
  const agregar = () => onChange([...items, { institucion:'', titulo:'', nivel:'licenciatura', fecha_inicio:'', fecha_fin:'' }]);
  const eliminar = i => onChange(items.filter((_,idx) => idx !== i));
  const actualizar = (i, campo, val) => {
    const copia = [...items]; copia[i] = { ...copia[i], [campo]: val }; onChange(copia);
  };

  return (
    <div className="space-y-4">
      {items.map((edu, i) => (
        <div key={i} className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 relative">
          <button onClick={() => eliminar(i)} className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition text-lg">×</button>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Campo label="Institución" value={edu.institucion}
              onChange={e => actualizar(i,'institucion',e.target.value)} placeholder="UNAM, IPN, TEC..." />
            <Campo label="Título / Carrera" value={edu.titulo}
              onChange={e => actualizar(i,'titulo',e.target.value)} placeholder="Ing. en Sistemas..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">Nivel</label>
              <select value={edu.nivel} onChange={e => actualizar(i,'nivel',e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">
                {['preparatoria','licenciatura','maestria','doctorado','curso','certificacion'].map(n => (
                  <option key={n} value={n}>{n.charAt(0).toUpperCase()+n.slice(1)}</option>
                ))}
              </select>
            </div>
            <Campo label="Fecha inicio" value={edu.fecha_inicio}
              onChange={e => actualizar(i,'fecha_inicio',e.target.value)} type="date" />
            <Campo label="Fecha fin" value={edu.fecha_fin}
              onChange={e => actualizar(i,'fecha_fin',e.target.value)} type="date" />
          </div>
        </div>
      ))}
      <button onClick={agregar}
        className="w-full border-2 border-dashed border-slate-700 hover:border-blue-500/50 text-slate-500 hover:text-blue-400 rounded-2xl py-4 text-sm transition flex items-center justify-center gap-2">
        + Agregar educación
      </button>
    </div>
  );
}

// ── Sección: Habilidades ──────────────────────────────────────
function SeccionHabilidades({ items, onChange }) {
  const [nueva, setNueva] = useState('');
  const [nivel, setNivel] = useState('intermedio');
  const agregar = () => {
    if (!nueva.trim()) return;
    onChange([...items, { nombre: nueva.trim(), nivel }]);
    setNueva('');
  };
  const eliminar = i => onChange(items.filter((_,idx) => idx !== i));
  const colores = { basico:'bg-slate-500/20 text-slate-300', intermedio:'bg-blue-500/20 text-blue-400', avanzado:'bg-green-500/20 text-green-400', experto:'bg-purple-500/20 text-purple-400' };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 min-h-12">
        {items.map((h, i) => (
          <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${colores[h.nivel]} border-current/30`}>
            {h.nombre}
            <span className="text-xs opacity-60">· {h.nivel}</span>
            <button onClick={() => eliminar(i)} className="opacity-50 hover:opacity-100 ml-1">×</button>
          </span>
        ))}
        {items.length === 0 && <p className="text-slate-600 text-sm py-1">Aún no has agregado habilidades</p>}
      </div>
      <div className="flex gap-3">
        <input value={nueva} onChange={e => setNueva(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregar())}
          placeholder="React, Python, Photoshop..."
          className="flex-1 bg-slate-900/50 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition" />
        <select value={nivel} onChange={e => setNivel(e.target.value)}
          className="bg-slate-900/50 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
          {['basico','intermedio','avanzado','experto'].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={agregar} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm transition">+</button>
      </div>
    </div>
  );
}

// ── Vista previa del CV ───────────────────────────────────────
function VistaPrevia({ datos }) {
  const { personal, resumen, experiencia, educacion, habilidades } = datos;
  const colores = { basico:'#64748b', intermedio:'#3b82f6', avanzado:'#22c55e', experto:'#a855f7' };

  return (
    <div className="bg-white text-gray-800 rounded-2xl p-8 text-sm leading-relaxed shadow-2xl" style={{ fontFamily: 'Georgia, serif' }}>
      {/* Encabezado */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-2xl font-black text-gray-900 mb-1">
          {personal.nombre || 'Tu Nombre'} {personal.apellidos}
        </h1>
        <p className="text-gray-500 text-sm">{personal.carrera} {personal.semestre ? `· Semestre ${personal.semestre}` : ''}</p>
        <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
          {personal.email && <span>✉ {personal.email}</span>}
          {personal.telefono && <span>📞 {personal.telefono}</span>}
          {personal.ciudad && <span>📍 {personal.ciudad}</span>}
          {personal.linkedin && <span>in {personal.linkedin}</span>}
        </div>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Perfil Profesional</h2>
          <p className="text-gray-700">{resumen}</p>
        </div>
      )}

      {/* Experiencia */}
      {experiencia.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Experiencia Laboral</h2>
          <div className="space-y-3">
            {experiencia.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900">{e.puesto}</span>
                  <span className="text-xs text-gray-400">{e.fecha_inicio} — {e.actual ? 'Presente' : e.fecha_fin}</span>
                </div>
                <p className="text-gray-500 text-xs mb-1">{e.empresa}</p>
                {e.descripcion && <p className="text-gray-600 text-xs">{e.descripcion}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educación */}
      {educacion.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Educación</h2>
          <div className="space-y-2">
            {educacion.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900">{e.titulo}</span>
                  <span className="text-xs text-gray-400">{e.fecha_inicio} — {e.fecha_fin || 'Presente'}</span>
                </div>
                <p className="text-gray-500 text-xs">{e.institucion} · {e.nivel}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habilidades */}
      {habilidades.length > 0 && (
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Habilidades</h2>
          <div className="flex flex-wrap gap-1.5">
            {habilidades.map((h, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full border"
                style={{ borderColor: colores[h.nivel]+'60', color: colores[h.nivel], backgroundColor: colores[h.nivel]+'15' }}>
                {h.nombre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function CVBuilder({ onVolver }) {
  const [seccionActiva, setSeccionActiva] = useState('personal');
  const [guardando, setGuardando]         = useState(false);
  const [descargando, setDescargando]     = useState(false);
  const [guardado, setGuardado]           = useState(false);
  const [vistaPrevia, setVistaPrevia]     = useState(false);

  const [datos, setDatos] = useState({
    personal:    { nombre:'', apellidos:'', email:'', telefono:'', ciudad:'', carrera:'', semestre:'', linkedin:'' },
    resumen:     '',
    experiencia: [],
    educacion:   [],
    habilidades: [],
  });

  // Cargar CV existente
  useEffect(() => {
    api.get('/postulante/cv').then(({ data }) => {
      if (data) setDatos(prev => ({
        personal:    data.personal    || prev.personal,
        resumen:     data.resumen     || '',
        experiencia: data.experiencia || [],
        educacion:   data.educacion   || [],
        habilidades: data.habilidades || [],
      }));
    }).catch(() => {});
  }, []);

  const handlePersonal = e => setDatos(d => ({ ...d, personal: { ...d.personal, [e.target.name]: e.target.value } }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.post('/postulante/cv', datos);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const descargarPDF = async () => {
    setDescargando(true);
    try {
      const resp = await api.get('/postulante/cv/pdf', { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href = url; a.download = 'mi-cv.pdf'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al generar PDF'); }
    finally { setDescargando(false); }
  };

  const secciones = [
    { key:'personal',    label:'Información personal' },
    { key:'resumen',     label:'Resumen profesional' },
    { key:'experiencia', label:'Experiencia laboral' },
    { key:'educacion',   label:'Educación' },
    { key:'habilidades', label:'Habilidades' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onVolver} className="text-slate-400 hover:text-white transition text-sm">← Volver</button>
          <h1 className="text-lg font-bold">Constructor de CV</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setVistaPrevia(!vistaPrevia)}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm transition">
            {vistaPrevia ? '✏️ Editar' : '👁 Vista previa'}
          </button>
          <button onClick={descargarPDF} disabled={descargando}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm transition flex items-center gap-2">
            {descargando ? '⏳' : '⬇️'} PDF
          </button>
          <button onClick={guardar} disabled={guardando}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2
              ${guardado ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
            {guardado ? '✓ Guardado' : guardando ? 'Guardando...' : 'Guardar CV'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {vistaPrevia ? (
          <div className="max-w-2xl mx-auto">
            <VistaPrevia datos={datos} />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar de secciones */}
            <div className="col-span-3">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-2 sticky top-24">
                {secciones.map(({ key, label }) => (
                  <button key={key} onClick={() => setSeccionActiva(key)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition flex items-center gap-3
                      ${seccionActiva===key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                    <span>{SECCION_ICONS[key]}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contenido de la sección */}
            <div className="col-span-9">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <span>{SECCION_ICONS[seccionActiva]}</span>
                  {secciones.find(s => s.key === seccionActiva)?.label}
                </h2>

                {seccionActiva === 'personal' && (
                  <div className="grid grid-cols-2 gap-4">
                    <Campo label="Nombre" name="nombre" value={datos.personal.nombre} onChange={handlePersonal} placeholder="Juan" required />
                    <Campo label="Apellidos" name="apellidos" value={datos.personal.apellidos} onChange={handlePersonal} placeholder="García López" required />
                    <Campo label="Correo" name="email" value={datos.personal.email} onChange={handlePersonal} type="email" placeholder="juan@uni.edu.mx" />
                    <Campo label="Teléfono" name="telefono" value={datos.personal.telefono} onChange={handlePersonal} placeholder="55 1234 5678" />
                    <Campo label="Ciudad" name="ciudad" value={datos.personal.ciudad} onChange={handlePersonal} placeholder="Ciudad de México" />
                    <Campo label="Semestre" name="semestre" value={datos.personal.semestre} onChange={handlePersonal} type="number" placeholder="8" />
                    <div className="col-span-2">
                      <Campo label="Carrera" name="carrera" value={datos.personal.carrera} onChange={handlePersonal} placeholder="Ingeniería en Sistemas Computacionales" />
                    </div>
                    <div className="col-span-2">
                      <Campo label="LinkedIn (URL)" name="linkedin" value={datos.personal.linkedin} onChange={handlePersonal} placeholder="linkedin.com/in/tu-perfil" />
                    </div>
                  </div>
                )}

                {seccionActiva === 'resumen' && (
                  <div>
                    <p className="text-slate-400 text-sm mb-4">Escribe un párrafo breve que resuma tu perfil profesional, fortalezas y objetivos laborales.</p>
                    <Textarea label="Resumen profesional" value={datos.resumen}
                      onChange={e => setDatos(d => ({ ...d, resumen: e.target.value }))}
                      placeholder="Soy estudiante de Ingeniería en Sistemas con experiencia en desarrollo web full-stack. Me especializo en React y Node.js, con habilidades para resolver problemas de manera eficiente y trabajar en equipo..."
                      rows={6} />
                    <p className="text-slate-600 text-xs mt-2">{datos.resumen.length} / 500 caracteres recomendados</p>
                  </div>
                )}

                {seccionActiva === 'experiencia' && (
                  <SeccionExperiencia items={datos.experiencia}
                    onChange={v => setDatos(d => ({ ...d, experiencia: v }))} />
                )}

                {seccionActiva === 'educacion' && (
                  <SeccionEducacion items={datos.educacion}
                    onChange={v => setDatos(d => ({ ...d, educacion: v }))} />
                )}

                {seccionActiva === 'habilidades' && (
                  <SeccionHabilidades items={datos.habilidades}
                    onChange={v => setDatos(d => ({ ...d, habilidades: v }))} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
