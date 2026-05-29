/**
 * AmbientTV Web — Player Core
 * Core playback logic: init, load, play, pause, sync
 */

// DOM refs
const videoEl = document.getElementById('videoEl');
const audioEl = document.getElementById('audioEl');
const layerAudioEl = document.getElementById('layerAudioEl');
const videoWrap = document.getElementById('videoWrap');
const controls = document.getElementById('controls');
const playerOverlay = document.getElementById('playerOverlay');

// State
let category = null;
let pairs = [];
let currentIndex = 0;
let isPlaying = false;
let syncInterval = null;
let sleepInterval = null;
let sleepSeconds = 0;
let currentPair = null;
let onFatalError = null; // callback for fallback handler

function initCore(pairParam, categoryId, allCategories) {
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
}

function loadPair(pair, cat) {
  if (!pair) return;
  currentPair = pair;
  const vol = (localStorage.getItem('atv_volume') || 80) / 100;

  // Clear old error handlers
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

  isPlaying = false;
  document.getElementById('playBtn').textContent = '▶';

  // Metadata
  audioEl.onloadedmetadata = () => {
    document.getElementById('durTime').textContent = fmtTime(audioEl.duration || 0);
  };

  // Fatal error propagation
  videoEl.onerror = () => {
    if (onFatalError) onFatalError('video', pair);
  };
  videoEl.onstalled = videoEl.onerror;
  audioEl.onerror = () => {
    if (onFatalError) onFatalError('audio', pair);
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
  isPlaying ? pause() : play();
}

// ========== SYNC ==========
function startSync() {
  stopSync();
  syncInterval = setInterval(() => {
    if (isPlaying && videoEl.paused) videoEl.play().catch(() => {});
    if (isPlaying && audioEl.paused) audioEl.play().catch(() => {});
  }, 2000);
}
function stopSync() {
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
}

// ========== PROGRESS (from AUDIO) ==========
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
  audioEl.currentTime = (e.target.value / 100) * dur;
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

// ========== HISTORY ==========
async function recordHistory(pair, cat) {
  const item = {
    pair, categoryId: cat ? cat.id : '',
    progress: 0, duration: videoEl.duration || 0, watchedAt: Date.now()
  };
  const hist = getHistory();
  hist.unshift(item);
  saveHistory(hist.slice(0, 50));
  try {
    await apiAddHistory({
      video_url: pair.videoUrl, audio_url: pair.audioUrl,
      title: pair.title, category_id: cat ? cat.id : '',
      progress: 0, duration: videoEl.duration || 0
    });
  } catch (e) {}
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem('atv_history') || '[]'); }
  catch (e) { return []; }
}
function saveHistory(list) {
  localStorage.setItem('atv_history', JSON.stringify(list));
}

// ========== GETTERS ==========
function getCurrentPair() { return currentPair; }
function getPairs() { return pairs; }
function getCurrentIndex() { return currentIndex; }
function setCurrentIndex(i) { currentIndex = i; }
function getCategory() { return category; }
function isPlayerPlaying() { return isPlaying; }
function getVideoEl() { return videoEl; }
function getAudioEl() { return audioEl; }
function getLayerAudioEl() { return layerAudioEl; }
function setOnFatalError(cb) { onFatalError = cb; }
