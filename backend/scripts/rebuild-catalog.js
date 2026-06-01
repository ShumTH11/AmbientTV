#!/usr/bin/env node
/**
 * AmbientTV — Catalog Rebuilder
 * Replaces local /media/ URLs with real external URLs
 * Sources: Pexels (video), Archive.org (audio)
 */

const fs = require('fs').promises;
const path = require('path');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'content_catalog.json');

// Real video URLs from Pexels (verified working)
const VIDEOS = {
  'cozy-room': 'https://videos.pexels.com/video-files/32197054/13731349_1080_1920_30fps.mp4',
  'rain-window': 'https://videos.pexels.com/video-files/5197762/5197762-hd_1920_1080_25fps.mp4',
  'neon-city': 'https://videos.pexels.com/video-files/34719182/14717092_1280_720_30fps.mp4',
  'train-sunset': 'https://videos.pexels.com/video-files/34735453/14724763_1280_720_30fps.mp4',
  'coffee-shop': 'https://videos.pexels.com/video-files/33923464/14395782_1280_720_60fps.mp4',
  'library': 'https://videos.pexels.com/video-files/35298829/14955811_1440_2560_30fps.mp4',
  'sakura': 'https://videos.pexels.com/video-files/12219155/12219155-hd_1080_1920_60fps.mp4',
  'beach-sunset': 'https://videos.pexels.com/video-files/3179024/3179024-hd_1280_720_50fps.mp4',
  'night-stars': 'https://videos.pexels.com/video-files/30054113/12891206_1440_2560_30fps.mp4',
  'rain-study': 'https://videos.pexels.com/video-files/8549583/8549583-hd_1080_1920_25fps.mp4',
  'lake-sunset': 'https://videos.pexels.com/video-files/36318061/15402242_1440_2560_30fps.mp4',
};

// Real audio URLs from Archive.org (verified working)
const AUDIOS = {
  // CalmPills collection — ambient/chill
  'calm-1': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_1_-_Still_Habitat.mp3',
  'calm-2': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_2_-_Slowly_Dusk.mp3',
  'calm-3': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_10_-_Tone_Poetry_E52E62AA-6353-44AE-BA40-2AE6AD7F1776.mp3',
  'calm-4': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_11_-_The_Healing_Lake_8BE609A8-7115-4273-8A1A-CE5738459E7A.mp3',
  'calm-5': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_12_-_It_Was_Beautiful_A8151772-9133-4709-8419-D74050521F15.mp3',
  'calm-6': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_13_-_Introverted_Chords_AAA9721C-0CAE-470A-A2CE-A8E1B627463C.mp3',
  'calm-7': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_14_-_Absolvo_6C9066FC-B86B-4525-A504-62E7EC98DF73.mp3',
  'calm-8': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_15_-_Painting_Twilight_B95718A4-8D99-474C-9B6B-07EC2087E161.mp3',
  'calm-9': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_16_-_Star_Encounter_F14A4860-06AC-4C42-BB1B-E1E6B92152C5.mp3',
  'calm-10': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_17_-_Day_and_Night_9620FEF5-BD45-4570-9B97-1DEF9F245C72.mp3',
  'calm-11': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_18_-_Before_Sunset_622D0F46-D1E8-44BE-AA22-B85E311A62BF.mp3',
  'calm-12': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_21_-_Heaven_Sings.mp3',
  'calm-13': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_22_-_Beauty_In_Decay.mp3',
  'calm-14': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_23_-_Unabridged_Rest.mp3',
  'calm-15': 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_24_-_Quarantine.mp3',
  // Chillhop collection — lofi/beats
  'lofi-1': 'https://archive.org/download/chillhop-music/tracks/mp3/10000_Moods%2C%20Yasper%20-%20Pick%20Up.mp3',
  'lofi-2': 'https://archive.org/download/chillhop-music/tracks/mp3/10001_Moods%2C%20Yasper%20-%20Sofa%20Stories.mp3',
  'lofi-3': 'https://archive.org/download/chillhop-music/tracks/mp3/10002_Moods%2C%20Yasper%20-%20Vibe%20Vibe.mp3',
  'lofi-4': 'https://archive.org/download/chillhop-music/tracks/mp3/10003_Moods%2C%20Yasper%20-%20Breakfast%20w%20Bastien.mp3',
  'lofi-5': 'https://archive.org/download/chillhop-music/tracks/mp3/10015_Sleepy%20Fish%20-%20Rest%20Until%20Dark.mp3',
  'lofi-6': 'https://archive.org/download/chillhop-music/tracks/mp3/10017_Sleepy%20Fish%20-%20Witch%20Hat.mp3',
  'lofi-7': 'https://archive.org/download/chillhop-music/tracks/mp3/10021_Sleepy%20Fish%20-%20Butterfly.mp3',
  'lofi-8': 'https://archive.org/download/chillhop-music/tracks/mp3/10022_Sleepy%20Fish%20-%20Bookshelves.mp3',
  'lofi-9': 'https://archive.org/download/chillhop-music/tracks/mp3/10023_Sleepy%20Fish%20-%20Colors%20Fade.mp3',
  'lofi-10': 'https://archive.org/download/chillhop-music/tracks/mp3/10027_Sleepy%20Fish%20-%20Feather.mp3',
};

const videoKeys = Object.keys(VIDEOS);
const audioKeys = Object.keys(AUDIOS);

function getTag(mood, genre) {
  return [
    { key: 'mood', value: mood },
    { key: 'genre', value: genre },
    { key: 'duration', value: 'long' }
  ];
}

// Build anime-lofi category with real URLs
function buildAnimeLofi() {
  const pairs = [];
  const scenes = [
    { v: 'cozy-room', a: ['calm-1', 'lofi-1', 'calm-2', 'lofi-2', 'calm-3'], title: 'Cozy Room', mood: 'cozy', genre: 'lofi' },
    { v: 'rain-window', a: ['calm-4', 'lofi-3', 'calm-5', 'lofi-4', 'calm-6'], title: 'Rainy Window', mood: 'calm', genre: 'ambient' },
    { v: 'neon-city', a: ['lofi-5', 'calm-7', 'lofi-6', 'calm-8', 'lofi-7'], title: 'Neon City Night', mood: 'dark', genre: 'synthwave' },
    { v: 'train-sunset', a: ['calm-9', 'lofi-8', 'calm-10', 'lofi-9', 'calm-11'], title: 'Train at Sunset', mood: 'nostalgic', genre: 'lofi' },
    { v: 'coffee-shop', a: ['lofi-10', 'calm-12', 'lofi-1', 'calm-13', 'lofi-2'], title: 'Coffee Shop', mood: 'cozy', genre: 'jazz' },
    { v: 'library', a: ['calm-14', 'lofi-3', 'calm-15', 'lofi-4', 'calm-1'], title: 'Quiet Library', mood: 'focused', genre: 'piano' },
    { v: 'sakura', a: ['calm-2', 'lofi-5', 'calm-3', 'lofi-6', 'calm-4'], title: 'Cherry Blossom', mood: 'peaceful', genre: 'ambient' },
    { v: 'beach-sunset', a: ['lofi-7', 'calm-5', 'lofi-8', 'calm-6', 'lofi-9'], title: 'Beach Sunset', mood: 'calm', genre: 'chill' },
    { v: 'night-stars', a: ['calm-7', 'lofi-10', 'calm-8', 'lofi-1', 'calm-9'], title: 'Starry Night', mood: 'dreamy', genre: 'ambient' },
    { v: 'rain-study', a: ['lofi-2', 'calm-10', 'lofi-3', 'calm-11', 'lofi-4'], title: 'Study in Rain', mood: 'focused', genre: 'lofi' },
    { v: 'lake-sunset', a: ['calm-12', 'lofi-5', 'calm-13', 'lofi-6', 'calm-14'], title: 'Lake at Dusk', mood: 'peaceful', genre: 'ambient' },
  ];

  for (const scene of scenes) {
    for (const ak of scene.a) {
      pairs.push({
        videoUrl: VIDEOS[scene.v],
        audioUrl: AUDIOS[ak],
        title: `${scene.title} — ${ak.startsWith('lofi') ? 'LoFi' : 'Ambient'} Mix`,
        tags: getTag(scene.mood, scene.genre)
      });
    }
  }

  return { id: 'anime-lofi', pairs };
}

async function rebuild() {
  console.log('🔄 Rebuilding catalog with real URLs...\n');

  const data = await fs.readFile(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(data);

  // Remove old anime-lofi and add rebuilt
  catalog.categories = catalog.categories.filter(c => c.id !== 'anime-lofi');
  catalog.categories.push(buildAnimeLofi());

  // Fix broken Pexels URLs (old direct links return 403, need updated format)
  // The 5 original videos still work with their hd_1920_1080 variants
  const pexelsFixes = {
    '1550080': 'https://videos.pexels.com/video-files/1550080/1550080-hd_1920_1080_30fps.mp4',
    '18069166': 'https://videos.pexels.com/video-files/18069166/18069166-hd_1920_1080_24fps.mp4',
    '18069578': 'https://videos.pexels.com/video-files/18069578/18069578-hd_1920_1080_24fps.mp4',
    '1860076': 'https://videos.pexels.com/video-files/1860076/1860076-hd_1920_1080_24fps.mp4',
    '4763824': 'https://videos.pexels.com/video-files/4763824/4763824-hd_1920_1080_24fps.mp4',
  };

  for (const cat of catalog.categories) {
    for (const pair of cat.pairs || []) {
      if (pair.videoUrl && pair.videoUrl.includes('videos.pexels.com')) {
        const match = pair.videoUrl.match(/video-files\/(\d+)/);
        if (match && pexelsFixes[match[1]]) {
          pair.videoUrl = pexelsFixes[match[1]];
        }
      }
    }
  }

  // Fix broken Healing Hands audio (404)
  for (const cat of catalog.categories) {
    for (const pair of cat.pairs || []) {
      if (pair.audioUrl && pair.audioUrl.includes('best-relaxation-music-2019') && pair.audioUrl.includes('Healing%20Hands')) {
        // Replace with CalmPills track
        pair.audioUrl = 'https://archive.org/download/CalmPills/Uplifting_Pills_-_Calm_Pill_15_-_Painting_Twilight_B95718A4-8D99-474C-9B6B-07EC2087E161.mp3';
        pair.title = pair.title.replace('Healing Hands', 'Painting Twilight');
      }
    }
  }

  catalog.version = (catalog.version || 1) + 1;
  catalog.rebuiltAt = new Date().toISOString();

  await fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2));

  const totalPairs = catalog.categories.reduce((s, c) => s + (c.pairs?.length || 0), 0);
  console.log('✅ Catalog rebuilt!');
  console.log(`   Version: ${catalog.version}`);
  console.log(`   Categories: ${catalog.categories.length}`);
  console.log(`   Total pairs: ${totalPairs}`);
  console.log(`   anime-lofi pairs: ${catalog.categories.find(c => c.id === 'anime-lofi')?.pairs?.length || 0}`);
}

rebuild().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
