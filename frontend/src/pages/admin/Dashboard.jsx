// ============================================================
// pages/admin/Dashboard.jsx
// ============================================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ModalInactividad } from '../../components/Chatbot';
import { Chatbot } from '../../components/Chatbot';

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-black text-white mb-1">{value ?? '—'}</p>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const [stats, setStats]       = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [tab, setTab]           = useState('stats');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/empresas/pendientes')
    ]).then(([s, e]) => {
      setStats(s.data);
      setEmpresas(e.data);
    }).catch(() => navigate('/login'))
      .finally(() => setCargando(false));
  }, []);

  const validarEmpresa = async (id, accion) => {
    try {
      await api.put(`/admin/empresas/${id}/validar`, { accion });
      setEmpresas(prev => prev.filter(e => e.id !== id));
      if (accion === 'aprobar') setStats(s => ({ ...s, empresas_pendientes: s.empresas_pendientes - 1 }));
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">B</span>
          </div>
          <span className="font-bold text-lg">BolsaUni</span>
          <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full border border-purple-500/30">Admin</span>
        </div>
        <button onClick={handleLogout}
          className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition">
          Cerrar sesión →
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Panel de Administración</h1>
          <p className="text-slate-400">Gestiona empresas, usuarios y el contenido de la plataforma.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-slate-800/50 p-1 rounded-xl w-fit">
          {[['stats','📊 Estadísticas'], ['empresas','🏢 Empresas pendientes']].map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab===key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {label}
              {key==='empresas' && empresas.length > 0 &&
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5">{empresas.length}</span>}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
          </div>
        ) : tab === 'stats' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon:'👤', label:'Total usuarios', value: stats?.usuarios, color:'bg-blue-500/20' },
              { icon:'🏢', label:'Empresas', value: stats?.empresas, color:'bg-indigo-500/20' },
              { icon:'🎓', label:'Postulantes', value: stats?.postulantes, color:'bg-cyan-500/20' },
              { icon:'💼', label:'Vacantes activas', value: stats?.vacantes, color:'bg-green-500/20' },
              { icon:'📋', label:'Postulaciones', value: stats?.postulaciones, color:'bg-yellow-500/20' },
              { icon:'⏳', label:'Pendientes', value: stats?.empresas_pendientes, color:'bg-red-500/20' },
            ].map(s => <StatCard key={s.label} {...s} />)}
          </div>
        ) : (
          <div className="space-y-4">
            {empresas.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <span className="text-4xl block mb-3">✅</span>
                <p>No hay empresas pendientes de validación</p>
              </div>
            ) : empresas.map(empresa => (
              <div key={empresa.id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">{empresa.nombre}</h3>
                  <p className="text-slate-400 text-sm">{empresa.sector} · {empresa.ciudad}</p>
                  <p className="text-slate-500 text-xs mt-1">Registrada: {new Date(empresa.creado_en).toLocaleDateString('es-MX')}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => validarEmpresa(empresa.id, 'aprobar')}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30
                               px-4 py-2 rounded-xl text-sm font-medium transition">
                    ✅ Aprobar
                  </button>
                  <button onClick={() => validarEmpresa(empresa.id, 'rechazar')}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30
                               px-4 py-2 rounded-xl text-sm font-medium transition">
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalInactividad />
      <Chatbot rol="admin" />
    </div>
  );
}
