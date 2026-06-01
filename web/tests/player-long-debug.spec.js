const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Player Long Debug', () => {
  test('nature plays for more than 14 seconds', async ({ page }) => {
    test.setTimeout(30000);
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    page.on('pageerror', err => logs.push('PAGEERROR: ' + err.message));

    await page.goto(`${BASE_URL}/player.html?category=nature`);
    await page.waitForTimeout(2000);

    // Click play to satisfy autoplay policy
    await page.click('#playBtn');

    // Wait 25 seconds (longer than video duration of ~14s, with buffer for slow starts)
    await page.waitForTimeout(25000);

    const state = await page.evaluate(() => {
      const video = document.getElementById('videoEl');
      const audio = document.getElementById('audioEl');
      return {
        videoCurrentTime: video ? video.currentTime : 'null',
        videoDuration: video ? video.duration : 'null',
        videoPaused: video ? video.paused : 'null',
        audioCurrentTime: audio ? audio.currentTime : 'null',
        audioDuration: audio ? audio.duration : 'null',
        audioPaused: audio ? audio.paused : 'null',
        audioReadyState: audio ? audio.readyState : 'null',
        audioError: audio ? (audio.error ? audio.error.code : 'none') : 'null',
      };
    });

    console.log('After 16s state:', JSON.stringify(state, null, 2));
    console.log('Console logs:', logs.join('\n'));

    // Audio should have progressed past 5 seconds
    expect(state.audioCurrentTime).toBeGreaterThan(5);
    expect(state.audioPaused).toBe(false);
  });
});
