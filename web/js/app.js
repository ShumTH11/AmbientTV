/**
 * AmbientTV Web — Main App Logic
 */

let categories = [];
let currentCatalog = null;
let smartCat = null;
let currentUser = null;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initApp();
  } catch (e) {
    showToast('Ошибка загрузки: ' + e.message, true);
    document.querySelector('.loader-sub').textContent = 'Не удалось подключиться к серверу';
  }
});

async function initApp() {
  // Retry catalog load up to 3 times (helps after quick F5 reloads)
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      currentCatalog = await apiCatalog();
      break;
    } catch (e) {
      lastErr = e;
      if (i < 2) await new Promise(r => setTimeout(r, 400));
    }
  }
  if (!currentCatalog) throw lastErr || new Error('Не удалось загрузить каталог');
  categories = currentCatalog.categories || [];

  // Check auth via cookie (server-side)
  try {
    const profile = await apiProfile();
    currentUser = profile;
    updateUserBadge();
    await syncFromServer();
  } catch (e) {
    currentUser = null;
  }

  // UI
  const loader = document.getElementById('loader');
  loader.classList.add('fade');
  setTimeout(() => {
    loader.classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }, 600);

  renderCategories();
  renderSmartSuggestion();
  renderFavorites();
  renderHistory();
  loadSettings();
}

// ========== AUTH ==========

function toggleAuthModal() {
  const modal = document.getElementById('authModal');
  if (currentUser) {
    showSection('profile');
    return;
  }
  modal.classList.toggle('hidden');
}

function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('authFormLogin').classList.toggle('hidden', tab !== 'login');
  document.getElementById('authFormRegister').classList.toggle('hidden', tab !== 'register');
  document.getElementById('authTitle').textContent = tab === 'login' ? '🔐 Вход' : '🔐 Регистрация';
  document.getElementById('authError').textContent = '';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  document.getElementById('authError').textContent = '';
  try {
    const res = await apiLogin(email, password);
    currentUser = res.user;
    document.getElementById('authModal').classList.add('hidden');
    updateUserBadge();
    await syncFromServer();
    renderFavorites();
    renderHistory();
    showToast('Добро пожаловать, ' + res.user.name + '!');
  } catch (e) {
    document.getElementById('authError').textContent = e.message;
  }
}

async function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  document.getElementById('authError').textContent = '';
  try {
    const res = await apiRegister(email, password, name);
    currentUser = res.user;
    document.getElementById('authModal').classList.add('hidden');
    updateUserBadge();
    showToast('Аккаунт создан! Добро пожаловать, ' + res.user.name + '!');
  } catch (e) {
    document.getElementById('authError').textContent = e.message;
  }
}

function updateUserBadge() {
  const badge = document.getElementById('userBadge');
  const nameEl = document.getElementById('userName');
  if (currentUser) {
    nameEl.textContent = currentUser.name || currentUser.email;
    badge.style.borderColor = '#7dd3fc';
    badge.style.color = '#7dd3fc';
  } else {
    nameEl.textContent = 'Войти';
    badge.style.borderColor = '#2a2a3a';
    badge.style.color = '#e2e2e2';
  }
}

async function logout() {
  try {
    await apiLogout();
  } catch (e) {}
  currentUser = null;
  localStorage.removeItem('atv_favorites');
  localStorage.removeItem('atv_history');
  updateUserBadge();
  showSection('browse');
  renderFavorites();
  renderHistory();
  showToast('Вы вышли из аккаунта');
}

// Sync from server
async function syncFromServer() {
  if (!currentUser) return;
  try {
    const [favs, hist] = await Promise.all([apiGetFavorites(), apiGetHistory()]);
    localStorage.setItem('atv_favorites', JSON.stringify(favs.map(f => ({
      videoUrl: f.video_url, audioUrl: f.audio_url, title: f.title, categoryId: f.category_id
    }))));
    localStorage.setItem('atv_history', JSON.stringify(hist.map(h => ({
      pair: { videoUrl: h.video_url, audioUrl: h.audio_url, title: h.title },
      categoryId: h.category_id, progress: h.progress, duration: h.duration, watchedAt: h.watched_at
    }))));
  } catch (e) {
    console.log('Sync failed', e);
  }
}

// ========== NAVIGATION ==========

function showSection(name) {
  ['browse','favorites','history','profile'].forEach(s => {
    document.getElementById('sec-' + s).classList.add('hidden');
    document.getElementById('nav-' + s).classList.remove('active');
  });
  document.getElementById('sec-' + name).classList.remove('hidden');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'favorites') renderFavorites();
  if (name === 'history') renderHistory();
  if (name === 'profile') renderProfile();
}

// ========== PROFILE ==========

function renderProfile() {
  if (currentUser) {
    document.getElementById('profileName').textContent = currentUser.name || 'Пользователь';
    document.getElementById('profileEmail').textContent = currentUser.email;
  } else {
    document.getElementById('profileName').textContent = 'Гость';
    document.getElementById('profileEmail').textContent = 'Войдите, чтобы сохранять избранное и историю';
  }
  const favs = getFavorites().length;
  const hist = getHistory().length;
  document.getElementById('statFav').textContent = favs;
  document.getElementById('statHist').textContent = hist;
}

// ========== SMART SUGGESTION ==========

function renderSmartSuggestion() {
  smartCat = getSmartSuggestion();
  if (!smartCat) return;
  const el = document.getElementById('smartSuggestion');
  el.classList.remove('hidden');
  const labels = {
    christmas: { label: '❄ Праздничная подборка', icon: '🎄' },
    nature:    { label: '☀ Утренний покой', icon: '🌿' },
    cyberpunk: { label: '☾ Вечернее настроение', icon: '🌃' },
    fantasy:   { label: '⚔ Эпичный полдень', icon: '🏰' },
    steampunk: { label: '⚙ Индустриальный вайб', icon: '🚂' }
  };
  const info = labels[smartCat.id] || { label: '✨ Рекомендуем', icon: '🎬' };
  el.innerHTML = `
    <div>
      <div class="label">${info.label}</div>
      <div class="title">${info.icon} ${capitalize(smartCat.id)}</div>
    </div>
    <div class="action">▶ Смотреть</div>
  `;
}

function openSmart() {
  if (smartCat) openCategory(smartCat.id);
}

function getSmartSuggestion() {
  const h = new Date().getHours();
  const m = new Date().getMonth();
  const isWinter = m === 11 || m === 0 || m === 1;
  if (isWinter) {
    const xmas = categories.find(c => c.id === 'christmas');
    if (xmas && xmas.pairs?.length) return xmas;
  }
  if (h >= 5 && h < 12) return categories.find(c => c.id === 'nature');
  if (h >= 12 && h < 17) return categories.find(c => c.id === 'fantasy');
  if (h >= 17 && h < 22) return categories.find(c => c.id === 'cyberpunk');
  return categories.find(c => c.id === 'anime-lofi') || categories.find(c => c.id === 'steampunk') || categories[0];
}

// ========== CATEGORIES ==========

function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!categories.length) {
    grid.innerHTML = '<p class="empty">Категории не загружены. Проверьте каталог в админке.</p>';
    return;
  }
  grid.innerHTML = categories.map((cat) => {
    const firstPair = cat.pairs?.[0];
    const tags = firstPair ? firstPair.tags.map(t => `<span class="tag">${esc(t.value)}</span>`).join('') : '';
    const icons = { christmas: '🎄', nature: '🌿', cyberpunk: '🌃', fantasy: '🏰', steampunk: '🚂', 'cozy-rain': '🌧️', 'ocean-waves': '🌊', fireplace: '🔥', 'coffee-shop': '☕', 'snow-window': '❄️', 'neon-rain': '🌆', 'starry-night': '🌌', 'zen-garden': '🌸', 'city-night': '🏙️', 'forest-stream': '🍃', 'anime-lofi': '🎌' };
    return `
      <div class="card" onclick="openCategory('${esc(cat.id)}')">
        <div class="card-thumb">
          <span style="font-size:32px">${icons[cat.id] || '🎬'}</span>
          <div class="play-icon">▶</div>
        </div>
        <div class="card-body">
          <h3>${capitalize(esc(cat.id))}</h3>
          <p>${cat.pairs?.length || 0} атмосферных пар</p>
          <div class="card-tags">${tags}</div>
        </div>
      </div>
    `;
  }).join('');
}

function openCategory(catId) {
  location.href = `player.html?category=${encodeURIComponent(catId)}`;
}

// ========== FAVORITES ==========

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('atv_favorites') || '[]'); }
  catch (e) { return []; }
}
function saveFavorites(list) {
  localStorage.setItem('atv_favorites', JSON.stringify(list));
}
function renderFavorites() {
  const favs = getFavorites();
  const grid = document.getElementById('favoritesGrid');
  const empty = document.getElementById('favEmpty');
  grid.innerHTML = '';
  if (!favs.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = favs.map((f) => `
    <div class="card" onclick="openFavorite('${esc(f.videoUrl)}','${esc(f.audioUrl)}','${esc(f.title || '')}')">
      <div class="card-thumb"><span style="font-size:32px">❤</span><div class="play-icon">▶</div></div>
      <div class="card-body">
        <h3>${esc(f.title || 'Без названия')}</h3>
        <p>${capitalize(esc(f.categoryId || ''))}</p>
      </div>
    </div>
  `).join('');
}
function openFavorite(videoUrl, audioUrl, title) {
  const pair = JSON.stringify({ videoUrl, audioUrl, title });
  location.href = `player.html?pair=${encodeURIComponent(pair)}`;
}

// ========== HISTORY ==========

function getHistory() {
  try { return JSON.parse(localStorage.getItem('atv_history') || '[]'); }
  catch (e) { return []; }
}
function saveHistory(list) {
  localStorage.setItem('atv_history', JSON.stringify(list.slice(0, 50)));
}
function renderHistory() {
  const hist = getHistory();
  const list = document.getElementById('historyList');
  const empty = document.getElementById('histEmpty');
  list.innerHTML = '';
  if (!hist.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.innerHTML = hist.map((h) => {
    const pct = h.duration ? Math.min(100, Math.round((h.progress / h.duration) * 100)) : 0;
    return `
    <div class="list-item" onclick="openFavorite('${esc(h.pair.videoUrl)}','${esc(h.pair.audioUrl)}','${esc(h.pair.title || '')}')">
      <div>
        <div class="title">${esc(h.pair.title || 'Без названия')}</div>
        <div class="meta">${capitalize(esc(h.categoryId || ''))} • ${fmtTime(h.progress)} / ${fmtTime(h.duration)}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>
  `}).join('');
}

// ========== SETTINGS ==========

function loadSettings() {
  document.getElementById('sleepTimer').value = localStorage.getItem('atv_sleep_timer') || '0';
  const vol = localStorage.getItem('atv_volume') || '80';
  document.getElementById('volumeSlider').value = vol;
  document.getElementById('volumeValue').textContent = vol + '%';

  document.getElementById('volumeSlider').addEventListener('input', (e) => {
    document.getElementById('volumeValue').textContent = e.target.value + '%';
  });
}
function saveSettings() {
  localStorage.setItem('atv_sleep_timer', document.getElementById('sleepTimer').value);
  localStorage.setItem('atv_volume', document.getElementById('volumeSlider').value);
  showToast('Настройки сохранены');
}

// ========== UTILS ==========

function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
function capitalize(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}
function fmtTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}
function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = isError ? 'error show' : 'show';
  setTimeout(() => t.classList.remove('show'), 3000);
}
