// ============================================================
// App.jsx â€” Enrutamiento principal con rutas protegidas
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// PÃ¡ginas
import Login from './pages/Login';
import RegistroEmpresa, { RegistroPostulante } from './pages/RegistroEmpresa';
import AdminDashboard    from './pages/admin/Dashboard';
import EmpresaDashboard  from './pages/empresa/Dashboard';
import PostulanteDashboard from './pages/postulante/Dashboard';
import Configuracion2FA from './pages/Configuracion2FA';
import ResetPassword from './pages/ResetPassword';

// â”€â”€ Ruta protegida por rol â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RutaProtegida({ children, rol }) {
  const { usuario, cargando } = useAuth();

  if (cargando) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"/>
    </div>
  );

  if (!usuario) return <Navigate to="/login" replace />;
  if (rol && usuario.rol !== rol) return <Navigate to={`/${usuario.rol}`} replace />;

  return children;
}

// â”€â”€ RedirecciÃ³n por rol al iniciar sesiÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RedirectPorRol() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  const destinos = { admin: '/admin', empresa: '/empresa', postulante: '/postulante' };
  return <Navigate to={destinos[usuario.rol] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* PÃºblicas */}
      <Route path="/login"               element={<Login />} />
      <Route path="/registro/empresa"    element={<RegistroEmpresa />} />
      <Route path="/registro/postulante" element={<RegistroPostulante />} />
      <Route path="/recuperar-password" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin */}
      <Route path="/admin" element={
        <RutaProtegida rol="admin"><AdminDashboard /></RutaProtegida>
      }/>

      {/* Empresa */}
      <Route path="/empresa" element={
        <RutaProtegida rol="empresa"><EmpresaDashboard /></RutaProtegida>
      }/>

      {/* Postulante */}
      <Route path="/postulante" element={
        <RutaProtegida rol="postulante"><PostulanteDashboard /></RutaProtegida>
      }/>

      {/* RaÃ­z â†’ redirige segÃºn rol */}
      <Route path="/" element={<RedirectPorRol />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

