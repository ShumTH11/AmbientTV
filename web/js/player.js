/**
 * AmbientTV Web — Player Main Entry
 * Orchestrates core, UI, and fallback modules
 */

const params = new URLSearchParams(location.search);
const categoryId = params.get('category');
const pairParam = params.get('pair');

initPlayer();

async function initPlayer() {
  try {
    const catalog = await apiCatalog();
    const allCategories = catalog.categories || [];

    initUI(allCategories);
    initCore(pairParam, categoryId, allCategories);
    initFallback();
  } catch (e) {
    alert('Ошибка: ' + e.message);
    goBack();
  }
}
