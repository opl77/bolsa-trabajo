// ============================================================
// hooks/useInactividad.js — Timeout de sesión en frontend
// ============================================================
import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const TIEMPO_INACTIVIDAD = 3 * 60 * 1000;   // 3 minutos
const TIEMPO_ADVERTENCIA  = 30 * 1000;        // Avisar 30 seg antes

export const useInactividad = () => {
  const navigate        = useNavigate();
  const timerAviso      = useRef(null);
  const timerLogout     = useRef(null);
  const cuentaRef       = useRef(null);
  const [mostrarAviso, setMostrarAviso]           = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(30);

  const limpiarTimers = useCallback(() => {
    clearTimeout(timerAviso.current);
    clearTimeout(timerLogout.current);
    clearInterval(cuentaRef.current);
  }, []);

  const cerrarSesion = useCallback(async (razon = 'inactividad') => {
    limpiarTimers();
    try {
      await api.delete('/auth/logout');
    } catch (_) {}
    localStorage.clear();
    navigate('/login', { state: { mensaje: `Sesión cerrada por ${razon}` } });
  }, [navigate, limpiarTimers]);

  const mostrarAdvertencia = useCallback(() => {
    setMostrarAviso(true);
    setSegundosRestantes(30);

    cuentaRef.current = setInterval(() => {
      setSegundosRestantes(prev => Math.max(prev - 1, 0));
    }, 1000);

    timerLogout.current = setTimeout(() => cerrarSesion(), TIEMPO_ADVERTENCIA);
  }, [cerrarSesion]);

  const reiniciarTimer = useCallback(async () => {
    limpiarTimers();
    setMostrarAviso(false);
    setSegundosRestantes(30);

    try {
      await api.post('/auth/refresh');
    } catch {
      cerrarSesion('token expirado');
      return;
    }

    timerAviso.current = setTimeout(
      mostrarAdvertencia,
      TIEMPO_INACTIVIDAD - TIEMPO_ADVERTENCIA
    );
  }, [limpiarTimers, mostrarAdvertencia, cerrarSesion]);

  useEffect(() => {
    const eventos = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    eventos.forEach(e => window.addEventListener(e, reiniciarTimer, { passive: true }));
    reiniciarTimer();

    return () => {
      limpiarTimers();
      eventos.forEach(e => window.removeEventListener(e, reiniciarTimer));
    };
  }, [reiniciarTimer, limpiarTimers]);

  return { mostrarAviso, segundosRestantes, reiniciarTimer, cerrarSesion };
};
