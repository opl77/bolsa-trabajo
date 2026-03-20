import os
from app import create_app, socketio, db

app = create_app()

with app.app_context():
    from app.models import Usuario, Empresa, Postulante, SesionActiva, IntentoLogin
    db.create_all()
    print('Tablas creadas exitosamente')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
