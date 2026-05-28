/**
 * AmbientTV Web Configuration
 */
const CONFIG = {
  API_BASE: '', // same origin
  getToken() { return localStorage.getItem('atv_jwt') || ''; },
  setToken(t) { localStorage.setItem('atv_jwt', t); },
  clearToken() { localStorage.removeItem('atv_jwt'); },
  isLoggedIn() { return !!this.getToken(); }
};
