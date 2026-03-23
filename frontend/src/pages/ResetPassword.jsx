// ============================================================
// pages/ResetPassword.jsx - Recuperacion de contrasena
// ============================================================
import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [mensaje, setMensaje]   = useState('');
  const [error, setError]       = useState('');
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado]   = useState(false);

  const handleSolicitar = async e => {
    e.preventDefault();
    setError(''); setCargando(true);
    try {
      await api.post('/auth/recuperar-password', { email });
      setEnviado(true);
      setMensaje('Si el correo existe, recibiras instrucciones en tu bandeja.');
    } catch {
      setError('Error al procesar la solicitud');
    } finally { setCargando(false); }
  };

  const handleReset = async e => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Las contrasenas no coinciden'); return; }
    setCargando(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setMensaje('Contrasena actualizada correctamente.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al actualizar contrasena');
    } finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black">B</span>
          </div>
          <span className="text-white font-bold">BolsaUni</span>
        </div>

        {mensaje ? (
          <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
            <p className="text-green-400 text-lg mb-4">{mensaje}</p>
            <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm">
              Volver al login
            </Link>
          </div>
        ) : token ? (
          <>
            <h2 className="text-3xl font-black text-white mb-2">Nueva contrasena</h2>
            <p className="text-slate-400 mb-8">Ingresa tu nueva contrasena</p>
            {error && <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">X {error}</p>
            </div>}
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Nueva contrasena</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="Minimo 10 caracteres"
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Confirmar contrasena</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  required placeholder="Repite la contrasena"
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              </div>
              <p className="text-slate-500 text-xs">Minimo 10 caracteres, mayuscula, minuscula, numero y caracter especial.</p>
              <button type="submit" disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition">
                {cargando ? 'Actualizando...' : 'Actualizar contrasena'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-black text-white mb-2">Recuperar contrasena</h2>
            <p className="text-slate-400 mb-8">Ingresa tu correo y te enviaremos instrucciones</p>
            {error && <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">X {error}</p>
            </div>}
            {!enviado && (
              <form onSubmit={handleSolicitar} className="space-y-5">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Correo electronico</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="tu@correo.com"
                    className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
                </div>
                <button type="submit" disabled={cargando}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition">
                  {cargando ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </form>
            )}
            <div className="mt-6 text-center">
              <Link to="/login" className="text-slate-500 hover:text-slate-300 text-sm">Volver al login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
