const BASE_URL = ''; // Se usa ruta relativa por el proxy en dev y porque en prod servimos el build en el mismo dominio

async function request(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Si el token expira o no es válido, cerramos sesión
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Si no estamos ya en la pantalla de login, forzar recarga para redirigir
    if (window.location.pathname !== '/') {
      window.location.reload();
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensaje || 'Algo salió mal.');
  }

  return data;
}

export const api = {
  // Autenticación
  login: (username, password) => 
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
    
  register: (nombre_usuario, username, password, es_admin) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nombre_usuario, username, password, es_admin }),
    }),

  // Préstamos y Deudores
  getPrestamos: () => request('/api/prestamos'),
  getDeudores: () => request('/api/deudores'),
  
  createPrestamo: (prestamo) => 
    request('/api/prestamos', {
      method: 'POST',
      body: JSON.stringify(prestamo),
    }),

  // Abonos
  createAbono: (abono) => 
    request('/api/abonos', {
      method: 'POST',
      body: JSON.stringify(abono),
    }),
    
  getAbonos: (prestamoId) => request(`/api/prestamos/${prestamoId}/abonos`),

  // Resumen
  getResumen: () => request('/api/resumen'),
};

// Utilidad para formatear moneda COP
export const formatCOP = (valor) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
};

// Utilidad para formatear fechas de forma legible en español
export const formatFecha = (fechaStr) => {
  if (!fechaStr) return '';
  // Convertir YYYY-MM-DD a objeto Date sin problemas de zona horaria local
  const [year, month, day] = fechaStr.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
