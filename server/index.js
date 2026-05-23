const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('./middleware/auth');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

// --- Lógica del Cálculo de Meses ---
function calcularMesesTranscurridos(fechaInicioStr) {
  const fechaInicio = new Date(fechaInicioStr);
  const hoy = new Date();
  
  // Evitar problemas de zonas horarias en la comparación de fechas nativas
  const yStart = fechaInicio.getFullYear();
  const mStart = fechaInicio.getMonth();
  const dStart = fechaInicio.getDate();
  
  const yHoy = hoy.getFullYear();
  const mHoy = hoy.getMonth();
  const dHoy = hoy.getDate();
  
  let meses = (yHoy - yStart) * 12 + (mHoy - mStart);
  
  if (dHoy <= dStart) {
    meses--; // Aún no pasa el día exacto de cobro de este mes (periodo de gracia en día de corte)
  }
  
  // El primer mes se cobra de inmediato al adquirir el crédito, por tanto inicia en 1
  return Math.max(1, meses + 1);
}

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

// POST /api/auth/login -> Login de usuario
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ mensaje: 'Por favor, ingrese usuario y contraseña.' });
  }

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

// ==========================================
// RUTAS DE PRÉSTAMOS
// ==========================================

// GET /api/prestamos -> Listar préstamos del usuario autenticado con cálculos de negocio en tiempo real
app.get('/api/prestamos', authenticateToken, async (req, res) => {
  try {
    const userIds = await getSharedUserIds(req.user.id);
    const prestamosRes = await db.query(
      'SELECT * FROM prestamos WHERE usuario_id = ANY($1) ORDER BY creado_en DESC',
      [userIds]
    );
    
    const prestamos = prestamosRes.rows;
    
    // Obtener abonos asociados para realizar cálculos en lote
    const prestamosCalculados = await Promise.all(
      prestamos.map(async (loan) => {
        const abonosRes = await db.query(
          'SELECT monto, tipo FROM abonos WHERE prestamo_id = $1',
          [loan.id]
        );
        
        const abonos = abonosRes.rows;
        
        const totalAbonoInteres = abonos
          .filter(a => a.tipo === 'interes')
          .reduce((sum, a) => sum + parseFloat(a.monto), 0);
          
        const totalAbonoCapital = abonos
          .filter(a => a.tipo === 'capital')
          .reduce((sum, a) => sum + parseFloat(a.monto), 0);

        const mesesTranscurridos = calcularMesesTranscurridos(loan.fecha_inicio);
        const interesMensual = parseFloat(loan.capital_pendiente) * (parseFloat(loan.tasa_interes) / 100);
        const interesAcumulado = mesesTranscurridos * interesMensual;
        const interesPendiente = Math.max(0, interesAcumulado - totalAbonoInteres);
        
        return {
          ...loan,
          capital_original: parseFloat(loan.capital_original),
          capital_pendiente: parseFloat(loan.capital_pendiente),
          tasa_interes: parseFloat(loan.tasa_interes),
          meses_transcurridos: mesesTranscurridos,
          interes_mensual: interesMensual,
          interes_acumulado: interesAcumulado,
          interes_pendiente: interesPendiente,
          total_abonado_interes: totalAbonoInteres,
          total_abonado_capital: totalAbonoCapital
        };
      })
    );
    
    res.json(prestamosCalculados);
  } catch (error) {
    console.error('Error al obtener préstamos:', error);
    res.status(500).json({ mensaje: 'Error al obtener préstamos.' });
  }
});

// POST /api/prestamos -> Crear préstamo
app.post('/api/prestamos', authenticateToken, async (req, res) => {
  const { deudor, capital_original, tasa_interes, fecha_inicio } = req.body;
  
  if (!deudor || !capital_original || !fecha_inicio) {
    return res.status(400).json({ mensaje: 'Nombre del deudor, capital original y fecha de inicio son requeridos.' });
  }

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
      `INSERT INTO prestamos (usuario_id, deudor, capital_original, capital_pendiente, tasa_interes, fecha_inicio, activo) 
       VALUES ($1, $2, $3, $3, $4, $5, TRUE) RETURNING *`,
      [req.user.id, deudor, montoPrestamo, tasa, fecha_inicio]
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


// PUT /api/prestamos/:id -> Editar préstamo
app.put('/api/prestamos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { deudor, capital_original, tasa_interes, fecha_inicio } = req.body;
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verificar que el préstamo pertenece al grupo del usuario
    const userIds = await getSharedUserIds(req.user.id, client);
    const loanCheck = await client.query('SELECT capital_original, capital_pendiente FROM prestamos WHERE id = $1 AND usuario_id = ANY($2)', [id, userIds]);
    if (loanCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Préstamo no encontrado.' });
    }
    
    const oldOriginal = parseFloat(loanCheck.rows[0].capital_original);
    const oldPendiente = parseFloat(loanCheck.rows[0].capital_pendiente);
    
    const newOriginal = parseFloat(capital_original);
    const diferencia = newOriginal - oldOriginal;
    
    // Si incrementa el préstamo, verificar fondos en caja del grupo
    if (diferencia > 0) {
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

    const newPendiente = Math.max(0, oldPendiente + diferencia);
    const esActivo = newPendiente > 0;
    
    await client.query(
      `UPDATE prestamos 
       SET deudor = $1, capital_original = $2, capital_pendiente = $3, tasa_interes = $4, fecha_inicio = $5, activo = $6
       WHERE id = $7`,
      [deudor, newOriginal, newPendiente, parseFloat(tasa_interes), fecha_inicio, esActivo, id]
    );

    // Actualizar la transacción en caja correspondiente
    await client.query(
      `UPDATE transacciones_caja 
       SET monto = $1, descripcion = $2, fecha = $3
       WHERE prestamo_id = $4 AND tipo = 'prestamo'`,
      [-newOriginal, `Préstamo otorgado a ${deudor} (Modificado)`, fecha_inicio, id]
    );
    
    await client.query('COMMIT');
    res.json({ mensaje: 'Préstamo actualizado con éxito.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al editar préstamo:', error);
    res.status(500).json({ mensaje: 'Error al editar préstamo.' });
  } finally {
    client.release();
  }
});

// DELETE /api/prestamos/:id -> Eliminar préstamo
app.delete('/api/prestamos/:id', authenticateToken, async (req, res) => {
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

// ==========================================
// RUTAS DE ABONOS
// ==========================================

// POST /api/abonos -> Registrar abono (interés o capital)
app.post('/api/abonos', authenticateToken, async (req, res) => {
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
app.delete('/api/abonos/:id', authenticateToken, async (req, res) => {
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

// POST /api/caja/transacciones -> Registrar transacción manual (aporte o egreso)
app.post('/api/caja/transacciones', authenticateToken, async (req, res) => {
  const { monto, tipo, descripcion, fecha } = req.body;
  
  if (!monto || !tipo || !descripcion || !fecha) {
    return res.status(400).json({ mensaje: 'Monto, tipo (ingreso/egreso), descripción y fecha son requeridos.' });
  }

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


// ==========================================
// RUTA DE RESUMEN METRICAS
// ==========================================

// GET /api/resumen -> Totales generales y datos de gráfica para el dashboard
app.get('/api/resumen', authenticateToken, async (req, res) => {
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
    
    let totalPrestado = 0; // Suma de capital original de préstamos activos
    let totalInteresesPendientes = 0;
    let totalCapitalRecuperado = 0;
    let totalInteresesCobrados = 0;
    
    const deudoresDataMap = {};

    await Promise.all(
      prestamos.map(async (loan) => {
        const abonosRes = await db.query(
          'SELECT monto, tipo FROM abonos WHERE prestamo_id = $1',
          [loan.id]
        );
        
        const abonos = abonosRes.rows;
        
        const totalAbonoInteres = abonos
          .filter(a => a.tipo === 'interes')
          .reduce((sum, a) => sum + parseFloat(a.monto), 0);
          
        const totalAbonoCapital = abonos
          .filter(a => a.tipo === 'capital')
          .reduce((sum, a) => sum + parseFloat(a.monto), 0);

        const mesesTranscurridos = calcularMesesTranscurridos(loan.fecha_inicio);
        const interesMensual = parseFloat(loan.capital_pendiente) * (parseFloat(loan.tasa_interes) / 100);
        const interesAcumulado = mesesTranscurridos * interesMensual;
        const interesPendiente = Math.max(0, interesAcumulado - totalAbonoInteres);
        
        const capOrig = parseFloat(loan.capital_original);
        const capPend = parseFloat(loan.capital_pendiente);
        
        if (loan.activo) {
          totalPrestado += capOrig;
          totalInteresesPendientes += interesPendiente;
        }
        
        totalCapitalRecuperado += totalAbonoCapital;
        totalInteresesCobrados += totalAbonoInteres;
        
        // Agrupar datos por deudor para la gráfica
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
        deudoresDataMap[loan.deudor].interesesCobrados += totalAbonoInteres;
        deudoresDataMap[loan.deudor].interesesPendientes += interesPendiente;
      })
    );
    
    const graficaData = Object.values(deudoresDataMap);

    res.json({
      resumen: {
        totalPrestado,
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
// SERVIR FRONTEND CLIENTE EN PRODUCCIÓN
// ==========================================

const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  // Solo responder con index.html si no es una ruta de API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ mensaje: 'Ruta API no encontrada.' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
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
