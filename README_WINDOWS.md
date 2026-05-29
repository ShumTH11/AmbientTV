# Windows Local Deploy — Docker Desktop

## Требования

1. **Windows 10/11** (Home, Pro, или Enterprise)
2. **Docker Desktop** с WSL2 backend
3. **Git** (для клонирования)

## Установка Docker Desktop

1. Скачай с [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Установи, при установке выбери **Use WSL 2** если спросит
3. Перезагрузи ПК
4. Открой Docker Desktop, убедись что он работает (зеленый статус)

## Установка

### 1. Клонируй репозиторий

```cmd
cd E:\
git clone https://github.com/ShumTH11/AmbientTV.git
```

Или просто скачай ZIP и распакуй в `E:\AmbientTV`.

### 2. Создай .env файл

```cmd
cd E:\AmbientTV\backend
copy .env.example .env
```

Открой `.env` в Notepad (или VS Code) и добавь свои API ключи:

```
APP_SECRET=your-secret-key-12345
PIXABAY_API_KEY=твой_ключ_от_pixabay
PEXELS_API_KEY=твой_ключ_от_pexels
```

Где взять ключи:
- **Pixabay**: регистрация на [pixabay.com/api/docs](https://pixabay.com/api/docs)
- **Pexels**: регистрация на [pexels.com/api](https://www.pexels.com/api/)

### 3. Запуск

Просто дважды кликни файл или запусти в терминале:

```cmd
cd E:\AmbientTV
scripts\deploy.bat
```

Или вручную:

```cmd
cd E:\AmbientTV
docker compose up -d
```

### 4. Проверка

Открой браузер: [http://localhost:3000](http://localhost:3000)

Должно показать приложение AmbientTV.

## Команды для управления

```cmd
# Проверить статус
docker compose ps

# Смотреть логи (в реальном времени)
docker compose logs -f

# Остановить
docker compose down

# Перезапустить после изменений кода
docker compose up -d --build

# Войти внутрь контейнера (для отладки)
docker exec -it ambienttv sh
```

## Данные хранятся локально

- База данных: `E:\AmbientTV\backend\data\users.db`
- Бэкапы: `E:\AmbientTV\backend\backups\`
- Веб-файлы: `E:\AmbientTV\web\` (можно править, перезапуск не нужен)

## Обновление приложения

```cmd
cd E:\AmbientTV
git pull origin master
docker compose down
docker compose up -d --build
```

## Требования по памяти

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| Docker Desktop | 4 GB RAM | 8 GB RAM |
| AmbientTV контейнер | 512 MB | 1 GB |
| Redis контейнер | 256 MB | 512 MB |

## Проблемы и решения

**❌ "Docker Desktop not found"**
→ Установи Docker Desktop, перезагрузи ПК

**❌ "Port 3000 already in use"**
→ Уже что-то на порту 3000. Останови: `docker compose down` или поменяй порт в `docker-compose.yml`

**❌ "Health check failed"**
→ Проверь логи: `docker compose logs ambienttv`
→ Возможно неправильный `.env` файл

---

Если что-то не работает — пиши, помогу 🤍
