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
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre_usuario VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        es_admin BOOLEAN DEFAULT FALSE,
        creado_en TIMESTAMP DEFAULT NOW()
      );
    `);

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
  
  if (dHoy < dStart) {
    meses--; // Aún no llega al día exacto de cobro de este mes
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
      { id: user.id, username: user.username, nombre_usuario: user.nombre_usuario, es_admin: user.es_admin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      usuario: {
        id: user.id,
        nombre_usuario: user.nombre_usuario,
        username: user.username,
        es_admin: user.es_admin
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error en el servidor.' });
  }
});

// POST /api/auth/register -> Crear usuario (SOLO ACCESIBLE POR ADMINS)
app.post('/api/auth/register', authenticateToken, requireAdmin, async (req, res) => {
  const { nombre_usuario, username, password, es_admin } = req.body;
  
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
      'INSERT INTO usuarios (nombre_usuario, username, password_hash, es_admin) VALUES ($1, $2, $3, $4) RETURNING id, nombre_usuario, username, es_admin',
      [nombre_usuario, username, passwordHash, !!es_admin]
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
// RUTAS DE PRÉSTAMOS
// ==========================================

// GET /api/prestamos -> Listar préstamos del usuario autenticado con cálculos de negocio en tiempo real
app.get('/api/prestamos', authenticateToken, async (req, res) => {
  try {
    const prestamosRes = await db.query(
      'SELECT * FROM prestamos WHERE usuario_id = $1 ORDER BY creado_en DESC',
      [req.user.id]
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

  try {
    const result = await db.query(
      `INSERT INTO prestamos (usuario_id, deudor, capital_original, capital_pendiente, tasa_interes, fecha_inicio, activo) 
       VALUES ($1, $2, $3, $3, $4, $5, TRUE) RETURNING *`,
      [req.user.id, deudor, parseFloat(capital_original), tasa, fecha_inicio]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear préstamo:', error);
    res.status(500).json({ mensaje: 'Error al crear préstamo.' });
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
    
    // Verificar que el préstamo pertenece al usuario
    const loanCheck = await client.query(
      'SELECT id, capital_pendiente, deudor FROM prestamos WHERE id = $1 AND usuario_id = $2',
      [prestamo_id, req.user.id]
    );
    
    if (loanCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ mensaje: 'Préstamo no encontrado o no pertenece a su cuenta.' });
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
    
    await client.query('COMMIT');
    res.status(201).json({
      mensaje: 'Abono registrado con éxito.',
      abono: abonoInsert.rows[0]
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
    // Verificar pertenencia del préstamo
    const loanCheck = await db.query(
      'SELECT deudor FROM prestamos WHERE id = $1 AND usuario_id = $2',
      [id, req.user.id]
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


// ==========================================
// RUTA DE RESUMEN METRICAS
// ==========================================

// GET /api/resumen -> Totales generales y datos de gráfica para el dashboard
app.get('/api/resumen', authenticateToken, async (req, res) => {
  try {
    // 1. Obtener todos los préstamos del usuario
    const prestamosRes = await db.query(
      'SELECT id, deudor, capital_original, capital_pendiente, tasa_interes, fecha_inicio, activo FROM prestamos WHERE usuario_id = $1',
      [req.user.id]
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
        interesesCobrados: totalInteresesCobrados
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
