// ============================================================
// components/Chat.jsx — Chat en tiempo real con SocketIO
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

let socket = null;

function MensajeBurbuja({ mensaje, esPropio }) {
  const hora = new Date(mensaje.enviado_en).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className={`flex ${esPropio ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-xs lg:max-w-md group`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${esPropio
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-slate-700/80 text-slate-100 rounded-bl-md'
          }`}>
          {mensaje.contenido}
        </div>
        <p className={`text-xs text-slate-600 mt-1 ${esPropio ? 'text-right' : 'text-left'}`}>
          {hora} {esPropio && (mensaje.leido ? '✓✓' : '✓')}
        </p>
      </div>
    </div>
  );
}

export function ChatVentana({ postulacionId, nombreOtro, onCerrar, usuarioId }) {
  const [mensajes, setMensajes]   = useState([]);
  const [input, setInput]         = useState('');
  const [conectado, setConectado] = useState(false);
  const [cargando, setCargando]   = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Cargar historial
  useEffect(() => {
    api.get(`/chat/${postulacionId}`)
      .then(({ data }) => setMensajes(data))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [postulacionId]);

  // Conectar socket
  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000';

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setConectado(true);
      socket.emit('unirse_chat', { postulacion_id: postulacionId });
    });

    socket.on('disconnect', () => setConectado(false));

    socket.on('nuevo_mensaje', (msg) => {
      setMensajes(prev => {
        const yaExiste = prev.some(m => m.id === msg.id);
        return yaExiste ? prev : [...prev, msg];
      });
    });

    return () => {
      socket?.emit('salir_chat', { postulacion_id: postulacionId });
      socket?.disconnect();
    };
  }, [postulacionId]);

  // Auto-scroll al recibir mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const enviar = useCallback(() => {
    const texto = input.trim();
    if (!texto || !socket?.connected) return;

    // Optimistic update
    const msgTemp = {
      id: `temp_${Date.now()}`,
      emisor_id:  usuarioId,
      contenido:  texto,
      leido:      false,
      enviado_en: new Date().toISOString()
    };
    setMensajes(prev => [...prev, msgTemp]);
    setInput('');

    socket.emit('enviar_mensaje', {
      postulacion_id: postulacionId,
      contenido:      texto,
      emisor_id:      usuarioId
    });

    inputRef.current?.focus();
  }, [input, postulacionId, usuarioId]);

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  return (
    <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden"
      style={{ height: '500px' }}>

      {/* Header */}
      <div className="bg-slate-900/80 px-4 py-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {nombreOtro?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{nombreOtro}</p>
            <p className={`text-xs flex items-center gap-1 ${conectado ? 'text-green-400' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${conectado ? 'bg-green-400' : 'bg-slate-500'}`}/>
              {conectado ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
        </div>
        {onCerrar && (
          <button onClick={onCerrar} className="text-slate-400 hover:text-white transition text-xl">×</button>
        )}
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4">
        {cargando ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
          </div>
        ) : mensajes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm text-center">
            <div>
              <span className="text-3xl block mb-2">💬</span>
              <p>Inicia la conversación</p>
            </div>
          </div>
        ) : (
          <>
            {mensajes.map((msg) => (
              <MensajeBurbuja key={msg.id} mensaje={msg} esPropio={msg.emisor_id === usuarioId} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700 flex gap-2 items-end">
        <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..."
          rows={1} style={{ resize: 'none' }}
          className="flex-1 bg-slate-700/50 border border-slate-600 text-white rounded-xl
                     px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition placeholder-slate-500" />
        <button onClick={enviar} disabled={!input.trim() || !conectado}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-600
                     text-white p-2.5 rounded-xl transition shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}


// ── Lista de conversaciones ───────────────────────────────────
export function ListaChats({ postulaciones, usuarioId, rol }) {
  const [chatAbierto, setChatAbierto]         = useState(null);
  const [postulacionActiva, setPostulacionActiva] = useState(null);

  const abrirChat = (postulacion) => {
    setPostulacionActiva(postulacion);
    setChatAbierto(true);
  };

  const nombreOtro = (p) => rol === 'empresa'
    ? `${p.postulante?.nombre} ${p.postulante?.apellidos}`
    : p.vacante?.empresa;

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-6">💬 Mensajes</h2>

      {postulaciones.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <span className="text-5xl block mb-3">💬</span>
          <p>No tienes conversaciones aún</p>
          <p className="text-sm mt-1">Los chats se habilitan cuando una empresa acepta tu postulación</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {postulaciones.filter(p => p.estado === 'aceptada' || p.estado === 'en_revision').map(p => (
            <button key={p.id} onClick={() => abrirChat(p)}
              className="bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30
                         rounded-2xl p-4 text-left transition flex items-center gap-4 w-full">
              <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-bold shrink-0">
                {nombreOtro(p)?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{nombreOtro(p)}</p>
                <p className="text-slate-500 text-xs truncate">
                  {rol === 'empresa' ? p.vacante?.titulo : p.vacante?.titulo}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${
                p.estado === 'aceptada' ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                {p.estado}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Ventana de chat flotante */}
      {chatAbierto && postulacionActiva && (
        <div className="fixed bottom-6 right-6 w-96 z-40 shadow-2xl">
          <ChatVentana
            postulacionId={postulacionActiva.id}
            nombreOtro={nombreOtro(postulacionActiva)}
            usuarioId={usuarioId}
            onCerrar={() => setChatAbierto(false)} />
        </div>
      )}
    </div>
  );
}
