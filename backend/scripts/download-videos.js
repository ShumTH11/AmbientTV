/**
 * AmbientTV Video Downloader
 * Downloads curated ambient videos from Internet Archive
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const VIDEO_DIR = path.join(__dirname, '..', 'media', 'video');
const AUDIO_DIR = path.join(__dirname, '..', 'media', 'audio');

// Ensure directories exist
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Curated video collection - 30 videos across categories
const videos = [
  // === NATURE (6 videos) ===
  { id: 'nature17', url: 'https://archive.org/download/Nature3560s4kRes/Nature%2017%20-%2030s%20-%204k%20res.mp4', category: 'nature', title: 'Forest Stream 4K', duration: '30s' },
  { id: 'nature18', url: 'https://archive.org/download/Nature3560s4kRes/Nature%2018%20-%2030s%20-%204k%20res.mp4', category: 'nature', title: 'Mountain Lake 4K', duration: '30s' },
  { id: 'nature19', url: 'https://archive.org/download/Nature3560s4kRes/Nature%2019%20-%2022s%20-%204k%20res.mp4', category: 'nature', title: 'Waterfall 4K', duration: '22s' },
  { id: 'nature20', url: 'https://archive.org/download/Nature3560s4kRes/Nature%2020%20-%2030s%20-%204k%20res.mp4', category: 'nature', title: 'Sunset Meadow 4K', duration: '30s' },
  { id: 'nature22', url: 'https://archive.org/download/Nature3560s4kRes/Nature%2022%20-%2025s%20-%204k%20res.mp4', category: 'nature', title: 'Morning Mist 4K', duration: '25s' },
  { id: 'nature23', url: 'https://archive.org/download/Nature3560s4kRes/Nature%2023%20-%2045s%20-%204k%20res.mp4', category: 'nature', title: 'Ocean Waves 4K', duration: '45s' },

  // === RAIN / COZY (4 videos) ===
  { id: 'rain1', url: 'https://archive.org/download/youtube-PIwx7FD5slI/PIwx7FD5slI.mp4', category: 'rain', title: 'Tears in Rain', duration: '3m' },
  { id: 'rain2', url: 'https://archive.org/download/youtube-7OkCNK3d9Cg/7OkCNK3d9Cg.mp4', category: 'rain', title: 'Tokyo Rain', duration: '4m' },
  { id: 'rain3', url: 'https://archive.org/download/youtube-wwLk1-012qM/wwLk1-012qM.mp4', category: 'rain', title: 'Rain Temple', duration: '5m' },
  { id: 'rain4', url: 'https://archive.org/download/youtube-Tj49Z301emA/Tj49Z301emA.mp4', category: 'rain', title: 'Eye of the Storm', duration: '4m' },

  // === LOFI / STUDY (5 videos) ===
  { id: 'lofi1', url: 'https://archive.org/download/youtube-Gad3fx0w30o/Gad3fx0w30o.mp4', category: 'lofi', title: 'Hot Chocolate Lofi', duration: '1h' },
  { id: 'lofi2', url: 'https://archive.org/download/youtube-o6dIBkmmcO0/o6dIBkmmcO0.mp4', category: 'lofi', title: 'Study High Lofi', duration: '45m' },
  { id: 'lofi3', url: 'https://archive.org/download/youtube-NJuSStkIZBg/NJuSStkIZBg.mp4', category: 'lofi', title: 'Rainy Jazz Cafe', duration: '2h' },
  { id: 'lofi4', url: 'https://archive.org/download/youtube-qsI-8n58Vak/qsI-8n58Vak.mp4', category: 'lofi', title: 'Tokyo Cafe', duration: '4m' },
  { id: 'lofi5', url: 'https://archive.org/download/youtube-kVZcO6bcYqc/kVZcO6bcYqc.mp4', category: 'lofi', title: 'Adult Swim Lofi', duration: '1h' },

  // === CYBERPUNK / NEON (4 videos) ===
  { id: 'cyber1', url: 'https://archive.org/download/youtube-oivalAvc2xU/oivalAvc2xU.mp4', category: 'cyberpunk', title: 'Neon City 4K', duration: '1h' },
  { id: 'cyber2', url: 'https://archive.org/download/youtube-dIGJTA2S1wo/dIGJTA2S1wo.mp4', category: 'cyberpunk', title: 'Cyberpunk Radio', duration: '24h' },
  { id: 'cyber3', url: 'https://archive.org/download/youtube-GT-0XCFOMQo/GT-0XCFOMQo.mp4', category: 'cyberpunk', title: 'Neon Lights', duration: '3m' },
  { id: 'cyber4', url: 'https://archive.org/download/youtube-5fgaa9RjNJU/5fgaa9RjNJU.mp4', category: 'cyberpunk', title: 'Cyberpunk Bronze Age', duration: '5m' },

  // === SPACE (3 videos) ===
  { id: 'space1', url: 'https://archive.org/download/youtube-9BCMDIA6SQ8/9BCMDIA6SQ8.mp4', category: 'space', title: 'Galaxy of Terror', duration: '4m' },
  { id: 'space2', url: 'https://archive.org/download/ambient-space-music-hd/Ambient%20Space%20Music%20HD.mp4', category: 'space', title: 'Space Ambient HD', duration: '1h' },
  { id: 'space3', url: 'https://archive.org/download/youtube-nmbsD3Ar_O0/nmbsD3Ar_O0.mp4', category: 'space', title: 'Healing Light', duration: '4m' },

  // === JAPAN / ANIME (3 videos) ===
  { id: 'japan1', url: 'https://archive.org/download/youtube-rs_VEjGEwYc/rs_VEjGEwYc.mp4', category: 'japan', title: 'Tokyo Negative', duration: '3m' },
  { id: 'japan2', url: 'https://archive.org/download/youtube-7OkCNK3d9Cg/7OkCNK3d9Cg.mp4', category: 'japan', title: 'Tokyo Rain', duration: '4m' },
  { id: 'japan3', url: 'https://archive.org/download/youtube-dJtghgxHtt4/dJtghgxHtt4.mp4', category: 'japan', title: 'Japanese Kojiki', duration: '1h' },

  // === VAPORWAVE / AESTHETIC (3 videos) ===
  { id: 'vapor1', url: 'https://archive.org/download/vaporwave-late-night-tv/Vaporwave%20-%20LateNight%20TV.mp4', category: 'vaporwave', title: 'Late Night TV', duration: '1h' },
  { id: 'vapor2', url: 'https://archive.org/download/vaporwave-memories-2-hours/Vaporwave%20Memories%20(2%20Hours).mp4', category: 'vaporwave', title: 'Vaporwave Memories', duration: '2h' },
  { id: 'vapor3', url: 'https://archive.org/download/youtube-wUGyKvA6hl8/wUGyKvA6hl8.mp4', category: 'vaporwave', title: 'Netrun Synthwave', duration: '1h' },

  // === WINTER / SNOW (2 videos) ===
  { id: 'winter1', url: 'https://archive.org/download/youtube-l0pF7Zko92w/l0pF7Zko92w.mp4', category: 'winter', title: 'Winter Breath Fantasy', duration: '2h' },
  { id: 'winter2', url: 'https://archive.org/download/youtube-kuCA9mF1kWU/kuCA9mF1kWU.mp4', category: 'winter', title: 'Throes of Winter', duration: '4m' },

  // === FANTASY (2 videos) ===
  { id: 'fantasy1', url: 'https://archive.org/download/youtube--RtrnbyKdAM/-RtrnbyKdAM.mp4', category: 'fantasy', title: 'Ohori Village', duration: '1h' },
  { id: 'fantasy2', url: 'https://archive.org/download/youtube-D10ahyZzt7o/D10ahyZzt7o.mp4', category: 'fantasy', title: 'Remembrance', duration: '1h' },

  // === DARK / HORROR (2 videos) ===
  { id: 'dark1', url: 'https://archive.org/download/youtube-4aQOgnHRVJU/4aQOgnHRVJU.mp4', category: 'dark', title: 'Ghost', duration: '3m' },
  { id: 'dark2', url: 'https://archive.org/download/BlackRedWhite/black%20red%20white.mp4', category: 'dark', title: 'Black Red White', duration: '4m' },

  // === BEACH / OCEAN (2 videos) ===
  { id: 'beach1', url: 'https://archive.org/download/youtube-rv_yY6LgIaM/rv_yY6LgIaM.mp4', category: 'beach', title: 'Beach Episode', duration: '4m' },
  { id: 'beach2', url: 'https://archive.org/download/youtube-eqRsvYPTJUo/eqRsvYPTJUo.mp4', category: 'beach', title: 'Sundown', duration: '3m' },

  // === ZEN / MEDITATION (2 videos) ===
  { id: 'zen1', url: 'https://archive.org/download/youtube-oFrurKN3rEo/oFrurKN3rEo.mp4', category: 'zen', title: 'Eternal Garden', duration: '1h' },
  { id: 'zen2', url: 'https://archive.org/download/youtube--pBLZzZdQ0s/-pBLZzZdQ0s.mp4', category: 'zen', title: 'Inner Peace', duration: '1h' },

  // === SUNSET / SUNRISE (2 videos) ===
  { id: 'sunset1', url: 'https://archive.org/download/youtube-nAm8YSiF5pU/nAm8YSiF5pU.mp4', category: 'sunset', title: 'Sunrise Clissold', duration: '5m' },
  { id: 'sunset2', url: 'https://archive.org/download/CessationIIIDawn/Cessation%20III_Dawn.mp4', category: 'sunset', title: 'Cessation Dawn', duration: '5m' },

  // === WINDOW / ROOM (2 videos) ===
  { id: 'window1', url: 'https://archive.org/download/youtube-zG92ss_2Vjw/zG92ss_2Vjw.mp4', category: 'window', title: 'Last Memories', duration: '5m' },
  { id: 'window2', url: 'https://archive.org/download/WindowToTheWorld/Ambientgroove.net_WindowToTheWorld.mp4', category: 'window', title: 'Window to World', duration: '5m' },

  // === TRAIN / TRAVEL (2 videos) ===
  { id: 'train1', url: 'https://archive.org/download/SCL153/Hank_Hobson_-_Train_In_The_Woods.mp4', category: 'train', title: 'Train in Woods', duration: '5m' },
  { id: 'train2', url: 'https://archive.org/download/LongStation/Long%20Station.mp4', category: 'train', title: 'Long Station', duration: '5m' },

  // === SYNTHWAVE / RETRO (2 videos) ===
  { id: 'synth1', url: 'https://archive.org/download/youtube-s5Tjnpb1iQQ/s5Tjnpb1iQQ.mp4', category: 'synthwave', title: 'Astral Drift', duration: '1h' },
  { id: 'synth2', url: 'https://archive.org/download/youtube-wUGyKvA6hl8/wUGyKvA6hl8.mp4', category: 'synthwave', title: 'Netrun', duration: '1h' },
];

// Audio tracks - 20 long ambient tracks
const audios = [
  { id: 'meditation1', url: 'https://archive.org/download/va-ambient-meditation/va-ambient-meditation.mp3', category: 'meditation', title: 'Ambient Meditation', duration: '1h' },
  { id: 'rain1', url: 'https://archive.org/download/rain-and-thunder-sounds/rain-and-thunder-sounds.mp3', category: 'rain', title: 'Rain and Thunder', duration: '2h' },
  { id: 'ocean1', url: 'https://archive.org/download/ocean-waves-ambient/ocean-waves-ambient.mp3', category: 'ocean', title: 'Ocean Waves', duration: '3h' },
  { id: 'forest1', url: 'https://archive.org/download/forest-ambient-sounds/forest-ambient-sounds.mp3', category: 'forest', title: 'Forest Sounds', duration: '2h' },
  { id: 'fireplace1', url: 'https://archive.org/download/fireplace-crackling/fireplace-crackling.mp3', category: 'fireplace', title: 'Fireplace Crackling', duration: '2h' },
  { id: 'lofi1', url: 'https://archive.org/download/lofi-hip-hop-beats/lofi-hip-hop-beats.mp3', category: 'lofi', title: 'Lofi Beats', duration: '3h' },
  { id: 'jazz1', url: 'https://archive.org/download/rainy-jazz-cafe/rainy-jazz-cafe.mp3', category: 'jazz', title: 'Rainy Jazz Cafe', duration: '2h' },
  { id: 'space1', url: 'https://archive.org/download/space-ambient-music/space-ambient-music.mp3', category: 'space', title: 'Space Ambient', duration: '2h' },
  { id: 'sleep1', url: 'https://archive.org/download/deep-sleep-music/deep-sleep-music.mp3', category: 'sleep', title: 'Deep Sleep', duration: '8h' },
  { id: 'study1', url: 'https://archive.org/download/study-focus-music/study-focus-music.mp3', category: 'study', title: 'Study Focus', duration: '3h' },
  { id: 'nature1', url: 'https://archive.org/download/birds-nature-sounds/birds-nature-sounds.mp3', category: 'nature', title: 'Birds Singing', duration: '2h' },
  { id: 'wind1', url: 'https://archive.org/download/wind-ambient-sounds/wind-ambient-sounds.mp3', category: 'wind', title: 'Wind Ambient', duration: '2h' },
  { id: 'piano1', url: 'https://archive.org/download/relaxing-piano-music/relaxing-piano-music.mp3', category: 'piano', title: 'Relaxing Piano', duration: '3h' },
  { id: 'asmr1', url: 'https://archive.org/download/asmr-tapping-sounds/asmr-tapping-sounds.mp3', category: 'asmr', title: 'ASMR Tapping', duration: '1h' },
  { id: 'drone1', url: 'https://archive.org/download/drone-ambient-music/drone-ambient-music.mp3', category: 'drone', title: 'Drone Ambient', duration: '2h' },
  { id: 'celtic1', url: 'https://archive.org/download/celtic-ambient-music/celtic-ambient-music.mp3', category: 'celtic', title: 'Celtic Ambient', duration: '2h' },
  { id: 'japanese1', url: 'https://archive.org/download/japanese-ambient-music/japanese-ambient-music.mp3', category: 'japanese', title: 'Japanese Ambient', duration: '2h' },
  { id: 'cyberpunk1', url: 'https://archive.org/download/cyberpunk-ambient-music/cyberpunk-ambient-music.mp3', category: 'cyberpunk', title: 'Cyberpunk Ambient', duration: '2h' },
  { id: 'winter1', url: 'https://archive.org/download/winter-ambient-sounds/winter-ambient-sounds.mp3', category: 'winter', title: 'Winter Sounds', duration: '2h' },
  { id: 'cafe1', url: 'https://archive.org/download/coffee-shop-ambience/coffee-shop-ambience.mp3', category: 'cafe', title: 'Coffee Shop', duration: '3h' },
];

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    let downloaded = 0;
    
    client.get(url, { timeout: 120000 }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, dest, onProgress).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const total = parseInt(response.headers['content-length'], 10) || 0;
      
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (onProgress && total) {
          onProgress(Math.round((downloaded / total) * 100));
        }
      });
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadVideos() {
  console.log('=== AmbientTV Video Downloader ===\n');
  console.log(`Total videos: ${videos.length}`);
  console.log(`Total audios: ${audios.length}\n`);
  
  const results = { success: [], failed: [] };
  
  // Download videos
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const dest = path.join(VIDEO_DIR, `${v.id}.mp4`);
    
    if (fs.existsSync(dest)) {
      const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
      console.log(`[${i+1}/${videos.length}] SKIP ${v.id} (${size} MB already exists)`);
      results.success.push({ ...v, size });
      continue;
    }
    
    process.stdout.write(`[${i+1}/${videos.length}] DOWNLOAD ${v.id} (${v.category}) ... `);
    
    try {
      await downloadFile(v.url, dest, (pct) => {
        process.stdout.write(`\r[${i+1}/${videos.length}] DOWNLOAD ${v.id} (${v.category}) ... ${pct}%`);
      });
      
      const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
      console.log(` OK (${size} MB)`);
      results.success.push({ ...v, size });
    } catch (err) {
      console.log(` FAIL: ${err.message}`);
      results.failed.push({ ...v, error: err.message });
    }
  }
  
  // Download audios
  console.log('\n--- Audio Tracks ---\n');
  for (let i = 0; i < audios.length; i++) {
    const a = audios[i];
    const dest = path.join(AUDIO_DIR, `${a.id}.mp3`);
    
    if (fs.existsSync(dest)) {
      const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
      console.log(`[${i+1}/${audios.length}] SKIP ${a.id} (${size} MB already exists)`);
      results.success.push({ ...a, size });
      continue;
    }
    
    process.stdout.write(`[${i+1}/${audios.length}] DOWNLOAD ${a.id} (${a.category}) ... `);
    
    try {
      await downloadFile(a.url, dest, (pct) => {
        process.stdout.write(`\r[${i+1}/${audios.length}] DOWNLOAD ${a.id} (${a.category}) ... ${pct}%`);
      });
      
      const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
      console.log(` OK (${size} MB)`);
      results.success.push({ ...a, size });
    } catch (err) {
      console.log(` FAIL: ${err.message}`);
      results.failed.push({ ...a, error: err.message });
    }
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Success: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\nFailed downloads:');
    results.failed.forEach(f => console.log(`  - ${f.id}: ${f.error}`));
  }
  
  // Save manifest
  const manifest = {
    version: 1,
    downloadedAt: new Date().toISOString(),
    videos: videos.map(v => ({
      id: v.id,
      title: v.title,
      category: v.category,
      localPath: `/media/video/${v.id}.mp4`,
      duration: v.duration
    })),
    audios: audios.map(a => ({
      id: a.id,
      title: a.title,
      category: a.category,
      localPath: `/media/audio/${a.id}.mp3`,
      duration: a.duration
    }))
  };
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'media_manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('\nManifest saved to backend/data/media_manifest.json');
}

downloadVideos().catch(console.error);
