import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import zlib from 'zlib'
import db from './db.js'
import { authenticateToken, requireAdmin, JWT_SECRET } from './middleware/auth.js'
import { calcularIntereses, ahoraCol } from './utils/calcularIntereses.js'

// ==========================================
// VALIDACION DE VARIABLES DE ENTORNO AL ARRANQUE
// ==========================================
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL', 'FRONTEND_URL'];
for (const v of requiredEnvVars) {
  if (!process.env[v]) {
    console.error(`ERROR CRÍTICO: Variable de entorno ${v} no definida.`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('ERROR CRÍTICO: JWT_SECRET debe tener al menos 32 caracteres.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CABECERAS DE SEGURIDAD HTTP (reemplazo manual de helmet)
// ==========================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  next()
})

// ==========================================
// CORS RESTRICTIVO
// ==========================================
app.use(cors({
  origin: [
    'https://credialiado.digital',
    'https://www.credialiado.digital',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.options('*', cors())
app.use(express.json())

// ==========================================
// COMPRESION GZIP MANUAL (sin dependencias externas)
// ==========================================

app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) return next();

  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const json = JSON.stringify(data);
    if (json.length < 1024) return originalJson(data);

    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'application/json');
    zlib.gzip(json, (err, compressed) => {
      if (err) return originalJson(data);
      res.end(compressed);
    });
  };
  next();
});

// ==========================================
// CACHÉ EN MEMORIA PARA RESPUESTAS COSTOSAS
// ==========================================
const cache = new Map();

function cacheMiddleware(segundos) {
  return (req, res, next) => {
    const key = `${req.user?.id}_${req.path}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < segundos * 1000) {
      return res.json(cached.data);
    }
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      cache.set(key, { data, timestamp: Date.now() });
      return originalJson(data);
    };
    next();
  };
}

function invalidateCache(req, res, next) {
  cache.clear();
  next();
}

// ==========================================
// RATE LIMITING MANUAL (sin express-rate-limit)
// ==========================================
const rateLimitStore = new Map();

function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let record = rateLimitStore.get(key);

    if (!record || now - record.start > windowMs) {
      record = { count: 1, start: now };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    if (record.count > max) {
      return res.status(429).json({ mensaje: message });
    }
    next();
  };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Demasiadas solicitudes. Intente nuevamente más tarde.'
});

// ==========================================
// FUNCIÓN DE VALIDACIÓN MANUAL (sin express-validator)
// ==========================================
function validar(campos) {
  return (req, res, next) => {
    const errores = [];
    for (const [campo, reglas] of Object.entries(campos)) {
      const valor = req.body[campo];
      if (reglas.requerido && (valor === undefined || valor === null || String(valor).trim() === '')) {
        errores.push({ campo, mensaje: `El campo "${campo}" es requerido.` });
        continue;
      }
      if (valor === undefined || valor === null) continue;
      if (reglas.tipo === 'numero') {
        const n = parseFloat(valor);
        if (isNaN(n) || n <= 0) {
          errores.push({ campo, mensaje: `El campo "${campo}" debe ser un número positivo.` });
        } else if (reglas.max !== undefined && n > reglas.max) {
          errores.push({ campo, mensaje: `El campo "${campo}" no puede superar ${reglas.max}.` });
        } else if (reglas.min !== undefined && n < reglas.min) {
          errores.push({ campo, mensaje: `El campo "${campo}" no puede ser menor a ${reglas.min}.` });
        }
      }
      if (reglas.tipo === 'string') {
        const str = String(valor).trim();
        if (reglas.maxLength && str.length > reglas.maxLength) {
          errores.push({ campo, mensaje: `El campo "${campo}" no puede superar ${reglas.maxLength} caracteres.` });
        }
      }
      if (reglas.enum && !reglas.enum.includes(valor)) {
        errores.push({ campo, mensaje: `El campo "${campo}" debe ser uno de: ${reglas.enum.join(', ')}.` });
      }
      if (reglas.tipo === 'fecha') {
        const d = new Date(valor);
        if (isNaN(d.getTime())) {
          errores.push({ campo, mensaje: `El campo "${campo}" debe ser una fecha válida.` });
        }
      }
    }
    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }
    next();
  };
}

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA DE BASE DE DATOS
// ==========================================
async function initializeDatabase() {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS grupos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre_usuario VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        es_admin BOOLEAN DEFAULT FALSE,
        grupo_id INTEGER REFERENCES grupos(id) ON DELETE SET NULL,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);

    try {
      await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES grupos(id) ON DELETE SET NULL;');
    } catch (e) {
      // Ignorar si ya existe
    }

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS transacciones_caja (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE CASCADE,
        abono_id INTEGER REFERENCES abonos(id) ON DELETE CASCADE,
        monto NUMERIC(15,2) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        descripcion TEXT NOT NULL,
        fecha DATE NOT NULL,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tabla de clientes
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nombre VARCHAR(150) NOT NULL,
        telefono VARCHAR(20),
        email VARCHAR(100),
        documento VARCHAR(30),
        notas TEXT,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migración: agregar cliente_id y concepto a prestamos
    try {
      await client.query(`
        ALTER TABLE prestamos 
        ADD COLUMN IF NOT EXISTS cliente_id 
        INTEGER REFERENCES clientes(id) ON DELETE SET NULL
      `);
    } catch (e) { /* ignorar si ya existe */ }

    try {
      await client.query(`
        ALTER TABLE prestamos
        ADD COLUMN IF NOT EXISTS concepto TEXT
      `);
    } catch (e) { /* ignorar si ya existe */ }

    // Crear admin inicial si no existe
    const adminName = process.env.ADMIN_NAME || 'JOHAN HUERTAS';
    const adminUsername = process.env.ADMIN_USERNAME || 'stevenhm03@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Jh9@mN2sTy';

    const userCheck = await client.query('SELECT id FROM usuarios WHERE username = $1', [adminUsername]);
    if (userCheck.rows.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        'INSERT INTO usuarios (nombre_usuario, username, password_hash, es_admin) VALUES ($1, $2, $3, $4)',
        [adminName, adminUsername, hash, true]
      );
      console.log(`✅ Admin "${adminUsername}" creado automáticamente.`);
    } else {
      console.log(`ℹ️ Admin "${adminUsername}" ya existe.`);
    }

    await client.query('COMMIT');
    console.log('✅ Base de datos inicializada correctamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al inicializar la base de datos:', error);
  } finally {
    client.release();
  }
}

// --- Helper: IDs Compartidos ---
async function getSharedUserIds(userId, client = db) {
  const userResult = await client.query('SELECT grupo_id FROM usuarios WHERE id = $1', [userId]);
  const grupoId = userResult.rows[0]?.grupo_id;
  
  if (grupoId) {
    const groupUsers = await client.query('SELECT id FROM usuarios WHERE grupo_id = $1', [grupoId]);
    return groupUsers.rows.map(u => u.id);
  }
  return [userId];
}


// ==========================================
// RATE LIMITING GENERAL PARA TODAS LAS RUTAS /api/
// ==========================================
app.use('/api/', apiLimiter);

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

// POST /api/auth/login -> Login de usuario (con rate limiting y validación)
app.post('/api/auth/login', loginLimiter, validar({
  username: { requerido: true, tipo: 'string', maxLength: 100 },
  password: { requerido: true, tipo: 'string', maxLength: 100 }
}), async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM usuarios WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
    }
    
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, nombre_usuario: user.nombre_usuario, es_admin: user.es_admin, grupo_id: user.grupo_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      usuario: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        username: user.username,
        es_admin: user.es_admin,
        grupo_id: user.grupo_id
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error en el servidor.' });
  }
});

// POST /api/auth/register -> Crear usuario (SOLO ACCESIBLE POR ADMINS)
app.post('/api/auth/register', authenticateToken, requireAdmin, async (req, res) => {
  const { nombre_usuario, username, password, es_admin, grupo_id } = req.body;
  
  if (!nombre_usuario || !username || !password) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  try {
    const userExists = await db.query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ mensaje: 'El nombre de usuario ya está registrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO usuarios (nombre_usuario, username, password_hash, es_admin, grupo_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre_usuario, username, es_admin, grupo_id',
      [nombre_usuario, username, passwordHash, !!es_admin, grupo_id || null]
    );

    res.status(201).json({
      mensaje: 'Usuario registrado con éxito.',
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ mensaje: 'Error en el servidor al registrar usuario.' });
  }
});


// ==========================================
// RUTAS DE GESTIÓN DE GRUPOS Y USUARIOS (ADMIN)
// ==========================================

// GET /api/grupos
app.get('/api/grupos', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const grupos = await db.query('SELECT * FROM grupos ORDER BY creado_en DESC');
    const gruposConMiembros = await Promise.all(
      grupos.rows.map(async (grupo) => {
        const miembros = await db.query(
          'SELECT id, nombre_usuario, username, es_admin FROM usuarios WHERE grupo_id = $1 ORDER BY nombre_usuario',
          [grupo.id]
        );
        return { ...grupo, miembros: miembros.rows };
      })
    );
    res.json(gruposConMiembros);
  } catch (error) {
    console.error('Error al obtener grupos:', error);
    res.status(500).json({ mensaje: 'Error al obtener grupos.' });
  }
});

// POST /api/grupos
app.post('/api/grupos', authenticateToken, requireAdmin, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ mensaje: 'El nombre del grupo es obligatorio.' });
  }
  try {
    const result = await db.query('INSERT INTO grupos (nombre) VALUES ($1) RETURNING *', [nombre.trim()]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear grupo:', error);
    res.status(500).json({ mensaje: 'Error al crear grupo.' });
  }
});

// DELETE /api/grupos/:id
app.delete('/api/grupos/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE usuarios SET grupo_id = NULL WHERE grupo_id = $1', [id]);
    const result = await db.query('DELETE FROM grupos WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Grupo no encontrado.' });
    }
    res.json({ mensaje: 'Grupo eliminado. Los usuarios ahora tienen cuenta individual.' });
  } catch (error) {
    console.error('Error al eliminar grupo:', error);
    res.status(500).json({ mensaje: 'Error al eliminar grupo.' });
  }
});

// GET /api/usuarios
app.get('/api/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.nombre_usuario, u.username, u.es_admin, u.grupo_id, g.nombre as grupo_nombre
       FROM usuarios u
       LEFT JOIN grupos g ON u.grupo_id = g.id
       ORDER BY u.nombre_usuario`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ mensaje: 'Error al obtener usuarios.' });
  }
});

// PUT /api/usuarios/:id/grupo
app.put('/api/usuarios/:id/grupo', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { grupo_id } = req.body;
  try {
    const userCheck = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    if (grupo_id !== null && grupo_id !== undefined) {
      const grupoCheck = await db.query('SELECT id FROM grupos WHERE id = $1', [grupo_id]);
      if (grupoCheck.rows.length === 0) {
        return res.status(404).json({ mensaje: 'Grupo no encontrado.' });
      }
    }
    await db.query('UPDATE usuarios SET grupo_id = $1 WHERE id = $2', [grupo_id !== undefined ? grupo_id : null, id]);
    res.json({ mensaje: grupo_id ? 'Usuario asignado al grupo.' : 'Usuario removido del grupo (cuenta individual).' });
  } catch (error) {
    console.error('Error al actualizar grupo del usuario:', error);
    res.status(500).json({ mensaje: 'Error al actualizar grupo del usuario.' });
  }
});

// DELETE /api/usuarios/:id
app.delete('/api/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const userCheck = await db.query('SELECT id FROM usuarios WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    }
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ mensaje: 'No puedes eliminarte a ti mismo.' });
    }
    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ mensaje: 'Usuario eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ mensaje: 'Error al eliminar usuario.' });
  }
});


// ==========================================
// RUTAS DE CLIENTES (DEUDORES)
// ==========================================

// GET /api/deudores -> Obtener lista de nombres únicos de deudores del usuario
app.get('/api/deudores', authenticateToken, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const result = await db.query(
      'SELECT DISTINCT deudor FROM prestamos WHERE usuario_id = ANY($1) ORDER BY deudor ASC',
      [userIds]
    );
    res.json(result.rows.map(row => row.deudor));
  } catch (error) {
    console.error('Error al obtener deudores:', error);
    res.status(500).json({ mensaje: 'Error al obtener lista de clientes.' });
  }
});

// GET /api/clientes -> Listar clientes del usuario (con deuda total + intereses)
app.get('/api/clientes', authenticateToken, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const result = await db.query(
      `SELECT c.*, 
        COUNT(DISTINCT p.id) as total_prestamos,
        COALESCE(SUM(p.capital_pendiente), 0) as deuda_capital
       FROM clientes c
       LEFT JOIN prestamos p ON p.cliente_id = c.id AND p.activo = TRUE
       WHERE c.usuario_id = ANY($1)
       GROUP BY c.id
       ORDER BY c.nombre ASC`,
      [userIds]
    );

    // Calcular intereses pendientes en tiempo real para cada cliente
    const prestamos = await db.query(
      'SELECT * FROM prestamos WHERE usuario_id = ANY($1) AND activo = TRUE AND cliente_id IS NOT NULL',
      [userIds]
    );

    const interesesPorCliente = {};
    await Promise.all(prestamos.rows.map(async (loan) => {
      const abonosRes = await db.query(
        'SELECT monto, tipo, fecha FROM abonos WHERE prestamo_id = $1',
        [loan.id]
      );
      try {
        const calculo = calcularIntereses(loan, abonosRes.rows);
        const cid = loan.cliente_id;
        if (!interesesPorCliente[cid]) interesesPorCliente[cid] = 0;
        interesesPorCliente[cid] += calculo.interes_pendiente;
      } catch (e) {}
    }));

    const clientes = result.rows.map(c => ({
      ...c,
      deuda_intereses: interesesPorCliente[c.id] || 0,
    }));

    res.json(clientes);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener clientes.' });
  }
});

// POST /api/clientes -> Crear cliente
app.post('/api/clientes', authenticateToken, async (req, res) => {
  const { nombre, telefono, descripcion } = req.body;
  if (!nombre?.trim()) {
    return res.status(400).json({ mensaje: 'El nombre es requerido.' });
  }
  if (!telefono?.trim()) {
    return res.status(400).json({ mensaje: 'El teléfono es requerido.' });
  }
  try {
    const result = await db.query(
      `INSERT INTO clientes 
        (usuario_id, nombre, telefono, notas)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, nombre.trim(), telefono.trim(),
       descripcion?.trim() || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear cliente:', error);
    res.status(500).json({ mensaje: 'Error al crear cliente.' });
  }
});

// PUT /api/clientes/:id -> Actualizar cliente
app.put('/api/clientes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, descripcion } = req.body;
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const result = await db.query(
      `UPDATE clientes 
       SET nombre=$1, telefono=$2, notas=$3
       WHERE id=$4 AND usuario_id = ANY($5) RETURNING *`,
      [nombre, telefono||null,
       descripcion||null, id, userIds]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ mensaje: 'Cliente no encontrado.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ mensaje: 'Error al actualizar cliente.' });
  }
});

// DELETE /api/clientes/:id -> Eliminar cliente
app.delete('/api/clientes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const userIds = await getSharedUserIds(req.user.id);
    await db.query(
      'UPDATE prestamos SET cliente_id = NULL WHERE cliente_id = $1',
      [id]
    );
    const result = await db.query(
      'DELETE FROM clientes WHERE id=$1 AND usuario_id=ANY($2) RETURNING id',
      [id, userIds]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ mensaje: 'Cliente no encontrado.' });
    res.json({ mensaje: 'Cliente eliminado.' });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ mensaje: 'Error al eliminar cliente.' });
  }
});

// GET /api/clientes/:id/estado-cuenta -> HTML imprimible / PDF vía navegador
app.get('/api/clientes/:id/estado-cuenta', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const userIds = await getSharedUserIds(req.user.id);

    const clienteRes = await db.query(
      'SELECT * FROM clientes WHERE id=$1 AND usuario_id=ANY($2)',
      [id, userIds]
    );
    if (clienteRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Cliente no encontrado.' });
    const cliente = clienteRes.rows[0];

    const prestamosRes = await db.query(
      'SELECT * FROM prestamos WHERE cliente_id=$1 ORDER BY fecha_inicio ASC',
      [id]
    );
    const prestamos = prestamosRes.rows;

    const abonosRes = await db.query(
      `SELECT a.*, p.concepto
       FROM abonos a
       JOIN prestamos p ON a.prestamo_id = p.id
       WHERE p.cliente_id = $1
       ORDER BY a.fecha ASC`,
      [id]
    );
    const abonos = abonosRes.rows;

    const deudaOriginal = prestamos.reduce(
      (s, p) => s + parseFloat(p.capital_original), 0
    );
    const deudaRestante = prestamos
      .filter(p => p.activo)
      .reduce((s, p) => s + parseFloat(p.capital_pendiente), 0);

    // Calcular intereses pendientes en tiempo real
    let interesesPendientes = 0;
    for (const p of prestamos.filter(p => p.activo)) {
      try {
        const abonosP = abonos.filter(a => a.prestamo_id === p.id);
        const calculo = calcularIntereses(p, abonosP);
        interesesPendientes += calculo.interes_pendiente;
      } catch (e) {}
    }
    const deudaTotal = deudaRestante + interesesPendientes;

    const hoy = ahoraCol().toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const filas = abonos.map((a, i) => `
      <tr style="background:${i%2===0?'#f8fafc':'#ffffff'}">
        <td>${new Date(a.fecha).toLocaleDateString('es-CO')}</td>
        <td>${a.nota || (a.tipo==='capital' ? 'Pago' : 'Interés')}</td>
        <td>${a.tipo==='capital' ? 'Abono capital' : 'Abono interés'}</td>
        <td style="text-align:right;font-weight:600;">
          $${parseFloat(a.monto).toLocaleString('es-CO')}
        </td>
      </tr>
    `).join('');

    const conceptos = prestamos
      .filter(p => p.concepto)
      .map(p => `<p><strong>Concepto:</strong> ${p.concepto}</p>`)
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Estado de Cuenta - ${cliente.nombre}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      padding: 40px;
      max-width: 700px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 22px;
      color: #1e3a5f;
      letter-spacing: 0.05em;
    }
    .header .fecha {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .seccion { margin-bottom: 24px; }
    .seccion h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1e3a5f;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .seccion p {
      margin-bottom: 4px;
      font-size: 13px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    thead tr { background: #1e3a5f; color: #ffffff; }
    thead th {
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    tbody td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tbody tr:last-child td { border-bottom: none; }
    .sin-movimientos {
      text-align: center;
      color: #94a3b8;
      padding: 20px;
      font-style: italic;
    }
    .total-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
    }
    .total-box .label {
      font-size: 13px;
      color: #0369a1;
      font-weight: 600;
    }
    .total-box .monto {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }
    .pie {
      margin-top: 40px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
    .btn-imprimir {
      display: block;
      margin: 0 auto 32px;
      padding: 12px 32px;
      background: #1e3a5f;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.02em;
    }
    .btn-imprimir:hover { background: #2d5a9e; }
    @media print {
      .btn-imprimir { display: none !important; }
      body { padding: 20px; }
      .total-box { border: 1px solid #000 !important; background: #fff !important; }
    }
  </style>
</head>
<body>
  <button class="btn-imprimir" onclick="window.print()">
    🖨️ Imprimir / Guardar como PDF
  </button>
  <div class="header">
    <h1>ESTADO DE CUENTA</h1>
    <p class="fecha">${hoy}</p>
  </div>
  <div class="seccion">
    <h2>Información</h2>
    <p><strong>Nombre:</strong> ${cliente.nombre}</p>
    ${cliente.documento ? `<p><strong>Documento:</strong> ${cliente.documento}</p>` : ''}
    ${cliente.telefono ? `<p><strong>Teléfono:</strong> ${cliente.telefono}</p>` : ''}
    ${conceptos}
    <p><strong>Deuda original:</strong> $${deudaOriginal.toLocaleString('es-CO')}</p>
    ${prestamos[0] ? `<p><strong>Fecha de creación:</strong> ${new Date(prestamos[0].fecha_inicio).toLocaleDateString('es-CO')}</p>` : ''}
  </div>
  <div class="seccion">
    <h2>Movimientos</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Concepto</th>
          <th>Tipo</th>
          <th style="text-align:right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${filas || '<tr><td colspan="4" class="sin-movimientos">Sin movimientos registrados</td></tr>'}
      </tbody>
    </table>
  </div>
  <div class="total-box">
    <div>
      <span class="label">Total por pagar (capital + intereses)</span>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">
        Capital: $${deudaRestante.toLocaleString('es-CO')} | Intereses: $${interesesPendientes.toLocaleString('es-CO')}
      </div>
    </div>
    <span class="monto">$${deudaTotal.toLocaleString('es-CO')}</span>
  </div>
  <div class="pie">
    Documento generado automáticamente por PrestamoExpress
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    console.error('Error al generar estado de cuenta:', error);
    res.status(500).json({ mensaje: 'Error al generar estado de cuenta.' });
  }
});

// ==========================================
// RUTAS DE PRÉSTAMOS
// ==========================================

// GET /api/prestamos -> Listar préstamos del usuario autenticado con cálculos de negocio en tiempo real
app.get('/api/prestamos', authenticateToken, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const prestamosRes = await db.query(
      `SELECT p.*, c.telefono as cliente_telefono
       FROM prestamos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       WHERE p.usuario_id = ANY($1)
       ORDER BY p.creado_en DESC`,
      [userIds]
    );
    
    const prestamos = prestamosRes.rows;
    
    // Obtener abonos asociados para realizar cálculos en lote
    const prestamosCalculados = await Promise.all(
      prestamos.map(async (loan) => {
        const abonosRes = await db.query(
          'SELECT monto, tipo, fecha FROM abonos WHERE prestamo_id = $1',
          [loan.id]
        );
        
        const abonos = abonosRes.rows;

        let calculo;
        try {
          calculo = calcularIntereses(loan, abonos);
        } catch (e) {
          console.error('Error calculando interés para préstamo', loan.id, e);
          calculo = {
            capital_original: parseFloat(loan.capital_original),
            capital_pendiente: parseFloat(loan.capital_pendiente),
            tasa_interes: parseFloat(loan.tasa_interes),
            interes_mensual_actual: 0,
            total_intereses_generados: 0,
            total_intereses_pagados: 0,
            interes_pendiente: 0,
            total_abonado_capital: 0,
            dias_transcurridos: 0,
            tiempo_texto: 'Sin calcular',
            proximo_vencimiento: 'Sin calcular',
            dias_para_vencer: 0,
            desglose: []
          };
        }
        
        return {
          ...loan,
          capital_original: calculo.capital_original,
          capital_pendiente: calculo.capital_pendiente,
          tasa_interes: calculo.tasa_interes,
          dias_transcurridos: calculo.dias_transcurridos,
          interes_mensual: calculo.interes_mensual_actual,
          interes_acumulado: calculo.total_intereses_generados,
          interes_pendiente: calculo.interes_pendiente,
          tiempo_texto: calculo.tiempo_texto,
          proximo_vencimiento: calculo.proximo_vencimiento,
          dias_para_vencer: calculo.dias_para_vencer,
          total_abonado_interes: calculo.total_intereses_pagados,
          total_abonado_capital: calculo.total_abonado_capital
        };
      })
    );
    
    res.json(prestamosCalculados);
  } catch (error) {
    console.error('Error al obtener préstamos:', error);
    res.status(500).json({ mensaje: 'Error al obtener préstamos.' });
  }
});

// POST /api/prestamos -> Crear préstamo (con validación)
app.post('/api/prestamos', apiLimiter, authenticateToken, invalidateCache, validar({
  deudor: { requerido: true, tipo: 'string', maxLength: 150 },
  capital_original: { requerido: true, tipo: 'numero' },
  tasa_interes: { requerido: false, tipo: 'numero', max: 100, min: 0 },
  fecha_inicio: { requerido: true, tipo: 'fecha' }
}), async (req, res) => {
  const { deudor, capital_original, tasa_interes, fecha_inicio, cliente_id, concepto } = req.body;

  const tasa = tasa_interes !== undefined ? parseFloat(tasa_interes) : 20.00;
  const montoPrestamo = parseFloat(capital_original);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener saldo actual en caja (compartido por grupo)
    const userIds = await getSharedUserIds(req.user.id, client);
    const saldoRes = await client.query(
      'SELECT COALESCE(SUM(monto), 0) AS saldo FROM transacciones_caja WHERE usuario_id = ANY($1)',
      [userIds]
    );
    const saldoCaja = parseFloat(saldoRes.rows[0].saldo);

    if (saldoCaja < montoPrestamo) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        mensaje: `Saldo insuficiente en caja para realizar este préstamo. Disponible: $${saldoCaja.toLocaleString('es-CO')}` 
      });
    }

    // 2. Insertar el préstamo
    const result = await client.query(
      `INSERT INTO prestamos (usuario_id, deudor, capital_original, capital_pendiente, tasa_interes, fecha_inicio, activo, cliente_id, concepto) 
       VALUES ($1, $2, $3, $3, $4, $5, TRUE, $6, $7) RETURNING *`,
      [req.user.id, deudor, montoPrestamo, tasa, fecha_inicio, cliente_id || null, concepto || null]
    );
    const nuevoPrestamo = result.rows[0];

    // 3. Registrar el egreso en caja
    await client.query(
      `INSERT INTO transacciones_caja (usuario_id, prestamo_id, monto, tipo, descripcion, fecha)
       VALUES ($1, $2, $3, 'prestamo', $4, $5)`,
      [req.user.id, nuevoPrestamo.id, -montoPrestamo, `Préstamo otorgado a ${deudor}`, fecha_inicio]
    );
    
    await client.query('COMMIT');
    res.status(201).json(nuevoPrestamo);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear préstamo:', error);
    res.status(500).json({ mensaje: 'Error al crear préstamo.' });
  } finally {
    client.release();
  }
});


// PATCH /api/prestamos/reparar/:uid -> Reparar préstamos huérfanos (admin)
app.patch('/api/prestamos/reparar/:uid', authenticateToken, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  try {
    const result = await db.query(
      "UPDATE prestamos SET usuario_id = $1 WHERE usuario_id IS NULL RETURNING id",
      [parseInt(uid)]
    );
    res.json({
      mensaje: `Préstamos reparados: ${result.rows.length}`,
      reparados: result.rows.length
    });
  } catch (error) {
    console.error('Error al reparar préstamos:', error);
    res.status(500).json({ mensaje: 'Error al reparar préstamos.' });
  }
});

// PUT /api/prestamos/:id -> Editar préstamo
app.put('/api/prestamos/:id', authenticateToken, invalidateCache, async (req, res) => {
  const { id } = req.params;
  const { deudor, capital_original, tasa_interes, fecha_inicio, capital_pendiente, activo, concepto } = req.body;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verificar que el préstamo pertenece al grupo del usuario
    const userIds = await getSharedUserIds(req.user.id, client);
    const loanCheck = await client.query('SELECT * FROM prestamos WHERE id = $1 AND usuario_id = ANY($2)', [id, userIds]);
    if (loanCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
    }
    
    const oldOriginal = parseFloat(loanCheck.rows[0].capital_original);
    const oldPendiente = parseFloat(loanCheck.rows[0].capital_pendiente);
    
    const newOriginal = parseFloat(capital_original);
    const diferencia = newOriginal - oldOriginal;
    
    // Si se proporciona capital_pendiente explícitamente, usarlo
    const newPendiente = capital_pendiente !== undefined
      ? Math.max(0, parseFloat(capital_pendiente))
      : Math.max(0, oldPendiente + diferencia);
    
    const esActivo = activo !== undefined ? !!activo : newPendiente > 0;
    
    // Si incrementa el préstamo (y no se dio capital_pendiente explícito), verificar fondos en caja del grupo
    if (diferencia > 0 && capital_pendiente === undefined) {
      const saldoRes = await client.query(
        'SELECT COALESCE(SUM(monto), 0) AS saldo FROM transacciones_caja WHERE usuario_id = ANY($1)',
        [userIds]
      );
      const saldoCaja = parseFloat(saldoRes.rows[0].saldo);
      if (saldoCaja < diferencia) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          mensaje: `Saldo insuficiente en caja para ampliar el préstamo. Requiere $${diferencia.toLocaleString('es-CO')} adicionales.` 
        });
      }
    }

    await client.query(
      `UPDATE prestamos 
       SET deudor = $1, capital_original = $2, capital_pendiente = $3, tasa_interes = $4, fecha_inicio = $5, activo = $6, concepto = COALESCE($7, concepto)
       WHERE id = $8`,
      [deudor, newOriginal, newPendiente, parseFloat(tasa_interes), fecha_inicio, esActivo, concepto || null, id]
    );

    // Actualizar la transacción en caja correspondiente
    await client.query(
      `UPDATE transacciones_caja 
       SET monto = $1, descripcion = $2, fecha = $3
       WHERE prestamo_id = $4 AND tipo = 'prestamo'`,
      [-newOriginal, `Préstamo otorgado a ${deudor} (Modificado)`, fecha_inicio, id]
    );
    
    await client.query('COMMIT');
    const updated = await db.query('SELECT * FROM prestamos WHERE id = $1', [id]);
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al editar préstamo:', error);
    res.status(500).json({ mensaje: 'Error al editar préstamo.' });
  } finally {
    client.release();
  }
});

// DELETE /api/prestamos/:id -> Eliminar préstamo
app.delete('/api/prestamos/:id', authenticateToken, invalidateCache, async (req, res) => {
  const { id } = req.params;
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const result = await db.query('DELETE FROM prestamos WHERE id = $1 AND usuario_id = ANY($2) RETURNING id', [id, userIds]);
    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
    }
    res.json({ mensaje: 'Préstamo eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar préstamo:', error);
    res.status(500).json({ mensaje: 'Error al eliminar préstamo.' });
  }
});

// GET /api/prestamos/:id/estado-cuenta -> HTML imprimible de un préstamo individual
app.get('/api/prestamos/:id/estado-cuenta', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const loanRes = await db.query(
      'SELECT * FROM prestamos WHERE id=$1 AND usuario_id=ANY($2)',
      [id, userIds]
    );
    if (loanRes.rows.length === 0)
      return res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
    const loan = loanRes.rows[0];

    const abonosRes = await db.query(
      'SELECT * FROM abonos WHERE prestamo_id=$1 ORDER BY fecha ASC',
      [id]
    );
    const abonos = abonosRes.rows;

    const totalAbonoCapital = abonos
      .filter(a => a.tipo === 'capital')
      .reduce((sum, a) => sum + parseFloat(a.monto), 0);

    const deudaOriginal = parseFloat(loan.capital_original);
    const deudaRestante = Math.max(0, deudaOriginal - totalAbonoCapital);

    const calculo = calcularIntereses(loan, abonos);
    const interesPendiente = calculo.interes_pendiente;

    const hoy = ahoraCol().toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const filas = abonos.map((a, i) => `
      <tr style="background:${i%2===0?'#f8fafc':'#ffffff'}">
        <td>${new Date(a.fecha).toLocaleDateString('es-CO')}</td>
        <td>${a.nota || (a.tipo==='capital' ? 'Pago' : 'Interés')}</td>
        <td>${a.tipo==='capital' ? 'Abono capital' : 'Abono interés'}</td>
        <td style="text-align:right;font-weight:600;">
          $${parseFloat(a.monto).toLocaleString('es-CO')}
        </td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Estado de Cuenta - ${loan.deudor}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      padding: 40px;
      max-width: 700px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 22px; color: #1e3a5f; letter-spacing: 0.05em; }
    .header .fecha { font-size: 12px; color: #64748b; margin-top: 4px; }
    .seccion { margin-bottom: 24px; }
    .seccion h2 {
      font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em;
      color: #1e3a5f; border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px; margin-bottom: 12px;
    }
    .seccion p { margin-bottom: 4px; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #1e3a5f; color: #ffffff; }
    thead th { padding: 10px 12px; text-align: left; font-weight: 600; letter-spacing: 0.03em; }
    tbody td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
    tbody tr:last-child td { border-bottom: none; }
    .sin-movimientos { text-align: center; color: #94a3b8; padding: 20px; font-style: italic; }
    .resumen-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;
    }
    .resumen-card {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; padding: 14px 18px;
    }
    .resumen-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .resumen-card .valor { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .resumen-card .valor.danger { color: #dc2626; }
    .resumen-card .valor.success { color: #16a34a; }
    .pie {
      margin-top: 40px; text-align: center; font-size: 11px;
      color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px;
    }
    .btn-imprimir {
      display: block; margin: 0 auto 32px; padding: 12px 32px;
      background: #1e3a5f; color: #fff; border: none; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer; letter-spacing: 0.02em;
    }
    .btn-imprimir:hover { background: #2d5a9e; }
    @media print {
      .btn-imprimir { display: none !important; }
      body { padding: 20px; }
      .resumen-card { border: 1px solid #000 !important; background: #fff !important; }
    }
  </style>
</head>
<body>
  <button class="btn-imprimir" onclick="window.print()">
    🖨️ Imprimir / Guardar como PDF
  </button>
  <div class="header">
    <h1>ESTADO DE CUENTA</h1>
    <p class="fecha">${hoy}</p>
  </div>
  <div class="seccion">
    <h2>Información</h2>
    <p><strong>Deudor:</strong> ${loan.deudor}</p>
    ${loan.concepto ? `<p><strong>Concepto:</strong> ${loan.concepto}</p>` : ''}
    <p><strong>Fecha de inicio:</strong> ${new Date(loan.fecha_inicio).toLocaleDateString('es-CO')}</p>
    <p><strong>Tasa de interés:</strong> ${loan.tasa_interes}% mensual</p>
  </div>
  <div class="seccion">
    <h2>Movimientos</h2>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Concepto</th>
          <th>Tipo</th>
          <th style="text-align:right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${filas || '<tr><td colspan="4" class="sin-movimientos">Sin movimientos registrados</td></tr>'}
      </tbody>
    </table>
  </div>
  <div class="resumen-grid" style="grid-template-columns:1fr 1fr 1fr">
    <div class="resumen-card">
      <div class="label">Capital original</div>
      <div class="valor">$${deudaOriginal.toLocaleString('es-CO')}</div>
    </div>
    <div class="resumen-card">
      <div class="label">Capital pendiente</div>
      <div class="valor danger">$${deudaRestante.toLocaleString('es-CO')}</div>
    </div>
    <div class="resumen-card">
      <div class="label">Interés mensual actual</div>
      <div class="valor">$${Math.round(calculo.interes_mensual_actual).toLocaleString('es-CO')}</div>
    </div>
    <div class="resumen-card">
      <div class="label">Total intereses generados</div>
      <div class="valor">$${Math.round(calculo.total_intereses_generados).toLocaleString('es-CO')}</div>
    </div>
    <div class="resumen-card">
      <div class="label">Total intereses pagados</div>
      <div class="valor success">$${Math.round(calculo.total_intereses_pagados).toLocaleString('es-CO')}</div>
    </div>
    <div class="resumen-card">
      <div class="label">Interés pendiente</div>
      <div class="valor danger">$${interesPendiente.toLocaleString('es-CO')}</div>
    </div>
  </div>
  <div class="pie">
    Documento generado automáticamente por PrestamoExpress
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    console.error('Error al generar estado de cuenta:', error);
    res.status(500).json({ mensaje: 'Error al generar estado de cuenta.' });
  }
});

// ==========================================
// RUTAS DE ABONOS
// ==========================================

// POST /api/abonos -> Registrar abono (interés o capital)
app.post('/api/abonos', authenticateToken, invalidateCache, async (req, res) => {
  const { prestamo_id, monto, tipo, fecha, nota } = req.body;
  
  if (!prestamo_id || !monto || !tipo || !fecha) {
    return res.status(400).json({ mensaje: 'Préstamo, monto, tipo (interes/capital) y fecha son requeridos.' });
  }
  
  if (tipo !== 'interes' && tipo !== 'capital') {
    return res.status(400).json({ mensaje: 'El tipo de abono debe ser "interes" o "capital".' });
  }

  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verificar que el préstamo pertenece al grupo del usuario
    const userIds = await getSharedUserIds(req.user.id, client);
    const loanCheck = await client.query(
      'SELECT id, capital_pendiente, deudor FROM prestamos WHERE id = $1 AND usuario_id = ANY($2)',
      [prestamo_id, userIds]
    );
    
    if (loanCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
    }
    
    const loan = loanCheck.rows[0];
    const capitalPendienteActual = parseFloat(loan.capital_pendiente);
    const montoAbono = parseFloat(monto);
    
    if (montoAbono <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ mensaje: 'El monto del abono debe ser mayor a cero.' });
    }

    // Si el abono es a capital, actualizar el capital pendiente
    if (tipo === 'capital') {
      if (montoAbono > capitalPendienteActual) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          mensaje: `El abono a capital ($${montoAbono}) no puede ser mayor al capital pendiente ($${capitalPendienteActual}).` 
        });
      }
      
      const nuevoCapitalPendiente = capitalPendienteActual - montoAbono;
      const esActivo = nuevoCapitalPendiente > 0;
      
      await client.query(
        'UPDATE prestamos SET capital_pendiente = $1, activo = $2 WHERE id = $3',
        [nuevoCapitalPendiente, esActivo, prestamo_id]
      );
    }
    
    // Insertar el abono
    const abonoInsert = await client.query(
      `INSERT INTO abonos (prestamo_id, monto, tipo, fecha, nota) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [prestamo_id, montoAbono, tipo, fecha, nota || null]
    );
    const nuevoAbono = abonoInsert.rows[0];

    // Registrar el ingreso en caja
    const tipoCaja = tipo === 'capital' ? 'abono_capital' : 'abono_interes';
    const conceptoDescr = tipo === 'capital' ? 'Abono a capital' : 'Abono a interés';
    
    await client.query(
      `INSERT INTO transacciones_caja (usuario_id, prestamo_id, abono_id, monto, tipo, descripcion, fecha)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.user.id, 
        prestamo_id, 
        nuevoAbono.id, 
        montoAbono, 
        tipoCaja, 
        `${conceptoDescr} - Cliente: ${loan.deudor}`, 
        fecha
      ]
    );
    
    await client.query('COMMIT');
    res.status(201).json({
      mensaje: 'Abono registrado con éxito.',
      abono: nuevoAbono
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar abono:', error);
    res.status(500).json({ mensaje: 'Error al registrar el abono.' });
  } finally {
    client.release();
  }
});

// GET /api/prestamos/:id/abonos -> Historial de abonos
app.get('/api/prestamos/:id/abonos', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar que el préstamo pertenece al grupo del usuario
    const userIds = await getSharedUserIds(req.user.id);
    const loanCheck = await db.query(
      'SELECT deudor FROM prestamos WHERE id = $1 AND usuario_id = ANY($2)',
      [id, userIds]
    );
    
    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
    }
    
    const abonosRes = await db.query(
      'SELECT * FROM abonos WHERE prestamo_id = $1 ORDER BY fecha DESC, creado_en DESC',
      [id]
    );
    
    res.json(abonosRes.rows);
  } catch (error) {
    console.error('Error al obtener abonos:', error);
    res.status(500).json({ mensaje: 'Error al obtener el historial de abonos.' });
  }
});


// DELETE /api/abonos/:id -> Eliminar abono
app.delete('/api/abonos/:id', authenticateToken, invalidateCache, async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Buscar el abono y verificar que pertenece al grupo del usuario
    const userIds = await getSharedUserIds(req.user.id, client);
    const abonoCheck = await client.query(
      `SELECT a.monto, a.tipo, a.prestamo_id, p.usuario_id, p.capital_pendiente 
       FROM abonos a
       JOIN prestamos p ON a.prestamo_id = p.id
       WHERE a.id = $1 AND p.usuario_id = ANY($2)`,
      [id, userIds]
    );
    
    if (abonoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Abono no encontrado.' });
    }
    
    const abono = abonoCheck.rows[0];
    
    // Si era un abono a capital, restaurar el capital pendiente en el préstamo
    if (abono.tipo === 'capital') {
      const nuevoPendiente = parseFloat(abono.capital_pendiente) + parseFloat(abono.monto);
      await client.query('UPDATE prestamos SET capital_pendiente = $1, activo = TRUE WHERE id = $2', [nuevoPendiente, abono.prestamo_id]);
    }
    
    await client.query('DELETE FROM abonos WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ mensaje: 'Abono eliminado con éxito.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar abono:', error);
    res.status(500).json({ mensaje: 'Error al eliminar abono.' });
  } finally {
    client.release();
  }
});


// ==========================================
// RUTAS DE GESTIÓN DE CAJA
// ==========================================

// GET /api/caja/saldo -> Obtener saldo actual
app.get('/api/caja/saldo', authenticateToken, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const result = await db.query(
      'SELECT COALESCE(SUM(monto), 0) AS saldo FROM transacciones_caja WHERE usuario_id = ANY($1)',
      [userIds]
    );
    res.json({ saldo: parseFloat(result.rows[0].saldo) });
  } catch (error) {
    console.error('Error al obtener saldo de caja:', error);
    res.status(500).json({ mensaje: 'Error al obtener saldo de caja.' });
  }
});

// GET /api/caja/transacciones -> Obtener todas las transacciones
app.get('/api/caja/transacciones', authenticateToken, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const result = await db.query(
      'SELECT * FROM transacciones_caja WHERE usuario_id = ANY($1) ORDER BY creado_en DESC, id DESC',
      [userIds]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener transacciones de caja:', error);
    res.status(500).json({ mensaje: 'Error al obtener transacciones de caja.' });
  }
});

// POST /api/caja/transacciones -> Registrar transacción manual (aporte o egreso, con validación)
app.post('/api/caja/transacciones', apiLimiter, authenticateToken, invalidateCache, validar({
  monto: { requerido: true, tipo: 'numero' },
  tipo: { requerido: true, enum: ['ingreso', 'egreso'] },
  descripcion: { requerido: true, tipo: 'string', maxLength: 300 },
  fecha: { requerido: true, tipo: 'fecha' }
}), async (req, res) => {
  const { monto, tipo, descripcion, fecha } = req.body;

  if (tipo !== 'ingreso' && tipo !== 'egreso') {
    return res.status(400).json({ mensaje: 'El tipo debe ser "ingreso" o "egreso".' });
  }

  const valorMonto = parseFloat(monto);
  if (valorMonto <= 0) {
    return res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' });
  }

  // Guardar egresos como monto negativo y aportes como positivo
  const montoReal = tipo === 'egreso' ? -valorMonto : valorMonto;

  try {
    // Si es un egreso, podemos validar si hay fondos suficientes
    if (tipo === 'egreso') {
      const userIds = await getSharedUserIds(req.user.id);
      const saldoRes = await db.query(
        'SELECT COALESCE(SUM(monto), 0) AS saldo FROM transacciones_caja WHERE usuario_id = ANY($1)',
        [userIds]
      );
      const saldoCaja = parseFloat(saldoRes.rows[0].saldo);
      if (saldoCaja < valorMonto) {
        return res.status(400).json({ 
          mensaje: `Saldo insuficiente en caja para realizar este egreso. Disponible: $${saldoCaja.toLocaleString('es-CO')}` 
        });
      }
    }

    const result = await db.query(
      `INSERT INTO transacciones_caja (usuario_id, monto, tipo, descripcion, fecha)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, montoReal, tipo, descripcion, fecha]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al registrar transacción de caja:', error);
    res.status(500).json({ mensaje: 'Error al registrar transacción de caja.' });
  }
});

// PUT /api/caja/transacciones/:id -> Editar transacción manual (con validación)
app.put('/api/caja/transacciones/:id', apiLimiter, authenticateToken, invalidateCache, validar({
  monto: { requerido: true, tipo: 'numero' },
  tipo: { requerido: true, enum: ['ingreso', 'egreso'] },
  descripcion: { requerido: true, tipo: 'string', maxLength: 300 },
  fecha: { requerido: true, tipo: 'fecha' }
}), async (req, res) => {
  const { id } = req.params;
  const { monto, tipo, descripcion, fecha } = req.body;
  
  if (tipo !== 'ingreso' && tipo !== 'egreso') {
    return res.status(400).json({ mensaje: 'Solo se pueden editar transacciones de tipo ingreso o egreso.' });
  }

  const valorMonto = parseFloat(monto);
  if (valorMonto <= 0) {
    return res.status(400).json({ mensaje: 'El monto debe ser mayor a cero.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userIds = await getSharedUserIds(req.user.id, client);
    const check = await client.query(
      `SELECT * FROM transacciones_caja WHERE id = $1 AND usuario_id = ANY($2) AND tipo IN ('ingreso', 'egreso')`,
      [id, userIds]
    );

    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Transacción no encontrada o no es editable. Solo se pueden editar ingresos y egresos manuales.' });
    }

    const montoReal = tipo === 'egreso' ? -valorMonto : valorMonto;

    if (tipo === 'egreso') {
      const montoActual = parseFloat(check.rows[0].monto);
      const saldoRes = await client.query(
        'SELECT COALESCE(SUM(monto), 0) AS saldo FROM transacciones_caja WHERE usuario_id = ANY($1)',
        [userIds]
      );
      const saldoSinEsta = parseFloat(saldoRes.rows[0].saldo) - montoActual;
      if (saldoSinEsta < valorMonto) {
        await client.query('ROLLBACK');
        return res.status(400).json({ mensaje: `Saldo insuficiente. Disponible: $${saldoSinEsta.toLocaleString('es-CO')}` });
      }
    }

    const result = await client.query(
      `UPDATE transacciones_caja SET monto = $1, tipo = $2, descripcion = $3, fecha = $4 WHERE id = $5 RETURNING *`,
      [montoReal, tipo, descripcion, fecha, id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al editar transacción de caja:', error);
    res.status(500).json({ mensaje: 'Error al editar transacción de caja.' });
  } finally {
    client.release();
  }
});

// DELETE /api/caja/transacciones/:id -> Eliminar transacción manual (solo ingreso/egreso del usuario)
app.delete('/api/caja/transacciones/:id', authenticateToken, invalidateCache, async (req, res) => {
  const { id } = req.params;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const userIds = await getSharedUserIds(req.user.id, client);
    const check = await client.query(
      `SELECT * FROM transacciones_caja WHERE id = $1 AND usuario_id = ANY($2) AND tipo IN ('ingreso', 'egreso')`,
      [id, userIds]
    );

    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Transacción no encontrada o no se puede eliminar. Solo ingresos y egresos manuales.' });
    }

    await client.query('DELETE FROM transacciones_caja WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ mensaje: 'Transacción eliminada con éxito.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar transacción de caja:', error);
    res.status(500).json({ mensaje: 'Error al eliminar transacción de caja.' });
  } finally {
    client.release();
  }
});

// ==========================================
// RUTA DE RESUMEN METRICAS
// ==========================================

// GET /api/resumen -> Totales generales y datos de gráfica para el dashboard
app.get('/api/resumen', authenticateToken, cacheMiddleware(30), async (req, res) => {
  try {
    // 0. Obtener IDs compartidos y saldo de caja del grupo
    const userIds = await getSharedUserIds(req.user.id);
    const saldoRes = await db.query(
      'SELECT COALESCE(SUM(monto), 0) AS saldo FROM transacciones_caja WHERE usuario_id = ANY($1)',
      [userIds]
    );
    const saldoCaja = parseFloat(saldoRes.rows[0].saldo);

    // 1. Obtener préstamos del grupo
    const prestamosRes = await db.query(
      'SELECT id, deudor, capital_original, capital_pendiente, tasa_interes, fecha_inicio, activo FROM prestamos WHERE usuario_id = ANY($1)',
      [userIds]
    );
    
    const prestamos = prestamosRes.rows;
    
    let totalPrestado = 0;
    let totalCapitalPendiente = 0;
    let totalInteresesPendientes = 0;
    let totalCapitalRecuperado = 0;
    let totalInteresesCobrados = 0;
    
    const deudoresDataMap = {};

    await Promise.all(
      prestamos.map(async (loan) => {
        const abonosRes = await db.query(
          'SELECT monto, tipo, fecha FROM abonos WHERE prestamo_id = $1',
          [loan.id]
        );
        
        const abonos = abonosRes.rows;

        let calculo;
        try {
          calculo = calcularIntereses(loan, abonos);
        } catch (e) {
          console.error('Error calculando interés para préstamo', loan.id, e);
          calculo = {
            capital_original: 0,
            capital_pendiente: 0,
            interes_mensual_actual: 0,
            total_intereses_generados: 0,
            total_intereses_pagados: 0,
            interes_pendiente: 0,
            total_abonado_capital: 0,
            dias_transcurridos: 0,
            tiempo_texto: 'Sin calcular',
            proximo_vencimiento: 'Sin calcular',
            dias_para_vencer: 0,
            desglose: []
          };
        }
        
        const capOrig = calculo.capital_original;
        const capPend = calculo.capital_pendiente;
        
        if (loan.activo) {
          totalPrestado += capOrig;
          totalCapitalPendiente += capPend;
          totalInteresesPendientes += calculo.interes_pendiente;
        }
        
        totalCapitalRecuperado += calculo.total_abonado_capital;
        totalInteresesCobrados += calculo.total_intereses_pagados;
        
        if (!deudoresDataMap[loan.deudor]) {
          deudoresDataMap[loan.deudor] = {
            deudor: loan.deudor,
            capitalOriginal: 0,
            capitalPendiente: 0,
            interesesCobrados: 0,
            interesesPendientes: 0
          };
        }
        
        deudoresDataMap[loan.deudor].capitalOriginal += capOrig;
        deudoresDataMap[loan.deudor].capitalPendiente += capPend;
        deudoresDataMap[loan.deudor].interesesCobrados += calculo.total_intereses_pagados;
        deudoresDataMap[loan.deudor].interesesPendientes += calculo.interes_pendiente;
      })
    );
    
    const graficaData = Object.values(deudoresDataMap);

    res.json({
      resumen: {
        totalPrestado,
        capitalPendienteTotal: totalCapitalPendiente,
        interesesPendientes: totalInteresesPendientes,
        capitalRecuperado: totalCapitalRecuperado,
        interesesCobrados: totalInteresesCobrados,
        saldoCaja
      },
      grafica: graficaData
    });
  } catch (error) {
    console.error('Error al calcular resumen:', error);
    res.status(500).json({ mensaje: 'Error al obtener resumen de métricas.' });
  }
});


// ==========================================
// MANEJO GLOBAL DE ERRORES NO CAPTURADOS
// ==========================================
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

// ==========================================
// MANEJO DE EXCEPCIONES NO CAPTURADAS (process)
// ==========================================
process.on('unhandledRejection', (reason) => {
  console.error('Excepción no manejada (unhandledRejection):', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada (uncaughtException):', err.message);
  process.exit(1);
});

// Inicializar BD y luego arrancar el servidor
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Express corriendo en el puerto ${PORT}`);
  });
}).catch((err) => {
  console.error('❌ Fallo crítico al inicializar:', err);
  process.exit(1);
});
