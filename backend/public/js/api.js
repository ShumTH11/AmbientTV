/**
 * AmbientTV Web API Layer
 */

function authHeaders() {
  const token = CONFIG.getToken();
  return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function retryFetch(url, options, retries = 3, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function apiGet(path) {
  const res = await retryFetch(`${CONFIG.API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await retryFetch(`${CONFIG.API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiDelete(path, body) {
  const res = await retryFetch(`${CONFIG.API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiHealth() {
  const res = await retryFetch(`${CONFIG.API_BASE}/api/health`, {});
  return res.json();
}

async function apiCatalog() {
  return apiGet('/api/catalog');
}

// Auth
async function apiRegister(email, password, name) {
  return apiPost('/api/auth/register', { email, password, name });
}
async function apiLogin(email, password) {
  return apiPost('/api/auth/login', { email, password });
}
async function apiProfile() {
  return apiGet('/api/auth/profile');
}

// User data
async function apiGetFavorites() {
  return apiGet('/api/user/favorites');
}
async function apiAddFavorite(item) {
  return apiPost('/api/user/favorites', item);
}
async function apiRemoveFavorite(video_url, audio_url) {
  return apiDelete('/api/user/favorites', { video_url, audio_url });
}
async function apiGetHistory() {
  return apiGet('/api/user/history');
}
async function apiAddHistory(item) {
  return apiPost('/api/user/history', item);
}
