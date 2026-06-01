/**
 * AmbientTV Web — Player UI
 * Auto-hide, keyboard, media session, warm filter, layered sounds, scene selector
 */

let uiHideTimer = null;
let wakeLock = null;
let allCategories = [];

function initUI(categories) {
  allCategories = categories || [];
  renderSceneSelector();
  setupAutoHideUI();
  setupMediaSession();
  setupKeyboardShortcuts();
  setupWarmFilter();
  setupLayeredSounds();
  requestWakeLock();
}

// ========== SCENE SELECTOR ==========
function renderSceneSelector() {
  const container = document.getElementById('sceneSelector');
  if (!container || allCategories.length < 2) return;
  container.innerHTML = allCategories.slice(0, 8).map(cat => {
    const active = cat.id === new URLSearchParams(location.search).get('category') ? 'active' : '';
    const icons = { christmas: '🎄', nature: '🌿', cyberpunk: '🌃', fantasy: '🏰', steampunk: '🚂', 'cozy-rain': '🌧️', 'ocean-waves': '🌊', fireplace: '🔥', 'coffee-shop': '☕', 'snow-window': '❄️', 'neon-rain': '🌆', 'starry-night': '🌌', 'zen-garden': '🌸', 'city-night': '🏙️', 'forest-stream': '🍃' };
    return `<button class="${active}" onclick="switchScene('${esc(cat.id)}')">${icons[cat.id] || '🎬'} ${capitalize(cat.id)}</button>`;
  }).join('');
}
function switchScene(catId) {
  location.href = `player.html?category=${encodeURIComponent(catId)}`;
}

// ========== AUTO-HIDE UI ==========
function setupAutoHideUI() {
  resetUIHideTimer();
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach(evt => {
    document.addEventListener(evt, resetUIHideTimer);
  });
}
function resetUIHideTimer() {
  // If UI is force-hidden by user, do not restore full controls on mouse move
  if (playerOverlay.classList.contains('ui-force-hidden')) {
    return;
  }
  controls.classList.add('visible');
  playerOverlay.classList.add('active-ui');
  document.getElementById('uiHint').classList.add('hidden');
  if (uiHideTimer) clearTimeout(uiHideTimer);
  uiHideTimer = setTimeout(() => {
    controls.classList.remove('visible');
    playerOverlay.classList.remove('active-ui');
  }, 5000);
}

function toggleUI() {
  const isHidden = playerOverlay.classList.toggle('ui-force-hidden');
  if (isHidden) {
    controls.classList.remove('visible');
    playerOverlay.classList.remove('active-ui');
    document.getElementById('uiHint').classList.add('hidden');
    if (uiHideTimer) clearTimeout(uiHideTimer);
  } else {
    playerOverlay.classList.remove('ui-force-hidden');
    resetUIHideTimer();
  }
}

// ========== WAKE LOCK ==========
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      document.getElementById('wakeBtn').textContent = '🖥️';
      document.getElementById('wakeBtn').title = 'Screen stays on';
      wakeLock.addEventListener('release', () => {
        document.getElementById('wakeBtn').textContent = '💤';
        document.getElementById('wakeBtn').title = 'Screen may sleep';
      });
    } catch (e) {}
  }
}
async function toggleWakeLock() {
  if (!wakeLock) {
    await requestWakeLock();
  } else {
    wakeLock.release();
    wakeLock = null;
    document.getElementById('wakeBtn').textContent = '💤';
  }
}

// ========== MEDIA SESSION API ==========
function setupMediaSession() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevPair());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextPair());
  }
}
function updateMediaSession() {
  if ('mediaSession' in navigator) {
    const pair = getCurrentPair();
    const cat = getCategory();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: pair?.title || 'AmbientTV',
      artist: cat ? capitalize(cat.id) : 'Ambient',
      album: 'AmbientTV Experience',
      artwork: [{ src: '', sizes: '512x512', type: 'image/png' }]
    });
    navigator.mediaSession.playbackState = isPlayerPlaying() ? 'playing' : 'paused';
  }
}

// ========== WARM FILTER ==========
function setupWarmFilter() {
  const slider = document.getElementById('warmFilter');
  if (!slider) return;
  const saved = localStorage.getItem('atv_warm_filter');
  if (saved) slider.value = saved;
  applyWarmFilter(slider.value);
  slider.addEventListener('input', (e) => {
    applyWarmFilter(e.target.value);
    localStorage.setItem('atv_warm_filter', e.target.value);
  });
}
function applyWarmFilter(val) {
  const pct = val / 100;
  const sepia = pct * 0.6;
  const brightness = 1 - (pct * 0.15);
  const contrast = 1 - (pct * 0.05);
  videoWrap.style.filter = `sepia(${sepia}) brightness(${brightness}) contrast(${contrast})`;
}

// ========== LAYERED SOUNDS ==========
function setupLayeredSounds() {
  const volSlider = document.getElementById('layerVol');
  if (!volSlider) return;
  volSlider.addEventListener('input', updateLayerVolume);
  updateLayerVolume();
}
function changeLayerSound() {
  const select = document.getElementById('layerSelect');
  const url = select.value;
  if (url) {
    layerAudioEl.src = url;
    layerAudioEl.loop = true;
    layerAudioEl.play().catch(() => {});
  } else {
    layerAudioEl.pause();
    layerAudioEl.src = '';
  }
  updateLayerVolume();
}
function updateLayerVolume() {
  if (!layerAudioEl.src || layerAudioEl.src === window.location.href) return;
  const master = (localStorage.getItem('atv_volume') || 80) / 100;
  const layerPct = (document.getElementById('layerVol')?.value || 30) / 100;
  layerAudioEl.volume = master * layerPct;
}

// ========== KEYBOARD SHORTCUTS ==========
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    switch (e.code) {
      case 'Space': e.preventDefault(); togglePlay(); break;
      case 'ArrowRight': nextPair(); break;
      case 'ArrowLeft': prevPair(); break;
      case 'ArrowUp': e.preventDefault(); adjustVolume(5); break;
      case 'ArrowDown': e.preventDefault(); adjustVolume(-5); break;
      case 'KeyM': toggleMute(); break;
      case 'KeyF': toggleFullscreen(); break;
      case 'Escape': if (document.fullscreenElement) toggleFullscreen(); else goBack(); break;
    }
    resetUIHideTimer();
  });
}
function adjustVolume(delta) {
  let vol = parseInt(localStorage.getItem('atv_volume') || 80);
  vol = Math.max(0, Math.min(100, vol + delta));
  localStorage.setItem('atv_volume', vol);
  const v = vol / 100;
  videoEl.volume = v;
  audioEl.volume = v;
  updateLayerVolume();
  updateVolDisplay();
  showToast(`Громкость ${vol}%`);
}
function toggleMute() {
  if (videoEl.muted) {
    videoEl.muted = false;
    audioEl.muted = false;
    layerAudioEl.muted = false;
    showToast('🔊 Звук включён');
  } else {
    videoEl.muted = true;
    audioEl.muted = true;
    layerAudioEl.muted = true;
    showToast('🔇 Звук выключен');
  }
}
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}
function updateVolDisplay() {
  const vol = localStorage.getItem('atv_volume') || 80;
  document.getElementById('volDisplay').textContent = vol + '%';
}

// ========== FAVORITES ==========
async function toggleFavorite() {
  const pair = getCurrentPair();
  if (!pair) return;
  const favs = getFavorites();
  const idx = favs.findIndex(f => f.videoUrl === pair.videoUrl && f.audioUrl === pair.audioUrl);
  if (idx >= 0) {
    favs.splice(idx, 1);
    try { await apiRemoveFavorite(pair.videoUrl, pair.audioUrl); } catch (e) {}
  } else {
    const cat = getCategory();
    favs.unshift({ ...pair, categoryId: cat ? cat.id : '' });
    try { await apiAddFavorite({ video_url: pair.videoUrl, audio_url: pair.audioUrl, title: pair.title, category_id: cat ? cat.id : '' }); } catch (e) {}
  }
  saveFavorites(favs);
  updateFavButton(pair);
}
function updateFavButton(pair) {
  const favs = getFavorites();
  const isFav = favs.some(f => f.videoUrl === pair.videoUrl && f.audioUrl === pair.audioUrl);
  document.getElementById('favBtn').textContent = isFav ? '❤' : '♡';
}
function getFavorites() {
  try { return JSON.parse(localStorage.getItem('atv_favorites') || '[]'); }
  catch (e) { return []; }
}
function saveFavorites(list) {
  localStorage.setItem('atv_favorites', JSON.stringify(list));
}

// ========== NAVIGATION ==========
function goBack() {
  location.href = 'index.html';
}

// ========== UTILS ==========
function fmtTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}
function esc(s) {
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}
function capitalize(s) {
  return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'show';
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ========== SHORTCUT HELP ==========
let shortcutHelpVisible = false;
function toggleShortcutHelp() {
  shortcutHelpVisible = !shortcutHelpVisible;
  let overlay = document.getElementById('shortcutHelpOverlay');
  if (!shortcutHelpVisible) {
    if (overlay) overlay.remove();
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'shortcutHelpOverlay';
    overlay.innerHTML = `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:300; display:flex; align-items:center; justify-content:center;">
        <div style="background:#16161e; border:1px solid #2a2a3a; border-radius:14px; padding:28px; max-width:420px; width:90%;">
          <h3 style="color:#7dd3fc; margin-bottom:16px; font-size:18px;">⌨️ Горячие клавиши</h3>
          <div style="display:grid; grid-template-columns:auto 1fr; gap:8px 16px; font-size:14px; color:#e2e2e2;">
            <span style="color:#94a3b8; font-family:monospace;">Space</span><span>Play / Pause</span>
            <span style="color:#94a3b8; font-family:monospace;">← →</span><span>Назад / Вперёд на 10с</span>
            <span style="color:#94a3b8; font-family:monospace;">↑ ↓</span><span>Громкость +/-</span>
            <span style="color:#94a3b8; font-family:monospace;">F</span><span>Полноэкранный режим</span>
            <span style="color:#94a3b8; font-family:monospace;">M</span><span>Вкл/выкл звук</span>
            <span style="color:#94a3b8; font-family:monospace;">N</span><span>Следующий трек</span>
            <span style="color:#94a3b8; font-family:monospace;">P</span><span>Предыдущий трек</span>
            <span style="color:#94a3b8; font-family:monospace;">R</span><span>Повтор вкл/выкл</span>
            <span style="color:#94a3b8; font-family:monospace;">D</span><span>Auto-DJ вкл/выкл</span>
            <span style="color:#94a3b8; font-family:monospace;">S</span><span>Сохранить как основную</span>
            <span style="color:#94a3b8; font-family:monospace;">I</span><span>Picture-in-Picture</span>
            <span style="color:#94a3b8; font-family:monospace;">H</span><span>Скрыть/показать UI</span>
            <span style="color:#94a3b8; font-family:monospace;">0-9</span><span>Перейти к % трека</span>
          </div>
          <button onclick="toggleShortcutHelp()" style="margin-top:20px; width:100%; padding:10px; background:#0ea5e9; color:#fff; border:none; border-radius:6px; font-weight:700; cursor:pointer;">Закрыть</button>
        </div>
    `;
    document.body.appendChild(overlay);
  }
}
