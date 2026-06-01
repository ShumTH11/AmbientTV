const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Player Debug', () => {
  test('nature playback state', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    page.on('pageerror', err => logs.push('PAGEERROR: ' + err.message));

    await page.goto(`${BASE_URL}/player.html?category=nature`);
    await page.waitForTimeout(4000);

    const state = await page.evaluate(() => {
      const video = document.getElementById('videoEl');
      const audio = document.getElementById('audioEl');
      return {
        videoPaused: video ? video.paused : 'null',
        videoCurrentTime: video ? video.currentTime : 'null',
        videoDuration: video ? video.duration : 'null',
        videoReadyState: video ? video.readyState : 'null',
        videoError: video ? (video.error ? video.error.code : 'none') : 'null',
        audioPaused: audio ? audio.paused : 'null',
        audioCurrentTime: audio ? audio.currentTime : 'null',
        audioDuration: audio ? audio.duration : 'null',
        audioReadyState: audio ? audio.readyState : 'null',
        audioError: audio ? (audio.error ? audio.error.code : 'none') : 'null',
        audioNetworkState: audio ? audio.networkState : 'null',
        audioSrc: audio ? audio.src : 'null',
        pairTitle: document.getElementById('pairTitle')?.textContent || 'null',
        categoryName: document.getElementById('categoryName')?.textContent || 'null',
        playBtn: document.getElementById('playBtn')?.textContent || 'null',
        durTime: document.getElementById('durTime')?.textContent || 'null',
        isPlaying: typeof isPlayerPlaying !== 'undefined' ? isPlayerPlaying() : 'undefined'
      };
    });

    console.log('Nature state:', JSON.stringify(state, null, 2));
    console.log('Console logs:', logs.join('\n'));
  });
});
