import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ mensaje: 'Token invalido o expirado.' })
    }
    req.user = user
    next()
  })
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ mensaje: 'No autenticado.' })
  }

  if (!req.user.es_admin) {
    return res.status(403).json({ mensaje: 'Acceso prohibido. Se requieren privilegios de administrador.' })
  }

  next()
}

export { JWT_SECRET }
