process.chdir('E:\\Ambient TV\\ambienttv');
process.env.PORT = process.env.PORT || '3997';
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.REDIS_HOST = '';

const http = require('http');

function httpReq(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: process.env.PORT,
      path,
      method,
      headers: Object.assign({}, headers || {})
    };
    if (body) opts.headers['Content-Type'] = 'application/json';
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        // Capture set-cookie header
        const setCookie = res.headers['set-cookie'] || [];
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, setCookie });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const app = require('./backend/app.js');
  const server = app.listen(process.env.PORT, async () => {
    console.log('Server on', process.env.PORT);
    let cookie = '';
    let passed = 0;
    let failed = 0;

    function check(name, ok, detail) {
      if (ok) { console.log('  PASS', name); passed++; }
      else { console.error('  FAIL', name, '-', detail); failed++; }
    }

    function getCookie(res) {
      return (res.setCookie || [])
        .map(c => c.split(';')[0])
        .join('; ');
    }

    try {
      // 1. Health
      const h = await httpReq('GET', '/api/health');
      check('health', h.status === 200 || h.status === 503, h.status + ' ' + JSON.stringify(h.body).substring(0, 100));

      // 2. Catalog
      const cat = await httpReq('GET', '/api/catalog');
      check('catalog', cat.status === 200 && Array.isArray(cat.body.categories) && cat.body.categories.length === 7,
        `status=${cat.status} cats=${cat.body.categories?.length}`);

      // 3. Register (capture cookie)
      const email = 'test' + Date.now() + '@t.com';
      const reg = await httpReq('POST', '/api/auth/register', {
        email, password: 'TestPass123!', name: 'Test User'
      });
      cookie = getCookie(reg);
      check('register', reg.status === 200 && reg.body.user && reg.body.user.email === email,
        `status=${reg.status} user=${JSON.stringify(reg.body.user)}`);

      // 4. Profile (with cookie from register)
      const prof = await httpReq('GET', '/api/auth/profile', null, { Cookie: cookie });
      check('profile', prof.status === 200 && prof.body.email === email,
        `status=${prof.status} email=${prof.body.email || prof.body.error}`);

      // 5. Add YouTube scene to favorites
      const ytScene = {
        source: 'youtube', ref: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        categoryId: 'nature'
      };
      const fav = await httpReq('POST', '/api/user/favorites', { scene: ytScene }, { Cookie: cookie });
      check('add-youtube-fav', fav.status === 200,
        `status=${fav.status} ${JSON.stringify(fav.body).substring(0, 80)}`);

      // 6. Add Rutube scene to favorites
      const rtScene = {
        source: 'rutube', ref: 'abc12345',
        title: 'Rutube Video', thumbnail: undefined, categoryId: 'rain'
      };
      const fav2 = await httpReq('POST', '/api/user/favorites', { scene: rtScene }, { Cookie: cookie });
      check('add-rutube-fav', fav2.status === 200, `status=${fav2.status} ${JSON.stringify(fav2.body).substring(0, 80)}`);

      // 7. Get favorites
      const favs = await httpReq('GET', '/api/user/favorites', null, { Cookie: cookie });
      check('get-favorites', favs.status === 200 && Array.isArray(favs.body) && favs.body.length >= 2,
        `status=${favs.status} count=${favs.body.length} first=${JSON.stringify(favs.body[0]).substring(0, 80)}`);

      // 8. Create playlist
      const pl = await httpReq('POST', '/api/user/playlists', { name: 'My Playlist', description: 'Test' }, { Cookie: cookie });
      check('create-playlist', pl.status === 201, `status=${pl.status} id=${pl.body.id}`);
      const plId = pl.body.id;

      // 9. Get playlists
      const pls = await httpReq('GET', '/api/user/playlists', null, { Cookie: cookie });
      check('get-playlists', pls.status === 200 && Array.isArray(pls.body) && pls.body.length >= 1,
        `status=${pls.status} count=${pls.body.length}`);

      // 10. Add item to playlist
      const plItem = await httpReq('POST', `/api/user/playlists/${plId}/items`, {
        scene: ytScene
      }, { Cookie: cookie });
      check('add-playlist-item', plItem.status === 200 || plItem.status === 201,
        `status=${plItem.status} ${JSON.stringify(plItem.body).substring(0, 60)}`);

      // 11. Get playlists with items
      const pls2 = await httpReq('GET', '/api/user/playlists', null, { Cookie: cookie });
      const plWithItems = pls2.body.find(p => String(p.id) === String(plId));
      check('playlist-has-items', Array.isArray(plWithItems?.items) && plWithItems.items.length >= 1,
        `items count: ${plWithItems?.items?.length}`);

      // 12. Add to history
      const hist = await httpReq('POST', '/api/user/history', {
        scene: ytScene, progress: 30, duration: 212
      }, { Cookie: cookie });
      check('add-history', hist.status === 200,
        `status=${hist.status} ${JSON.stringify(hist.body).substring(0, 60)}`);

      // 13. Get history
      const history = await httpReq('GET', '/api/user/history', null, { Cookie: cookie });
      check('get-history', history.status === 200 && Array.isArray(history.body) && history.body.length >= 1,
        `status=${history.status} count=${history.body.length} first=${JSON.stringify(history.body[0]).substring(0, 80)}`);

      // 14. Stats
      const stats = await httpReq('GET', '/api/user/stats', null, { Cookie: cookie });
      check('stats', stats.status === 200 && stats.body.favorites >= 2,
        `status=${stats.status} ${JSON.stringify(stats.body)}`);

      // 15. Login (get fresh cookie)
      const login = await httpReq('POST', '/api/auth/login', { email, password: 'TestPass123!' }, {});
      cookie = getCookie(login); // update cookie
      check('login', login.status === 200 && login.body.user && login.body.user.email === email,
        `status=${login.status} user=${JSON.stringify(login.body.user)}`);

      // 16. Delete favorite
      const delFav = await httpReq('DELETE', '/api/user/favorites?sceneKey=youtube:dQw4w9WgXcQ', null, { Cookie: cookie });
      console.log('[TEST] delFav response:', delFav.status, JSON.stringify(delFav.body), delFav.headers);
      check('delete-favorite', delFav.status === 200 && delFav.body?.ok, `status=${delFav.status} body=${JSON.stringify(delFav.body)}`);

      // 17. Verify favorites count decreased
      const favs2 = await httpReq('GET', '/api/user/favorites', null, { Cookie: cookie });
      check('favorites-decreased', favs2.body.length === favs.body.length - 1,
        `before=${favs.body.length} after=${favs2.body.length}`);

      // 18. Health after DB ops
      const h2 = await httpReq('GET', '/api/health');
      check('health-after-db', h2.body.mode === 'in-memory',
        `mode=${h2.body.mode} ${JSON.stringify(h2.body).substring(0, 80)}`);

      console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
    } catch (e) {
      console.error('Error:', e.message, e.stack);
    }
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  });
  server.on('error', e => { console.error('Server error:', e.message); process.exit(1); });
}

run();
