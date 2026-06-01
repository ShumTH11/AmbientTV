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
  // Check local media status first
  let mediaStatus = { hasLocalMedia: false };
  try {
    mediaStatus = await apiMediaStatus();
  } catch (e) {
    console.log('Media status check failed:', e.message);
  }
  window.ambientMediaStatus = mediaStatus;

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
  renderMediaStatus();
}

function renderMediaStatus() {
  const status = window.ambientMediaStatus || { hasLocalMedia: false };
  const el = document.getElementById('mediaStatus');
  if (!el) return;
  if (status.hasLocalMedia) {
    el.innerHTML = `
      <span class="local-badge" title="${status.videos?.length || 0} видео + ${status.audios?.length || 0} аудио локально">
        💾 Локально: ${status.videos?.length || 0} видео, ${status.audios?.length || 0} аудио
        (${status.totalVideoMB || 0} MB + ${status.totalAudioMB || 0} MB)
      </span>`;
    el.classList.remove('hidden');
  } else {
    el.innerHTML = `<span class="remote-badge">🌐 Все медиа загружаются из сети</span>`;
    el.classList.remove('hidden');
  }
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
  const captchaToken = document.getElementById('captchaToken').value;
  document.getElementById('authError').textContent = '';

  if (!captchaToken) {
    document.getElementById('authError').textContent = 'Пожалуйста, пройдите капчу';
    return;
  }

  try {
    const res = await apiRegister(email, password, name, captchaToken);
    currentUser = res.user;
    document.getElementById('authModal').classList.add('hidden');
    updateUserBadge();
    showToast('Аккаунт создан! Добро пожаловать, ' + res.user.name + '!');
  } catch (e) {
    document.getElementById('authError').textContent = e.message;
    // Reset captcha on error
    document.getElementById('captchaToken').value = '';
    if (window.smartCaptcha) {
      window.smartCaptcha.reset();
    }
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
  ['browse','favorites','history','playlists','profile'].forEach(s => {
    document.getElementById('sec-' + s).classList.add('hidden');
    document.getElementById('nav-' + s).classList.remove('active');
  });
  document.getElementById('sec-' + name).classList.remove('hidden');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'favorites') renderFavorites();
  if (name === 'history') renderHistory();
  if (name === 'playlists') renderPlaylists();
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
  const playlists = currentPlaylists?.length || 0;
  const watchTime = Math.round(getHistory().reduce((sum, h) => sum + (h.duration || 0), 0) / 60);

  document.getElementById('statFav').textContent = favs;
  document.getElementById('statHist').textContent = hist;
  document.getElementById('statPlaylists').textContent = playlists;
  document.getElementById('statWatchTime').textContent = watchTime;
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
    steampunk: { label: '⚙ Индустриальный вайб', icon: '🚂' },
    'anime-lofi': { label: '🌙 Ночной чилл', icon: '🎌' }
  };
  const info = labels[smartCat.id] || { label: smartCat.reason || '✨ Рекомендуем', icon: '🎬' };
  el.innerHTML = `
    <div>
      <div class="label">${info.label}</div>
      <div class="title">${info.icon} ${capitalize(smartCat.id)}</div>
      <div style="font-size:12px; color:#64748b; margin-top:4px;">${smartCat.reason || ''}</div>
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
  const day = new Date().getDay();
  const isWinter = m === 11 || m === 0 || m === 1;
  const isWeekend = day === 0 || day === 6;

  // Winter holidays priority
  if (isWinter) {
    const xmas = categories.find(c => c.id === 'christmas');
    if (xmas && xmas.pairs?.length) return { ...xmas, reason: '❄ Зимняя подборка' };
  }

  // Time-based suggestions
  if (h >= 5 && h < 10) {
    const cat = categories.find(c => c.id === 'nature');
    if (cat) return { ...cat, reason: '☀ Утренний покой' };
  }
  if (h >= 10 && h < 13) {
    const cat = categories.find(c => c.id === 'fantasy');
    if (cat) return { ...cat, reason: '⚔ Энергия полдня' };
  }
  if (h >= 13 && h < 17) {
    const cat = categories.find(c => c.id === 'steampunk');
    if (cat) return { ...cat, reason: '⚙ Рабочий фокус' };
  }
  if (h >= 17 && h < 21) {
    const cat = categories.find(c => c.id === 'cyberpunk');
    if (cat) return { ...cat, reason: '☾ Вечернее настроение' };
  }
  if (h >= 21 || h < 1) {
    const cat = categories.find(c => c.id === 'anime-lofi');
    if (cat) return { ...cat, reason: '🌙 Ночной чилл' };
  }
  if (h >= 1 && h < 5) {
    const cat = categories.find(c => c.id === 'anime-lofi');
    if (cat) return { ...cat, reason: '🌌 Глубокая ночь' };
  }

  // Weekend fallback
  if (isWeekend) {
    const cat = categories.find(c => c.id === 'anime-lofi') || categories.find(c => c.id === 'nature');
    if (cat) return { ...cat, reason: '🎉 Выходной вайб' };
  }

  return categories[0] ? { ...categories[0], reason: '✨ Рекомендуем' } : null;
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
    const videoUrl = firstPair?.videoUrl;
    const icons = { christmas: '🎄', nature: '🌿', cyberpunk: '🌃', fantasy: '🏰', steampunk: '🚂', 'cozy-rain': '🌧️', 'ocean-waves': '🌊', fireplace: '🔥', 'coffee-shop': '☕', 'snow-window': '❄️', 'neon-rain': '🌆', 'starry-night': '🌌', 'zen-garden': '🌸', 'city-night': '🏙️', 'forest-stream': '🍃', 'anime-lofi': '🎌' };
    const fallbackIcon = icons[cat.id] || '🎬';
    return `
      <div class="card" onclick="openCategory('${esc(cat.id)}')">
        <div class="card-thumb">
          ${videoUrl
            ? `<video src="${esc(videoUrl)}" preload="none" muted playsinline data-thumb
               style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;"></video>`
            : `<span style="font-size:32px">${fallbackIcon}</span>`
          }
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

  // Lazy-load video thumbnails only when cards enter viewport
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          video.preload = 'auto';
          video.load();
          video.oncanplay = () => { video.currentTime = 0.1; };
          observer.unobserve(video);
        }
      });
    }, { rootMargin: '100px' });
    document.querySelectorAll('.card-thumb video[data-thumb]').forEach(v => observer.observe(v));
  }
}

function openCategory(catId) {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;
  document.getElementById('categoryModalTitle').textContent = capitalize(esc(cat.id));
  renderCategoryPairs(cat);
  document.getElementById('categoryModal').classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('categoryModal').classList.add('hidden');
}

function getVideoThumbnail(videoUrl) {
  if (!videoUrl) return '';
  // Pexels: extract ID from .../video-files/ID/...
  const m = videoUrl.match(/pexels\.com\/video-files\/(\d+)/);
  if (m) return `https://images.pexels.com/videos/${m[1]}/pexels-photo-${m[1]}.jpeg?auto=compress&cs=tinysrgb&w=640`;
  return '';
}

function renderCategoryPairs(cat) {
  const grid = document.getElementById('categoryPairsGrid');

  // Группируем пары по уникальному видео
  const videoMap = new Map(); // videoUrl → { indices: [pair indices], defaultIdx: first index }
  cat.pairs.forEach((p, i) => {
    if (!videoMap.has(p.videoUrl)) {
      videoMap.set(p.videoUrl, { indices: [], defaultIdx: i });
    }
    videoMap.get(p.videoUrl).indices.push(i);
  });

  grid.innerHTML = Array.from(videoMap.entries()).map(([videoUrl, info]) => {
    const firstPair = cat.pairs[info.defaultIdx];
    const videoTitle = firstPair.title.includes('—')
      ? firstPair.title.split('—')[0].trim()
      : firstPair.title;

    return `
      <div class="pair-card" data-video-url="${esc(videoUrl)}">
        <div class="video-thumb" style="position:relative; overflow:hidden; background:#0a0a10;">
          <video src="${esc(videoUrl)}" preload="none" muted playsinline data-thumb
            style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;"></video>
        </div>
        <div class="card-body">
          <h4>${esc(videoTitle || 'Без названия')}</h4>
          <p>${info.indices.length} аудио трек(ов)</p>
          <button class="play-btn" data-pair-index="${info.defaultIdx}" onclick="openPair('${esc(cat.id)}', this.dataset.pairIndex)" style="margin-top:10px; width:100%; padding:10px; background:#0ea5e9; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">▶ Смотреть</button>
        </div>
      </div>
    `;
  }).join('');

  // Lazy-load video thumbnails in modal
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          video.preload = 'auto';
          video.load();
          video.oncanplay = () => { video.currentTime = 0.1; };
          observer.unobserve(video);
        }
      });
    }, { rootMargin: '100px' });
    document.querySelectorAll('#categoryPairsGrid video[data-thumb]').forEach(v => observer.observe(v));
  }
}

function openPair(catId, index) {
  location.href = `player.html?category=${encodeURIComponent(catId)}&index=${index}`;
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

  // Load theme
  const savedTheme = localStorage.getItem('atv_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    updateThemeIcon();
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('atv_theme', isLight ? 'light' : 'dark');
  updateThemeIcon();
  showToast(isLight ? '☀️ Светлая тема' : '🌙 Тёмная тема');
}
function updateThemeIcon() {
  const toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
  }
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

// ========== PLAYLISTS ==========

let currentPlaylists = [];
let currentPlaylistDetail = null;

async function renderPlaylists() {
  const grid = document.getElementById('playlistsGrid');
  const empty = document.getElementById('playlistsEmpty');
  const detail = document.getElementById('playlistDetail');

  if (!currentUser) {
    grid.innerHTML = '<p class="empty">Войдите, чтобы создавать плейлисты</p>';
    empty.classList.add('hidden');
    detail.classList.add('hidden');
    return;
  }

  try {
    currentPlaylists = await apiGetPlaylists();
  } catch (e) {
    showToast('Ошибка загрузки плейлистов: ' + e.message, true);
    currentPlaylists = [];
  }

  grid.innerHTML = '';
  if (!currentPlaylists.length) {
    empty.classList.remove('hidden');
    detail.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = currentPlaylists.map((pl) => `
    <div class="card" onclick="openPlaylistDetail(${pl.id})">
      <div class="card-thumb"><span style="font-size:32px">📂</span><div class="play-icon">▶</div></div>
      <div class="card-body">
        <h3>${esc(pl.name)}</h3>
        <p>${pl.item_count || 0} треков</p>
        <button onclick="event.stopPropagation(); deletePlaylist(${pl.id})" style="margin-top:8px; padding:6px 12px; background:#ef4444; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">🗑 Удалить</button>
      </div>
    </div>
  `).join('');

  // If detail was open, refresh it
  if (currentPlaylistDetail && !detail.classList.contains('hidden')) {
    openPlaylistDetail(currentPlaylistDetail.id);
  }
}

async function createPlaylist() {
  const nameInput = document.getElementById('newPlaylistName');
  const name = nameInput.value.trim();
  if (!name) {
    showToast('Введите название плейлиста', true);
    return;
  }
  try {
    await apiCreatePlaylist(name);
    nameInput.value = '';
    showToast('Плейлист создан');
    renderPlaylists();
  } catch (e) {
    showToast('Ошибка: ' + e.message, true);
  }
}

async function deletePlaylist(id) {
  if (!confirm('Удалить плейлист?')) return;
  try {
    await apiDeletePlaylist(id);
    showToast('Плейлист удалён');
    if (currentPlaylistDetail && currentPlaylistDetail.id === id) {
      closePlaylistDetail();
    }
    renderPlaylists();
  } catch (e) {
    showToast('Ошибка: ' + e.message, true);
  }
}

async function openPlaylistDetail(id) {
  try {
    const pl = await apiGetPlaylist(id);
    currentPlaylistDetail = pl;
    document.getElementById('playlistDetailTitle').textContent = pl.name;
    const list = document.getElementById('playlistItemsList');

    if (!pl.items || !pl.items.length) {
      list.innerHTML = '<p class="empty">Плейлист пуст. Добавляйте треки из плеера.</p>';
    } else {
      list.innerHTML = pl.items.map((item, idx) => `
        <div class="list-item">
          <div>
            <div class="title">${esc(item.title || 'Без названия')}</div>
            <div class="meta">${capitalize(esc(item.category_id || ''))}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button onclick="playPlaylistItem(${idx})" style="padding:6px 12px; background:#0ea5e9; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">▶</button>
            <button onclick="removeFromPlaylist(${item.id})" style="padding:6px 12px; background:#ef4444; color:#fff; border:none; border-radius:4px; font-size:12px; cursor:pointer;">✕</button>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('playlistDetail').classList.remove('hidden');
    document.getElementById('playlistsGrid').classList.add('hidden');
    document.getElementById('playlistsToolbar').classList.add('hidden');
    document.getElementById('playlistsEmpty').classList.add('hidden');
  } catch (e) {
    showToast('Ошибка загрузки плейлиста: ' + e.message, true);
  }
}

function closePlaylistDetail() {
  document.getElementById('playlistDetail').classList.add('hidden');
  document.getElementById('playlistsGrid').classList.remove('hidden');
  document.getElementById('playlistsToolbar').classList.remove('hidden');
  currentPlaylistDetail = null;
  renderPlaylists();
}

function playPlaylist() {
  if (!currentPlaylistDetail || !currentPlaylistDetail.items || !currentPlaylistDetail.items.length) {
    showToast('Плейлист пуст', true);
    return;
  }
  // Build pairs array and navigate to player with playlist mode
  const pairs = currentPlaylistDetail.items.map(item => ({
    videoUrl: item.video_url,
    audioUrl: item.audio_url,
    title: item.title,
    categoryId: item.category_id
  }));
  localStorage.setItem('atv_playlist_queue', JSON.stringify(pairs));
  localStorage.setItem('atv_playlist_index', '0');
  location.href = 'player.html?playlist=1';
}

function playPlaylistItem(idx) {
  if (!currentPlaylistDetail || !currentPlaylistDetail.items) return;
  const item = currentPlaylistDetail.items[idx];
  if (!item) return;
  const pair = JSON.stringify({
    videoUrl: item.video_url,
    audioUrl: item.audio_url,
    title: item.title
  });
  location.href = `player.html?pair=${encodeURIComponent(pair)}`;
}

async function removeFromPlaylist(itemId) {
  if (!currentPlaylistDetail) return;
  try {
    await apiRemoveFromPlaylist(currentPlaylistDetail.id, itemId);
    showToast('Трек удалён из плейлиста');
    openPlaylistDetail(currentPlaylistDetail.id);
  } catch (e) {
    showToast('Ошибка: ' + e.message, true);
  }
}

// Global helper to add current pair to playlist from player
async function addToPlaylistFromPlayer(playlistId, pair) {
  try {
    await apiAddToPlaylist(playlistId, {
      video_url: pair.videoUrl,
      audio_url: pair.audioUrl,
      title: pair.title,
      category_id: pair.categoryId || ''
    });
    showToast('Добавлено в плейлист');
  } catch (e) {
    showToast('Ошибка: ' + e.message, true);
  }
}
