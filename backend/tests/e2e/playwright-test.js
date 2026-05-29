const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
  function log(label, status, detail) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    results.push(`${icon} ${label}: ${detail}`);
  }

  try {
    // 1. Главная страница загружается
    const response = await page.goto('http://localhost:3999', { waitUntil: 'domcontentloaded', timeout: 15000 });
    log('Page load', response.ok() ? 'PASS' : 'FAIL', `status ${response.status()}`);

    // 2. Auth modal присутствует
    const authModal = await page.$('#authModal');
    log('Auth modal', authModal ? 'PASS' : 'FAIL', authModal ? 'found' : 'not found');

    // 3. Loader присутствует
    const loader = await page.$('#loader');
    log('Loader', loader ? 'PASS' : 'FAIL', loader ? 'found' : 'not found');

    // 4. Переключение на player.html
    await page.goto('http://localhost:3999/player.html?category=nature', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // 5. Video element
    const videoEl = await page.$('#videoEl');
    log('Video element', videoEl ? 'PASS' : 'FAIL', videoEl ? 'found' : 'not found');

    // 6. Audio element
    const audioEl = await page.$('#audioEl');
    log('Audio element', audioEl ? 'PASS' : 'FAIL', audioEl ? 'found' : 'not found');

    // 7. Play button
    const playBtn = await page.$('#playBtn');
    log('Play button', playBtn ? 'PASS' : 'FAIL', playBtn ? 'found' : 'not found');

    // 8. Сцена Nature загружена
    await page.waitForTimeout(2000);
    const categoryName = await page.$eval('#categoryName', el => el.textContent).catch(() => null);
    log('Category loaded', categoryName ? 'PASS' : 'FAIL', categoryName || 'not loaded');

    // 9. Клик Play
    if (playBtn) {
      await playBtn.click();
      await page.waitForTimeout(1000);
      const isPlaying = await page.evaluate(() => {
        const v = document.getElementById('videoEl');
        return v && !v.paused;
      });
      log('Play click', isPlaying ? 'PASS' : 'FAIL', isPlaying ? 'video playing' : 'video not playing');
    }

    // 10. API health
    const health = await page.evaluate(async () => {
      const r = await fetch('/api/health');
      return r.ok ? await r.json() : null;
    });
    log('API health', health && health.status === 'ok' ? 'PASS' : 'FAIL', health ? JSON.stringify(health) : 'failed');

    // 11. CORS test — should fail with wrong origin
    const corsRes = await fetch('http://localhost:3999/api/health', {
      headers: { 'Origin': 'http://evil.com' }
    }).catch(() => ({ ok: false, status: 0 }));
    // Note: this uses Node fetch, not browser context

    // 12. Check localStorage JWT (web vulnerability check)
    const jwt = await page.evaluate(() => localStorage.getItem('atv_jwt'));
    log('JWT localStorage', jwt === null ? 'PASS' : 'INFO', jwt ? 'JWT present' : 'JWT empty (not logged in)');

    // 13. Test login
    await page.goto('http://localhost:3999', { waitUntil: 'domcontentloaded' });
    await page.fill('#loginEmail', 'test2@example.com');
    await page.fill('#loginPassword', 'testpass123');
    await page.click('#tab-login');
    await page.click('#authFormLogin button');
    await page.waitForTimeout(2000);
    
    const jwtAfter = await page.evaluate(() => localStorage.getItem('atv_jwt'));
    log('Login flow', jwtAfter ? 'PASS' : 'FAIL', jwtAfter ? 'JWT stored' : 'No JWT');

    // 14. Test favorites after login
    if (jwtAfter) {
      const fav = await page.evaluate(async () => {
        const r = await fetch('/api/user/favorites', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('atv_jwt') } });
        return r.ok ? await r.json() : null;
      });
      log('Favorites API', Array.isArray(fav) ? 'PASS' : 'FAIL', Array.isArray(fav) ? `array[${fav.length}]` : 'failed');
    }

  } catch (e) {
    log('Error', 'FAIL', e.message);
  }

  await browser.close();

  console.log('\n=== AmbientTV Web Test Results ===\n');
  results.forEach(r => console.log(r));
  const passed = results.filter(r => r.includes('✅')).length;
  const failed = results.filter(r => r.includes('❌')).length;
  console.log(`\nPassed: ${passed}, Failed: ${failed}, Total: ${results.length}`);
})();
