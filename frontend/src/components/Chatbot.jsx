// ============================================================
// components/Chatbot.jsx
// Exporta: ModalInactividad, Chatbot
// ============================================================
import { useInactividad } from '../hooks/useInactividad';

export const ModalInactividad = () => {
  const { mostrarAviso, segundosRestantes, reiniciarTimer, cerrarSesion } = useInactividad();

  if (!mostrarAviso) return null;

  const porcentaje = (segundosRestantes / 30) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none"
              stroke={segundosRestantes <= 10 ? '#ef4444' : '#3b82f6'}
              strokeWidth="3"
              strokeDasharray={`${porcentaje} 100`}
              strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center
                           text-2xl font-bold text-gray-800">
            {segundosRestantes}
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-2">¿Sigues ahí?</h2>
        <p className="text-gray-500 mb-6 text-sm">
          Tu sesión se cerrará en{' '}
          <span className={`font-bold ${segundosRestantes <= 10 ? 'text-red-500' : 'text-blue-600'}`}>
            {segundosRestantes} segundos
          </span>{' '}
          por inactividad.
        </p>

        <button onClick={reiniciarTimer}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                     hover:bg-blue-700 transition mb-3">
          ✅ Continuar sesión
        </button>
        <button onClick={() => cerrarSesion('solicitud del usuario')}
          className="w-full text-gray-400 py-2 hover:text-gray-600 transition text-sm">
          Cerrar sesión ahora
        </button>
      </div>
    </div>
  );
};


// ============================================================
// components/Chatbot.jsx — Widget de chatbot IA
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

export const Chatbot = ({ rol }) => {
  const [abierto,   setAbierto]   = useState(false);
  const [mensajes,  setMensajes]  = useState([]);
  const [input,     setInput]     = useState('');
  const [cargando,  setCargando]  = useState(false);
  const bottomRef = useRef(null);

  const saludo = {
    empresa:    '¡Hola! Soy tu asistente de RRHH. ¿En qué te puedo ayudar hoy?',
    postulante: '¡Hola! Soy tu asistente de búsqueda de empleo. ¿Cómo te puedo ayudar?',
    admin:      '¡Hola! Soy el asistente administrativo. ¿En qué te ayudo?',
  };

  useEffect(() => {
    if (abierto && mensajes.length === 0) {
      setMensajes([{ rol: 'assistant', contenido: saludo[rol] || saludo.postulante }]);
    }
  }, [abierto]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const enviar = async () => {
    if (!input.trim() || cargando) return;

    const texto = input.trim();
    setInput('');
    setMensajes(prev => [...prev, { rol: 'user', contenido: texto }]);
    setCargando(true);

    try {
      // Historial de los últimos 10 mensajes (sin el saludo inicial)
      const historial = mensajes.slice(1).map(m => ({
        rol:      m.rol,
        contenido: m.contenido
      }));

      const { data } = await api.post('/chatbot/mensaje', {
        mensaje:   texto,
        historial: historial
      });

      setMensajes(prev => [...prev, { rol: 'assistant', contenido: data.respuesta }]);
    } catch (err) {
      setMensajes(prev => [...prev, {
        rol: 'assistant',
        contenido: 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.'
      }]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Ventana del chat */}
      {abierto && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200
                        flex flex-col" style={{ height: '480px' }}>
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-bold">IA</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Asistente Virtual</p>
                <p className="text-xs text-blue-200">Siempre disponible</p>
              </div>
            </div>
            <button onClick={() => setAbierto(false)}
              className="text-white hover:text-blue-200 transition text-xl">×</button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensajes.map((msg, i) => (
              <div key={i} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-xl text-sm leading-relaxed
                  ${msg.rol === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                  {msg.contenido}
                </div>
              </div>
            ))}
            {cargando && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-xl rounded-bl-none">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              rows={1}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button onClick={enviar} disabled={!input.trim() || cargando}
              className="bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700
                         disabled:opacity-50 disabled:cursor-not-allowed transition">
              →
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button onClick={() => setAbierto(!abierto)}
        className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg
                   hover:bg-blue-700 transition flex items-center justify-center text-2xl">
        {abierto ? '×' : '💬'}
      </button>
    </div>
  );
};
