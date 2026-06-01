/**
 * AmbientTV Web — Player Main Entry
 * Orchestrates core, UI, and fallback modules
 */

const params = new URLSearchParams(location.search);
const categoryId = params.get('category');
const pairParam = params.get('pair');
const pairIndex = params.get('index');
const playlistMode = params.get('playlist') === '1';

initPlayer();

async function initPlayer() {
  try {
    const catalog = await apiCatalog();
    const allCategories = catalog.categories || [];

    initUI(allCategories);

    // Check for resume progress
    const resumeParams = new URLSearchParams(location.search);
    const resumeCategory = resumeParams.get('category');
    const resumePair = resumeParams.get('pair');

    // Playlist mode: load queue from localStorage
    if (playlistMode) {
      const queue = JSON.parse(localStorage.getItem('atv_playlist_queue') || '[]');
      const startIdx = parseInt(localStorage.getItem('atv_playlist_index') || '0', 10);
      initPlaylistPlayer(queue, startIdx);
      return;
    }

    initCore(pairParam, categoryId, pairIndex, allCategories);

    // Try to resume progress from server
    if (currentUser && currentPair) {
      try {
        const progress = await apiGetProgress(currentPair.videoUrl, currentPair.audioUrl);
        if (progress && progress.progress > 0 && progress.duration > 0) {
          const pct = Math.min(95, (progress.progress / progress.duration) * 100);
          audioEl.currentTime = progress.progress;
          showToast(`⏯ Возобновлено с ${fmtTime(progress.progress)}`);
        }
      } catch (e) {
        console.log('Resume failed:', e);
      }
    }

    initFallback();
  } catch (e) {
    alert('Ошибка: ' + e.message);
    goBack();
  }
}
