// ============================================================
// services/api.js - Cliente HTTP seguro con Axios
// ============================================================
import axios from 'axios';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

export const api = axios.create({
  baseURL:         process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// -- Interceptor de request: inyectar CSRF token --
api.interceptors.request.use(config => {
  const csrf = getCookie('csrf_access_token');
  if (csrf) {
    config.headers['X-CSRF-TOKEN'] = csrf;
  }
  return config;
});

// -- Interceptor de respuesta --
api.interceptors.response.use(
  response => response,
  async error => {
    const codigo = error.response?.data?.codigo;
    if (codigo === 'TOKEN_EXPIRED' || codigo === 'SESSION_EXPIRED') {
      window.dispatchEvent(new CustomEvent('sesion:expirada'));
    }
    if (codigo === 'SESSION_HIJACK_DETECTED') {
      window.dispatchEvent(new CustomEvent('sesion:hijack'));
    }
    return Promise.reject(error);
  }
);
