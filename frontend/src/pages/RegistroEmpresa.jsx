// ============================================================
// pages/RegistroEmpresa.jsx
// ============================================================
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function RegistroEmpresa() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmar: '', nombre_empresa: '' });
  const [error, setError]     = useState('');
  const [exito, setExito]     = useState(false);
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmar) { setError('Las contrasenas no coinciden'); return; }
    setCargando(true);
    try {
      await api.post('/auth/registro', { ...form, rol: 'empresa' });
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally { setCargando(false); }
  };

  if (exito) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-3">¡Registro exitoso!</h2>
        <p className="text-slate-400 mb-6">Tu empresa esta en revision. El administrador validara tu cuenta y recibiras un correo cuando sea aprobada.</p>
        <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-500 transition inline-block">
          Ir al inicio de sesion
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/login" className="text-slate-500 hover:text-slate-300 mb-8 flex items-center gap-1 text-sm">
          ← Volver al login
        </Link>
        <div className="mb-8">
          <span className="text-4xl mb-4 block">🏢</span>
          <h2 className="text-3xl font-black text-white mb-2">Registro de Empresa</h2>
          <p className="text-slate-400 text-sm">Publica vacantes y encuentra talento universitario</p>
        </div>

        {error && <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm">❌ {error}</p>
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Nombre de la empresa</label>
            <input type="text" name="nombre_empresa" value={form.nombre_empresa} onChange={handleChange}
              placeholder="Empresa S.A. de C.V." required
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Correo corporativo</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="rrhh@empresa.com" required
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Contrasena</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                placeholder="••••••••••" required
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Confirmar contrasena</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} name="confirmar" value={form.confirmar} onChange={handleChange}
                placeholder="••••••••••" required
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-xs">
              🔒 La contrasena debe tener minimo 10 caracteres, mayuscula, minuscula, numero y caracter especial.
            </p>
          </div>

          <button type="submit" disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition mt-2">
            {cargando ? 'Registrando...' : 'Crear cuenta empresa →'}
          </button>
        </form>
      </div>
    </div>
  );
}


// ============================================================
// RegistroPostulante
// ============================================================
export function RegistroPostulante() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmar: '', nombre: '', apellidos: '' });
  const [error, setError]     = useState('');
  const [exito, setExito]     = useState(false);
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmar) { setError('Las contrasenas no coinciden'); return; }
    setCargando(true);
    try {
      await api.post('/auth/registro', { ...form, rol: 'postulante' });
      setExito(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    } finally { setCargando(false); }
  };

  if (exito) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-3">¡Cuenta creada!</h2>
        <p className="text-slate-400 mb-6">Ya puedes iniciar sesion y comenzar a buscar oportunidades.</p>
        <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-500 transition inline-block">
          Iniciar sesion
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/login" className="text-slate-500 hover:text-slate-300 mb-8 flex items-center gap-1 text-sm">← Volver</Link>
        <div className="mb-8">
          <span className="text-4xl mb-4 block">🎓</span>
          <h2 className="text-3xl font-black text-white mb-2">Registro de Estudiante</h2>
          <p className="text-slate-400 text-sm">Crea tu perfil y postulate a las mejores vacantes</p>
        </div>
        {error && <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400 text-sm">❌ {error}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[{ name:'nombre', label:'Nombre', placeholder:'Juan' }, { name:'apellidos', label:'Apellidos', placeholder:'Garcia Lopez' }].map(({name,label,placeholder}) => (
              <div key={name}>
                <label className="block text-slate-400 text-sm mb-2">{label}</label>
                <input type="text" name={name} value={form[name]} onChange={handleChange}
                  placeholder={placeholder} required
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Correo universitario</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="matricula@universidad.edu.mx" required
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Contrasena</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                placeholder="••••••••••" required
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Confirmar contrasena</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} name="confirmar" value={form.confirmar} onChange={handleChange}
                placeholder="••••••••••" required
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 transition placeholder-slate-600" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-xs">🔒 La contrasena debe tener minimo 10 caracteres, mayuscula, minuscula, numero y caracter especial.</p>
          </div>
          <button type="submit" disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition mt-2">
            {cargando ? 'Registrando...' : 'Crear mi cuenta →'}
          </button>
        </form>
      </div>
    </div>
  );
}
