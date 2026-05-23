# 💰 PrestamoExpress

Sistema de gestión de préstamos personales. Controla préstamos, abonos, intereses y caja desde cualquier dispositivo.

## 🚀 Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Deploy:** Railway

## ⚙️ Variables de entorno requeridas
Crea un archivo `.env` en la raíz con:

```
DATABASE_URL=tu_url_de_postgresql
JWT_SECRET=tu_secreto_minimo_32_caracteres
CLIENT_URL=http://localhost:5173
ADMIN_NAME=Tu Nombre
ADMIN_USERNAME=tu@email.com
ADMIN_PASSWORD=tu_password_seguro
PORT=5000
```

## 🛠️ Instalación local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/prestamoexpress.git
cd prestamoexpress

# Instalar dependencias
npm run install:all

# Iniciar en desarrollo
npm run dev
```

## 📦 Build para producción

```bash
npm run build
npm start
```
