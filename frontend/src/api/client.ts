const API_BASE = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(err.error || `Erreur ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    register: (data: { username: string; email: string; password: string }) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
  },
  matches: {
    list: (status?: string) => request(`/matches${status ? `?status=${status}` : ''}`),
    get: (id: number) => request(`/matches/${id}`),
    setResult: (id: number, data: { home_score: number; away_score: number }) =>
      request(`/matches/${id}/result`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  bets: {
    place: (data: { match_id: number; bet_type: string; amount: number }) =>
      request('/bets', { method: 'POST', body: JSON.stringify(data) }),
    history: () => request('/bets'),
  },
};
