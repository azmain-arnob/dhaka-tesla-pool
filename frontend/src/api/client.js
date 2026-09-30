const API_BASE_URL = 'http://localhost:5000'

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token')

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}`,
    )
  }

  return data
}

export const api = {
  get(endpoint) {
    return request(endpoint)
  },

  post(endpoint, body) {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  put(endpoint, body) {
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  patch(endpoint, body) {
    return request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  delete(endpoint) {
    return request(endpoint, {
      method: 'DELETE',
    })
  },
}