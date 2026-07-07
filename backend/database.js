// Unified database layer for AmbientTV backend.
//
// - On Vercel / serverless: uses Turso (libSQL over HTTP) when TURSO_DATABASE_URL is set.
// - Locally / on Railway: falls back to a local SQLite file via libSQL's embedded engine.
//
// @libsql/client is used for BOTH modes so the code path is identical and there is no
// native `sqlite3` build step required on Vercel.
//
// IMPORTANT (serverless safety): the client and schema are initialized *lazily* and
// *non-fatally*. On Vercel the build/output directory is read-only, so a local file
// DB must live in /tmp. If initialization fails for any reason we keep the module
// loadable (healthy = false) so that routes that don't need the DB — e.g. /api/catalog
// and /api/health — keep working instead of crashing the whole function with a 500.

const path = require('path');
const fs = require('fs');

const isTurso = !!process.env.TURSO_DATABASE_URL;
const onVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// Resolve the database URL:
//   - Turso (HTTP client, no native binary) when configured
//   - /tmp on Vercel (writable, ephemeral)
//   - repo data/ folder locally / on Railway (persistent)
let url;
if (process.env.TURSO_DATABASE_URL) {
  url = process.env.TURSO_DATABASE_URL;
} else if (onVercel) {
  url = 'file:/tmp/ambienttv_users.db';
} else {
  url = 'file:' + path.join(__dirname, 'data', 'users.db');
}
const authToken = process.env.TURSO_AUTH_TOKEN;

let createClient = null;
let client = null;
let healthy = false;
let ready = Promise.resolve();

function loadLibsql() {
  if (createClient) return createClient;
  try {
    createClient = require('@libsql/client').createClient;
  } catch (e) {
    console.error('[db] cannot load @libsql/client:', e && e.message);
    createClient = null;
  }
  return createClient;
}

function initClient() {
  if (client) return;
  const factory = loadLibsql();
  if (!factory) {
    healthy = false;
    return;
  }
  try {
    client = authToken ? factory({ url, authToken }) : factory({ url });
  } catch (e) {
    console.error('[db] createClient failed:', e && e.message);
    client = null;
    healthy = false;
    return;
  }
  // Make sure the parent directory exists for local/Railway file: URLs.
  if (url.startsWith('file:') && !onVercel) {
    try {
      fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });
    } catch (_) {
      /* ignore */
    }
  }
  // Apply schema. On failure we mark unhealthy but DO NOT rethrow — the module
  // must stay loadable so /api/catalog continues to work.
  ready = (async () => {
    for (const stmt of SCHEMA) {
      await client.execute(stmt);
    }
    healthy = true;
  })().catch((e) => {
    healthy = false;
    console.error('[db] schema init failed (continuing without persistence):', e && e.message);
  });
}

async function ensureInit() {
  if (!client) initClient();
  if (!client) {
    const err = new Error('database unavailable');
    err.statusCode = 503;
    throw err;
  }
  await ready;
  if (!healthy) {
    const err = new Error('database unavailable');
    err.statusCode = 503;
    throw err;
  }
}

// Convert a libSQL ResultSet into an array of plain objects keyed by column name.
// libSQL may return rows as positional arrays or as objects depending on the driver,
// so we handle both.
function toObjects(result) {
  const rows = result.rows || [];
  if (rows.length === 0) return [];
  const first = rows[0];
  if (Array.isArray(first)) {
    return rows.map((row) => {
      const obj = {};
      (result.columns || []).forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }
  return rows;
}

async function run(sql, params = []) {
  await ensureInit();
  const result = await client.execute({ sql, args: params });
  return {
    lastID: Number(result.lastInsertRowid != null ? result.lastInsertRowid : 0),
    changes: result.rowsAffected != null ? result.rowsAffected : 0,
  };
}

async function get(sql, params = []) {
  await ensureInit();
  const result = await client.execute({ sql, args: params });
  return toObjects(result)[0] || null;
}

async function all(sql, params = []) {
  await ensureInit();
  const result = await client.execute({ sql, args: params });
  return toObjects(result);
}

function close(cb) {
  try {
    if (client) client.close();
    healthy = false;
  } catch (e) {
    /* ignore */
  }
  if (typeof cb === 'function') cb();
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    title TEXT,
    category_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_url, audio_url)
  )`,
  `CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    title TEXT,
    category_id TEXT,
    progress INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS playlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    title TEXT,
    category_id TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, video_url, audio_url)
  )`,
];

const db = { run, get, all, close, isTurso };
Object.defineProperty(db, 'open', {
  enumerable: true,
  configurable: true,
  get: () => healthy,
});

module.exports = db;
