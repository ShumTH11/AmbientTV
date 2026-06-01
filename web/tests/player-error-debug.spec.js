const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Player Error Debug', () => {
  test('log errors over 20s', async ({ page }) => {
    test.setTimeout(35000);
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    page.on('pageerror', err => logs.push('PAGEERROR: ' + err.message));

    await page.goto(`${BASE_URL}/player.html?category=nature`);
    await page.waitForTimeout(2000);
    await page.click('#playBtn');

    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const state = await page.evaluate((idx) => {
        const video = document.getElementById('videoEl');
        const audio = document.getElementById('audioEl');
        return {
          sec: idx + 1,
          vTime: video?.currentTime?.toFixed(2),
          aTime: audio?.currentTime?.toFixed(2),
          aPaused: audio?.paused,
          vPaused: video?.paused,
        };
      }, i);
      console.log(JSON.stringify(state));
    }

    console.log('Console logs:', logs.join('\n'));
  });
});
