const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('Advertencia: La variable de entorno DATABASE_URL no está definida. Se usará una configuración local por defecto.');
}

const isProduction = process.env.NODE_ENV === 'production' || 
                    (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));

const pool = new Pool({
  connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/prestamos_db',
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
