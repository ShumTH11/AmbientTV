const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  try {
    await page.goto('http://localhost:3000/player.html?category=nature', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch(e) {
    console.log('Navigation timeout, continuing...');
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  const html = await page.content();
  console.log('Page loaded, length:', html.length);
  
  // Check if video element exists
  const hasVideo = await page.evaluate(() => !!document.getElementById('videoEl'));
  console.log('Has videoEl:', hasVideo);
  
  // Check if play button exists
  const hasPlayBtn = await page.evaluate(() => !!document.getElementById('playBtn'));
  console.log('Has playBtn:', hasPlayBtn);
  
  // Try clicking play
  try {
    await page.click('#playBtn');
    console.log('Clicked playBtn');
    await new Promise(r => setTimeout(r, 3000));
  } catch(e) {
    console.log('Click error:', e.message);
  }
  
  await browser.close();
})();
