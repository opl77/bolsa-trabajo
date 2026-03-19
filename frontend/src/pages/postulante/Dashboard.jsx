// ============================================================
// pages/postulante/Dashboard.jsx
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ModalInactividad, Chatbot } from '../../components/Chatbot';
import { ListaChats } from '../../components/Chat';
import CVBuilder from './CVBuilder';

// ── Componente: Tarjeta de Vacante ────────────────────────────
function VacanteCard({ vacante, onPostular, yaPostulado }) {
  const [expandida, setExpandida] = useState(false);

  const colores = {
    practicas: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medio_tiempo: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    tiempo_completo: 'bg-green-500/20 text-green-400 border-green-500/30',
    proyecto: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  const modalidades = { presencial:'🏢', remoto:'🌐', hibrido:'🔀' };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-white font-bold text-lg">{vacante.titulo}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${colores[vacante.tipo_contrato] || 'bg-slate-500/20 text-slate-400'}`}>
              {vacante.tipo_contrato?.replace('_',' ')}
            </span>
          </div>
          <p className="text-blue-400 font-medium mb-2">{vacante.empresa}</p>
          <p className="text-slate-400 text-sm flex items-center gap-3 flex-wrap">
            <span>{modalidades[vacante.modalidad]} {vacante.modalidad}</span>
            {vacante.ciudad && <span>📍 {vacante.ciudad}</span>}
            {vacante.salario_min && <span>💰 ${vacante.salario_min?.toLocaleString()} - ${vacante.salario_max?.toLocaleString()} MXN</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {yaPostulado ? (
            <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-xl text-xs">
              ✓ Ya postulado
            </span>
          ) : (
            <button onClick={() => onPostular(vacante)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
              Postularme
            </button>
          )}
          <button onClick={() => setExpandida(!expandida)}
            className="text-slate-500 hover:text-slate-300 text-xs transition">
            {expandida ? 'Ver menos ↑' : 'Ver más ↓'}
          </button>
        </div>
      </div>

      {expandida && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-3">
          {vacante.descripcion && (
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Descripción</p>
              <p className="text-slate-300 text-sm">{vacante.descripcion}</p>
            </div>
          )}
          {vacante.requisitos && (
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Requisitos</p>
              <p className="text-slate-300 text-sm">{vacante.requisitos}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal Postulación ─────────────────────────────────────────
function ModalPostulacion({ vacante, onClose, onPostulado }) {
  const [carta, setCarta] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setCargando(true);
    try {
      await api.post('/postulante/postulaciones', {
        vacante_id: vacante.id,
        carta_presentacion: carta
      });
      onPostulado(vacante.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al postularse');
    } finally { setCargando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Postularse a vacante</h3>
            <p className="text-slate-400 text-sm">{vacante.titulo} · {vacante.empresa}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">
              Carta de presentación <span className="text-slate-600">(opcional)</span>
            </label>
            <textarea value={carta} onChange={e => setCarta(e.target.value)} rows={5}
              className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-xl
                         px-4 py-3 focus:outline-none focus:border-blue-500 resize-none text-sm"
              placeholder="Cuéntale a la empresa por qué eres el candidato ideal..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition">
              Cancelar
            </button>
            <button type="submit" disabled={cargando}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition">
              {cargando ? 'Enviando...' : 'Enviar postulación ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────
export default function PostulanteDashboard() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [tab, setTab]                   = useState('vacantes');
  const [vacantes, setVacantes]         = useState([]);
  const [postulaciones, setPostulaciones] = useState([]);
  const [idsPostulados, setIdsPostulados] = useState(new Set());
  const [vacanteModal, setVacanteModal] = useState(null);
  const [busqueda, setBusqueda]         = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState('');
  const [pagina, setPagina]             = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando]         = useState(true);

  const cargarVacantes = async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ pagina, por_pagina: 10 });
      if (busqueda) params.set('q', busqueda);
      if (filtroModalidad) params.set('modalidad', filtroModalidad);
      const { data } = await api.get(`/vacantes?${params}`);
      setVacantes(data.vacantes);
      setTotalPaginas(data.paginas);
    } finally { setCargando(false); }
  };

  const cargarPostulaciones = async () => {
    const { data } = await api.get('/postulante/postulaciones');
    setPostulaciones(data);
    setIdsPostulados(new Set(data.map(p => p.vacante.id)));
  };

  useEffect(() => { cargarVacantes(); }, [pagina, filtroModalidad]);
  useEffect(() => { cargarPostulaciones(); }, []);

  const handleBuscar = e => { e.preventDefault(); setPagina(1); cargarVacantes(); };

  const handlePostulado = (vacanteId) => {
    setIdsPostulados(prev => new Set([...prev, vacanteId]));
    cargarPostulaciones();
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const badgeEstado = estado => ({
    enviada:     'bg-slate-500/20 text-slate-300 border-slate-600',
    en_revision: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    aceptada:    'bg-green-500/20 text-green-400 border-green-500/30',
    rechazada:   'bg-red-500/20 text-red-400 border-red-500/30',
  }[estado] || 'bg-slate-500/20 text-slate-400');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">B</span>
            </div>
            <span className="font-bold">BolsaUni</span>
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/30">Estudiante</span>
          </div>
          <div className="hidden md:flex gap-1">
            {[['vacantes','💼 Vacantes'],['postulaciones','📋 Mis postulaciones'],['mensajes','💬 Mensajes'],['cv','📄 Mi CV']].map(([key,label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition ${tab===key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                {label}
                {key==='postulaciones' && postulaciones.length > 0 &&
                  <span className="ml-1.5 bg-blue-500 text-white text-xs rounded-full px-1.5">{postulaciones.length}</span>}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white text-sm transition">Salir →</button>
      </nav>

      {vacanteModal && (
        <ModalPostulacion vacante={vacanteModal}
          onClose={() => setVacanteModal(null)}
          onPostulado={handlePostulado} />
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── Tab: Vacantes ── */}
        {tab === 'vacantes' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-black mb-1">Vacantes disponibles</h1>
              <p className="text-slate-400">Encuentra la oportunidad perfecta para tu perfil</p>
            </div>

            {/* Buscador */}
            <form onSubmit={handleBuscar} className="flex gap-3 mb-6">
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por puesto, empresa, tecnología..."
                className="flex-1 bg-slate-800/50 border border-slate-700 text-white rounded-xl
                           px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
              <select value={filtroModalidad} onChange={e => { setFiltroModalidad(e.target.value); setPagina(1); }}
                className="bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                <option value="">Modalidad</option>
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
              <button type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl transition font-medium">
                Buscar
              </button>
            </form>

            {cargando ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
              </div>
            ) : vacantes.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <span className="text-5xl block mb-3">🔍</span>
                <p>No se encontraron vacantes con esos criterios</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {vacantes.map(v => (
                    <VacanteCard key={v.id} vacante={v}
                      onPostular={setVacanteModal}
                      yaPostulado={idsPostulados.has(v.id)} />
                  ))}
                </div>
                {totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1}
                      className="px-3 py-2 bg-slate-800 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-700 transition">
                      ←
                    </button>
                    <span className="text-slate-400 text-sm">Página {pagina} de {totalPaginas}</span>
                    <button onClick={() => setPagina(p => Math.min(totalPaginas, p+1))} disabled={pagina === totalPaginas}
                      className="px-3 py-2 bg-slate-800 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-700 transition">
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Tab: Mis postulaciones ── */}
        {tab === 'postulaciones' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-black mb-1">Mis Postulaciones</h1>
              <p className="text-slate-400">{postulaciones.length} postulaciones en total</p>
            </div>
            {postulaciones.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <span className="text-5xl block mb-3">📋</span>
                <p className="mb-4">Aún no te has postulado a ninguna vacante</p>
                <button onClick={() => setTab('vacantes')}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-500 transition">
                  Ver vacantes disponibles
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {postulaciones.map(p => (
                  <div key={p.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold">{p.vacante.titulo}</h3>
                      <p className="text-blue-400 text-sm">{p.vacante.empresa}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        📍 {p.vacante.ciudad} · {new Date(p.postulado_en).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${badgeEstado(p.estado)}`}>
                      {p.estado === 'enviada' ? '📤 Enviada' :
                       p.estado === 'en_revision' ? '🔍 En revisión' :
                       p.estado === 'aceptada' ? '🎉 Aceptada' : '❌ No seleccionado'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Mensajes ── */}
        {tab === 'mensajes' && (
          <ListaChats postulaciones={postulaciones} usuarioId={null} rol="postulante" />
        )}

        {/* ── Tab: Mi CV ── */}
        {tab === 'cv' && (
          <CVBuilder onVolver={() => setTab('vacantes')} />
        )}
      </div>

      <ModalInactividad />
      <Chatbot rol="postulante" />
    </div>
  );
}
