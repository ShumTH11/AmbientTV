@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo 🚀 AmbientTV — Windows Local Deploy
echo =====================================

REM Check Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop не найден.
    echo Установи: https://docs.docker.com/desktop/install/windows-install/
    exit /b 1
)

echo ✅ Docker найден

REM Check .env
if not exist "backend\.env" (
    echo ⚠️  Файл backend\.env не найден. Создаю из примера...
    if exist "backend\.env.example" (
        copy backend\.env.example backend\.env
        echo ✅ Создан backend\.env — отредактируй его и добавь свои API ключи
    ) else (
        echo ❌ Нет backend\.env и backend\.env.example
        exit /b 1
    )
)

REM Pull latest
echo 📥 Обновление кода...
git pull origin master 2>nul || echo (git не настроен или не нужен)

REM Build and start
echo 🏗️  Сборка контейнеров...
docker compose down 2>nul
docker compose up -d --build

REM Wait for health
echo ⏳ Проверка запуска...
for /l %%i in (1,1,10) do (
    curl -s http://localhost:3000/api/health | findstr "ok" >nul
    if !errorlevel! equ 0 (
        echo ✅ AmbientTV запущен на http://localhost:3000
        echo.
        docker compose ps
        exit /b 0
    )
    timeout /t 2 /nobreak >nul
)

echo ❌ Health check не пройден. Логи:
docker compose logs ambienttv
exit /b 1
