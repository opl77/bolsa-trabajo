// ============================================================
// services/api.js — Cliente HTTP seguro con Axios
// ============================================================
import axios from 'axios';

export const api = axios.create({
  baseURL:          process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials:  true,        // Enviar cookies HttpOnly automáticamente
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Interceptor de respuesta ──────────────────────────────────
api.interceptors.response.use(
  response => response,
  async error => {
    const codigo = error.response?.data?.codigo;

    // Sesión expirada por inactividad
    if (codigo === 'TOKEN_EXPIRED' || codigo === 'SESSION_EXPIRED') {
      window.dispatchEvent(new CustomEvent('sesion:expirada'));
    }

    // Posible robo de sesión detectado
    if (codigo === 'SESSION_HIJACK_DETECTED') {
      window.dispatchEvent(new CustomEvent('sesion:hijack'));
    }

    return Promise.reject(error);
  }
);
