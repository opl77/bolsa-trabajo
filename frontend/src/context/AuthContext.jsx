// ============================================================
// context/AuthContext.jsx
// ============================================================
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null);
  const [cargando, setCargando] = useState(true);
  const refreshTimer = useRef(null);

  const iniciarRefresh = () => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    // Refrescar token cada 20 minutos
    refreshTimer.current = setInterval(async () => {
      try {
        await api.post('/auth/refresh');
      } catch (_) {
        setUsuario(null);
        if (refreshTimer.current) clearInterval(refreshTimer.current);
      }
    }, 20 * 60 * 1000);
  };

  const detenerRefresh = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  useEffect(() => {
    const verificar = async () => {
      try {
        const { data } = await api.get('/auth/sesion');
        if (data.sesion === 'activa') {
          setUsuario({ rol: data.rol });
          iniciarRefresh();
        }
      } catch (_) {
        setUsuario(null);
      } finally {
        setCargando(false);
      }
    };
    verificar();

    const onExpirada = () => { setUsuario(null); detenerRefresh(); };
    const onHijack   = () => {
      setUsuario(null);
      detenerRefresh();
      window.location.href = '/login';
    };
    window.addEventListener('sesion:expirada', onExpirada);
    window.addEventListener('sesion:hijack', onHijack);
    return () => {
      window.removeEventListener('sesion:expirada', onExpirada);
      window.removeEventListener('sesion:hijack', onHijack);
      detenerRefresh();
    };
  }, []);

  const login = (data) => {
    setUsuario({ rol: data.rol });
    iniciarRefresh();
  };

  const logout = async () => {
    try { await api.delete('/auth/logout'); } catch (_) {}
    setUsuario(null);
    detenerRefresh();
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
