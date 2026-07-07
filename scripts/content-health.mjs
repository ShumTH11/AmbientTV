#!/usr/bin/env node
/**
 * Content health check for AmbientTV catalog files.
 *
 * Scans backend/data/*.json that look like content (have `categories` or `pairs`),
 * validates structure and required fields, and optionally HEAD-checks external media
 * links when run with --check-links.
 *
 * Exit code 0 = healthy, 1 = warnings/errors found.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'backend', 'data');
const MEDIA_DIR = join(__dirname, '..', 'backend');
const CHECK_LINKS = process.argv.includes('--check-links');

const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/** Absolute http(s) URL or root-relative path served by the backend. */
function isMediaRef(val) {
  if (typeof val !== 'string') return false;
  return URL_RE.test(val) || val.startsWith('/');
}

let errors = 0;
let warnings = 0;
const lines = [];

function fail(file, msg) {
  errors++;
  lines.push(`  ❌ [${file}] ${msg}`);
}
function warn(file, msg) {
  warnings++;
  lines.push(`  ⚠️  [${file}] ${msg}`);
}

function isContent(obj) {
  return obj && typeof obj === 'object' && (Array.isArray(obj.categories) || Array.isArray(obj.pairs));
}

function validatePair(file, catId, idx, p) {
  if (!p || typeof p !== 'object') return fail(file, `${catId}.pairs[${idx}] не объект`);
  if (!p.title || typeof p.title !== 'string') fail(file, `${catId}.pairs[${idx}] нет title`);
  const v = p.videoUrl;
  const a = p.audioUrl;
  if (!v && !a) fail(file, `${catId}.pairs[${idx}] нет videoUrl и audioUrl`);
  for (const [key, val] of [['videoUrl', v], ['audioUrl', a]]) {
    if (!val) continue;
    if (!isMediaRef(val)) {
      fail(file, `${catId}.pairs[${idx}].${key} невалидный медиа-путь: ${val}`);
      continue;
    }
    if (URL_RE.test(val)) {
      if (val.startsWith('http://')) {
        warn(file, `${catId}.pairs[${idx}].${key} использует http:// (не https): ${val}`);
      }
    } else if (val.startsWith('/media/')) {
      const fp = join(MEDIA_DIR, val.slice(1));
      if (!existsSync(fp)) fail(file, `${catId}.pairs[${idx}].${key} файл отсутствует: ${val}`);
    }
  }
}

async function checkLink(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!res.ok) warn('link', `${res.status} ${url}`);
    else if ((res.headers.get('content-type') || '').includes('text/html')) {
      warn('link', `отдаёт HTML вместо медиа: ${url}`);
    }
  } catch {
    warn('link', `недоступно: ${url}`);
  }
}

async function main() {
  if (!existsSync(DATA_DIR)) {
    console.error(`Каталог не найден: ${DATA_DIR}`);
    process.exit(1);
  }
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  const linkChecks = [];

  for (const f of files) {
    const full = join(DATA_DIR, f);
    let json;
    try {
      json = JSON.parse(readFileSync(full, 'utf8'));
    } catch (e) {
      fail(f, `не парсится JSON: ${e.message}`);
      continue;
    }
    if (!isContent(json)) continue; // skip non-content files (e.g. config)

    const categories = Array.isArray(json.categories) ? json.categories : [{ id: 'root', name: 'root', pairs: json.pairs }];
    if (categories.length === 0) fail(f, 'нет категорий');

    for (const c of categories) {
      const cid = c.id || c.name || '?';
      if (!c.id) warn(f, `категория без id: ${c.name}`);
      if (!c.name) warn(f, `категория ${cid} без name`);
      if (!c.description) warn(f, `категория ${cid} без description`);
      if (!Array.isArray(c.pairs) || c.pairs.length === 0) {
        fail(f, `категория ${cid} без пар (pairs)`);
        continue;
      }
      c.pairs.forEach((p, i) => {
        validatePair(f, cid, i, p);
        if (CHECK_LINKS) {
          for (const key of ['videoUrl', 'audioUrl']) {
            const url = p[key];
            if (url && URL_RE.test(url)) linkChecks.push(checkLink(url));
          }
        }
      });
    }
  }

  if (linkChecks.length) await Promise.allSettled(linkChecks);

  const total = errors + warnings;
  console.log('\n=== Content Health ===');
  if (lines.length) console.log(lines.join('\n'));
  console.log(`\nОшибок: ${errors} · предупреждений: ${warnings}`);
  console.log(total === 0 ? '✅ Контент в порядке' : '⚠️ Найдены проблемы');
  process.exit(errors > 0 ? 1 : 0);
}

main();
