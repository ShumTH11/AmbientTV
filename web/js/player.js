/**
 * AmbientTV Web — Player Logic (Extended)
 * Features: Auto-hide UI, Wake Lock, Media Session, Warm Filter, Layered Sounds,
 *           Keyboard shortcuts, Scene selector, Gapless crossfade
 */

const params = new URLSearchParams(location.search);
const categoryId = params.get('category');
const pairParam = params.get('pair');

const videoEl = document.getElementById('videoEl');
const audioEl = document.getElementById('audioEl');
const layerAudioEl = document.getElementById('layerAudioEl');
const videoWrap = document.getElementById('videoWrap');
const controls = document.getElementById('controls');
const playerOverlay = document.getElementById('playerOverlay');

let category = null;
let pairs = [];
let currentIndex = 0;
let isPlaying = false;
let sleepInterval = null;
let sleepSeconds = 0;
let syncInterval = null;
let uiHideTimer = null;
let wakeLock = null;
let allCategories = [];

initPlayer();

async function initPlayer() {
  try {
    // Load catalog for scene selector
    const catalog = await apiCatalog();
    allCategories = catalog.categories || [];
    renderSceneSelector();

    if (pairParam) {
      const pair = JSON.parse(pairParam);
      loadPair(pair, null);
    } else if (categoryId) {
      category = allCategories.find(c => c.id === categoryId);
      if (!category) throw new Error('Категория не найдена');
      pairs = category.pairs || [];
      if (pairs.length === 0) throw new Error('В категории нет пар');
      currentIndex = 0;
      loadPair(pairs[0], category);
    } else {
      throw new Error('Не указана категория или пара');
    }

    setupAutoHideUI();
    setupMediaSession();
    setupKeyboardShortcuts();
    setupWarmFilter();
    setupLayeredSounds();
    requestWakeLock();
  } catch (e) {
    alert('Ошибка: ' + e.message);
    goBack();
  }
}

// ========== SCENE SELECTOR ==========
function renderSceneSelector() {
  const container = document.getElementById('sceneSelector');
  if (!container || allCategories.length < 2) return;
  container.innerHTML = allCategories.slice(0, 8).map(cat => {
    const active = cat.id === categoryId ? 'active' : '';
    const icons = { christmas: '🎄', nature: '🌿', cyberpunk: '🌃', fantasy: '🏰', steampunk: '🚂', 'cozy-rain': '🌧️', 'ocean-waves': '🌊', fireplace: '🔥', 'coffee-shop': '☕', 'snow-window': '❄️', 'neon-rain': '🌆', 'starry-night': '🌌', 'zen-garden': '🌸', 'city-night': '🏙️', 'forest-stream': '🍃' };
    return `<button class="${active}" onclick="switchScene('${esc(cat.id)}')">${icons[cat.id] || '🎬'} ${capitalize(cat.id)}</button>`;
  }).join('');
}
function switchScene(catId) {
  location.href = `player.html?category=${encodeURIComponent(catId)}`;
}

// ========== LOAD / PLAY ==========
function loadPair(pair, cat) {
  if (!pair) return;
  const vol = (localStorage.getItem('atv_volume') || 80) / 100;

  // Clear old error handlers to avoid false triggers during src swap
  videoEl.onerror = null;
  videoEl.onstalled = null;
  audioEl.onerror = null;
  audioEl.onwaiting = null;
  audioEl.oncanplay = null;

  videoEl.src = pair.videoUrl || '';
  audioEl.src = pair.audioUrl || '';
  videoEl.volume = vol;
  audioEl.volume = vol;

  document.getElementById('pairTitle').textContent = pair.title || 'Без названия';
  document.getElementById('categoryName').textContent = cat ? cat.id : (category ? category.id : '-');
  updateFavButton(pair);
  updateVolDisplay();

  isPlaying = false;
  document.getElementById('playBtn').textContent = '▶';

  // Wait for audio metadata to know duration
  audioEl.onloadedmetadata = () => {
    document.getElementById('durTime').textContent = fmtTime(audioEl.duration || 0);
  };

  // Error handling
  videoEl.onerror = () => {
    showToast('Видео недоступно, переключаем...');
    pause();
    if (pairs.length > 1) {
      currentIndex = (currentIndex + 1) % pairs.length;
      loadPair(pairs[currentIndex], category);
    }
  };
  videoEl.onstalled = videoEl.onerror;
  audioEl.onerror = () => {
    showToast('Аудио недоступно: ' + (pair.audioUrl ? pair.audioUrl.split('/').pop() : 'нет URL'));
    pause();
  };

  play();
  recordHistory(pair, cat || category);
}

function play() {
  const promises = [
    videoEl.play().catch(() => {}),
    audioEl.play().catch(() => {})
  ];
  if (layerAudioEl.src && layerAudioEl.src !== window.location.href) {
    promises.push(layerAudioEl.play().catch(() => {}));
  }
  Promise.all(promises).then(() => {
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    startSync();
    startSleepTimer();
    updateMediaSession();
  });
}
function pause() {
  videoEl.pause();
  audioEl.pause();
  layerAudioEl.pause();
  isPlaying = false;
  document.getElementById('playBtn').textContent = '▶';
  stopSync();
}
function togglePlay() {
  if (isPlaying) pause(); else play();
}

// ========== SYNC (disabled for ambient: video loops independently) ==========
function startSync() {
  stopSync();
  // Ambient concept: video is a short loop, audio is the long track.
  // Do NOT sync audio to video — that would reset audio to 0 every video loop.
  // Instead, just keep both playing independently.
  syncInterval = setInterval(() => {
    // Only ensure both are playing if supposed to be
    if (isPlaying && videoEl.paused) { videoEl.play().catch(() => {}); }
    if (isPlaying && audioEl.paused) { audioEl.play().catch(() => {}); }
  }, 2000);
}
function stopSync() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
}

// ========== PROGRESS (from AUDIO, not video) ==========
audioEl.addEventListener('timeupdate', () => {
  const dur = audioEl.duration || 0;
  const cur = audioEl.currentTime || 0;
  const pct = dur ? (cur / dur) * 100 : 0;
  document.getElementById('seekBar').value = pct;
  document.getElementById('curTime').textContent = fmtTime(cur);
  document.getElementById('durTime').textContent = fmtTime(dur);
});

document.getElementById('seekBar').addEventListener('input', (e) => {
  const dur = audioEl.duration || 0;
  const t = (e.target.value / 100) * dur;
  audioEl.currentTime = t;
  // Video is short loop — just let it continue looping
});

// ========== CROSSFADE NAVIGATION ==========
async function nextPair() {
  if (!category || pairs.length <= 1) return;
  await crossfadeTo(() => {
    currentIndex = (currentIndex + 1) % pairs.length;
    loadPair(pairs[currentIndex], category);
  });
}
async function prevPair() {
  if (!category || pairs.length <= 1) return;
  await crossfadeTo(() => {
    currentIndex = (currentIndex - 1 + pairs.length) % pairs.length;
    loadPair(pairs[currentIndex], category);
  });
}

function crossfadeTo(loadFn) {
  return new Promise(resolve => {
    const steps = 20; const stepTime = 40;
    const startVol = parseFloat(localStorage.getItem('atv_volume') || 80) / 100;
    let i = 0;
    const fade = setInterval(() => {
      i++;
      const v = startVol * (1 - i / steps);
      videoEl.volume = Math.max(0, v);
      audioEl.volume = Math.max(0, v);
      layerAudioEl.volume = Math.max(0, v * (document.getElementById('layerVol').value / 100));
      if (i >= steps) {
        clearInterval(fade);
        pause();
        loadFn();
        let j = 0;
        const fadeIn = setInterval(() => {
          j++;
          const vi = startVol * (j / steps);
          videoEl.volume = vi;
          audioEl.volume = vi;
          layerAudioEl.volume = vi * (document.getElementById('layerVol').value / 100);
          if (j >= steps) { clearInterval(fadeIn); resolve(); }
        }, stepTime);
      }
    }, stepTime);
  });
}

// ========== FAVORITES ==========
async function toggleFavorite() {
  const pair = pairs[currentIndex] || (pairParam ? JSON.parse(pairParam) : null);
  if (!pair) return;
  const favs = getFavorites();
  const idx = favs.findIndex(f => f.videoUrl === pair.videoUrl && f.audioUrl === pair.audioUrl);
  if (idx >= 0) {
    favs.splice(idx, 1);
    if (CONFIG.isLoggedIn()) {
      try { await apiRemoveFavorite(pair.videoUrl, pair.audioUrl); } catch (e) {}
    }
  } else {
    favs.unshift({ ...pair, categoryId: category ? category.id : '' });
    if (CONFIG.isLoggedIn()) {
      try { await apiAddFavorite({ video_url: pair.videoUrl, audio_url: pair.audioUrl, title: pair.title, category_id: category ? category.id : '' }); } catch (e) {}
    }
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

// ========== HISTORY ==========
async function recordHistory(pair, cat) {
  const item = {
    pair, categoryId: cat ? cat.id : '',
    progress: 0, duration: videoEl.duration || 0, watchedAt: Date.now()
  };
  const hist = getHistory();
  hist.unshift(item);
  saveHistory(hist.slice(0, 50));

  if (CONFIG.isLoggedIn()) {
    try {
      await apiAddHistory({
        video_url: pair.videoUrl, audio_url: pair.audioUrl,
        title: pair.title, category_id: cat ? cat.id : '',
        progress: 0, duration: videoEl.duration || 0
      });
    } catch (e) {}
  }
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem('atv_history') || '[]'); }
  catch (e) { return []; }
}
function saveHistory(list) {
  localStorage.setItem('atv_history', JSON.stringify(list));
}

// ========== SLEEP TIMER ==========
function startSleepTimer() {
  if (sleepInterval) clearInterval(sleepInterval);
  const minutes = parseInt(localStorage.getItem('atv_sleep_timer') || '0');
  if (!minutes) {
    document.getElementById('sleepBadge').classList.add('hidden');
    return;
  }
  sleepSeconds = minutes * 60;
  document.getElementById('sleepBadge').classList.remove('hidden');
  updateSleepDisplay();
  sleepInterval = setInterval(() => {
    sleepSeconds--;
    updateSleepDisplay();
    if (sleepSeconds <= 0) {
      clearInterval(sleepInterval);
      pause();
      document.getElementById('sleepOverlay').classList.remove('hidden');
    }
  }, 1000);
}
function updateSleepDisplay() {
  const m = Math.floor(sleepSeconds / 60);
  const s = sleepSeconds % 60;
  document.getElementById('sleepTime').textContent = `${m}:${s.toString().padStart(2,'0')}`;
  document.getElementById('sleepCountdown').textContent = `${m}:${s.toString().padStart(2,'0')}`;
}

// ========== AUTO-HIDE UI ==========
function setupAutoHideUI() {
  resetUIHideTimer();
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach(evt => {
    document.addEventListener(evt, resetUIHideTimer);
  });
}
function resetUIHideTimer() {
  controls.classList.add('visible');
  playerOverlay.classList.add('active-ui');
  document.getElementById('uiHint').classList.add('hidden');
  if (uiHideTimer) clearTimeout(uiHideTimer);
  uiHideTimer = setTimeout(() => {
    controls.classList.remove('visible');
    playerOverlay.classList.remove('active-ui');
  }, 5000);
}

// ========== WAKE LOCK (Keep Screen On) ==========
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
    const pair = pairs[currentIndex] || (pairParam ? JSON.parse(pairParam) : null);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: pair?.title || 'AmbientTV',
      artist: category ? capitalize(category.id) : 'Ambient',
      album: 'AmbientTV Experience',
      artwork: [{ src: '', sizes: '512x512', type: 'image/png' }]
    });
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
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
