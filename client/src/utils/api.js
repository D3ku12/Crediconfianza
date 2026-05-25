import { API_URL } from '../config/api'

async function request(url, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  })

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (window.location.pathname !== '/') {
      window.location.reload()
    }
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.mensaje || 'Algo salio mal.')
  }

  return data
}

async function requestHtml(url) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}${url}`, {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ mensaje: 'Error desconocido' }))
    throw new Error(error.mensaje || 'Error al obtener el documento')
  }
  return response.text()
}

export const api = {
  // Autenticacion
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (nombre_usuario, username, password, es_admin, grupo_id) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre_usuario, username, password, es_admin, grupo_id }),
    }),

  // Prestamos y Deudores
  getPrestamos: () => request('/api/prestamos'),
  getDeudores: () => request('/api/deudores'),

  createPrestamo: (prestamo) =>
    request('/api/prestamos', {
      method: 'POST',
      body: JSON.stringify(prestamo),
    }),

  updatePrestamo: (id, prestamo) =>
    request(`/api/prestamos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(prestamo),
    }),

  deletePrestamo: (id) =>
    request(`/api/prestamos/${id}`, {
      method: 'DELETE',
    }),

  repairPrestamos: (userId) =>
    request(`/api/prestamos/reparar/${userId}`, {
      method: 'PATCH',
    }),

  // Abonos
  createAbono: (abono) =>
    request('/api/abonos', {
      method: 'POST',
      body: JSON.stringify(abono),
    }),

  deleteAbono: (id) =>
    request(`/api/abonos/${id}`, {
      method: 'DELETE',
    }),

  getAbonos: (prestamoId) => request(`/api/prestamos/${prestamoId}/abonos`),

  // Resumen
  getResumen: () => request('/api/resumen'),

  // Caja
  getCajaSaldo: () => request('/api/caja/saldo'),
  getCajaTransacciones: () => request('/api/caja/transacciones'),
  createCajaTransaccion: (transaccion) =>
    request('/api/caja/transacciones', {
      method: 'POST',
      body: JSON.stringify(transaccion),
    }),
  updateCajaTransaccion: (id, transaccion) =>
    request(`/api/caja/transacciones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaccion),
    }),
  deleteCajaTransaccion: (id) =>
    request(`/api/caja/transacciones/${id}`, {
      method: 'DELETE',
    }),

  // Grupos (admin)
  getGrupos: () => request('/api/grupos'),
  createGrupo: (nombre) =>
    request('/api/grupos', {
      method: 'POST',
      body: JSON.stringify({ nombre }),
    }),
  deleteGrupo: (id) =>
    request(`/api/grupos/${id}`, {
      method: 'DELETE',
    }),

  // Usuarios (admin)
  getUsuarios: () => request('/api/usuarios'),
  updateUsuarioGrupo: (userId, grupoId) =>
    request(`/api/usuarios/${userId}/grupo`, {
      method: 'PUT',
      body: JSON.stringify({ grupo_id: grupoId }),
    }),
  deleteUser: (userId) =>
    request(`/api/usuarios/${userId}`, {
      method: 'DELETE',
    }),

  // Clientes
  getClientes: () => request('/api/clientes'),
  createCliente: (cliente) =>
    request('/api/clientes', {
      method: 'POST',
      body: JSON.stringify(cliente),
    }),
  updateCliente: (id, cliente) =>
    request(`/api/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cliente),
    }),
  deleteCliente: (id) =>
    request(`/api/clientes/${id}`, {
      method: 'DELETE',
    }),

  // Perfil de usuario
  updatePerfil: (nombre) =>
    request('/api/auth/perfil', {
      method: 'PUT',
      body: JSON.stringify({ nombre }),
    }),

  changePassword: (actual, nueva) =>
    request('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ actual, nueva }),
    }),

  // Estado de cuenta (retorna HTML)
  getPrestamoEstadoCuenta: (id) => requestHtml(`/api/prestamos/${id}/estado-cuenta`),
  getClienteEstadoCuenta: (id) => requestHtml(`/api/clientes/${id}/estado-cuenta`),
}

// Utilidad para formatear moneda COP
export const formatCOP = (valor) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

// Utilidad para formatear fechas de forma legible en espanol
export const formatFecha = (fechaStr) => {
  if (!fechaStr) return ''
  const datePart = fechaStr.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  const fecha = new Date(year, month - 1, day)

  if (isNaN(fecha.getTime())) return 'Fecha invalida'

  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
