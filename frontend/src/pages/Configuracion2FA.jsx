// ============================================================
// pages/Configuracion2FA.jsx — Configuración de autenticación de dos factores
// ============================================================
import { useState } from 'react';
import { api } from '../services/api';

// ── Paso 1: Elegir método ────────────────────────────────────
function ElegirMetodo({ onElegir }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm mb-6">
        El segundo factor de autenticación añade una capa extra de seguridad a tu cuenta.
        Cada vez que inicies sesión, necesitarás un código adicional.
      </p>

      <button onClick={() => onElegir('totp')}
        className="w-full bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50
                   rounded-2xl p-5 text-left transition group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
            📱
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold group-hover:text-blue-400 transition">
              App Autenticadora
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              Google Authenticator, Authy, Microsoft Authenticator
            </p>
            <p className="text-blue-400 text-xs mt-1">⭐ Más seguro · Funciona sin internet</p>
          </div>
          <span className="text-slate-600 group-hover:text-blue-400 transition text-xl">→</span>
        </div>
      </button>

      <button onClick={() => onElegir('email')}
        className="w-full bg-slate-800/50 border border-slate-700/50 hover:border-slate-500/50
                   rounded-2xl p-5 text-left transition group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center text-2xl shrink-0">
            📧
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold group-hover:text-slate-200 transition">
              Código por correo
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              Recibirás un código de 6 dígitos en tu correo registrado
            </p>
            <p className="text-slate-500 text-xs mt-1">Fácil de usar · Requiere acceso al correo</p>
          </div>
          <span className="text-slate-600 group-hover:text-slate-400 transition text-xl">→</span>
        </div>
      </button>
    </div>
  );
}

// ── Paso 2: Configurar TOTP ───────────────────────────────────
function ConfigurarTOTP({ onConfirmado, onCancelar }) {
  const [paso, setPaso]         = useState(1); // 1=QR, 2=verificar
  const [qrData, setQrData]     = useState(null);
  const [codigo, setCodigo]     = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  const generarQR = async () => {
    setCargando(true);
    try {
      const { data } = await api.post('/auth/2fa/activar-totp');
      setQrData(data);
      setPaso(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar QR');
    } finally { setCargando(false); }
  };

  const confirmar = async () => {
    if (codigo.length !== 6) return;
    setCargando(true);
    setError('');
    try {
      await api.post('/auth/2fa/confirmar-totp', { codigo });
      onConfirmado('totp');
    } catch (err) {
      setError(err.response?.data?.error || 'Código incorrecto');
    } finally { setCargando(false); }
  };

  return (
    <div>
      {paso === 1 && (
        <div className="text-center space-y-6">
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4">Instrucciones</h3>
            <ol className="text-slate-400 text-sm space-y-3 text-left">
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                Descarga <strong className="text-white">Google Authenticator</strong> o <strong className="text-white">Authy</strong> en tu celular
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                Presiona el botón para generar tu código QR
              </li>
              <li className="flex gap-3">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                Escanea el QR con la app y luego ingresa el código de 6 dígitos
              </li>
            </ol>
          </div>
          {error && <p className="text-red-400 text-sm">❌ {error}</p>}
          <div className="flex gap-3">
            <button onClick={onCancelar}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition">
              Cancelar
            </button>
            <button onClick={generarQR} disabled={cargando}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold py-3 rounded-xl transition">
              {cargando ? 'Generando...' : 'Generar código QR →'}
            </button>
          </div>
        </div>
      )}

      {paso === 2 && qrData && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-4">Escanea este código QR con tu app autenticadora</p>
            <div className="inline-block bg-white p-4 rounded-2xl">
              <img src={qrData.qr} alt="QR Code 2FA" className="w-48 h-48" />
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-500 text-xs mb-1">¿No puedes escanear? Ingresa este código manual:</p>
            <p className="text-white font-mono text-sm tracking-widest">{qrData.secreto}</p>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">Ingresa el código de 6 dígitos de la app</label>
            <input value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g,'').slice(0,6))}
              maxLength={6} placeholder="000000"
              className="w-full bg-slate-900/50 border border-slate-700 text-white text-center
                         text-2xl tracking-widest font-mono rounded-xl px-4 py-3
                         focus:outline-none focus:border-blue-500 transition" />
          </div>

          {error && <p className="text-red-400 text-sm text-center">❌ {error}</p>}

          <div className="flex gap-3">
            <button onClick={() => setPaso(1)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition">
              ← Atrás
            </button>
            <button onClick={confirmar} disabled={cargando || codigo.length < 6}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-semibold py-3 rounded-xl transition">
              {cargando ? 'Verificando...' : 'Confirmar y activar ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pantalla de éxito ─────────────────────────────────────────
function PantallaExito({ metodo, onCerrar }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
        <span className="text-4xl">🔐</span>
      </div>
      <div>
        <h3 className="text-xl font-black text-white mb-2">¡2FA activado!</h3>
        <p className="text-slate-400 text-sm">
          {metodo === 'totp'
            ? 'Tu cuenta ahora está protegida con Google Authenticator. La próxima vez que inicies sesión, necesitarás el código de tu app.'
            : 'Tu cuenta ahora está protegida con verificación por correo. La próxima vez que inicies sesión, recibirás un código.'}
        </p>
      </div>
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
        <p className="text-green-400 text-sm">
          ✅ A partir de ahora, ningún atacante podrá acceder a tu cuenta aunque tenga tu contraseña.
        </p>
      </div>
      <button onClick={onCerrar}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition">
        Perfecto, continuar
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Configuracion2FA({ onCerrar }) {
  const [paso, setPaso]     = useState('elegir');
  const [metodo, setMetodo] = useState(null);

  const elegirMetodo = (m) => {
    setMetodo(m);
    setPaso(m === 'totp' ? 'totp' : 'email_info');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg">

        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {paso === 'elegir'   && '🔐 Activar 2FA'}
              {paso === 'totp'     && '📱 App Autenticadora'}
              {paso === 'email_info' && '📧 2FA por Email'}
              {paso === 'exito'    && '✅ 2FA Activado'}
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Autenticación de dos factores</p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white transition text-xl">×</button>
        </div>

        <div className="p-6">
          {paso === 'elegir' && <ElegirMetodo onElegir={elegirMetodo} />}

          {paso === 'totp' && (
            <ConfigurarTOTP
              onConfirmado={(m) => { setMetodo(m); setPaso('exito'); }}
              onCancelar={() => setPaso('elegir')} />
          )}

          {paso === 'email_info' && (
            <div className="space-y-5">
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <span className="text-4xl block mb-3">📧</span>
                <p className="text-white font-semibold mb-2">2FA por correo electrónico</p>
                <p className="text-slate-400 text-sm">
                  Cada vez que inicies sesión, enviaremos un código de 6 dígitos a tu correo registrado. El código expira en 5 minutos.
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 text-sm">
                  ⚠️ Este método está activo por defecto. Para mayor seguridad, te recomendamos usar una app autenticadora.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPaso('elegir')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl transition">
                  Volver
                </button>
                <button onClick={() => elegirMetodo('totp')}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition">
                  Usar App Autenticadora ⭐
                </button>
              </div>
            </div>
          )}

          {paso === 'exito' && <PantallaExito metodo={metodo} onCerrar={onCerrar} />}
        </div>
      </div>
    </div>
  );
}
