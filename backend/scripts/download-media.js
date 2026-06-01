#!/usr/bin/env node
/**
 * AmbientTV — Media Downloader
 * Downloads key video/audio files locally for self-hosting
 * Updates catalog to use local paths for downloaded files
 *
 * Usage: node download-media.js [--max-video-mb N] [--max-audio-mb N]
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'content_catalog.json');
const MEDIA_DIR = path.join(__dirname, '..', 'public', 'media');
const VIDEO_DIR = path.join(MEDIA_DIR, 'video');
const AUDIO_DIR = path.join(MEDIA_DIR, 'audio');

const MAX_VIDEO_MB = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--max-video-mb') || '50');
const MAX_AUDIO_MB = parseInt(process.argv.find((a, i) => process.argv[i - 1] === '--max-audio-mb') || '20');

function downloadFile(url, destPath, maxBytes) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const file = require('fs').createWriteStream(destPath);
    let downloaded = 0;
    let aborted = false;

    const req = client.get(url, { timeout: 60000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(destPath).catch(() => {});
        return resolve(downloadFile(new URL(res.headers.location, url).href, destPath, maxBytes));
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(destPath).catch(() => {});
        return resolve({ ok: false, error: `HTTP ${res.statusCode}` });
      }

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (downloaded > maxBytes && !aborted) {
          aborted = true;
          req.destroy();
          file.close();
          fs.unlink(destPath).catch(() => {});
          resolve({ ok: false, error: 'Too large' });
        }
      });
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        if (!aborted) resolve({ ok: true, size: downloaded });
      });
    });

    req.on('error', (err) => {
      file.close();
      fs.unlink(destPath).catch(() => {});
      resolve({ ok: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      file.close();
      fs.unlink(destPath).catch(() => {});
      resolve({ ok: false, error: 'Timeout' });
    });
  });
}

function sanitizeFilename(url) {
  const basename = path.basename(new URL(url).pathname);
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function downloadMedia() {
  console.log('📥 AmbientTV Media Downloader\n');
  console.log(`Max video size: ${MAX_VIDEO_MB} MB`);
  console.log(`Max audio size: ${MAX_AUDIO_MB} MB\n`);

  await fs.mkdir(VIDEO_DIR, { recursive: true });
  await fs.mkdir(AUDIO_DIR, { recursive: true });

  const data = await fs.readFile(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(data);

  // Collect unique video/audio URLs per category (pick 1-2 per category)
  const toDownload = [];
  const seenVideos = new Set();
  const seenAudios = new Set();

  for (const cat of catalog.categories) {
    const pairs = cat.pairs || [];
    if (pairs.length === 0) continue;

    // Download first video of each category
    const firstPair = pairs[0];
    if (firstPair.videoUrl && !firstPair.videoUrl.startsWith('/media/') && !seenVideos.has(firstPair.videoUrl)) {
      seenVideos.add(firstPair.videoUrl);
      toDownload.push({
        type: 'video',
        url: firstPair.videoUrl,
        category: cat.id,
        filename: sanitizeFilename(firstPair.videoUrl)
      });
    }

    // Download first 2 unique audios per category
    let audioCount = 0;
    for (const pair of pairs) {
      if (audioCount >= 2) break;
      if (pair.audioUrl && !pair.audioUrl.startsWith('/media/') && !seenAudios.has(pair.audioUrl)) {
        seenAudios.add(pair.audioUrl);
        toDownload.push({
          type: 'audio',
          url: pair.audioUrl,
          category: cat.id,
          filename: sanitizeFilename(pair.audioUrl)
        });
        audioCount++;
      }
    }
  }

  console.log(`Will download: ${toDownload.filter(x => x.type === 'video').length} videos, ${toDownload.filter(x => x.type === 'audio').length} audios\n`);

  const results = { success: [], failed: [], skipped: [] };
  const urlToLocal = new Map();

  for (const item of toDownload) {
    const destDir = item.type === 'video' ? VIDEO_DIR : AUDIO_DIR;
    const destPath = path.join(destDir, item.filename);
    const maxBytes = (item.type === 'video' ? MAX_VIDEO_MB : MAX_AUDIO_MB) * 1024 * 1024;
    const localUrl = `/media/${item.type}/${item.filename}`;

    // Check if already exists
    try {
      await fs.access(destPath);
      console.log(`⏭️  [${item.category}] ${item.type}: ${item.filename} (already exists)`);
      urlToLocal.set(item.url, localUrl);
      results.skipped.push(item);
      continue;
    } catch {}

    process.stdout.write(`⬇️  [${item.category}] ${item.type}: ${item.filename} ... `);
    const result = await downloadFile(item.url, destPath, maxBytes);

    if (result.ok) {
      const sizeMB = (result.size / 1024 / 1024).toFixed(1);
      console.log(`✅ ${sizeMB} MB`);
      urlToLocal.set(item.url, localUrl);
      results.success.push({ ...item, sizeMB });
    } else {
      console.log(`❌ ${result.error}`);
      results.failed.push({ ...item, error: result.error });
    }
  }

  // Update catalog with local URLs
  let updatedPairs = 0;
  for (const cat of catalog.categories) {
    for (const pair of cat.pairs || []) {
      let changed = false;
      if (urlToLocal.has(pair.videoUrl)) {
        pair.videoUrl = urlToLocal.get(pair.videoUrl);
        changed = true;
      }
      if (urlToLocal.has(pair.audioUrl)) {
        pair.audioUrl = urlToLocal.get(pair.audioUrl);
        changed = true;
      }
      if (changed) updatedPairs++;
    }
  }

  catalog.version = (catalog.version || 1) + 1;
  catalog.hasLocalMedia = true;
  catalog.downloadedAt = new Date().toISOString();
  await fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2));

  console.log(`\n=== RESULTS ===`);
  console.log(`Downloaded: ${results.success.length}`);
  console.log(`Skipped (exists): ${results.skipped.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Pairs updated to local: ${updatedPairs}`);
  console.log(`\n💾 Catalog updated to version ${catalog.version}`);

  if (results.failed.length > 0) {
    console.log(`\n--- FAILED ---`);
    for (const f of results.failed) {
      console.log(`  [${f.category}] ${f.type}: ${f.filename} — ${f.error}`);
    }
  }
}

downloadMedia().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
