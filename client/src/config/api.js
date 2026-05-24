export const API_URL = import.meta.env.VITE_API_URL || ''

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
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
