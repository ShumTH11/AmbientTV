const { spawn } = require('child_process');
const http = require('http');

// Test environment
process.env.APP_SECRET = 'test_secret';
process.env.ADMIN_PASSWORD_HASH = require('bcryptjs').hashSync('admin123', 10);
process.env.ALLOWED_ORIGINS = 'http://localhost:3999';
process.env.PORT = '3999';

const server = spawn('node', ['server.js'], { cwd: __dirname + '/..' });

server.stdout.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.log('[server]', line);
});

server.stderr.on('data', (data) => {
  const line = data.toString().trim();
  if (line) console.error('[server]', line);
});

function testHealth() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3999/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 && json.status === 'ok') {
            resolve({ statusCode: res.statusCode, body: json });
          } else {
            reject(new Error(`Unexpected response: ${res.statusCode} ${data}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  // Wait for server to start
  await new Promise(r => setTimeout(r, 2500));

  try {
    const health = await testHealth();
    console.log('✅ /api/health passed:', health.body);

    server.kill();
    console.log('✅ All smoke tests passed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Smoke test failed:', err.message);
    server.kill();
    process.exit(1);
  }
}

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

runTests();
