# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-check.spec.js >> AmbientTV Web — Full Integration >> XSS sanitization
- Location: tests/full-check.spec.js:105:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/player.html
Call log:
  - navigating to "http://localhost:3000/player.html", waiting until "load"

```

# Test source

```ts
  12  | 
  13  |   test('auth modal works', async ({ page }) => {
  14  |     await page.goto(BASE_URL);
  15  |     await page.click('text=Войти');
  16  |     await expect(page.locator('#authModal')).toBeVisible();
  17  |   });
  18  | 
  19  |   test('API health check', async ({ request }) => {
  20  |     const response = await request.get(`${BASE_URL}/api/health`);
  21  |     expect(response.status()).toBe(200);
  22  |     const body = await response.json();
  23  |     expect(body.status).toBe('ok');
  24  |   });
  25  | 
  26  |   test('API catalog returns categories', async ({ request }) => {
  27  |     const response = await request.get(`${BASE_URL}/api/catalog`);
  28  |     expect(response.status()).toBe(200);
  29  |     const body = await response.json();
  30  |     expect(body.length).toBeGreaterThan(0);
  31  |   });
  32  | 
  33  |   test('register and login flow', async ({ request }) => {
  34  |     const email = `test_${Date.now()}@example.com`;
  35  |     const password = 'testpass123';
  36  |     
  37  |     const register = await request.post(`${BASE_URL}/api/auth/register`, {
  38  |       data: { email, password, name: 'Test User' }
  39  |     });
  40  |     expect(register.status()).toBe(200);
  41  |     
  42  |     const login = await request.post(`${BASE_URL}/api/auth/login`, {
  43  |       data: { email, password }
  44  |     });
  45  |     expect(login.status()).toBe(200);
  46  |     const body = await login.json();
  47  |     expect(body.user).toBeDefined();
  48  |     expect(body.user.email).toBe(email);
  49  |   });
  50  | 
  51  |   test('favorites CRUD with cookies', async ({ browser }) => {
  52  |     const context = await browser.newContext();
  53  |     const page = await context.newPage();
  54  |     const email = `fav_${Date.now()}@example.com`;
  55  |     const password = 'testpass123';
  56  |     
  57  |     // Register
  58  |     await page.goto(`${BASE_URL}/player.html`);
  59  |     await page.evaluate(async ({ email, password }) => {
  60  |       await fetch('/api/auth/register', {
  61  |         method: 'POST',
  62  |         headers: { 'Content-Type': 'application/json' },
  63  |         body: JSON.stringify({ email, password, name: 'Fav Test' })
  64  |       });
  65  |     }, { email, password });
  66  |     
  67  |     // Login (sets cookie)
  68  |     await page.evaluate(async ({ email, password }) => {
  69  |       await fetch('/api/auth/login', {
  70  |         method: 'POST',
  71  |         headers: { 'Content-Type': 'application/json' },
  72  |         credentials: 'include',
  73  |         body: JSON.stringify({ email, password })
  74  |       });
  75  |     }, { email, password });
  76  |     
  77  |     // Add favorite (with cookie)
  78  |     const addResponse = await page.evaluate(async () => {
  79  |       const res = await fetch('/api/user/favorites', {
  80  |         method: 'POST',
  81  |         headers: { 'Content-Type': 'application/json' },
  82  |         credentials: 'include',
  83  |         body: JSON.stringify({
  84  |           video_url: 'https://example.com/video.mp4',
  85  |           audio_url: 'https://example.com/audio.mp3',
  86  |           title: 'Test',
  87  |           category_id: 'nature'
  88  |         })
  89  |       });
  90  |       return res.status;
  91  |     });
  92  |     expect(addResponse).toBe(200);
  93  |     
  94  |     // Get favorites
  95  |     const favorites = await page.evaluate(async () => {
  96  |       const res = await fetch('/api/user/favorites', { credentials: 'include' });
  97  |       return res.json();
  98  |     });
  99  |     expect(favorites.length).toBeGreaterThan(0);
  100 |     expect(favorites[0].title).toBe('Test');
  101 |     
  102 |     await context.close();
  103 |   });
  104 | 
  105 |   test('XSS sanitization', async ({ browser }) => {
  106 |     const context = await browser.newContext();
  107 |     const page = await context.newPage();
  108 |     const email = `xss_${Date.now()}@example.com`;
  109 |     const password = 'testpass123';
  110 |     const xssPayload = '<script>alert(1)</script>';
  111 |     
> 112 |     await page.goto(`${BASE_URL}/player.html`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/player.html
  113 |     const result = await page.evaluate(async ({ email, password, xssPayload }) => {
  114 |       const res = await fetch('/api/auth/register', {
  115 |         method: 'POST',
  116 |         headers: { 'Content-Type': 'application/json' },
  117 |         body: JSON.stringify({ email, password, name: xssPayload })
  118 |       });
  119 |       return res.json();
  120 |     }, { email, password, xssPayload });
  121 |     
  122 |     expect(result.user.name).not.toContain('<script>');
  123 |     expect(result.user.name).toContain('&lt;');
  124 |     expect(result.user.name).not.toContain('&amp;lt;'); // no double escaping
  125 |     
  126 |     await context.close();
  127 |   });
  128 | 
  129 |   test('URL validation blocks malicious URLs', async ({ browser }) => {
  130 |     const context = await browser.newContext();
  131 |     const page = await context.newPage();
  132 |     const email = `url_${Date.now()}@example.com`;
  133 |     const password = 'testpass123';
  134 |     
  135 |     await page.goto(`${BASE_URL}/player.html`);
  136 |     await page.evaluate(async ({ email, password }) => {
  137 |       await fetch('/api/auth/register', {
  138 |         method: 'POST',
  139 |         headers: { 'Content-Type': 'application/json' },
  140 |         body: JSON.stringify({ email, password, name: 'URL Test' })
  141 |       });
  142 |       await fetch('/api/auth/login', {
  143 |         method: 'POST',
  144 |         headers: { 'Content-Type': 'application/json' },
  145 |         credentials: 'include',
  146 |         body: JSON.stringify({ email, password })
  147 |       });
  148 |     }, { email, password });
  149 |     
  150 |     const addResponse = await page.evaluate(async () => {
  151 |       const res = await fetch('/api/user/favorites', {
  152 |         method: 'POST',
  153 |         headers: { 'Content-Type': 'application/json' },
  154 |         credentials: 'include',
  155 |         body: JSON.stringify({
  156 |           video_url: 'javascript:alert(1)',
  157 |           audio_url: 'https://example.com/audio.mp3',
  158 |           title: 'Bad URL',
  159 |           category_id: 'nature'
  160 |         })
  161 |       });
  162 |       return res.status;
  163 |     });
  164 |     expect(addResponse).toBe(400);
  165 |     
  166 |     await context.close();
  167 |   });
  168 | 
  169 | });
  170 | 
```