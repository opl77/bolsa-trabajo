// ============================================================
// hooks/useInactividad.js - Timeout de sesion en frontend
// ============================================================
import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const TIEMPO_INACTIVIDAD = 25 * 60 * 1000;  // 25 minutos
const TIEMPO_ADVERTENCIA  = 60 * 1000;       // Avisar 60 seg antes
const DEBOUNCE_REFRESH    = 60 * 1000;       // Refresh maximo 1 vez por minuto

export const useInactividad = () => {
  const navigate             = useNavigate();
  const timerAviso           = useRef(null);
  const timerLogout          = useRef(null);
  const cuentaRef            = useRef(null);
  const ultimoRefresh        = useRef(0);
  const timerReinicio        = useRef(null);
  const [mostrarAviso, setMostrarAviso]           = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(60);

  const limpiarTimers = useCallback(() => {
    clearTimeout(timerAviso.current);
    clearTimeout(timerLogout.current);
    clearTimeout(timerReinicio.current);
    clearInterval(cuentaRef.current);
  }, []);

  const cerrarSesion = useCallback(async (razon = 'inactividad') => {
    limpiarTimers();
    try { await api.delete('/auth/logout'); } catch (_) {}
    localStorage.clear();
    navigate('/login', { state: { mensaje: `Sesion cerrada por ${razon}` } });
  }, [navigate, limpiarTimers]);

  const mostrarAdvertencia = useCallback(() => {
    setMostrarAviso(true);
    setSegundosRestantes(60);
    cuentaRef.current = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          clearInterval(cuentaRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    timerLogout.current = setTimeout(() => cerrarSesion(), TIEMPO_ADVERTENCIA);
  }, [cerrarSesion]);

  const programarTimers = useCallback(() => {
    clearTimeout(timerAviso.current);
    timerAviso.current = setTimeout(
      mostrarAdvertencia,
      TIEMPO_INACTIVIDAD - TIEMPO_ADVERTENCIA
    );
  }, [mostrarAdvertencia]);

  const reiniciarTimer = useCallback(() => {
    // Debounce: ignorar eventos si ya se reinicio hace menos de 5 segundos
    const ahora = Date.now();
    if (ahora - ultimoRefresh.current < 5000) return;
    ultimoRefresh.current = ahora;

    limpiarTimers();
    setMostrarAviso(false);
    setSegundosRestantes(60);
    programarTimers();

    // Refresh del token maximo 1 vez por minuto
    clearTimeout(timerReinicio.current);
    timerReinicio.current = setTimeout(async () => {
      try {
        await api.post('/auth/refresh');
      } catch {
        cerrarSesion('token expirado');
      }
    }, DEBOUNCE_REFRESH);
  }, [limpiarTimers, programarTimers, cerrarSesion]);

  useEffect(() => {
    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    eventos.forEach(e => window.addEventListener(e, reiniciarTimer, { passive: true }));
    programarTimers();
    return () => {
      limpiarTimers();
      eventos.forEach(e => window.removeEventListener(e, reiniciarTimer));
    };
  }, [reiniciarTimer, limpiarTimers, programarTimers]);

  return { mostrarAviso, segundosRestantes, reiniciarTimer, cerrarSesion };
};
