# 🎓 BolsaUni — Bolsa de Trabajo Universitaria

Plataforma web completa y segura para conectar empresas con estudiantes universitarios.

## Stack
| Capa | Tecnología |
|---|---|
| Backend | Flask (Python) |
| Base de datos | MySQL 8.0 |
| Cache/Sesiones | Redis |
| Frontend | React + Tailwind CSS |
| Chat en tiempo real | Flask-SocketIO |
| Chatbot IA | Claude (Anthropic) |
| Archivos | Cloudinary |

## Seguridad implementada
- ✅ JWT con cookies HttpOnly + Secure + SameSite=Strict
- ✅ 2FA: TOTP (Google Authenticator) + OTP por email
- ✅ Timeout de sesión por inactividad (3 minutos)
- ✅ Detección de robo de cookies (fingerprinting + IP + país)
- ✅ Cifrado AES-256-GCM en datos sensibles de BD
- ✅ bcrypt (cost 12) en contraseñas
- ✅ Cifrado Fernet en archivos (CVs)
- ✅ Mensajes del chat cifrados en BD
- ✅ TLS 1.3 en producción (Nginx)
- ✅ Protección XSS (Bleach + DOMPurify)
- ✅ Protección SQL Injection (ORM exclusivo)
- ✅ CSRF (tokens + SameSite)
- ✅ Rate limiting en endpoints críticos
- ✅ Headers de seguridad (CSP, HSTS, X-Frame-Options)

## Instalación rápida con Docker
```bash
cp backend/.env.example backend/.env
# Edita backend/.env con tus valores reales
docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

## Instalación manual

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # editar .env
mysql -u root -p < schema.sql
python run.py
```

### Frontend
```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
npm start
```

## Roles
- **Admin** — valida empresas, ve estadísticas
- **Empresa** — publica vacantes, gestiona postulantes, chat
- **Postulante** — busca vacantes, crea CV, se postula, chat

## Módulos
- Autenticación segura con 2FA
- Constructor de CV con exportación a PDF
- Chat en tiempo real (SocketIO)
- Chatbot IA por rol (Claude API)
- Timeout de sesión con modal de advertencia
- Detección de robo de sesión
