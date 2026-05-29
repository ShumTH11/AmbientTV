const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('AmbientTV Web — Full Integration', () => {

  test('page loads and shows player controls', async ({ page }) => {
    await page.goto(`${BASE_URL}/player.html`);
    await expect(page.locator('#videoEl')).toBeVisible();
    await expect(page.locator('#audioEl')).toBeVisible();
  });

  test('auth modal works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('text=Войти');
    await expect(page.locator('#authModal')).toBeVisible();
  });

  test('API health check', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('API catalog returns categories', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/catalog`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.length).toBeGreaterThan(0);
  });

  test('register and login flow', async ({ request }) => {
    const email = `test_${Date.now()}@example.com`;
    const password = 'testpass123';
    
    const register = await request.post(`${BASE_URL}/api/auth/register`, {
      data: { email, password, name: 'Test User' }
    });
    expect(register.status()).toBe(200);
    
    const login = await request.post(`${BASE_URL}/api/auth/login`, {
      data: { email, password }
    });
    expect(login.status()).toBe(200);
    const body = await login.json();
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(email);
  });

  test('favorites CRUD with cookies', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const email = `fav_${Date.now()}@example.com`;
    const password = 'testpass123';
    
    // Register
    await page.goto(`${BASE_URL}/player.html`);
    await page.evaluate(async ({ email, password }) => {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Fav Test' })
      });
    }, { email, password });
    
    // Login (sets cookie)
    await page.evaluate(async ({ email, password }) => {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
    }, { email, password });
    
    // Add favorite (with cookie)
    const addResponse = await page.evaluate(async () => {
      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          video_url: 'https://example.com/video.mp4',
          audio_url: 'https://example.com/audio.mp3',
          title: 'Test',
          category_id: 'nature'
        })
      });
      return res.status;
    });
    expect(addResponse).toBe(200);
    
    // Get favorites
    const favorites = await page.evaluate(async () => {
      const res = await fetch('/api/user/favorites', { credentials: 'include' });
      return res.json();
    });
    expect(favorites.length).toBeGreaterThan(0);
    expect(favorites[0].title).toBe('Test');
    
    await context.close();
  });

  test('XSS sanitization', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const email = `xss_${Date.now()}@example.com`;
    const password = 'testpass123';
    const xssPayload = '<script>alert(1)</script>';
    
    await page.goto(`${BASE_URL}/player.html`);
    const result = await page.evaluate(async ({ email, password, xssPayload }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: xssPayload })
      });
      return res.json();
    }, { email, password, xssPayload });
    
    expect(result.user.name).not.toContain('<script>');
    expect(result.user.name).toContain('&lt;');
    expect(result.user.name).not.toContain('&amp;lt;'); // no double escaping
    
    await context.close();
  });

  test('URL validation blocks malicious URLs', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const email = `url_${Date.now()}@example.com`;
    const password = 'testpass123';
    
    await page.goto(`${BASE_URL}/player.html`);
    await page.evaluate(async ({ email, password }) => {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'URL Test' })
      });
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
    }, { email, password });
    
    const addResponse = await page.evaluate(async () => {
      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          video_url: 'javascript:alert(1)',
          audio_url: 'https://example.com/audio.mp3',
          title: 'Bad URL',
          category_id: 'nature'
        })
      });
      return res.status;
    });
    expect(addResponse).toBe(400);
    
    await context.close();
  });

});
