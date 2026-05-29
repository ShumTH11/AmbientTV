const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'player.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/player.html?category=nature',
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
});

const window = dom.window;
const document = window.document;

window.onerror = (msg, url, line, col, err) => {
  console.log('WINDOW ERROR:', msg, 'at line', line, 'col', col);
  if (err) console.log('Stack:', err.stack);
};

// Load config.js
const configJs = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'js', 'config.js'), 'utf8');
const scriptConfig = document.createElement('script');
scriptConfig.textContent = configJs;
document.head.appendChild(scriptConfig);

// Load api.js
const apiJs = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'js', 'api.js'), 'utf8');
const scriptApi = document.createElement('script');
scriptApi.textContent = apiJs;
document.head.appendChild(scriptApi);

// Mock fetch
global.fetch = (url) => {
  console.log('FETCH:', url);
  if (url.includes('/api/catalog')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        categories: [
          { id: 'nature', pairs: [{ videoUrl: 'https://example.com/video.mp4', audioUrl: 'https://example.com/audio.mp3', title: 'Test' }] }
        ]
      })
    });
  }
  return Promise.resolve({ ok: false, status: 404 });
};

// Load player.js
const playerJs = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'js', 'player.js'), 'utf8');
const scriptPlayer = document.createElement('script');
scriptPlayer.textContent = playerJs;
document.head.appendChild(scriptPlayer);

setTimeout(() => {
  console.log('=== CHECKING ELEMENTS ===');
  console.log('videoEl:', !!document.getElementById('videoEl'));
  console.log('audioEl:', !!document.getElementById('audioEl'));
  console.log('playBtn:', !!document.getElementById('playBtn'));
  console.log('toast:', !!document.getElementById('toast'));
  console.log('layerAudioEl:', !!document.getElementById('layerAudioEl'));
  console.log('videoWrap:', !!document.getElementById('videoWrap'));
  console.log('controls:', !!document.getElementById('controls'));
  console.log('pairTitle:', !!document.getElementById('pairTitle'));
  console.log('categoryName:', !!document.getElementById('categoryName'));
  console.log('volDisplay:', !!document.getElementById('volDisplay'));
  console.log('sleepBadge:', !!document.getElementById('sleepBadge'));
  console.log('sleepTime:', !!document.getElementById('sleepTime'));
  console.log('sleepOverlay:', !!document.getElementById('sleepOverlay'));
  console.log('sleepCountdown:', !!document.getElementById('sleepCountdown'));
  console.log('seekBar:', !!document.getElementById('seekBar'));
  console.log('curTime:', !!document.getElementById('curTime'));
  console.log('durTime:', !!document.getElementById('durTime'));
  console.log('wakeBtn:', !!document.getElementById('wakeBtn'));
  console.log('favBtn:', !!document.getElementById('favBtn'));
  console.log('warmFilter:', !!document.getElementById('warmFilter'));
  console.log('layerSelect:', !!document.getElementById('layerSelect'));
  console.log('layerVol:', !!document.getElementById('layerVol'));
  console.log('uiHint:', !!document.getElementById('uiHint'));
  console.log('sceneSelector:', !!document.getElementById('sceneSelector'));
  console.log('volBadge:', !!document.getElementById('volBadge'));
  
  console.log('\n=== SIMULATING CLICK ===');
  try {
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
      playBtn.click();
      console.log('Play clicked successfully');
    }
  } catch(e) {
    console.log('CLICK ERROR:', e.message);
    console.log(e.stack);
  }
  
  dom.window.close();
}, 3000);
