# AmbientTV — Прогресс реализации

## Итоговая статистика

| Модуль | Файлы | Строки | Коммит |
|--------|-------|--------|--------|
| `:app` | 7 | 690 | `528e3d3` |
| `:domain` | 30 | 761 | `5acca1d` |
| `:data` | 31 | 2440 | `142df35` |
| `:player` | 6 | 1296 | `f099027` |
| `:ai` | 5 | 1087 | `fbb21e5` |
| `:ui` | 13 | 2528 | `e609c69` |
| **ИТОГО** | **109** | **8802** | — |

**Дата завершения**: 2026-05-23

## Stage 1: Корневая структура проекта ✅
- [x] Корневые gradle-файлы (build.gradle.kts, settings.gradle.kts)
- [x] gradle/libs.versions.toml (Version Catalog)
- [x] Структура папок для 6 модулей
- [x] Module-level build.gradle.kts для всех модулей
- [x] SPEC.md — полная спецификация проекта
- [x] Первый git commit

## Stage 2: Модуль :domain ✅
- [x] Модели: ContentCategory, ContentTag, ContentItem, ContentPair
- [x] Enum-ы: MediaType, ContentSource, LicenseType, MatchPriority
- [x] Интерфейс AIContentAdapter
- [x] Интерфейс ContentRepository
- [x] UseCases (MatchContent, PlayContentPair, ScanLocal, GetCategories, GenerateMedia)
- [x] Поддерживающие типы: PlaybackSession, ScanResult, MatchResult
- **Результат**: 31 файл, 761 строка. Коммит: `5acca1d`

## Stage 3: Модуль :data ✅
- [x] Room: ContentEntity, ContentPairEntity, CategoryEntity
- [x] DAO: ContentDao, ContentPairDao, CategoryDao
- [x] AppDatabase
- [x] LocalDataSource + FileScanner
- [x] RemoteDataSource (YouTube, Pixabay, Pexels, InternetArchive APIs)
- [x] LicenseChecker
- [x] ContentRepositoryImpl
- **Результат**: 28 файлов, 2350 строк. Коммит: `142df35`

## Stage 3.5: Каталог и Fallback-стратегия ✅
- [x] `assets/content_catalog.json` — курируемый каталог пар видео+аудио (реальные URL с Pexels + Archive.org)
- [x] `CatalogDataSource` — чтение каталога из assets, маппинг в `ContentPair`
- [x] `ContentRepositoryImpl` — приоритет: сохранённые пары → каталог → remote API → fallback
- **Результат**: +3 файла, ~250 строк.

## Stage 3.6: Backend (Node.js/Express) ✅
- [x] `backend/server.js` — Express сервер с CORS
- [x] `backend/routes/catalog.js` — отдаёт `content_catalog.json`
- [x] `backend/routes/search.js` — прокси к Pexels, Pixabay, YouTube, Coverr, Internet Archive
- [x] `backend/.env` — все API ключи хранятся на сервере (не в APK)
- [x] `middleware/auth.js` — Bearer-token защита всех эндпоинтов
- [x] `Dockerfile` + `.dockerignore` — контейнеризация
- [x] `fly.toml` — конфигурация деплоя на Fly.io
- [x] `AmbientBackendApi` — Retrofit интерфейс к бэкенду с `Authorization` заголовком
- [x] `RemoteDataSourceImpl` — теперь ходит в бэкенд, а не напрямую к API
- [x] `NetworkModule` — убраны реальные ключи из Android-кода, добавлен `backendClient` с Bearer interceptor
- [x] `app/build.gradle.kts` — `BuildConfig.APP_SECRET` из `local.properties`
- [x] `DEPLOY.md` — полная инструкция по деплою
- **Результат**: +10 файлов, ~800 строк.

## Stage 4: Модуль :player ✅
- [x] ExoPlayerWrapper
- [x] SyncedPlaybackManager
- [x] PlaybackService (MediaLibraryService)
- [x] MediaSessionCallback
- [x] PlayerState, SyncState
- [x] `PlaybackCacheManager` — `SimpleCache` + LRU eviction (1 GB → 500 MB fallback)
- [x] Retry logic (3×) + fatal error propagation для fallback на уровне UI
- [x] Stall detection (>3 s buffering) через `isStalled` Flow
- [x] Auto stop при паузе >5 мин для освобождения памяти
- **Результат**: +2 файла, ~350 строк к `player`.

## Stage 5: Модуль :ai ✅
- [x] CategoryMatcher
- [x] ContentRouter
- [x] AIContentAdapterImpl
- [x] ContentCache (LRU)
- [x] AIProviderConfig
- **Результат**: 10 файлов, 1225 строк. Коммит: `fbb21e5`

## Stage 6: Модуль :ui ✅
- [x] CategoryBrowserScreen — 3-колоночная сетка категорий
- [x] ContentPairPlayerScreen — полноэкранный плеер с оверлеем
- [x] SettingsScreen — настройки источников, AI, лицензии
- [x] AmbientModeScreen — минималистичный UI с автоскрытием
- [x] ViewModels (4 шт) — StateFlow + Hilt
- [x] Navigation — NavHost с 4 экранами
- [x] Компоненты — CategoryCard, FocusableButton, PlaybackControls
- **Результат**: 13 файлов, 2528 строк. Коммит: `e609c69`

## Stage 7: Модуль :app ✅
- [x] AmbientTVApplication — @HiltAndroidApp, preload категорий
- [x] MainActivity — ComponentActivity, TvNavigation, audio focus
- [x] DatabaseModule — Room singleton, все DAO
- [x] NetworkModule — Retrofit (YouTube, Pixabay, Pexels, IA)
- [x] PlayerModule — @Named(video/audio) ExoPlayerWrapper
- [x] AIModule — @Binds AIContentAdapterImpl
- [x] DataModule — @Binds ContentRepositoryImpl + DataSources
- [x] AndroidManifest — permissions, leanback, PlaybackService
- [x] **Seed catalog to SQLite** — при старте каталог сохраняется в Room (`content_items` + `content_pairs`)
- [x] **Cache pre-warm** — тихая 4-секундная буферизация первой пары каждой категории для заполнения `SimpleCache`
- **Результат**: 11 файлов, 826 строк. Коммит: `528e3d3`
