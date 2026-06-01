#!/usr/bin/env node
/**
 * AmbientTV — Catalog URL Validator
 * Checks all video/audio URLs in content_catalog.json
 * Removes broken pairs, reports statistics
 *
 * Usage: node validate-catalog.js [--fix] [--output path]
 *   --fix     Remove broken pairs from catalog
 *   --output  Write validated catalog to file (default: overwrite original)
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'content_catalog.json');

// URLs that are known to be local/relative — always fail remote check
const LOCAL_PREFIXES = ['/media/', './', '../'];

function isLocalUrl(url) {
  if (!url) return true;
  return LOCAL_PREFIXES.some(p => url.startsWith(p));
}

function checkUrl(url, timeoutMs = 15000) {
  return new Promise((resolve) => {
    if (isLocalUrl(url)) {
      return resolve({ ok: false, status: 'LOCAL', url });
    }

    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: timeoutMs }, (res) => {
      // Follow redirects manually to catch final status
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        return resolve(checkUrl(redirectUrl, timeoutMs));
      }
      // 302 from archive.org is OK — they redirect to CDN
      if (res.statusCode === 302 && url.includes('archive.org')) {
        return resolve({ ok: true, status: 302, url });
      }
      resolve({
        ok: res.statusCode >= 200 && res.statusCode < 400,
        status: res.statusCode,
        url
      });
    });

    req.on('error', () => resolve({ ok: false, status: 'ERROR', url }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT', url }); });
    req.end();
  });
}

async function validateCatalog(fix = false, outputPath = null) {
  console.log('🔍 AmbientTV Catalog Validator\n');

  const data = await fs.readFile(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(data);

  const results = {
    totalPairs: 0,
    brokenPairs: [],
    localPairs: [],
    okPairs: [],
    brokenUrls: [],
    checkedUrls: new Map()
  };

  // Collect all unique URLs first
  const urlSet = new Set();
  for (const cat of catalog.categories) {
    for (const pair of cat.pairs || []) {
      if (pair.videoUrl) urlSet.add(pair.videoUrl);
      if (pair.audioUrl) urlSet.add(pair.audioUrl);
    }
  }

  // Check all unique URLs with concurrency limit
  const urls = Array.from(urlSet);
  console.log(`Checking ${urls.length} unique URLs...`);

  const CONCURRENCY = 5;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(url => checkUrl(url)));
    batchResults.forEach(r => results.checkedUrls.set(r.url, r));
    process.stdout.write(`\r  ${Math.min(i + CONCURRENCY, urls.length)}/${urls.length}`);
  }
  console.log('\n');

  // Analyze pairs
  for (const cat of catalog.categories) {
    const validPairs = [];
    for (const pair of cat.pairs || []) {
      results.totalPairs++;
      const vCheck = results.checkedUrls.get(pair.videoUrl);
      const aCheck = results.checkedUrls.get(pair.audioUrl);

      const vBroken = !vCheck?.ok;
      const aBroken = !aCheck?.ok;
      const vLocal = vCheck?.status === 'LOCAL';
      const aLocal = aCheck?.status === 'LOCAL';

      if (vLocal || aLocal) {
        results.localPairs.push({
          category: cat.id,
          title: pair.title,
          videoOk: !vLocal,
          audioOk: !aLocal,
          videoUrl: pair.videoUrl,
          audioUrl: pair.audioUrl
        });
        if (!fix) validPairs.push(pair); // keep if not fixing
      } else if (vBroken || aBroken) {
        results.brokenPairs.push({
          category: cat.id,
          title: pair.title,
          videoStatus: vCheck?.status,
          audioStatus: aCheck?.status,
          videoUrl: pair.videoUrl,
          audioUrl: pair.audioUrl
        });
        if (!fix) validPairs.push(pair); // keep if not fixing
      } else {
        results.okPairs.push({ category: cat.id, title: pair.title });
        validPairs.push(pair);
      }
    }
    cat.pairs = validPairs;
  }

  // Report
  console.log('=== RESULTS ===');
  console.log(`Total pairs checked: ${results.totalPairs}`);
  console.log(`✅ OK: ${results.okPairs.length}`);
  console.log(`⚠️  Local (will fail in production): ${results.localPairs.length}`);
  console.log(`❌ Broken (HTTP error): ${results.brokenPairs.length}`);

  if (results.localPairs.length > 0) {
    console.log('\n--- LOCAL URLs (need replacement) ---');
    const byCat = {};
    for (const p of results.localPairs) {
      byCat[p.category] = byCat[p.category] || [];
      byCat[p.category].push(p);
    }
    for (const [cat, pairs] of Object.entries(byCat)) {
      console.log(`\n[${cat}] ${pairs.length} pairs with local URLs:`);
      for (const p of pairs.slice(0, 3)) {
        console.log(`  - ${p.title}`);
        if (!p.videoOk) console.log(`    video: ${p.videoUrl}`);
        if (!p.audioOk) console.log(`    audio: ${p.audioUrl}`);
      }
      if (pairs.length > 3) console.log(`    ... and ${pairs.length - 3} more`);
    }
  }

  if (results.brokenPairs.length > 0) {
    console.log('\n--- BROKEN URLs ---');
    for (const p of results.brokenPairs) {
      console.log(`[${p.category}] ${p.title}`);
      console.log(`  video: ${p.videoStatus} | audio: ${p.audioStatus}`);
    }
  }

  if (fix) {
    const outFile = outputPath || CATALOG_PATH;
    catalog.version = (catalog.version || 1) + 1;
    catalog.validatedAt = new Date().toISOString();
    await fs.writeFile(outFile, JSON.stringify(catalog, null, 2));
    console.log(`\n💾 Fixed catalog written to: ${outFile}`);
    console.log(`   New version: ${catalog.version}`);
    console.log(`   Remaining pairs: ${results.okPairs.length}`);
  }

  return results;
}

// CLI
const fix = process.argv.includes('--fix');
const outputIdx = process.argv.indexOf('--output');
const outputPath = outputIdx >= 0 ? process.argv[outputIdx + 1] : null;

validateCatalog(fix, outputPath).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
