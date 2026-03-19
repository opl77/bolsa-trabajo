// ============================================================
// context/AuthContext.jsx
// ============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Verificar sesión activa al cargar
  useEffect(() => {
    const verificar = async () => {
      try {
        const { data } = await api.get('/auth/sesion');
        if (data.sesion === 'activa') {
          setUsuario({ rol: data.rol });
        }
      } catch (_) {
        setUsuario(null);
      } finally {
        setCargando(false);
      }
    };
    verificar();

    // Escuchar eventos de seguridad
    const onExpirada = () => { setUsuario(null); };
    const onHijack   = () => {
      setUsuario(null);
      window.location.href = '/login';
    };
    window.addEventListener('sesion:expirada', onExpirada);
    window.addEventListener('sesion:hijack', onHijack);
    return () => {
      window.removeEventListener('sesion:expirada', onExpirada);
      window.removeEventListener('sesion:hijack', onHijack);
    };
  }, []);

  const login = (data) => setUsuario({ rol: data.rol });

  const logout = async () => {
    try { await api.delete('/auth/logout'); } catch (_) {}
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
