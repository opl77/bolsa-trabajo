// ============================================================
// pages/Login.jsx — Página de inicio de sesión
// ============================================================
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  const [paso, setPaso]       = useState(1); // 1=credenciales, 2=2FA
  const [metodo2fa, setMetodo2fa] = useState('');
  const [form, setForm]       = useState({ email: '', password: '' });
  const [codigo2fa, setCodigo] = useState('');
  const [error, setError]     = useState('');
  const [cargando, setCargando] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const mensajeExterno = location.state?.mensaje;

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  // Paso 1: email + password
  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.requiere_2fa) {
        setMetodo2fa(data.metodo_2fa);
        setPaso(2);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  // Paso 2: código 2FA
  const handleVerificar2FA = async e => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/auth/verificar-2fa', { codigo: codigo2fa });
      login(data);
      const destinos = { admin: '/admin', empresa: '/empresa', postulante: '/postulante' };
      navigate(destinos[data.rol] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Código incorrecto');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Panel izquierdo decorativo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 flex-col justify-between p-12">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6366f1 0%, transparent 40%)' }}/>
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px),
            repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.03) 40px, rgba(255,255,255,0.03) 41px)`
        }}/>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-black">B</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">BolsaUni</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-6"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Conecta tu<br />
            <span className="text-blue-400">talento</span> con<br />
            oportunidades
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            La plataforma universitaria que une a estudiantes brillantes con las empresas que los buscan.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { num: '500+', label: 'Empresas' },
            { num: '12k', label: 'Estudiantes' },
            { num: '3.2k', label: 'Empleos' },
          ].map(({ num, label }) => (
            <div key={label} className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
              <p className="text-2xl font-black text-white">{num}</p>
              <p className="text-slate-400 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black">B</span>
            </div>
            <span className="text-white font-bold">BolsaUni</span>
          </div>

          {/* Alerta externa (sesión expirada, etc.) */}
          {mensajeExterno && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-amber-400 text-sm">⚠️ {mensajeExterno}</p>
            </div>
          )}

          {paso === 1 ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-black text-white mb-2">Bienvenido</h2>
                <p className="text-slate-400">Ingresa a tu cuenta para continuar</p>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">❌ {error}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Correo electrónico</label>
                  <input type="email" name="email" value={form.email}
                    onChange={handleChange} required
                    placeholder="tu@universidad.edu.mx"
                    className="w-full bg-slate-800/50 border border-slate-700 text-white
                               rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500
                               focus:ring-1 focus:ring-blue-500/50 transition placeholder-slate-600" />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Contraseña</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} name="password"
                      value={form.password} onChange={handleChange} required
                      placeholder="••••••••••"
                      className="w-full bg-slate-800/50 border border-slate-700 text-white
                                 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-blue-500
                                 focus:ring-1 focus:ring-blue-500/50 transition placeholder-slate-600" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={cargando}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800
                             text-white font-semibold py-3 rounded-xl transition duration-200
                             flex items-center justify-center gap-2">
                  {cargando ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Verificando...</>
                  ) : 'Iniciar sesión →'}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-800"/>
                <span className="text-slate-600 text-sm">¿No tienes cuenta?</span>
                <div className="flex-1 h-px bg-slate-800"/>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link to="/registro/empresa"
                  className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300
                             py-2.5 rounded-xl text-sm transition border border-slate-700">
                  🏢 Soy empresa
                </Link>
                <Link to="/registro/postulante"
                  className="text-center bg-slate-800 hover:bg-slate-700 text-slate-300
                             py-2.5 rounded-xl text-sm transition border border-slate-700">
                  🎓 Soy estudiante
                </Link>
              </div>
            </>
          ) : (
            /* Paso 2 — Verificar 2FA */
            <>
              <button onClick={() => setPaso(1)} className="text-slate-500 hover:text-slate-300 mb-6 flex items-center gap-1 text-sm">
                ← Volver
              </button>

              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">{metodo2fa === 'totp' ? '🔐' : '📧'}</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Verificación en dos pasos</h2>
                <p className="text-slate-400 text-sm">
                  {metodo2fa === 'totp'
                    ? 'Ingresa el código de tu app autenticadora'
                    : 'Ingresa el código que enviamos a tu correo'}
                </p>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm">❌ {error}</p>
                </div>
              )}

              <form onSubmit={handleVerificar2FA} className="space-y-5">
                <input type="text" value={codigo2fa} onChange={e => setCodigo(e.target.value)}
                  maxLength={6} placeholder="000000" required
                  className="w-full bg-slate-800/50 border border-slate-700 text-white text-center
                             text-3xl tracking-widest font-mono rounded-xl px-4 py-4
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50" />

                <button type="submit" disabled={cargando || codigo2fa.length < 6}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800
                             text-white font-semibold py-3 rounded-xl transition">
                  {cargando ? 'Verificando...' : 'Verificar código ✓'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
