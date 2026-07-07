// Unified database layer for AmbientTV backend.
//
// - On Vercel / serverless: uses Turso (libSQL over HTTP) when TURSO_DATABASE_URL is set.
// - Locally / on Railway: falls back to a local SQLite file via libSQL's embedded engine.
//
// @libsql/client is used for BOTH modes so the code path is identical and there is no
// native `sqlite3` build step required on Vercel.

const { createClient } = require('@libsql/client');
const path = require('path');

const isTurso = !!process.env.TURSO_DATABASE_URL;
const url = process.env.TURSO_DATABASE_URL || ('file:' + path.join(__dirname, 'data', 'users.db'));
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

let healthy = true;

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
  await ready;
  const result = await client.execute({ sql, args: params });
  return {
    lastID: Number(result.lastInsertRowid != null ? result.lastInsertRowid : 0),
    changes: result.rowsAffected != null ? result.rowsAffected : 0,
  };
}

async function get(sql, params = []) {
  await ready;
  const result = await client.execute({ sql, args: params });
  return toObjects(result)[0] || null;
}

async function all(sql, params = []) {
  await ready;
  const result = await client.execute({ sql, args: params });
  return toObjects(result);
}

async function close(cb) {
  try {
    await client.close();
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

const ready = (async () => {
  for (const stmt of SCHEMA) {
    await client.execute(stmt);
  }
})().catch((e) => {
  healthy = false;
  console.error('[db] schema init failed:', e && e.message);
  throw e;
});

const db = { run, get, all, close, isTurso };
Object.defineProperty(db, 'open', {
  enumerable: true,
  configurable: true,
  get: () => healthy,
});

module.exports = db;
