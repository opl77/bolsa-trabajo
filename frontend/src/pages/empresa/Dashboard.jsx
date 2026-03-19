// ============================================================
// pages/empresa/Dashboard.jsx
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ModalInactividad, Chatbot } from '../../components/Chatbot';
import { ListaChats } from '../../components/Chat';

function NavEmpresa({ tab, setTab, onLogout }) {
  return (
    <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">B</span>
          </div>
          <span className="font-bold">BolsaUni</span>
          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/30">Empresa</span>
        </div>
        <div className="hidden md:flex gap-1">
          {[['vacantes','💼 Vacantes'],['postulantes','👥 Postulantes'],['mensajes','💬 Mensajes'],['perfil','🏢 Perfil']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${tab===key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={onLogout} className="text-slate-400 hover:text-white text-sm transition">Salir →</button>
    </nav>
  );
}

function ModalNuevaVacante({ onClose, onCreada }) {
  const [form, setForm] = useState({
    titulo:'', descripcion:'', requisitos:'', area:'', tipo_contrato:'practicas',
    modalidad:'presencial', ciudad:'', salario_min:'', salario_max:''
  });
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setCargando(true);
    try {
      await api.post('/empresa/vacantes', form);
      onCreada();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    } finally { setCargando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Nueva Vacante</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Título del puesto *</label>
            <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required
              className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              placeholder="Desarrollador Frontend Jr." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Tipo de contrato</label>
              <select value={form.tipo_contrato} onChange={e => setForm({...form, tipo_contrato: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                <option value="practicas">Prácticas</option>
                <option value="medio_tiempo">Medio tiempo</option>
                <option value="tiempo_completo">Tiempo completo</option>
                <option value="proyecto">Por proyecto</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Modalidad</label>
              <select value={form.modalidad} onChange={e => setForm({...form, modalidad: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Ciudad</label>
              <input value={form.ciudad} onChange={e => setForm({...form, ciudad: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                placeholder="CDMX" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Salario min</label>
              <input type="number" value={form.salario_min} onChange={e => setForm({...form, salario_min: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                placeholder="8000" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Salario max</label>
              <input type="number" value={form.salario_max} onChange={e => setForm({...form, salario_max: e.target.value})}
                className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                placeholder="15000" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} rows={3}
              className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Describe el puesto y responsabilidades..." />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Requisitos</label>
            <textarea value={form.requisitos} onChange={e => setForm({...form, requisitos: e.target.value})} rows={3}
              className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="React, Node.js, inglés intermedio..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition">
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition">
              {cargando ? 'Publicando...' : 'Publicar vacante ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmpresaDashboard() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [tab, setTab]           = useState('vacantes');
  const [vacantes, setVacantes] = useState([]);
  const [postulantes, setPostulantes] = useState([]);
  const [vacanteSeleccionada, setVacanteSeleccionada] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargarVacantes = () => {
    api.get('/empresa/vacantes').then(r => setVacantes(r.data)).catch(() => {}).finally(() => setCargando(false));
  };

  useEffect(() => { cargarVacantes(); }, []);

  const verPostulantes = async (vacante) => {
    setVacanteSeleccionada(vacante);
    setTab('postulantes');
    const { data } = await api.get(`/empresa/vacantes/${vacante.id}/postulantes`);
    setPostulantes(data);
  };

  const actualizarEstado = async (postulacionId, estado) => {
    await api.put(`/empresa/postulaciones/${postulacionId}/estado`, { estado });
    setPostulantes(prev => prev.map(p => p.postulacion_id === postulacionId ? {...p, estado} : p));
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const badgeEstado = e => ({
    practicas: 'bg-blue-500/20 text-blue-400',
    medio_tiempo: 'bg-yellow-500/20 text-yellow-400',
    tiempo_completo: 'bg-green-500/20 text-green-400',
    proyecto: 'bg-purple-500/20 text-purple-400',
  }[e] || 'bg-slate-500/20 text-slate-400');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <NavEmpresa tab={tab} setTab={setTab} onLogout={handleLogout} />
      {mostrarModal && <ModalNuevaVacante onClose={() => setMostrarModal(false)} onCreada={cargarVacantes} />}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {tab === 'vacantes' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black">Mis Vacantes</h1>
                <p className="text-slate-400 mt-1">{vacantes.length} vacantes publicadas</p>
              </div>
              <button onClick={() => setMostrarModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition flex items-center gap-2">
                + Nueva vacante
              </button>
            </div>
            {cargando ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
              </div>
            ) : vacantes.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <span className="text-5xl block mb-4">💼</span>
                <p className="text-lg mb-4">Aún no tienes vacantes publicadas</p>
                <button onClick={() => setMostrarModal(true)}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 transition">
                  Publicar primera vacante
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {vacantes.map(v => (
                  <div key={v.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-between hover:border-slate-600/50 transition">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-bold text-lg">{v.titulo}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeEstado(v.tipo_contrato)}`}>
                          {v.tipo_contrato?.replace('_',' ')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                          {v.modalidad}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm">
                        📍 {v.ciudad || 'Sin especificar'} ·{' '}
                        {v.salario_min ? `$${v.salario_min.toLocaleString()} - $${v.salario_max?.toLocaleString()} MXN` : 'Salario a convenir'} ·{' '}
                        {new Date(v.creado_en).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <button onClick={() => verPostulantes(v)}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm transition ml-4">
                      Ver postulantes
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'postulantes' && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setTab('vacantes')} className="text-slate-400 hover:text-white transition">← Volver</button>
              <div>
                <h1 className="text-3xl font-black">Postulantes</h1>
                {vacanteSeleccionada && <p className="text-slate-400 mt-1">{vacanteSeleccionada.titulo}</p>}
              </div>
            </div>
            {postulantes.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <span className="text-5xl block mb-3">👥</span>
                <p>Aún no hay postulantes para esta vacante</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {postulantes.map(p => (
                  <div key={p.postulacion_id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold">{p.postulante.nombre} {p.postulante.apellidos}</h3>
                      <p className="text-slate-400 text-sm">{p.postulante.carrera} · Semestre {p.postulante.semestre}</p>
                      <p className="text-slate-500 text-xs mt-1">Postulado: {new Date(p.postulado_en).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-3 py-1 rounded-full border ${
                        p.estado==='aceptada' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        p.estado==='rechazada' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        p.estado==='en_revision' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-slate-500/20 text-slate-400 border-slate-600'}`}>
                        {p.estado}
                      </span>
                      {p.estado === 'enviada' && <>
                        <button onClick={() => actualizarEstado(p.postulacion_id, 'aceptada')}
                          className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs transition">
                          ✓ Aceptar
                        </button>
                        <button onClick={() => actualizarEstado(p.postulacion_id, 'rechazada')}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs transition">
                          ✗ Rechazar
                        </button>
                      </>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'mensajes' && (
          <ListaChats postulaciones={vacantes.flatMap(v => [])} usuarioId={null} rol="empresa" />
        )}

        {tab === 'perfil' && (          <div className="max-w-lg">
            <h1 className="text-3xl font-black mb-8">Perfil de Empresa</h1>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-center text-slate-400">
              <span className="text-4xl block mb-3">🏢</span>
              <p>Edición de perfil — próximamente</p>
            </div>
          </div>
        )}
      </div>

      <ModalInactividad />
      <Chatbot rol="empresa" />
    </div>
  );
}
