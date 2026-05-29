# Railway Deploy — Step by Step

## 1. Подготовка (я сделал это в репозитории)

В корне репозитория уже есть:
- `railway.toml` — конфигурация деплоя
- `backend/Dockerfile.prod` — production Dockerfile
- `docker-compose.yml` — для локального теста

## 2. Регистрация на Railway

1. Открываешь [railway.app](https://railway.app)
2. Жмёшь **Login** → **Continue with GitHub**
3. Разрешаешь доступ к репозиториям

## 3. Создание проекта

1. Dashboard → **New Project**
2. Выбираешь **Deploy from GitHub repo**
3. Находишь `ShumTH11/AmbientTV`
4. Railway сам увидит `railway.toml` и `Dockerfile`

## 4. Настройка переменных окружения (Важно!)

Заходишь в проект → **Variables** → **New Variable**:

| Variable | Значение | Откуда взять |
|----------|----------|-------------|
| `APP_SECRET` | `random-string-32-chars` | Придумай сам |
| `PIXABAY_API_KEY` | `твой_ключ` | [pixabay.com/api/docs](https://pixabay.com/api/docs) |
| `PEXELS_API_KEY` | `твой_ключ` | [pexels.com/api](https://www.pexels.com/api/) |
| `REDIS_URL` | `redis://default:password@containers-us-west-XXX.railway.app:6379` | Railway добавит сам, если подключишь Redis |
| `ADMIN_PASSWORD_HASH` | `$2b$10$...` | Сгенерируй через bcrypt |

**Как получить ключи:**
- Pixabay: регистрация → https://pixabay.com/api/docs
- Pexels: регистрация → https://www.pexels.com/api/

## 5. Persistent Volume (для SQLite)

Без этого база данных будет сбрасываться при каждом деплое!

1. В проекте → **Add** → **Volume**
2. Name: `data`
3. Mount Path: `/app/data`
4. Size: 1 GB (хватит)

## 6. Добавление Redis (опционально)

1. **Add** → **Database** → **Add Redis**
2. Railway автоматически добавит `REDIS_URL` в переменные

## 7. Деплой

1. Каждый push в `master` на GitHub → автоматический деплой
2. Или вручную: **Deployments** → **Deploy Latest**
3. Ждёшь 1-2 минуты → статус **Healthy**

## 8. Домен

Railway даёт бесплатный домен:
- `https://ambienttv-production.up.railway.app`

Или свой:
- **Settings** → **Domains** → **Generate Domain** / **Custom Domain**

## 9. Проверка

```bash
curl https://ambienttv-production.up.railway.app/api/health
# → {"status":"ok"}
```

## 10. Мониторинг

Railway сам показывает:
- CPU / Memory usage
- Logs (в реальном времени)
- Deployments history
- Auto-restart при падении

---

## Итоговая структура на Railway

```
Project: AmbientTV
├── Service: ambienttv (Docker)
│   ├── Volume: /app/data (SQLite)
│   ├── Env vars: APP_SECRET, PIXABAY_API_KEY...
│   └── URL: https://ambienttv.up.railway.app
└── Service: redis (Redis)
    └── Internal connection only
```

Если застрянешь на каком-то шаге — пиши, помогу 🤍
