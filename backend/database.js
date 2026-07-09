// Unified database layer for AmbientTV backend.
//
// - On Vercel / serverless: uses Upstash Redis (HTTP) when UPSTASH_REDIS_REST_URL is set.
// - Locally / on Railway: falls back to a local Redis (REDIS_HOST).
// - Last resort: in-memory Map (demo mode, no persistence).
//
// Upstash Redis uses plain HTTP requests (no TCP sockets, no native deps),
// making it perfect for Vercel Functions, Cloudflare Workers, etc.

const path = require('path');

// ── Upstash REST client (pure HTTP, serverless-compatible) ─────────────────────
function createUpstashClient(restUrl, restToken) {
  return {
    async exec(...args) {
      const flat = args.flat ? args.flat(Infinity) : args.flat ? [...args] : args;
      const response = await fetch(restUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${restToken}` },
        body: JSON.stringify(flat),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upstash ${response.status}: ${text}`);
      }
      const r = await response.json();
      if (r.error) throw new Error(r.error);
      return r.result;
    },
    close() {},
  };
}

// ── Local Redis fallback (ioredis) ───────────────────────────────────────────
function createLocalRedisClient(url) {
  try {
    const { createClient } = require('ioredis');
    const host = url.replace('redis://', '').split(':')[0];
    const port = parseInt((url.split(':')[1] || '6379').split('/')[0]);
    const redis = new (createClient.constructor)({ host, port: port || 6379, lazyConnect: true, enableOfflineQueue: false });
    return {
      async exec(...args) {
        const flat = args.flat ? args.flat(Infinity) : [...args];
        return redis.call(...flat);
      },
      close() { redis.disconnect(); },
    };
  } catch (_) {
    return null;
  }
}

// ── In-memory fallback (always works, ephemeral) ─────────────────────────────
class MemoryStore {
  constructor() { this.data = new Map(); }

  async exec(...args) {
    const flat = args.flat ? args.flat(Infinity) : [...args];
    const cmd = (flat[0] || '').toUpperCase();
    if (cmd === 'HSET') {
      const [k, ...pairs] = flat.slice(1);
      if (!this.data.has(k)) this.data.set(k, {});
      const m = this.data.get(k);
      for (let i = 0; i < pairs.length; i += 2) m[pairs[i]] = pairs[i + 1] != null ? String(pairs[i + 1]) : '';
      return pairs.length / 2;
    }
    if (cmd === 'HGET') {
      const [k, f] = flat.slice(1);
      const m = this.data.get(k) || {};
      return m[f] ?? null;
    }
    if (cmd === 'HGETALL') {
      const m = this.data.get(flat[1]) || {};
      const result = [];
      for (const [k, v] of Object.entries(m)) result.push(k, v);
      return result;
    }
    if (cmd === 'HDEL') {
      const [k, ...fields] = flat.slice(1);
      const m = this.data.get(k) || {};
      let n = 0;
      for (const f of fields) { if (f in m) { delete m[f]; n++; } }
      return n;
    }
    if (cmd === 'INCR') {
      const [k] = flat.slice(1);
      const n = parseInt(this.data.get(k) || '0') + 1;
      this.data.set(k, String(n));
      return n;
    }
    if (cmd === 'DEL') {
      let n = 0;
      for (const k of flat.slice(1)) { if (this.data.delete(k)) n++; }
      return n;
    }
    if (cmd === 'ZADD') {
      const [k, ...rest] = flat.slice(1);
      if (!this.data.has(k)) this.data.set(k, new Map());
      const z = this.data.get(k);
      let n = 0;
      for (let i = 0; i < rest.length; i += 2) { z.set(String(rest[i + 1]), parseFloat(rest[i])); n++; }
      return n;
    }
    if (cmd === 'ZREVRANGE') {
      const [k, start, stop] = flat.slice(1);
      const z = this.data.get(k);
      if (!z) return [];
      const entries = [...z.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
      const s = parseInt(start), e = parseInt(stop);
      return e === -1 ? entries.slice(s) : entries.slice(s, e + 1);
    }
    if (cmd === 'ZRANGE') {
      const [k, start, stop] = flat.slice(1);
      const z = this.data.get(k);
      if (!z) return [];
      const entries = [...z.entries()].sort((a, b) => a[1] - b[1]).map(([m]) => m);
      const s = parseInt(start), e = parseInt(stop);
      return e === -1 ? entries.slice(s) : entries.slice(s, e + 1);
    }
    if (cmd === 'ZREM') {
      const [k, ...members] = flat.slice(1);
      const z = this.data.get(k);
      if (!z) return 0;
      let n = 0;
      for (const m of members) { if (z.delete(String(m))) n++; }
      return n;
    }
    if (cmd === 'SADD') {
      const [k, ...members] = flat.slice(1);
      if (!this.data.has(k)) this.data.set(k, new Set());
      const s = this.data.get(k);
      let n = 0;
      for (const m of members) { if (!s.has(m)) { s.add(String(m)); n++; } }
      return n;
    }
    if (cmd === 'SMEMBERS') {
      const s = this.data.get(flat[1]);
      return s ? [...s] : [];
    }
    if (cmd === 'SREM') {
      const [k, ...members] = flat.slice(1);
      const s = this.data.get(k);
      if (!s) return 0;
      let n = 0;
      for (const m of members) { if (s.delete(String(m))) n++; }
      return n;
    }
    if (cmd === 'KEYS') {
      const pattern = (flat[1] || '*').replace(/[.*?]/g, (c) => c === '*' ? '' : c);
      const result = [];
      for (const k of this.data.keys()) {
        if (k.includes(pattern) || pattern === '') result.push(k);
      }
      return result;
    }
    if (cmd === 'GET') {
      const v = this.data.get(flat[1]);
      return v != null ? String(v) : null;
    }
    if (cmd === 'SET') {
      this.data.set(flat[1], flat[2] != null ? String(flat[2]) : '');
      return 'OK';
    }
    return null;
  }

  close() {}
}

// ── Connection setup ──────────────────────────────────────────────────────────
const upstashUrl  = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const localRedisUrl = process.env.REDIS_HOST;

let store = null;
let healthy = false;
let ready = Promise.resolve();

function initStore() {
  if (store) return;

  if (upstashUrl && upstashToken) {
    try {
      store = createUpstashClient(upstashUrl, upstashToken);
      console.log('[db] Upstash Redis (HTTP serverless) ✓');
      healthy = true;
    } catch (e) {
      console.warn('[db] Upstash failed:', e.message);
    }
  }

  if (!store && localRedisUrl) {
    try {
      const client = createLocalRedisClient(localRedisUrl);
      if (client) { store = client; healthy = true; console.log('[db] Local Redis ✓'); }
    } catch (e) {
      console.warn('[db] ioredis failed:', e.message);
    }
  }

  if (!store) {
    store = new MemoryStore();
    console.warn('[db] ⚠ In-memory store — data NOT persisted between restarts');
    console.warn('[db]   Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars');
    healthy = true; // always works
  }
}

async function ensureInit() {
  if (!store) initStore();
  await ready;
  if (!healthy) {
    const err = new Error('database unavailable'); err.statusCode = 503; throw err;
  }
}

// ── SQL helpers ───────────────────────────────────────────────────────────────
function sqlType(sql) { return sql.trim().split(/\s+/)[0].toUpperCase(); }

function parseWhere(sql, params) {
  const tokens = sql.split(/\s+/);
  const conditions = [];
  let pIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '=' && i > 0) {
      const field = tokens[i - 1];
      let val;
      if (tokens[i + 1] === '?') { val = params[pIdx++]; i++; }
      else { val = tokens[i + 1].replace(/['"]/g, ''); i++; }
      conditions.push({ field, val });
    }
  }
  return conditions;
}

function hashToObj(hash) {
  if (!hash || !hash.length) return null;
  if (typeof hash[0] === 'string') {
    const obj = {};
    for (let i = 0; i < hash.length; i += 2) obj[hash[i]] = hash[i + 1];
    return obj;
  }
  return hash[0] || null;
}

// ── db.run(sql, params) — INSERT / UPDATE / DELETE ───────────────────────────
async function run(sql, params = []) {
  await ensureInit();
  const type = sqlType(sql);
  try {
    // ── INSERT ──────────────────────────────────────────────────────────────
    if (type === 'INSERT') {
      // Handle INSERT OR IGNORE (idempotent on Redis)
      const cleanSql = sql.replace(/\s+OR\s+IGNORE\s+/i, ' ');
      const tableMatch = cleanSql.match(/INSERT\s+(?:INTO\s+)?(\w+)/i);
      const table = tableMatch ? tableMatch[1] : null;
      if (!table) throw new Error('INSERT: missing table');

      const colsMatch = cleanSql.match(/\(([^)]+)\)\s+VALUES/i);
      const cols = colsMatch ? colsMatch[1].split(',').map((c) => c.trim()) : [];
      const vals = params.slice(0, cols.length);

      if (table === 'users') {
        const id = Date.now();
        await store.exec('HSET', `user:${id}`, 'id', String(id), 'email', vals[0], 'password_hash', vals[1], 'name', vals[2] || '', 'created_at', new Date().toISOString());
        await store.exec('HSET', `user:email:${(vals[0] || '').toLowerCase()}`, 'id', String(id));
        return { lastID: id, changes: 1, rowsAffected: 1 };
      }

      if (table === 'favorites') {
        const [userId, videoUrl, audioUrl, title, catId] = [vals[0], vals[1], vals[2], vals[3] || '', vals[4] || ''];
        const member = `${videoUrl || ''}|${audioUrl || ''}`;
        const id = Date.now();
        const score = Date.now();
        const hashKey = `fav:${userId}:${id}`;
        const zsetKey = `favorites:${userId}`;
        const indexKey = `favorites:${userId}:index`;
        console.log('[db.fav INSERT] id=' + id + ' userId=' + userId + ' videoUrl=' + videoUrl + ' memberLen=' + member.length + ' hashKey=' + hashKey);
        await store.exec('HSET', hashKey, 'id', String(id), 'user_id', String(userId), 'video_url', videoUrl, 'audio_url', audioUrl, 'title', title, 'category_id', catId, 'created_at', new Date().toISOString());
        await store.exec('ZADD', zsetKey, score, member);
        await store.exec('HSET', indexKey, member, String(id));
        // Verify ZREVRANGE sees both
        const allMembers = await store.exec('ZREVRANGE', zsetKey, 0, -1);
        console.log('[db.fav INSERT] ZREVRANGE after insert: count=' + (allMembers ? allMembers.length : 0) + ' members=' + JSON.stringify(allMembers).substring(0, 200));
        return { lastID: id, changes: 1, rowsAffected: 1 };
      }

      if (table === 'history') {
        const [userId, videoUrl, audioUrl, title, catId, progress, duration] = [vals[0], vals[1], vals[2], vals[3] || '', vals[4] || '', parseInt(vals[5]) || 0, parseInt(vals[6]) || 0];
        const member = `${videoUrl || ''}|${audioUrl || ''}`;
        const id = Date.now();
        const score = Date.now();
        await store.exec('HSET', `history:${userId}:${id}`, 'id', String(id), 'user_id', String(userId), 'video_url', videoUrl, 'audio_url', audioUrl, 'title', title, 'category_id', catId, 'progress', String(progress), 'duration', String(duration), 'watched_at', new Date().toISOString());
        await store.exec('ZADD', `history:${userId}`, score, member);
        return { lastID: id, changes: 1, rowsAffected: 1 };
      }

      if (table === 'playlists') {
        const [userId, name] = [vals[0], vals[1]];
        const id = Date.now();
        await store.exec('HSET', `playlist:${id}`, 'id', String(id), 'user_id', String(userId), 'name', name, 'created_at', new Date().toISOString());
        await store.exec('SADD', `playlists:${userId}`, String(id));
        return { lastID: id, changes: 1, rowsAffected: 1 };
      }

      if (table === 'playlist_items') {
        const [playlistId, videoUrl, audioUrl, title, catId, sortOrder] = [vals[0], vals[1], vals[2], vals[3] || '', vals[4] || '', parseInt(vals[5]) || 0];
        const member = `${videoUrl || ''}|${audioUrl || ''}`;
        const id = Date.now();
        await store.exec('HSET', `pi:${playlistId}:${id}`, 'id', String(id), 'playlist_id', String(playlistId), 'video_url', videoUrl, 'audio_url', audioUrl, 'title', title, 'category_id', catId, 'sort_order', String(sortOrder), 'created_at', new Date().toISOString());
        await store.exec('ZADD', `playlistItems:${playlistId}`, sortOrder, member);
        await store.exec('HSET', `playlistItems:${playlistId}:index`, member, String(id));
        return { lastID: id, changes: 1, rowsAffected: 1 };
      }

      throw new Error(`INSERT: unhandled table "${table}"`);
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────
    if (type === 'UPDATE') {
      const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
      const setCols = setMatch ? setMatch[1].split(',').map((c) => c.trim().split('=')[0].trim()) : [];
      const setVals = params.slice(0, setCols.length);
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:$|ORDER|LIMIT)/i);
      const wherePart = whereMatch ? whereMatch[1].trim() : '';
      const whereConds = parseWhere(wherePart, params.slice(setCols.length));
      console.log('[db.run UPDATE] table=' + (tableMatch ? tableMatch[1] : '?') + ' setCols=' + setCols.length + ' whereVals=' + JSON.stringify(whereConds.map(w => w.val)));

      if (table === 'users') {
        const key = `user:${whereConds[0].val}`;
        const pairs = [];
        for (let i = 0; i < setCols.length; i++) pairs.push(setCols[i], String(setVals[i]));
        await store.exec('HSET', key, ...pairs);
        return { changes: 1, rowsAffected: 1 };
      }

      if (table === 'favorites') {
        // UPDATE favorites: video_url in SET = key change → INSERT new row.
        // video_url NOT in SET = only title/category/timestamp update.
        const [newTitle, newCat, newCreatedAt, newVideoUrl, whereUserId, whereKey] = setVals;
        const keys = await store.exec('KEYS', `fav:${whereUserId}:*`);
        for (const k of (keys || [])) {
          const fav = await store.exec('HGETALL', k);
          const obj = hashToObj(fav);
          if (obj && String(obj.user_id) === String(whereUserId) && String(obj.video_url) === String(whereKey)) {
            // video_url is changing → INSERT new row (old row preserved)
            if (newVideoUrl != null && String(newVideoUrl) !== String(whereKey)) {
              const newId = Date.now();
              const newAudio = obj.audio_url || '';
              const newMember = `${String(newVideoUrl)}|${newAudio}`;
              const oldMember = `${String(whereKey)}|${obj.audio_url || ''}`;
              await store.exec('HSET', `fav:${whereUserId}:${newId}`,
                'id', String(newId), 'user_id', String(whereUserId),
                'video_url', String(newVideoUrl), 'audio_url', newAudio,
                'title', newTitle != null ? String(newTitle) : (obj.title || ''),
                'category_id', newCat != null ? String(newCat) : (obj.category_id || ''),
                'created_at', newCreatedAt || new Date().toISOString());
              await store.exec('ZADD', `favorites:${whereUserId}`, Date.now(), newMember);
              await store.exec('HSET', `favorites:${whereUserId}:index`, newMember, String(newId));
              // Also ensure old member is in sorted set (same scene via different source)
              const oldScore = await store.exec('ZSCORE', `favorites:${whereUserId}`, oldMember);
              if (!oldScore) {
                await store.exec('ZADD', `favorites:${whereUserId}`, Date.now() - 1, oldMember);
                await store.exec('HSET', `favorites:${whereUserId}:index`, oldMember, String(obj.id));
              }
              // Update old row timestamp
              await store.exec('HSET', k, 'created_at', newCreatedAt || new Date().toISOString());
              return { lastID: newId, changes: 1, rowsAffected: 1 };
            }
            // Key unchanged → update title/category/timestamp; ensure this member is in ZREVRANGE
            const thisMember = `${String(whereKey)}|${obj.audio_url || ''}`;
            const score = await store.exec('ZSCORE', `favorites:${whereUserId}`, thisMember);
            if (!score) {
              await store.exec('ZADD', `favorites:${whereUserId}`, Date.now(), thisMember);
              await store.exec('HSET', `favorites:${whereUserId}:index`, thisMember, String(obj.id));
            }
            const pairs = ['title', newTitle != null ? String(newTitle) : (obj.title || '')];
            if (newCat != null) pairs.push('category_id', String(newCat));
            if (newCreatedAt != null) pairs.push('created_at', String(newCreatedAt));
            await store.exec('HSET', k, ...pairs);
            return { changes: 1, rowsAffected: 1 };
          }
        }
        return { changes: 0, rowsAffected: 0 };
      }

      if (table === 'history') {
        // UPDATE history SET title=?, category_id=?, progress=?, duration=?, watched_at=? WHERE id=?
        const [newTitle, newCat, newProgress, newDuration, newWatched, whereId] = setVals;
        const existing = await store.exec('HGETALL', `history:${whereConds[0].val}:${whereId}`);
        if (existing && existing.length) {
          const pairs = [];
          for (const [k, v] of Object.entries(hashToObj(existing) || {})) {
            if (k === 'title') pairs.push(k, newTitle != null ? String(newTitle) : v);
            else if (k === 'category_id') pairs.push(k, newCat != null ? String(newCat) : v);
            else if (k === 'progress') pairs.push(k, newProgress != null ? String(newProgress) : v);
            else if (k === 'duration') pairs.push(k, newDuration != null ? String(newDuration) : v);
            else if (k === 'watched_at') pairs.push(k, newWatched || v);
            else pairs.push(k, v);
          }
          const userId = hashToObj(existing)?.user_id;
          await store.exec('HSET', `history:${userId}:${whereId}`, ...pairs);
          return { changes: 1, rowsAffected: 1 };
        }
        return { changes: 0, rowsAffected: 0 };
      }

      if (table === 'playlists') {
        // UPDATE playlists SET name = ? WHERE id = ?
        const [newName, whereId] = setVals;
        await store.exec('HSET', `playlist:${whereId}`, 'name', String(newName));
        return { changes: 1, rowsAffected: 1 };
      }

      if (table === 'playlist_items') {
        // UPDATE playlist_items SET sort_order = ? WHERE id = ? AND playlist_id = ?
        const [newSort, whereId, playlistId] = setVals;
        // Find the item by scanning the pi keys
        const keys = await store.exec('KEYS', `pi:${playlistId}:*`);
        for (const k of (keys || [])) {
          const item = await store.exec('HGETALL', k);
          const obj = hashToObj(item);
          if (obj && String(obj.id) === String(whereId)) {
            await store.exec('HSET', k, 'sort_order', String(newSort));
            // Update member in sorted set (remove old, add new)
            const oldMember = `${obj.video_url || ''}|${obj.audio_url || ''}`;
            await store.exec('ZADD', `playlistItems:${playlistId}`, newSort, oldMember);
            return { changes: 1, rowsAffected: 1 };
          }
        }
        return { changes: 0, rowsAffected: 0 };
      }

      throw new Error(`UPDATE: unhandled table "${table}"`);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (type === 'DELETE') {
      const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
      const table = tableMatch ? tableMatch[1] : null;
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:$|ORDER|LIMIT)/i);
      const wherePart = whereMatch ? whereMatch[1].trim() : '';
      const whereConds = parseWhere(wherePart, params);

      if (table === 'favorites') {
        const userId = whereConds.find((c) => c.field === 'user_id')?.val;
        const videoUrl = whereConds.find((c) => c.field === 'video_url')?.val;
        console.log('[db.DELETE fav] userId=' + userId + ' videoUrl=' + videoUrl);
        
        // Find the key by scanning fav:userId:* hashes
        const keys = await store.exec('KEYS', `fav:${userId}:*`);
        console.log('[db.DELETE fav] keys=' + (keys ? keys.length : 0));
        for (const k of (keys || [])) {
          const fav = await store.exec('HGETALL', k);
          const obj = hashToObj(fav);
          if (obj && String(obj.video_url) === String(videoUrl)) {
            const member = `${String(videoUrl)}|${obj.audio_url || ''}`;
            await store.exec('DEL', k);
            await store.exec('ZREM', `favorites:${userId}`, member);
            await store.exec('HDEL', `favorites:${userId}:index`, member);
            console.log('[db.DELETE fav] deleted key=' + k + ' member=' + member);
            return { changes: 1, rowsAffected: 1 };
          }
        }
        console.log('[db.DELETE fav] not found');
        return { changes: 0, rowsAffected: 0 };
      }

      if (table === 'history') {
        const userId = whereConds.find((c) => c.field === 'user_id')?.val;
        if (!whereConds.find((c) => c.field === 'video_url')) {
          // DELETE FROM history WHERE user_id = ? — clear all
          const keys = await store.exec('KEYS', `history:${userId}:*`);
          for (const k of (keys || [])) await store.exec('DEL', k);
          await store.exec('DEL', `history:${userId}`);
          return { changes: 1, rowsAffected: 1 };
        }
        const videoUrl = whereConds.find((c) => c.field === 'video_url')?.val;
        const audioUrl = whereConds.find((c) => c.field === 'audio_url')?.val;
        const member = `${videoUrl || ''}|${audioUrl || ''}`;
        await store.exec('ZREM', `history:${userId}`, member);
        return { changes: 1, rowsAffected: 1 };
      }

      if (table === 'playlists') {
        const playlistId = whereConds[0]?.val;
        if (playlistId) {
          const userId = await store.exec('HGET', `playlist:${playlistId}`, 'user_id');
          if (userId) await store.exec('SREM', `playlists:${userId}`, String(playlistId));
          await store.exec('DEL', `playlist:${playlistId}`);
          const keys = await store.exec('KEYS', `pi:${playlistId}:*`);
          for (const k of (keys || [])) await store.exec('DEL', k);
          await store.exec('DEL', `playlistItems:${playlistId}`);
          await store.exec('DEL', `playlistItems:${playlistId}:index`);
        }
        return { changes: 1, rowsAffected: 1 };
      }

      if (table === 'playlist_items') {
        const [itemId, playlistId] = params;
        const keys = await store.exec('KEYS', `pi:${playlistId}:*`);
        for (const k of (keys || [])) {
          const item = await store.exec('HGETALL', k);
          const obj = hashToObj(item);
          if (obj && String(obj.id) === String(itemId)) {
            const member = `${obj.video_url || ''}|${obj.audio_url || ''}`;
            await store.exec('DEL', k);
            await store.exec('ZREM', `playlistItems:${playlistId}`, member);
            await store.exec('HDEL', `playlistItems:${playlistId}:index`, member);
            return { changes: 1, rowsAffected: 1 };
          }
        }
        return { changes: 0, rowsAffected: 0 };
      }

      throw new Error(`DELETE: unhandled table "${table}"`);
    }

    throw new Error(`run: unsupported SQL type "${type}"`);
  } catch (err) {
    if (err.statusCode) throw err;
    console.error('[db.run]', sql.substring(0, 100), err.message);
    throw err;
  }
}

// ── db.get(sql, params) — SELECT one row ─────────────────────────────────────
async function get(sql, params = []) {
  await ensureInit();
  const type = sqlType(sql);
  try {
    if (type !== 'SELECT') throw new Error(`get: not SELECT "${sql.substring(0, 60)}"`);

    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    const wherePart = whereMatch ? whereMatch[1].trim() : '';
    const whereConds = parseWhere(wherePart, params);
    const isCount = /\bCOUNT\s*\(/i.test(sql);
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 1;

    // ── users ──────────────────────────────────────────────────────────────────
    if (table === 'users') {
      if (isCount) {
        const keys = await store.exec('KEYS', 'user:[0-9]*');
        return { 'COUNT(*)': keys ? keys.length : 0 };
      }
      const byEmail = whereConds.find((c) => c.field === 'email');
      if (byEmail) {
        const idStr = await store.exec('HGET', `user:email:${(byEmail.val || '').toLowerCase()}`, 'id');
        if (!idStr) return null;
        const u = await store.exec('HGETALL', `user:${idStr}`);
        return hashToObj(u);
      }
      const byId = whereConds.find((c) => c.field === 'id');
      if (byId) {
        const u = await store.exec('HGETALL', `user:${byId.val}`);
        return hashToObj(u);
      }
      // SELECT * FROM users (no WHERE) → first user
      const keys = await store.exec('KEYS', 'user:[0-9]*');
      if (keys && keys.length) { const u = await store.exec('HGETALL', keys[0]); return hashToObj(u); }
      return null;
    }

    // ── favorites ─────────────────────────────────────────────────────────────
    if (table === 'favorites') {
      if (isCount) {
        const userId = whereConds.find((c) => c.field === 'user_id')?.val;
        const members = await store.exec('ZREVRANGE', `favorites:${userId}`, 0, -1);
        return { 'COUNT(*)': members ? members.length : 0 };
      }
      const userId = whereConds.find((c) => c.field === 'user_id')?.val;
      const videoUrl = whereConds.find((c) => c.field === 'video_url')?.val;
      const audioUrl = whereConds.find((c) => c.field === 'audio_url')?.val;
      if (!userId) return null;
      if (videoUrl) {
        const member = `${String(videoUrl)}|${audioUrl != null ? String(audioUrl) : ''}`;
        const idStr = await store.exec('HGET', `favorites:${userId}:index`, member);
        if (!idStr) return null;
        const fav = await store.exec('HGETALL', `fav:${userId}:${idStr}`);
        return hashToObj(fav);
      }
      // Return most recent
      const members = await store.exec('ZREVRANGE', `favorites:${userId}`, 0, 0);
      if (!members || !members.length) return null;
      const idStr = await store.exec('HGET', `favorites:${userId}:index`, members[0]);
      if (!idStr) return null;
      const fav = await store.exec('HGETALL', `fav:${userId}:${idStr}`);
      return hashToObj(fav);
    }

    // ── history ───────────────────────────────────────────────────────────────
    if (table === 'history') {
      if (isCount) {
        const userId = whereConds.find((c) => c.field === 'user_id')?.val;
        const members = await store.exec('ZREVRANGE', `history:${userId}`, 0, -1);
        return { 'COUNT(*)': members ? members.length : 0 };
      }
      // SELECT id FROM history WHERE user_id = ? AND video_url = ? AND audio_url = ?
      const userId = whereConds.find((c) => c.field === 'user_id')?.val;
      const videoUrl = whereConds.find((c) => c.field === 'video_url')?.val;
      const audioUrl = whereConds.find((c) => c.field === 'audio_url')?.val;
      if (userId && videoUrl && audioUrl && sql.match(/\bID\b/i)) {
        // Return a fake id from the score (unique per entry)
        const members = await store.exec('ZREVRANGE', `history:${userId}`, 0, -1);
        if (members) {
          for (const m of members) {
            const parts = (m || '').split('|');
            if ((parts[0] && (parts[0] === videoUrl || parts[0].includes(videoUrl))) ||
                (parts[1] && (parts[1] === audioUrl || parts[1].includes(audioUrl)))) {
              return { id: String(Date.now()) }; // fake ID — UPDATE will search by WHERE id=? below
            }
          }
        }
        // Fallback: create a new entry
        const newId = Date.now();
        await store.exec('ZADD', `history:${userId}`, newId, `${videoUrl}|${audioUrl}`);
        return { id: String(newId) };
      }
      // SELECT title, watched_at FROM history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 1
      if (sql.match(/title/i)) {
        const userId = whereConds.find((c) => c.field === 'user_id')?.val;
        if (!userId) return null;
        // Get most recent history entry
        const keys = await store.exec('KEYS', `history:${userId}:*`);
        if (keys && keys.length) {
          const k = keys.sort().pop(); // most recent (timestamp in key)
          const h = await store.exec('HGETALL', k);
          return hashToObj(h);
        }
        return null;
      }
      return null;
    }

    // ── playlists ─────────────────────────────────────────────────────────────
    if (table === 'playlists') {
      if (isCount) {
        const userId = whereConds.find((c) => c.field === 'user_id')?.val;
        const ids = await store.exec('SMEMBERS', `playlists:${userId}`);
        return { 'COUNT(*)': ids ? ids.length : 0 };
      }
      const byId = whereConds.find((c) => c.field === 'id')?.val;
      if (byId) {
        const byUserId = whereConds.find((c) => c.field === 'user_id')?.val;
        if (byUserId) {
          // SELECT id FROM playlists WHERE id = ? AND user_id = ?
          const ownerId = await store.exec('HGET', `playlist:${byId}`, 'user_id');
          return ownerId && String(ownerId) === String(byUserId) ? { id: byId } : null;
        }
        const p = await store.exec('HGETALL', `playlist:${byId}`);
        return hashToObj(p);
      }
      // SELECT * FROM playlists WHERE id = ? (no user_id check)
      const allKeys = await store.exec('KEYS', 'playlist:*');
      for (const k of (allKeys || [])) {
        const p = await store.exec('HGETALL', k);
        const obj = hashToObj(p);
        if (obj && String(obj.id) === String(byId)) return obj;
      }
      return null;
    }

    // ── playlist_items ─────────────────────────────────────────────────────────
    if (table === 'playlist_items') {
      if (isCount) {
        const playlistId = whereConds.find((c) => c.field === 'playlist_id')?.val;
        const members = await store.exec('ZRANGE', `playlistItems:${playlistId}`, 0, -1);
        return { 'COUNT(*)': members ? members.length : 0 };
      }
    }

    throw new Error(`get: unhandled query "${sql.substring(0, 80)}"`);
  } catch (err) {
    if (err.statusCode) throw err;
    console.error('[db.get]', sql.substring(0, 100), err.message);
    throw err;
  }
}

// ── db.all(sql, params) — SELECT all rows ───────────────────────────────────
async function all(sql, params = []) {
  await ensureInit();
  const type = sqlType(sql);
  try {
    if (type !== 'SELECT') throw new Error(`all: not SELECT "${sql.substring(0, 60)}"`);

    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i);
    const wherePart = whereMatch ? whereMatch[1].trim() : '';
    const whereConds = parseWhere(wherePart, params);
    const isCount = /\bCOUNT\s*\(/i.test(sql);
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : -1;

    // ── COUNT ─────────────────────────────────────────────────────────────────
    if (isCount) {
      const userId = whereConds.find((c) => c.field === 'user_id')?.val;
      const playlistId = whereConds.find((c) => c.field === 'playlist_id')?.val;
      if (table === 'favorites' && userId) {
        const members = await store.exec('ZREVRANGE', `favorites:${userId}`, 0, -1);
        return [{ 'COUNT(*)': members ? members.length : 0 }];
      }
      if (table === 'playlists' && userId) {
        const ids = await store.exec('SMEMBERS', `playlists:${userId}`);
        return [{ 'COUNT(*)': ids ? ids.length : 0 }];
      }
      if (table === 'history' && userId) {
        const members = await store.exec('ZREVRANGE', `history:${userId}`, 0, -1);
        return [{ 'COUNT(*)': members ? members.length : 0 }];
      }
      if (table === 'playlist_items' && playlistId) {
        const members = await store.exec('ZRANGE', `playlistItems:${playlistId}`, 0, -1);
        return [{ 'COUNT(*)': members ? members.length : 0 }];
      }
      return [{ 'COUNT(*)': 0 }];
    }

    // ── users ──────────────────────────────────────────────────────────────────
    if (table === 'users') {
      const byId = whereConds.find((c) => c.field === 'id')?.val;
      if (byId) {
        const u = await store.exec('HGETALL', `user:${byId}`);
        const obj = hashToObj(u);
        return obj ? [obj] : [];
      }
      // SELECT * FROM users (admin list)
      const keys = await store.exec('KEYS', 'user:[0-9]*');
      const users = [];
      for (const k of (keys || [])) {
        if (!k.includes(':email:')) {
          const u = await store.exec('HGETALL', k);
          const obj = hashToObj(u);
          if (obj) users.push(obj);
        }
      }
      return users;
    }

    // ── favorites ─────────────────────────────────────────────────────────────
    if (table === 'favorites') {
      const userId = whereConds.find((c) => c.field === 'user_id')?.val;
      if (!userId) return [];
      const members = await store.exec('ZREVRANGE', `favorites:${userId}`, 0, limit > 0 ? limit - 1 : -1);
      console.log('[db.all fav] userId=' + userId + ' members count=' + (members ? members.length : 0));
      if (members) members.forEach((m, i) => console.log('[db.all fav] member[' + i + '] len=' + m.length + ' preview=' + m.substring(0, 50)));
      if (!members || !members.length) return [];
      const items = [];
      for (const m of members) {
        const idStr = await store.exec('HGET', `favorites:${userId}:index`, m);
        console.log('[db.all fav] HGET index for member len=' + m.length + ' → idStr=' + idStr);
        if (idStr) {
          try {
            const fav = await store.exec('HGETALL', `fav:${userId}:${idStr}`);
            const obj = hashToObj(fav);
            if (obj) items.push(obj);
          } catch (e) { console.error('[db.all fav] HGETALL err:', e.message); }
        } else {
          console.warn('[db.all fav] MISSING idStr for member, checking index directly');
          const allIdx = await store.exec('HGETALL', `favorites:${userId}:index`);
          console.warn('[db.all fav] index content:', JSON.stringify(allIdx).substring(0, 300));
        }
      }
      console.log('[db.all fav] returning items:', items.length);
      return items;
    }

    // ── history ───────────────────────────────────────────────────────────────
    if (table === 'history') {
      const userId = whereConds.find((c) => c.field === 'user_id')?.val;
      if (!userId) return [];
      const members = await store.exec('ZREVRANGE', `history:${userId}`, 0, limit > 0 ? limit - 1 : -1);
      if (!members || !members.length) return [];
      return members.map((m) => {
        const parts = (m || '').split('|');
        return { user_id: userId, video_url: parts[0] || '', audio_url: parts[1] || '', title: '', category_id: '', progress: 0, duration: 0 };
      });
    }

    // ── playlists ─────────────────────────────────────────────────────────────
    if (table === 'playlists') {
      const userId = whereConds.find((c) => c.field === 'user_id')?.val;
      if (!userId) return [];
      const ids = await store.exec('SMEMBERS', `playlists:${userId}`);
      const items = [];
      for (const id of (ids || [])) {
        try {
          const p = await store.exec('HGETALL', `playlist:${id}`);
          const obj = hashToObj(p);
          if (obj) items.push(obj);
        } catch (_) {}
      }
      // Sort by created_at desc
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return limit > 0 ? items.slice(0, limit) : items;
    }

    // ── playlist_items ─────────────────────────────────────────────────────────
    if (table === 'playlist_items') {
      const playlistId = whereConds.find((c) => c.field === 'playlist_id')?.val;
      if (!playlistId) return [];
      const desc = orderMatch && orderMatch[2] === 'DESC';
      const members = desc
        ? await store.exec('ZREVRANGE', `playlistItems:${playlistId}`, 0, limit > 0 ? limit - 1 : -1)
        : await store.exec('ZRANGE', `playlistItems:${playlistId}`, 0, limit > 0 ? limit - 1 : -1);
      if (!members || !members.length) return [];
      const items = [];
      for (const m of members) {
        const idStr = await store.exec('HGET', `playlistItems:${playlistId}:index`, m);
        if (idStr) {
          try {
            const item = await store.exec('HGETALL', `pi:${playlistId}:${idStr}`);
            const obj = hashToObj(item);
            if (obj) items.push(obj);
          } catch (_) {}
        }
      }
      return items;
    }

    throw new Error(`all: unhandled query "${sql.substring(0, 80)}"`);
  } catch (err) {
    if (err.statusCode) throw err;
    console.error('[db.all]', sql.substring(0, 100), err.message);
    throw err;
  }
}

function close(cb) {
  try { if (store) store.close(); } catch (_) {}
  healthy = false;
  if (typeof cb === 'function') cb();
}

const db = { run, get, all, close, isUpstash: !!upstashUrl };
Object.defineProperty(db, 'open', { enumerable: true, configurable: true, get: () => healthy });

// Initialize store immediately on module load (so health checks work before first query)
initStore();

module.exports = db;
