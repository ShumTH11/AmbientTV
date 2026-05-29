/**
 * AmbientTV Web — Player Fallback
 * Retry logic + source fallback for failed media
 */

let retryCount = { video: 0, audio: 0 };
const MAX_RETRIES = 2;

function initFallback() {
  setOnFatalError((type, failedPair) => {
    handleMediaFailure(type, failedPair);
  });
}

function handleMediaFailure(type, failedPair) {
  retryCount[type]++;
  showToast(`${type === 'video' ? 'Видео' : 'Аудио'} недоступно (попытка ${retryCount[type]}/${MAX_RETRIES})...`);

  if (retryCount[type] <= MAX_RETRIES) {
    // Retry same source after delay
    setTimeout(() => {
      if (type === 'video') {
        videoEl.src = failedPair.videoUrl;
        videoEl.play().catch(() => {});
      } else {
        audioEl.src = failedPair.audioUrl;
        audioEl.play().catch(() => {});
      }
    }, 3000);
    return;
  }

  // Max retries exceeded — try next pair or show error
  retryCount[type] = 0;

  const currentPairs = getPairs();
  if (currentPairs.length > 1) {
    showToast('Источник не отвечает, переключаем...');
    pause();
    // Find next working pair
    findWorkingPair(type, failedPair);
  } else {
    showToast('Медиа недоступно. Попробуйте позже.');
    pause();
  }
}

async function findWorkingPair(type, failedPair) {
  const currentPairs = getPairs();
  let startIdx = (getCurrentIndex() + 1) % currentPairs.length;
  let checked = 0;

  while (checked < currentPairs.length) {
    const idx = (startIdx + checked) % currentPairs.length;
    const candidate = currentPairs[idx];
    if (!candidate) { checked++; continue; }

    // Try to probe the failed media type
    const url = type === 'video' ? candidate.videoUrl : candidate.audioUrl;
    const isAvailable = await probeMedia(url, type);

    if (isAvailable) {
      setCurrentIndex(idx);
      loadPair(candidate, getCategory());
      showToast(`Переключено: ${candidate.title || 'Без названия'}`);
      return;
    }
    checked++;
  }

  showToast('Все источники недоступны. Попробуйте позже.');
}

function probeMedia(url, mediaType) {
  return new Promise(resolve => {
    if (!url) { resolve(false); return; }
    const el = document.createElement(mediaType === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    el.muted = true;

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; resolve(false); }
    }, 5000);

    el.oncanplaythrough = () => {
      if (!resolved) { resolved = true; clearTimeout(timeout); resolve(true); }
    };
    el.onerror = () => {
      if (!resolved) { resolved = true; clearTimeout(timeout); resolve(false); }
    };
    el.src = url;
    el.load();
  });
}

// Reset retry counts on successful load
function resetRetries() {
  retryCount = { video: 0, audio: 0 };
}
