const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const ADMIN_PASSWORD = 'change_me_in_production';

test.describe('AmbientTV Admin Panel', () => {

  test('admin login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('#login-btn')).toBeVisible();
  });

  test('admin login with correct password', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-btn');
    await expect(page.locator('#admin-screen')).toBeVisible();
    await expect(page.locator('#login-screen')).toBeHidden();
  });

  test('admin login with wrong password fails', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await page.fill('#login-password', 'wrong_password');
    await page.click('#login-btn');
    await expect(page.locator('#login-error')).toContainText('Неверный пароль');
  });

  test('catalog loads after login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-btn');
    await page.waitForSelector('#category-list', { timeout: 5000 });
    const categories = await page.locator('.cat-item').count();
    expect(categories).toBeGreaterThan(0);
  });

  test('add new category', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-btn');
    await page.waitForSelector('#add-category-btn');

    page.on('dialog', async dialog => {
      await dialog.accept('test-new-category');
    });

    await page.click('#add-category-btn');
    await page.waitForTimeout(500);

    const catItems = page.locator('.cat-item');
    await expect(catItems.filter({ hasText: 'test-new-category' })).toBeVisible();

    // Cleanup: delete the category
    const newCat = catItems.filter({ hasText: 'test-new-category' });
    await newCat.locator('.cat-del').click();
    await page.waitForTimeout(300);
  });

  test('add and delete pair in category', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-btn');
    await page.waitForSelector('.cat-item');

    // Click first category
    await page.click('.cat-item:first-child');
    await page.waitForTimeout(300);

    // Add pair
    await page.click('.add-pair-btn');
    await page.waitForTimeout(300);

    // Edit pair title
    const lastPair1 = page.locator('.pair-card').last();
    await lastPair1.locator('.pair-title-input').fill('Test Pair Title');
    await lastPair1.locator('input[placeholder="URL видео"]').fill('https://videos.pexels.com/test.mp4');
    await lastPair1.locator('input[placeholder="URL аудио"]').fill('https://archive.org/test.mp3');

    // Delete the pair
    const pairCountBefore = await page.locator('.pair-card').count();
    await page.locator('.pair-card').last().locator('.btn-danger').click();
    await page.waitForTimeout(300);
    const pairCountAfter = await page.locator('.pair-card').count();
    expect(pairCountAfter).toBeLessThan(pairCountBefore);
  });

  test('save catalog persists changes', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-btn');
    await page.waitForSelector('.cat-item');

    // Click first category
    await page.click('.cat-item:first-child');
    await page.waitForTimeout(300);

    // Add pair
    await page.click('.add-pair-btn');
    await page.waitForTimeout(300);
    await page.locator('.pair-card').last().locator('.pair-title-input').fill('Save Test Pair');

    // Save
    await page.click('#save-btn');
    await page.waitForTimeout(1000);

    // Check toast
    await expect(page.locator('#toast')).toContainText('Сохранено');

    // Reload and verify
    await page.reload();
    await page.waitForSelector('#login-password');
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-btn');
    await page.click('.cat-item:first-child');
    await page.waitForTimeout(500);

    await expect(page.locator('.pair-card').last().locator('.pair-title-input')).toHaveValue('Save Test Pair');
  });

  test('admin stats endpoint', async ({ request }) => {
    // Login via API to get cookie
    const login = await request.post(`${BASE_URL}/api/admin/login`, {
      data: { password: ADMIN_PASSWORD }
    });
    expect(login.status()).toBe(200);
    const cookies = login.headers()['set-cookie'];

    const stats = await request.get(`${BASE_URL}/api/admin/stats`, {
      headers: { 'Cookie': cookies }
    });
    expect(stats.status()).toBe(200);
    const body = await stats.json();
    expect(body.categories).toBeGreaterThan(0);
    expect(body.totalPairs).toBeGreaterThan(0);
  });

  test('admin catalog CRUD via API', async ({ request }) => {
    const login = await request.post(`${BASE_URL}/api/admin/login`, {
      data: { password: ADMIN_PASSWORD }
    });
    expect(login.status()).toBe(200);
    const cookies = login.headers()['set-cookie'];

    // Get catalog
    const catalog = await request.get(`${BASE_URL}/api/admin/catalog`, {
      headers: { 'Cookie': cookies }
    });
    expect(catalog.status()).toBe(200);
    const data = await catalog.json();
    const originalCount = data.categories.length;

    // Add category
    data.categories.push({ id: 'api-test-cat', pairs: [] });
    data.categories.find(c => c.id === 'api-test-cat').pairs.push({
      videoUrl: 'https://test.com/video.mp4',
      audioUrl: 'https://test.com/audio.mp3',
      title: 'API Test',
      tags: [{ key: 'mood', value: 'calm' }]
    });

    // Save
    const save = await request.post(`${BASE_URL}/api/admin/catalog`, {
      headers: { 'Cookie': cookies, 'Content-Type': 'application/json' },
      data: data
    });
    expect(save.status()).toBe(200);

    // Verify
    const verify = await request.get(`${BASE_URL}/api/admin/catalog`, {
      headers: { 'Cookie': cookies }
    });
    const verifyData = await verify.json();
    expect(verifyData.categories.length).toBe(originalCount + 1);
    const testCat = verifyData.categories.find(c => c.id === 'api-test-cat');
    expect(testCat).toBeDefined();
    expect(testCat.pairs[0].title).toBe('API Test');

    // Cleanup
    verifyData.categories = verifyData.categories.filter(c => c.id !== 'api-test-cat');
    await request.post(`${BASE_URL}/api/admin/catalog`, {
      headers: { 'Cookie': cookies, 'Content-Type': 'application/json' },
      data: verifyData
    });
  });

  test('admin logout clears session', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/`);
    await page.fill('#login-password', ADMIN_PASSWORD);
    await page.click('#login-btn');
    await page.waitForSelector('#admin-screen');

    await page.click('#logout-btn');
    await page.waitForTimeout(500);
    await expect(page.locator('#login-screen')).toBeVisible();
  });

});
