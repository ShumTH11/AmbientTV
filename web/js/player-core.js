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
let videoSyncInterval = null;
let sleepInterval = null;
let sleepSeconds = 0;
let currentPair = null;
let onFatalError = null; // callback for fallback handler
let repeatMode = localStorage.getItem('atv_repeat') === '1';
let playlistQueue = [];
let playlistIndex = 0;
let isPlaylistMode = false;
let autoDJMode = false;
let autoDJTimer = null;
let progressSyncInterval = null;

function initCore(pairParam, categoryId, pairIndex, allCategories) {
  if (pairParam) {
    const pair = JSON.parse(pairParam);
    loadPair(pair, null);
  } else if (categoryId) {
    category = allCategories.find(c => c.id === categoryId);
    if (!category) throw new Error('Категория не найдена');
    pairs = category.pairs || [];
    if (pairs.length === 0) throw new Error('В категории нет пар');
    // Check user-defined default pair for this category
    const savedDefault = localStorage.getItem('atv_default_' + categoryId);
    if (savedDefault !== null) {
      currentIndex = Math.max(0, Math.min(pairs.length - 1, parseInt(savedDefault, 10)));
    } else {
      currentIndex = Math.max(0, Math.min(pairs.length - 1, parseInt(pairIndex || '0', 10)));
    }
    loadPair(pairs[currentIndex], category);
  } else {
    throw new Error('Не указана категория или пара');
  }
}

function initPlaylistPlayer(queue, startIdx) {
  isPlaylistMode = true;
  playlistQueue = queue;
  playlistIndex = Math.max(0, Math.min(queue.length - 1, startIdx));
  if (!queue.length) {
    throw new Error('Плейлист пуст');
  }
  loadPair(playlistQueue[playlistIndex], null);
  updatePlaylistUI();
}

function updatePlaylistUI() {
  const el = document.getElementById('playlistBadge');
  if (el) {
    el.textContent = `📂 ${playlistIndex + 1}/${playlistQueue.length}`;
    el.style.display = isPlaylistMode ? 'inline-block' : 'none';
  }
}

function loadPair(pair, cat) {
  if (!pair) return;
  currentPair = pair;
  const vol = (localStorage.getItem('atv_volume') || 80) / 100;

  // Update repeat button state
  const repeatBtn = document.getElementById('repeatBtn');
  if (repeatBtn) repeatBtn.style.opacity = repeatMode ? '1' : '0.5';

  // Clear old event handlers
  videoEl.onerror = null;
  videoEl.onstalled = null;
  videoEl.onended = null;
  videoEl.loop = true;
  audioEl.onerror = null;
  audioEl.onwaiting = null;
  audioEl.oncanplay = null;
  audioEl.onended = null;

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
  videoEl.onended = () => {
    videoEl.currentTime = 0;
    videoEl.play().catch(() => {});
  };
  videoEl.onerror = () => {
    if (onFatalError) onFatalError('video', pair);
  };
  audioEl.onerror = () => {
    if (onFatalError) onFatalError('audio', pair);
  };
  audioEl.onended = () => {
    if (!isPlaying) return;
    if (repeatMode) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    } else {
      nextPair();
    }
  };

  // Periodic progress sync (every 10 seconds)
  startProgressSync();

  play();
  recordHistory(pair, cat || category);
  populateAudioSelect();
  populateVideoSelect();
  // Show audio select container only if there are multiple audio tracks for this video
  const audioSelectContainer = document.querySelector('.ext-row:has(#audioSelect)');
  if (audioSelectContainer) {
    const currentVideo = normalizeUrl(videoEl.src);
    const audioCount = pairs.filter(p => normalizeUrl(p.videoUrl) === currentVideo).length;
    audioSelectContainer.style.display = audioCount > 1 ? 'flex' : 'none';
  }
}

function normalizeUrl(url) {
  try { return new URL(url, location.href).href; } catch { return url; }
}

function populateAudioSelect() {
  const sel = document.getElementById('audioSelect');
  if (!sel || !category || !pairs.length) return;
  const currentAudio = normalizeUrl(audioEl.src);

  // Собираем уникальные аудио треки для текущего видео
  const currentVideo = normalizeUrl(videoEl.src);
  const uniqueAudios = [];
  const seen = new Set();
  pairs.forEach((p, i) => {
    if (normalizeUrl(p.videoUrl) === currentVideo && !seen.has(p.audioUrl)) {
      seen.add(p.audioUrl);
      const audioTitle = p.title.includes('—') ? p.title.split('—')[1].trim() : p.title;
      uniqueAudios.push({ url: p.audioUrl, title: audioTitle, idx: i });
    }
  });

  sel.innerHTML = uniqueAudios.map((a) => {
    const selected = normalizeUrl(a.url) === currentAudio ? 'selected' : '';
    return `<option value="${esc(a.url)}" ${selected}>${esc(a.title || 'Трек')}</option>`;
  }).join('');
}

function changeAudioTrack() {
  const sel = document.getElementById('audioSelect');
  if (!sel) return;
  const selectedAudioUrl = sel.value;
  if (!selectedAudioUrl) return;

  // Ищем пару с текущим видео + выбранным аудио
  const currentVideo = normalizeUrl(videoEl.src);
  const newPair = pairs.find(p => normalizeUrl(p.videoUrl) === currentVideo && p.audioUrl === selectedAudioUrl);
  if (newPair) {
    audioEl.src = newPair.audioUrl;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
    document.getElementById('pairTitle').textContent = newPair.title || 'Без названия';
    currentPair = newPair;
    currentIndex = pairs.indexOf(newPair);
  } else {
    // Fallback: просто меняем аудио, если точной пары нет
    audioEl.src = selectedAudioUrl;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  }
  populateAudioSelect();
  // Refresh audio select visibility after change
  const audioSelectContainer = document.querySelector('.ext-row:has(#audioSelect)');
  if (audioSelectContainer) {
    const currentVideo = normalizeUrl(videoEl.src);
    const audioCount = pairs.filter(p => normalizeUrl(p.videoUrl) === currentVideo).length;
    audioSelectContainer.style.display = audioCount > 1 ? 'flex' : 'none';
  }
}

function populateVideoSelect() {
  const sel = document.getElementById('videoSelect');
  if (!sel || !category || !pairs.length) return;
  // Build list of unique videos in category
  const uniqueVideos = [];
  const seen = new Set();
  pairs.forEach((p, i) => {
    if (!seen.has(p.videoUrl)) {
      seen.add(p.videoUrl);
      uniqueVideos.push({ url: p.videoUrl, title: p.title || 'Видео ' + (i + 1), idx: i });
    }
  });
  const currentVideo = videoEl.src;
  sel.innerHTML = uniqueVideos.map((v) => {
    const selected = v.url === currentVideo ? 'selected' : '';
    return `<option value="${v.idx}" ${selected}>${esc(v.title)}</option>`;
  }).join('');
}

function changeVideoTrack() {
  const sel = document.getElementById('videoSelect');
  if (!sel) return;
  const idx = parseInt(sel.value, 10);
  if (isNaN(idx) || !pairs[idx]) return;
  const newPair = pairs[idx];
  // Keep audio, swap video only
  videoEl.src = newPair.videoUrl || '';
  videoEl.currentTime = 0;
  videoEl.play().catch(() => {});
  document.getElementById('pairTitle').textContent = newPair.title || 'Без названия';
  currentPair = newPair;
  currentIndex = idx;
  populateVideoSelect();
  populateAudioSelect();
  // Refresh audio select visibility after video change
  const audioSelectContainer = document.querySelector('.ext-row:has(#audioSelect)');
  if (audioSelectContainer) {
    const currentVideo = normalizeUrl(videoEl.src);
    const audioCount = pairs.filter(p => normalizeUrl(p.videoUrl) === currentVideo).length;
    audioSelectContainer.style.display = audioCount > 1 ? 'flex' : 'none';
  }
}

function setAsDefault() {
  if (!category || !pairs[currentIndex]) return;
  localStorage.setItem('atv_default_' + category.id, String(currentIndex));
  showToast('⭐ Эта пара сохранена как основная для "' + capitalize(category.id) + '"');
}

function play() {
  // Wait until both media elements have enough buffered data to avoid stutter
  const needWait = videoEl.readyState < 3 || audioEl.readyState < 3;
  if (needWait) {
    let timer = null;
    const onReady = () => {
      if (videoEl.readyState >= 3 && audioEl.readyState >= 3) {
        clearTimeout(timer);
        videoEl.oncanplaythrough = null;
        audioEl.oncanplaythrough = null;
        doPlay();
      }
    };
    videoEl.oncanplaythrough = onReady;
    audioEl.oncanplaythrough = onReady;
    timer = setTimeout(() => {
      videoEl.oncanplaythrough = null;
      audioEl.oncanplaythrough = null;
      doPlay();
    }, 3000);
    return;
  }
  doPlay();
}

function doPlay() {
  let audioRejected = false;
  const promises = [
    videoEl.play().catch(() => {}),
    audioEl.play().catch((e) => { audioRejected = true; console.log('Audio play blocked:', e.message); })
  ];
  if (layerAudioEl.src && layerAudioEl.src !== window.location.href) {
    promises.push(layerAudioEl.play().catch(() => {}));
  }
  Promise.all(promises).then(() => {
    if (audioRejected) {
      isPlaying = false;
      document.getElementById('playBtn').textContent = '▶';
      return;
    }
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    startSync();
    startVideoSync();
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
  stopVideoSync();
  stopProgressSync();
  // Save final progress on pause
  if (currentPair) {
    const progress = Math.floor(audioEl.currentTime || 0);
    const duration = Math.floor(audioEl.duration || 0);
    apiSaveProgress({
      video_url: currentPair.videoUrl,
      audio_url: currentPair.audioUrl,
      title: currentPair.title,
      category_id: category ? category.id : '',
      progress,
      duration
    }).catch(() => {});
  }
}

function togglePlay() {
  isPlaying ? pause() : play();
}

function toggleRepeat() {
  repeatMode = !repeatMode;
  localStorage.setItem('atv_repeat', repeatMode ? '1' : '0');
  const btn = document.getElementById('repeatBtn');
  if (btn) btn.style.opacity = repeatMode ? '1' : '0.5';
  showToast(repeatMode ? '🔁 Повтор включён' : '🔁 Повтор выключен');
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

// High-frequency video sync to prevent ended event and keep video aligned with audio
function startVideoSync() {
  stopVideoSync();
  videoSyncInterval = setInterval(() => {
    if (!isPlaying) return;
    const vidDur = videoEl.duration || 0;
    if (vidDur <= 0) return;
    const target = (audioEl.currentTime || 0) % vidDur;
    // Keep video aligned with audio modulo its duration
    if (Math.abs(videoEl.currentTime - target) > 0.5) {
      videoEl.currentTime = target;
    }
    if (videoEl.paused) videoEl.play().catch(() => {});
  }, 150);
}
function stopVideoSync() {
  if (videoSyncInterval) { clearInterval(videoSyncInterval); videoSyncInterval = null; }
}

// ========== PROGRESS (from AUDIO) ==========
audioEl.addEventListener('timeupdate', () => {
  const dur = audioEl.duration || 0;
  const cur = audioEl.currentTime || 0;
  const pct = dur ? (cur / dur) * 100 : 0;
  document.getElementById('seekBar').value = pct;
  document.getElementById('curTime').textContent = fmtTime(cur);
  document.getElementById('durTime').textContent = fmtTime(dur);

  // Sync video to audio for seamless ambient loop (audio is master clock)
  const vidDur = videoEl.duration || 0;
  if (vidDur > 0 && isPlaying) {
    const target = cur % vidDur;
    const vidCur = videoEl.currentTime;
    // Detect wrap-around: video near end but audio has looped to beginning
    const nearEnd = vidCur > vidDur - 0.5;
    const targetNearStart = target < 0.5;
    if (nearEnd && targetNearStart) {
      videoEl.currentTime = target;
    } else if (Math.abs(vidCur - target) > 0.3) {
      videoEl.currentTime = target;
    }
    // Keep video playing
    if (videoEl.paused) videoEl.play().catch(() => {});
  }
});

document.getElementById('seekBar').addEventListener('input', (e) => {
  const dur = audioEl.duration || 0;
  audioEl.currentTime = (e.target.value / 100) * dur;
});

// ========== CROSSFADE NAVIGATION ==========
function getUniqueVideoIndices() {
  const seen = new Set();
  const indices = [];
  pairs.forEach((p, i) => {
    if (!seen.has(p.videoUrl)) {
      seen.add(p.videoUrl);
      indices.push(i);
    }
  });
  return indices;
}

async function nextPair() {
  if (!category || pairs.length <= 1) return;

  // Prefer switching audio track while keeping the same video (no crossfade needed)
  if (currentPair) {
    const sameVideoIndices = pairs.map((p, i) => p.videoUrl === currentPair.videoUrl ? i : -1).filter(i => i >= 0);
    const pos = sameVideoIndices.indexOf(currentIndex);
    if (sameVideoIndices.length > 1 && pos >= 0) {
      const nextPos = (pos + 1) % sameVideoIndices.length;
      const nextPair = pairs[sameVideoIndices[nextPos]];
      audioEl.src = nextPair.audioUrl;
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      currentPair = nextPair;
      currentIndex = sameVideoIndices[nextPos];
      document.getElementById('pairTitle').textContent = nextPair.title || 'Без названия';
      populateAudioSelect();
      updateMediaSession();
      // Refresh audio select visibility
      const audioSelectContainer = document.querySelector('.ext-row:has(#audioSelect)');
      if (audioSelectContainer) {
        const currentVideo = normalizeUrl(videoEl.src);
        const audioCount = pairs.filter(p => normalizeUrl(p.videoUrl) === currentVideo).length;
        audioSelectContainer.style.display = audioCount > 1 ? 'flex' : 'none';
      }
      return;
    }
  }

  // Fallback: switch to next unique video with crossfade
  const uniqueIndices = getUniqueVideoIndices();
  if (uniqueIndices.length <= 1) return;
  await crossfadeTo(() => {
    let pos = uniqueIndices.indexOf(currentIndex);
    if (pos < 0) {
      for (let i = 0; i < uniqueIndices.length; i++) {
        if (uniqueIndices[i] > currentIndex) { pos = i - 1; break; }
      }
      if (pos < 0) pos = uniqueIndices.length - 1;
    }
    const nextPos = (pos + 1) % uniqueIndices.length;
    currentIndex = uniqueIndices[nextPos];
    loadPair(pairs[currentIndex], category);
  });
}
async function prevPair() {
  if (!category || pairs.length <= 1) return;

  // Prefer switching audio track while keeping the same video (no crossfade needed)
  if (currentPair) {
    const sameVideoIndices = pairs.map((p, i) => p.videoUrl === currentPair.videoUrl ? i : -1).filter(i => i >= 0);
    const pos = sameVideoIndices.indexOf(currentIndex);
    if (sameVideoIndices.length > 1 && pos >= 0) {
      const prevPos = (pos - 1 + sameVideoIndices.length) % sameVideoIndices.length;
      const prevPair = pairs[sameVideoIndices[prevPos]];
      audioEl.src = prevPair.audioUrl;
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
      currentPair = prevPair;
      currentIndex = sameVideoIndices[prevPos];
      document.getElementById('pairTitle').textContent = prevPair.title || 'Без названия';
      populateAudioSelect();
      updateMediaSession();
      // Refresh audio select visibility
      const audioSelectContainer = document.querySelector('.ext-row:has(#audioSelect)');
      if (audioSelectContainer) {
        const currentVideo = normalizeUrl(videoEl.src);
        const audioCount = pairs.filter(p => normalizeUrl(p.videoUrl) === currentVideo).length;
        audioSelectContainer.style.display = audioCount > 1 ? 'flex' : 'none';
      }
      return;
    }
  }

  // Fallback: switch to previous unique video with crossfade
  const uniqueIndices = getUniqueVideoIndices();
  if (uniqueIndices.length <= 1) return;
  await crossfadeTo(() => {
    let pos = uniqueIndices.indexOf(currentIndex);
    if (pos < 0) {
      for (let i = uniqueIndices.length - 1; i >= 0; i--) {
        if (uniqueIndices[i] < currentIndex) { pos = i; break; }
      }
      if (pos < 0) pos = 0;
    }
    const prevPos = (pos - 1 + uniqueIndices.length) % uniqueIndices.length;
    currentIndex = uniqueIndices[prevPos];
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
    progress: 0, duration: audioEl.duration || 0, watchedAt: Date.now()
  };
  const hist = getHistory();
  hist.unshift(item);
  saveHistory(hist.slice(0, 50));
  try {
    await apiAddHistory({
      video_url: pair.videoUrl, audio_url: pair.audioUrl,
      title: pair.title, category_id: cat ? cat.id : '',
      progress: 0, duration: audioEl.duration || 0
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

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', (e) => {
  // Ignore if user is typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePlay();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      seek(-10);
      break;
    case 'ArrowRight':
      e.preventDefault();
      seek(10);
      break;
    case 'ArrowUp':
      e.preventDefault();
      adjustVolume(5);
      break;
    case 'ArrowDown':
      e.preventDefault();
      adjustVolume(-5);
      break;
    case 'KeyF':
      e.preventDefault();
      toggleFullscreen();
      break;
    case 'KeyM':
      e.preventDefault();
      toggleMute();
      break;
    case 'KeyN':
      e.preventDefault();
      if (isPlaylistMode) {
        playlistNext();
      } else {
        nextPair();
      }
      break;
    case 'KeyP':
      e.preventDefault();
      if (isPlaylistMode) {
        playlistPrev();
      } else {
        prevPair();
      }
      break;
    case 'KeyR':
      e.preventDefault();
      toggleRepeat();
      break;
    case 'KeyD':
      e.preventDefault();
      toggleAutoDJ();
      break;
    case 'KeyS':
      e.preventDefault();
      setAsDefault();
      break;
    case 'KeyI':
      e.preventDefault();
      togglePictureInPicture();
      break;
    case 'KeyH':
      e.preventDefault();
      toggleUI();
      break;
    case 'Digit0':
    case 'Digit1':
    case 'Digit2':
    case 'Digit3':
    case 'Digit4':
    case 'Digit5':
    case 'Digit6':
    case 'Digit7':
    case 'Digit8':
    case 'Digit9':
      e.preventDefault();
      seekToPercent(parseInt(e.key, 10) * 10);
      break;
  }
});

function seek(deltaSeconds) {
  const dur = audioEl.duration || 0;
  if (dur <= 0) return;
  audioEl.currentTime = Math.max(0, Math.min(dur, audioEl.currentTime + deltaSeconds));
}

function seekToPercent(percent) {
  const dur = audioEl.duration || 0;
  if (dur <= 0) return;
  audioEl.currentTime = (percent / 100) * dur;
}

function adjustVolume(delta) {
  const currentVol = Math.round((audioEl.volume || 0) * 100);
  const newVol = Math.max(0, Math.min(100, currentVol + delta));
  audioEl.volume = newVol / 100;
  videoEl.volume = newVol / 100;
  localStorage.setItem('atv_volume', String(newVol));
  showToast(`🔊 Громкость: ${newVol}%`);
}

let wasMuted = false;
let preMuteVolume = 80;
function toggleMute() {
  if (audioEl.muted || videoEl.muted) {
    audioEl.muted = false;
    videoEl.muted = false;
    audioEl.volume = preMuteVolume / 100;
    videoEl.volume = preMuteVolume / 100;
    showToast('🔊 Звук включён');
  } else {
    preMuteVolume = Math.round((audioEl.volume || 0) * 100) || 80;
    audioEl.muted = true;
    videoEl.muted = true;
    showToast('🔇 Звук выключен');
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function toggleAutoDJ() {
  autoDJMode = !autoDJMode;
  const btn = document.getElementById('autoDjBtn');
  if (btn) btn.style.opacity = autoDJMode ? '1' : '0.5';
  showToast(autoDJMode ? '🎲 Auto-DJ включён' : '🎲 Auto-DJ выключен');

  if (autoDJMode) {
    startAutoDJ();
  } else {
    stopAutoDJ();
  }
}

function startAutoDJ() {
  stopAutoDJ();
  // Switch to next track every 3-5 minutes (random)
  const nextTrack = () => {
    if (!autoDJMode || !isPlaying) return;
    const delay = (3 + Math.random() * 2) * 60 * 1000; // 3-5 min
    autoDJTimer = setTimeout(() => {
      if (!autoDJMode || !isPlaying) return;
      if (isPlaylistMode) {
        playlistNext();
      } else {
        nextPair();
      }
      nextTrack();
    }, delay);
  };
  nextTrack();
}

function stopAutoDJ() {
  if (autoDJTimer) {
    clearTimeout(autoDJTimer);
    autoDJTimer = null;
  }
}

// ========== PROGRESS SYNC ==========
function startProgressSync() {
  stopProgressSync();
  progressSyncInterval = setInterval(() => {
    if (!isPlaying || !currentPair) return;
    const progress = Math.floor(audioEl.currentTime || 0);
    const duration = Math.floor(audioEl.duration || 0);
    apiSaveProgress({
      video_url: currentPair.videoUrl,
      audio_url: currentPair.audioUrl,
      title: currentPair.title,
      category_id: category ? category.id : '',
      progress,
      duration
    }).catch(() => {});
  }, 10000); // every 10 seconds
}

function stopProgressSync() {
  if (progressSyncInterval) {
    clearInterval(progressSyncInterval);
    progressSyncInterval = null;
  }
}

// Stop Auto-DJ when manually changing tracks
const originalNextPair = nextPair;
const originalPrevPair = prevPair;
const originalPlaylistNext = playlistNext;
const originalPlaylistPrev = playlistPrev;

function toggleUI() {
  playerOverlay.classList.toggle('ui-force-hidden');
  const hidden = playerOverlay.classList.contains('ui-force-hidden');
  showToast(hidden ? '👁️ UI скрыт (нажмите H для показа)' : '👁️ UI показан');
}

function togglePictureInPicture() {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  } else if (videoEl.requestPictureInPicture) {
    videoEl.requestPictureInPicture().catch(() => {
      showToast('Picture-in-Picture не поддерживается', true);
    });
  } else {
    showToast('Picture-in-Picture не поддерживается браузером', true);
  }
}

// ========== PLAYLIST NAVIGATION ==========
function playlistNext() {
  if (!isPlaylistMode || !playlistQueue.length) return;
  playlistIndex = (playlistIndex + 1) % playlistQueue.length;
  localStorage.setItem('atv_playlist_index', String(playlistIndex));
  crossfadeTo(() => {
    loadPair(playlistQueue[playlistIndex], null);
    updatePlaylistUI();
  });
}

function playlistPrev() {
  if (!isPlaylistMode || !playlistQueue.length) return;
  playlistIndex = (playlistIndex - 1 + playlistQueue.length) % playlistQueue.length;
  localStorage.setItem('atv_playlist_index', String(playlistIndex));
  crossfadeTo(() => {
    loadPair(playlistQueue[playlistIndex], null);
    updatePlaylistUI();
  });
}
