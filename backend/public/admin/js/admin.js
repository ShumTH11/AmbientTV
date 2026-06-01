/* AmbientTV Admin Panel JS */
const API = '/api/admin';
let catalog = null;
let currentCatId = null;

// Check session on load
(async () => {
  try {
    const r = await fetch(`${API}/check`, { credentials: 'include' });
    if (r.ok) { showAdmin(); await loadCatalog(); }
    else { showLogin(); }
  } catch (e) { showLogin(); }
})();

// Login
document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  const pw = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.textContent = '';
  try {
    const r = await fetch(`${API}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }), credentials: 'include'
    });
    if (r.ok) { showAdmin(); await loadCatalog(); }
    else { err.textContent = 'Неверный пароль'; }
  } catch (e) { err.textContent = 'Ошибка сети'; }
}

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
  showLogin();
});

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('admin-screen').classList.add('hidden');
}
function showAdmin() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('admin-screen').classList.remove('hidden');
}

// Load catalog
async function loadCatalog() {
  try {
    const r = await fetch(`${API}/catalog`, { credentials: 'include' });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      toast('Ошибка загрузки каталога: ' + (err.error || r.status), 'error');
      console.error('loadCatalog failed:', r.status, err);
      return;
    }
    const data = await r.json();
    if (!data || !Array.isArray(data.categories)) {
      toast('Некорректный формат каталога', 'error');
      console.error('Invalid catalog format:', data);
      return;
    }
    catalog = data;
    renderSidebar();
    updateStats();
    if (currentCatId) selectCategory(currentCatId);
  } catch (e) {
    toast('Ошибка загрузки каталога', 'error');
    console.error('loadCatalog exception:', e);
  }
}

function updateStats() {
  if (!catalog || !Array.isArray(catalog.categories)) {
    document.getElementById('stats-bar').textContent = '0 категорий · 0 пар';
    return;
  }
  const total = catalog.categories.reduce((s, c) => s + (Array.isArray(c.pairs) ? c.pairs.length : 0), 0);
  document.getElementById('stats-bar').textContent =
    `${catalog.categories.length} категорий · ${total} пар`;
}

// Sidebar categories
function renderSidebar() {
  const list = document.getElementById('category-list');
  list.innerHTML = '';
  if (!catalog || !Array.isArray(catalog.categories)) return;
  catalog.categories.forEach((cat, idx) => {
    if (!cat || typeof cat !== 'object') return;
    const div = document.createElement('div');
    div.className = 'cat-item' + (cat.id === currentCatId ? ' active' : '');
    div.innerHTML = `
      <span class="cat-name">${escapeHtml(cat.id)}</span>
      <span class="cat-count">${Array.isArray(cat.pairs) ? cat.pairs.length : 0}</span>
      <span class="cat-del" title="Удалить">×</span>
    `;
    div.onclick = (e) => { if (e.target.closest('.cat-del')) return; selectCategory(cat.id); };
    list.appendChild(div);
  });
}

// Select category
function selectCategory(id) {
  currentCatId = id;
  document.querySelectorAll('.cat-item').forEach(el => el.classList.toggle('active', el.querySelector('.cat-name')?.textContent === id));
  if (!catalog || !Array.isArray(catalog.categories)) return;
  const cat = catalog.categories.find(c => c && c.id === id);
  if (!cat) return;
  renderCategoryEditor(cat);
}

// Category editor
function renderCategoryEditor(cat) {
  const area = document.getElementById('content-area');
  area.innerHTML = `
    <div class="cat-editor">
      <h2>
        <input type="text" id="cat-id-input" value="${escapeHtml(cat.id)}" placeholder="ID категории">
        <button class="btn-small" onclick="renameCurrentCat()">✏️ Переименовать</button>
        <button class="btn-small" onclick="addPair()">➕ Добавить пару</button>
      </h2>
      <div class="pairs-header"><h3>Пары видео+аудио</h3></div>
      <div id="pairs-container"></div>
    </div>
  `;
  const container = document.getElementById('pairs-container');
  const pairs = Array.isArray(cat.pairs) ? cat.pairs : [];
  if (pairs.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет пар. Нажмите «Добавить пару»</div>';
  } else {
    pairs.forEach((pair, idx) => {
      try {
        container.appendChild(renderPairCard(pair, idx));
      } catch (e) {
        console.error('Failed to render pair', idx, pair, e);
      }
    });
  }
  const addBtn = document.createElement('button');
  addBtn.className = 'add-pair-btn';
  addBtn.textContent = '➕ Добавить новую пару';
  addBtn.onclick = addPair;
  container.appendChild(addBtn);
}

function renderPairCard(pair, idx) {
  if (!pair || typeof pair !== 'object') {
    const div = document.createElement('div');
    div.className = 'pair-card error';
    div.textContent = '⚠️ Ошибка: некорректная пара #' + idx;
    return div;
  }
  const div = document.createElement('div');
  div.className = 'pair-card';
  div.dataset.index = idx;
  div.innerHTML = `
    <div class="pair-header">
      <input class="pair-title-input" value="${escapeHtml(pair.title || '')}" placeholder="Название пары" onchange="updatePair(${idx}, 'title', this.value)">
      <button class="btn-danger" onclick="deletePair(${idx})">🗑 Удалить</button>
    </div>
    <div class="row">
      <label>Видео</label>
      <input type="text" value="${escapeHtml(pair.videoUrl || '')}" placeholder="URL видео" onchange="updatePair(${idx}, 'videoUrl', this.value)">
    </div>
    <div class="row">
      <label>Аудио</label>
      <input type="text" value="${escapeHtml(pair.audioUrl || '')}" placeholder="URL аудио" onchange="updatePair(${idx}, 'audioUrl', this.value)">
    </div>
    <div class="tags-row">
      ${renderTags(pair.tags, idx)}
    </div>
    <div class="preview-row">
      <div class="preview-box">
        ${pair.videoUrl ? `<video src="${escapeHtml(pair.videoUrl)}" controls muted loop></video>` : '<span class="preview-placeholder">Нет видео</span>'}
      </div>
      <div class="preview-box">
        ${pair.audioUrl ? `<audio src="${escapeHtml(pair.audioUrl)}" controls></audio>` : '<span class="preview-placeholder">Нет аудио</span>'}
      </div>
    </div>
  `;
  return div;
}

function renderTags(tags, pairIdx) {
  const defaults = [
    { key: 'mood', options: ['calm', 'dark', 'festive', 'epic', 'industrial', 'happy', 'sad', 'energetic'] },
    { key: 'genre', options: ['ambient', 'synthwave', 'christmas', 'orchestral', 'steampunk', 'jazz', 'electronic', 'classical'] },
    { key: 'duration', options: ['short', 'medium', 'long'] },
  ];
  const safeTags = Array.isArray(tags) ? tags : [];
  return defaults.map(def => {
    const tag = safeTags.find(t => t && t.key === def.key) || { key: def.key, value: '' };
    return `<div class="tag-chip">
      <span class="tag-key">${def.key}</span>
      <select onchange="updateTag(${pairIdx}, '${def.key}', this.value)">
        <option value="">—</option>
        ${def.options.map(o => `<option value="${o}"${o === tag.value ? ' selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>`;
  }).join('');
}

// CRUD operations
function updatePair(idx, field, value) {
  const cat = catalog.categories.find(c => c.id === currentCatId);
  if (!cat || !cat.pairs[idx]) return;
  cat.pairs[idx][field] = value;
  toast('Изменено (не забудьте сохранить)', 'success');
  // Refresh preview if URL changed
  if (field === 'videoUrl' || field === 'audioUrl') {
    selectCategory(currentCatId);
  }
}

function updateTag(pairIdx, key, value) {
  const cat = catalog.categories.find(c => c.id === currentCatId);
  if (!cat || !cat.pairs[pairIdx]) return;
  if (!cat.pairs[pairIdx].tags) cat.pairs[pairIdx].tags = [];
  const existing = cat.pairs[pairIdx].tags.find(t => t.key === key);
  if (existing) existing.value = value;
  else cat.pairs[pairIdx].tags.push({ key, value });
}

function deletePair(idx) {
  if (!confirm('Удалить эту пару?')) return;
  const cat = catalog.categories.find(c => c.id === currentCatId);
  if (!cat) return;
  cat.pairs.splice(idx, 1);
  selectCategory(currentCatId);
  updateStats();
  toast('Пара удалена (не забудьте сохранить)', 'success');
}

function addPair() {
  const cat = catalog.categories.find(c => c.id === currentCatId);
  if (!cat) return;
  if (!cat.pairs) cat.pairs = [];
  cat.pairs.push({
    videoUrl: '',
    audioUrl: '',
    title: 'Новая пара',
    tags: [
      { key: 'mood', value: 'calm' },
      { key: 'genre', value: 'ambient' },
      { key: 'duration', value: 'long' }
    ]
  });
  selectCategory(currentCatId);
  updateStats();
  toast('Пара добавлена (не забудьте сохранить)', 'success');
}

function renameCurrentCat() {
  const newId = document.getElementById('cat-id-input').value.trim();
  if (!newId) return toast('ID не может быть пустым', 'error');
  const cat = catalog.categories.find(c => c.id === currentCatId);
  if (!cat) return;
  cat.id = newId;
  currentCatId = newId;
  renderSidebar();
  toast('Категория переименована', 'success');
}

// Add category
function deleteCategory(idx) {
  if (!confirm('Удалить категорию и все её пары?')) return;
  const removed = catalog.categories.splice(idx, 1);
  if (currentCatId === removed[0].id) { currentCatId = null; document.getElementById('content-area').innerHTML = '<div class="empty-state">Выберите категорию</div>'; }
  renderSidebar();
  updateStats();
  toast('Категория удалена', 'success');
}

document.getElementById('add-category-btn').addEventListener('click', () => {
  const id = prompt('ID новой категории (например: nature, cyberpunk):');
  if (!id) return;
  if (catalog.categories.find(c => c.id === id)) return toast('Категория уже существует', 'error');
  catalog.categories.push({ id, pairs: [] });
  currentCatId = id;
  renderSidebar();
  selectCategory(id);
  updateStats();
  toast('Категория создана', 'success');
});

// Save
document.getElementById('save-btn').addEventListener('click', async () => {
  try {
    const r = await fetch(`${API}/catalog`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catalog), credentials: 'include'
    });
    if (r.ok) { toast('✅ Сохранено!', 'success'); }
    else { const e = await r.json(); toast('Ошибка: ' + (e.error || ''), 'error'); }
  } catch (e) { toast('Ошибка сети', 'error'); }
});

// Toast
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type;
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
