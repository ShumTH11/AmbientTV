/**
 * AmbientTV Web API Layer
 */

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal, credentials: 'include' });
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
  const res = await retryFetch(`${CONFIG.API_BASE}${path}`, {});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await retryFetch(`${CONFIG.API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
async function apiRegister(email, password, name, captchaToken) {
  return apiPost('/api/auth/register', { email, password, name, captchaToken });
}
async function apiLogin(email, password) {
  return apiPost('/api/auth/login', { email, password });
}
async function apiLogout() {
  return apiPost('/api/auth/logout', {});
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

// Search: Pixabay audio (royalty-free music & sound effects)
async function apiSearchPixabayAudio(query, per_page = 10, type = 'music') {
  const res = await retryFetch(`${CONFIG.API_BASE}/api/search/pixabay-audio?query=${encodeURIComponent(query)}&per_page=${per_page}&type=${type}`, {});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Media status (local vs remote)
async function apiMediaStatus() {
  return apiGet('/api/media/status');
}

// Progress sync
async function apiGetProgress(videoUrl, audioUrl) {
  return apiGet(`/api/user/progress?video_url=${encodeURIComponent(videoUrl)}&audio_url=${encodeURIComponent(audioUrl)}`);
}
async function apiSaveProgress(item) {
  return apiPost('/api/user/progress', item);
}
async function apiGetAllProgress() {
  return apiGet('/api/user/progress/all');
}

// Playlists
async function apiGetPlaylists() {
  return apiGet('/api/user/playlists');
}
async function apiCreatePlaylist(name) {
  return apiPost('/api/user/playlists', { name });
}
async function apiDeletePlaylist(id) {
  return apiDelete(`/api/user/playlists/${id}`);
}
async function apiGetPlaylist(id) {
  return apiGet(`/api/user/playlists/${id}`);
}
async function apiAddToPlaylist(playlistId, item) {
  return apiPost(`/api/user/playlists/${playlistId}/items`, item);
}
async function apiRemoveFromPlaylist(playlistId, itemId) {
  return apiDelete(`/api/user/playlists/${playlistId}/items/${itemId}`);
}
async function apiReorderPlaylist(playlistId, itemIds) {
  return fetch(`${CONFIG.API_BASE}/api/user/playlists/${playlistId}/items/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ item_ids: itemIds })
  }).then(r => r.json());
}
