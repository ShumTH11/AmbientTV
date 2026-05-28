# AmbientTV Backend

Node.js / Express прокси-сервер для Android TV приложения AmbientTV.

## Что делает backend

- Хранит API-ключи к внешним сервисам (Pexels, Pixabay, YouTube и др.) на стороне сервера — они не попадают в APK.
- Предоставляет курируемый каталог контента (`content_catalog.json`) для OTA-обновлений.
- Проксирует поисковые запросы к видео/аудио хостингам с кэшированием (5 мин TTL) и rate limiting (30 req/min).
- Реализует exponential backoff retry для внешних API.
- Веб-админка для управления каталогом без необходимости править JSON вручную.

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка окружения
# Создайте файл .env (или отредактируйте существующий):
APP_SECRET=your_app_secret_for_android_tv
ADMIN_PASSWORD=your_admin_password

# Запуск в dev-режиме (с авто-перезагрузкой)
npm run dev

# Или production
npm start
```

Сервер поднимается на `http://localhost:3000` (или порту из env `PORT`).

## Endpoints

| Endpoint | Auth | Описание |
|----------|------|----------|
| `GET /api/health` | Нет | Health check |
| `GET /api/catalog` | Bearer `APP_SECRET` | Текущий content catalog |
| `GET /api/search/*` | Bearer `APP_SECRET` | Прокси поиск (Pexels, Pixabay, Archive, Coverr, YouTube) |
| `GET /admin` | Нет (UI) | Веб-админка |
| `GET /api/admin/catalog` | Bearer `ADMIN_PASSWORD` | API каталога для админки |
| `POST /api/admin/catalog` | Bearer `ADMIN_PASSWORD` | Сохранение каталога |
| `GET /api/admin/stats` | Bearer `ADMIN_PASSWORD` | Статистика сервера |

## Админка

Откройте `http://<your-server>:3000/admin` в браузере.

### Вкладки

1. **Каталог** — просмотр и редактирование категорий и пар. Можно добавлять/удалять категории, пары, теги. Все изменения сохраняются в `data/content_catalog.json`.
2. **Статистика** — версия каталога, количество категорий/пар, аптайм сервера.
3. **Документация** — полное описание:
   - Как работает приложение (AI matching, offline fallback, OTA sync, Watch Next и т.д.)
   - Как модерировать контент (проверка URL, теги, лицензии)
   - Способы управления контентом (Curated Catalog, Remote APIs, Local Media)
   - Таблица приоритетов источников контента
   - Быстрый старт для администратора

### Авторизация

Пароль админки задаётся через env-переменную `ADMIN_PASSWORD`. После ввода токен сохраняется в `localStorage` браузера.

## Структура проекта

```
backend/
├── data/
│   └── content_catalog.json      # Курируемый каталог (редактируется через админку)
├── middleware/
│   ├── auth.js                   # Bearer-token auth для API
│   ├── rateLimit.js              # Rate limiting (30 req/min)
│   └── cache.js                  # In-memory TTL cache
├── public/
│   └── admin/
│       └── index.html            # Веб-админка (vanilla JS)
├── routes/
│   ├── admin.js                  # Admin API (catalog CRUD + stats)
│   ├── catalog.js                # Публичный endpoint catalog
│   └── search.js                 # Прокси поисковых endpoint'ов
├── server.js                     # Точка входа
├── .env                          # Переменные окружения
├── package.json
└── README.md
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `PORT` | Порт сервера (по умолчанию 3000) |
| `APP_SECRET` | Секретный токен для Android TV приложения |
| `ADMIN_PASSWORD` | Пароль для входа в веб-админку |
| `PEXELS_API_KEY` | Ключ Pexels API (для search) |
| `PIXABAY_API_KEY` | Ключ Pixabay API (для search) |
| `YOUTUBE_API_KEY` | Ключ YouTube Data API (для search) |

## Развёртывание

### Docker

```bash
docker build -t ambienttv-backend .
docker run -p 3000:3000 --env-file .env ambienttv-backend
```

### Fly.io

```bash
fly deploy
```

## Лицензия

Backend использует только бесплатное ПО (Express, Node-fetch, CORS, dotenv). Все медиа-ссылки в каталоге должны быть royalty-free / CC0.
