const { pool } = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function runSeed() {
  console.log('Iniciando la creación de tablas en la base de datos...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Crear tabla usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre_usuario VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        es_admin BOOLEAN DEFAULT FALSE,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tabla "usuarios" verificada/creada.');

    // 2. Crear tabla prestamos
    await client.query(`
      CREATE TABLE IF NOT EXISTS prestamos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        deudor VARCHAR(150) NOT NULL,
        capital_original NUMERIC(15,2) NOT NULL,
        capital_pendiente NUMERIC(15,2) NOT NULL,
        tasa_interes NUMERIC(5,2) NOT NULL DEFAULT 20.00,
        fecha_inicio DATE NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tabla "prestamos" verificada/creada.');

    // 3. Crear tabla abonos
    await client.query(`
      CREATE TABLE IF NOT EXISTS abonos (
        id SERIAL PRIMARY KEY,
        prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE CASCADE,
        monto NUMERIC(15,2) NOT NULL,
        tipo VARCHAR(10) CHECK (tipo IN ('interes','capital')),
        fecha DATE NOT NULL,
        nota TEXT,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tabla "abonos" verificada/creada.');

    // 4. Crear administrador inicial si se provee información
    const adminName = process.env.ADMIN_NAME || 'JOHAN HUERTAS';
    const adminUsername = process.env.ADMIN_USERNAME || 'stevenhm03@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Jh9@mN2sTy';

    if (adminName && adminUsername && adminPassword) {
      // Verificar si el usuario ya existe
      const userCheck = await client.query('SELECT * FROM usuarios WHERE username = $1', [adminUsername]);
      if (userCheck.rows.length === 0) {
        const hash = await bcrypt.hash(adminPassword, 10);
        await client.query(
          'INSERT INTO usuarios (nombre_usuario, username, password_hash, es_admin) VALUES ($1, $2, $3, $4)',
          [adminName, adminUsername, hash, true]
        );
        console.log(`Usuario administrador inicial "${adminUsername}" creado con éxito.`);
      } else {
        console.log(`El usuario administrador "${adminUsername}" ya existe en la base de datos.`);
      }
    } else {
      console.log('No se suministraron credenciales de ADMIN por variables de entorno para crear el usuario inicial.');
      console.log('Esperando a que el usuario provea sus datos en el chat para insertarlos manualmente en el script.');
    }

    await client.query('COMMIT');
    console.log('Base de datos inicializada de forma exitosa.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runSeed();
