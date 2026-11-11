# Сводка по развертыванию проекта TFZ (Next.js + Docker)

## 1. Контекст инфраструктуры и окружения
- **Хост-сервер:** `172.26.4.9`
- **Проект:** Fullstack Next.js (`TFZFullStack`), директория `~/tfz`
- **Ожидаемый публичный подпуть:** `/calculate-tfz/`
- **Специфика хоста:** На сервере развернуто несколько независимых проектов в Docker без общего системного Nginx на хосте:
  - `nginx_server` (проект `pgpt`) — слушает внешний порт `0.0.0.0:80->80/tcp`
  - `sql_trainer_nginx` — слушает `0.0.0.0:8081->80/tcp`
  - `client-app` — слушает `0.0.0.0:8082->3000/tcp`
  - `temperament_nginx` — слушает `0.0.0.0:8083->80/tcp`
  - `tfz_nginx_server` (наш проект) — слушает `0.0.0.0:8084->80/tcp`

---

## 2. Проблема №1: Ошибка 404 при запросе без порта (`http://172.26.4.9/calculate-tfz/`)

### Симптомы
- Запрос `curl -I http://172.26.4.9/pgpt/` возвращает статус `200` или редирект.
- Запрос `curl -I http://172.26.4.9/calculate-tfz/` возвращает `HTTP/1.1 404 Not Found`.
- При этом прямой запрос на порт проекта `curl -I http://172.26.4.9:8084/calculate-tfz/` успешно возвращает `HTTP/1.1 307 Temporary Redirect`.

### Причина
Порт `80` хоста монопольно занят контейнером `nginx_server` из проекта `pgpt`. Когда браузер или клиент делает запрос на `http://172.26.4.9/...` без явного порта, запрос физически падает в Nginx проекта `pgpt`, в котором маршруты для `/calculate-tfz/` не настроены.

### Варианты решения
1. **Вариант А (Автономный):** Доступ к приложению осуществляется по выделенному порту:
   `http://172.26.4.9:8084/calculate-tfz/`.
2. **Вариант Б (Связывание через порт 80):** Если обязателен доступ именно по порту 80 без суффикса порта в URL, в конфигурацию Nginx проекта `pgpt` добавляется проксирование через хост-шлюз:
   ```nginx
   location /calculate-tfz/ {
       proxy_pass http://host.docker.internal:8084;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

---

## 3. Проблема №2: Потеря префикса `/calculate-tfz` при редиректах в Next.js

### Симптомы
- При запросе к корню `http://172.26.4.9:8084/calculate-tfz/` неавторизованный пользователь получал редирект на:
  `Location: /sign-in?redirect=%2F` вместо `/calculate-tfz/sign-in?redirect=%2Fcalculate-tfz%2F`.
- В браузере это приводило к потере базового пути и ошибке 404.

### Причина
1. В `next.config.ts` задан `basePath: '/calculate-tfz'`.
2. В файле `middleware.ts` использовалась стандартная конструкция:
   ```typescript
   const signInUrl = new URL(ROUTES.SIGN_IN, request.url);
   ```
   В среде за Nginx-прокси `request.url` терял контекст префикса `basePath`, что приводило к формированию редиректа без подпути.
3. Попытка вручную прибавить строку к типизированным литералам `ROUTES` вызывала ошибки компиляции TypeScript (`TS2322`).

### Текущее решение в `src/middleware.ts`
В `middleware.ts` логика формирования путей перенаправления была адаптирована для сохранения префикса:

```typescript
// Редирект неавторизованного пользователя
const signInUrl = new URL(`/calculate-tfz${ROUTES.SIGN_IN}`, request.url);
const redirectPath = pathname === "/" ? "/calculate-tfz/" : pathname;
signInUrl.searchParams.set("redirect", redirectPath);

return withSecurityHeaders(
    clearSessionCookies(NextResponse.redirect(signInUrl)),
);
```

### Результат проверки
Команда:
```bash
curl -I http://172.26.4.9:8084/calculate-tfz/
```
Возвращает корректный заголовок:
```http
HTTP/1.1 307 Temporary Redirect
location: /calculate-tfz/sign-in?redirect=%2Fcalculate-tfz%2F
```

---

## 4. Конфигурация Nginx проекта (`_docker/nginx/conf.d/nginx.conf`)

Конфигурация изолированного Nginx для `tfz`:

```nginx
upstream tfz_app_upstream {
    server tfz_app:3005;
}

server {
    listen 80;
    server_name 172.26.4.9;

    client_max_body_size 50M;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    location /calculate-tfz {
        proxy_pass http://tfz_app_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = / {
        return 302 /calculate-tfz/;
    }
}
```

*Важное замечание по `proxy_pass`:* Указание `proxy_pass http://tfz_app_upstream;` (без завершающего слэша) необходимо, чтобы путь передавался в Next.js вместе с префиксом `/calculate-tfz`, соответствующим `basePath`.

---

## 5. Инструкция по чистой изолированной пересборке

Чтобы пересобрать только проект `tfz`, не затронув другие контейнеры сервера:

```bash
cd ~/tfz

# Остановка контейнеров tfz
docker compose down

# Чистая сборка образов без кэша
docker compose build --no-cache

# Запуск
docker compose up -d
```