# Деплой AmbientTV (веб)

Сборка: `npm run build` → папка `dist/` (статика, SPA).
Запуск отдаёт `dist/` и проксирует `/api/*` и `/media/*` на бэкенд Node (по умолчанию `http://localhost:3000`).

## Вариант 1 — Node (zero-dependency), без Docker

```bash
npm run build
PORT=4173 BACKEND_URL=http://localhost:3000 npm start
# → http://localhost:4173
```

`server.mjs` сам отдаёт статику, делает SPA-fallback (`/любой-путь` → `index.html`),
защищает от path-traversal и проксирует API/медиа. Проверка: `GET /health`.

## Вариант 2 — nginx

```bash
npm run build
# скопировать dist/ в /var/www/ambienttv/dist
# подключить nginx.conf (см. файл) и запустить бэкенд на :3000
nginx -t && systemctl reload nginx
```

## Переменные окружения (server.mjs)

- `PORT` — порт статики (по умолч. 4173)
- `BACKEND_URL` — базовый URL бэкенда (по умолч. `http://localhost:3000`)

## Локально с бэкендом

Бэкенд в Docker: `docker start n8n` + запуск `backend` на `:3000`.
Тогда `/api/catalog` отдаёт реальный каталог, а CORS-аудио позволит
`Visualizer` (Web Audio) работать с реальным спектром, а не синтетическим.
