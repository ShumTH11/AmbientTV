# AmbientTV — Immersive Web Redesign · Progress

> Стек: React 18 + Vite 5 + TypeScript + Tailwind CSS 3 + Framer Motion 11
> Старый код сохранён в `../web-legacy`. План: `../IMMERSIVE_REDESIGN_PLAN.md`.

## ✅ Этап 0 — Scaffold (завершён)
- Vite + React + TS проект в `web/`, алиас `@/` → `src/`
- Tailwind с кастомными токенами темы (CSS-переменные `--accent*`, стекло, анимации aurora/meteor/shimmer/beams)
- Установлены зависимости: framer-motion, lucide-react, three, tailwind-merge, clsx, cva, tailwindcss-animate
- `npm run build` проходит (tsc + vite, ~99 КБ gzip)
- Dev-сервер: `npm run dev` → http://localhost:5173

## ✅ Этап 1 — Ambient Canvas + Glass UI + Dynamic Color (фундамент готов)
Базовые компоненты (`src/components/ui/`):
- `AuroraBackground` — анимированные aurora-блобы (цвет = акцент категории)
- `Spotlight` — радиальный спот, следующий за курсором
- `Sparkles` — парящие частицы
- `MeteorShower` — падающие метеоры
- `ShimmerButton`, `MagneticButton` — кнопки с эффектами
- `GlassCard`, `TiltCard` (3D-tilt), `GradientText`, `Loader`

Система динамических тем (`src/context/ThemeContext.tsx` + `src/lib/theme-presets.ts`):
- 8 палитр акцента (default, nature, rain, lofi, cyberpunk, space, japan, vaporwave)
- При наведении на категорию весь UI перекрашивается в её акцент

Страница `App` + секции:
- `Header` — стеклянная навигация с «плывущим» активным индикатором (layoutId)
- `Hero` — полноэкранный: aurora + spotlight + sparkles, градиентный заголовок, CTA
- `SmartSuggestion` — карточка «Подобрано для вас» (по времени суток)
- `CategoryShowcase` + `CategoryCard` — горизонтальный скролл, 3D-tilt, видео-превью при наведении
- `Player` — иммерсивный оверлей: видео + аудио, edge-glow, glass-контролы, waveform, авто-скрытие UI, переключение сцен

API-слой (`src/lib/api.ts`): загрузка каталога из `/api/catalog` с **mock-фолбэком**, если бэкенд недоступен (работает без Docker).

## ✅ Этап 2 — Hero/Showcase расширение + страницы библиотеки (готово)
- **AppStore** (`src/store/AppStore.tsx`): клиентский стор с localStorage — избранное,
  история, плейлисты, пользователь. Методы toggleFavorite/addHistory/createPlaylist/
  addToPlaylist/removeFromPlaylist/login/logout.
- **Toast** (`src/components/ui/Toast.tsx`): стеклянные тосты (✓ / ❤ / ℹ).
- **PairCard** (`src/components/library/PairCard.tsx`): универсальная карточка пары —
  видео-превью, play, ❤ избранное, меню «➕ в плейлист».
- **CategoryDetail** (`src/components/home/CategoryDetail.tsx`): детальная страница
  категории — сетка всех пар с превью.
- **Страницы библиотеки** (`src/components/library/`):
  - `Favorites` — сетка избранного (пустое состояние)
  - `History` — история просмотров
  - `Playlists` — создание/удаление плейлистов, просмотр видео внутри
  - `Profile` — вход (mock, локально), статистики, выход
- **Hero**: parallax по скроллу (useScroll) + индикатор прогрутки сверху.
- **App**: провайдеры Theme+Store+Toast, view `home|category|favorites|history|playlists|profile`,
  открытие плеера списком пар (гибко для любого источника).
- **Player** переделан**: принимает `pairs[] + meta` вместо объекта категории.

## ✅ Этап 3 — Иммерсивный плеер: Web Audio визуализатор + beat-glow + crossfade (готово)
- **Visualizer** (`src/components/player/Visualizer.tsx`): canvas-спектр на Web Audio AnalyserNode.
  Реальный анализ для same-origin/CORS-ок аудио; синтетический beat-пульсирующий спектр
  для cross-origin (archive.org) и mock. Публикует `--beat` (0..1) на `documentElement`.
- **Player**:
  - Видеослой обёрнут в `motion.div` с crossfade (fade-out 320мс → смена сцены → fade-in).
  - Edge-glow пульсирует от `--beat`: `opacity: calc(0.2 + var(--beat) * 0.8)`.
  - Вместо CSS-волны — реальный `Visualizer` в нижней панели.
  - Переходы между сценами и клик по сцене используют `changeIndex` (с crossfade).
- AudioContext создаётся один раз на плеер, корректно закрывается на unmount.

## ✅ Статус этапов
- Этап 0–1: ✅ scaffold + Ambient Canvas + Glass UI + Dynamic Color
- Этап 2: ✅ страницы библиотеки (Избранное/История/Плейлисты/Профиль), CategoryDetail, стор, тосты, parallax Hero
- Этап 3: ✅ Immersive-плеер (Web Audio Visualizer, beat-glow, crossfade)
- Этап 4: ✅ полировка/адаптив/микроанимации + a11y/perf основы (Reveal, lazy-чанки, aria, reduced-motion)
- Этап 5: ✅ перф-аудит (lazy-чанки, content-visibility, memo) + a11y (focus-trap в плеере, skip-link, ARIA-live тосты, MotionConfig reduced-motion)
- Этап 6: ✅ деплой (zero-dep server.mjs: статика dist + proxy /api,/media → :3000; альтернатива nginx.conf)

## 🔜 Следующие шаги
- Все этапы завершены. Прод-запуск: `npm run build` → `npm start` (server.mjs, порт 4173) либо nginx по `nginx.conf`.
- Опционально: поднять бэкенд в Docker и проверить реальный каталог/CORS-аудио (визуализатор станет настоящим).
  - ✅ Сделано без Docker: `node server.js` на :3000 (Redis не нужен — cache in-memory, rate-limiter fail-open).
    Каталог ссылается на внешнее аудио archive.org (`ACAO: *`). В `Player` добавлен
    `crossOrigin="anonymous"` на `<audio>` → `Visualizer` теперь читает **реальный** FFT-спектр
    (synthetic только при устойчивой тишине). Dev-сервер :5173 проксирует `/api`,`/media` → :3000.

## ✅ Мульти-источниковая архитектура: YouTube / Rutube / Загрузки / Кастом (добавлено)
Согласованная с пользователем единая модель «источники медиа».

**Модель (`src/lib/types.ts`):**
- `SourceId = 'youtube' | 'rutube' | 'uploads' | 'presets' | 'custom'`
- `MediaRef { source, ref, title?, thumbnail? }` — один медиа-примитив (видео или аудио)
- `Scene { id, title, source, video?, audio?, ... }` — сцена = видео + аудио из любых источников

**Хелперы (`src/lib/sources.ts`):** `parseYouTubeId`, `parseRutubeId`, `youtubeThumbnail`,
`youtubeEmbedUrl`, `rutubeEmbedUrl`, `catalogToScenes`, `pairToScene`, `sourceIcon/Label`.

**Плеер (`src/components/player/Player.tsx`) — теперь работает со `scenes: Scene[]`:**
- Рендерер видео: `<video>` (presets/uploads) или IFrame (`YouTubeIframe`/`RutubeIframe`)
- Аудио: `<audio>` (presets/uploads, реальный FFT) или **заглушённый** IFrame (youtube/rutube)
- Логика mute: если звук из отдельного источника — видеослой приглушён; если YT/RU — видео и
  аудио в одном iframe (unmuted). Crossfade между сценами сохранён.
- `Visualizer` получает реальный спектр только для `<audio>` (same/ok-CORS); для iframe —
  синтетический пульс (браузер не даёт доступ к потоку iframe).

**Новые вью (`src/components/sources/`):**
- `ExternalSourceView` (Ютуб/Рутуб): вставка ссылки/ID → сцена; список с возможностью удаления.
  Хранится в `AppStore` (`youtubeItems`/`rutubeItems`, localStorage).
- `UploadsView`: загрузка видео и/или аудио файла на бэкенд → сцена.
- `CustomView`: конструктор — два независимых селектора (Видео-источник + Аудио-источник) из
  presets/youtube/rutube/uploads; «Собрать и играть» создаёт `Scene` с любым комбо.
- `SceneCard`: универсальная карточка сцены (превью для YT, иконка для остальных).

**Бэкенд (`backend/routes/uploads.js`, смонтирован в `server.js`):** публичный `POST /api/uploads`
(поле `file`, query `?type=video|audio`, multer → `media/uploads/{videos,audios}`, лимит 2ГБ,
фильтр MIME) + `GET /api/uploads` (список). Файлы отдаются через `/media` (тот же прокси).

**Навигация (`Header.tsx`):** добавлена группа «Источники» — Ютуб / Рутуб / Загрузки / Кастом.

**Проверено end-to-end:** dev :5173 проксирует `/api/uploads` → бэкенд :3000; POST загрузки
возвращает 200 + url; файл отдаётся по `/media/uploads/audios/...` (200, audio/mpeg). `npm run build` зелёный.

## Запуск
```bash
cd web
npm install
npm run dev        # http://localhost:5173 (proxy /api,/media → :3000)
# с бэкендом (Docker): docker start n8n ... и запуск backend на :3000
```
