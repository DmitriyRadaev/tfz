# Публикация TFZ под /calculate-tfz/

Публичный адрес: `http://172.26.4.9/calculate-tfz/`.
Схема: основной Nginx (80) → TFZ Nginx (8084) → Next.js (3005).
В обоих прокси путь передаётся целиком, без удаления `/calculate-tfz`.
Next.js собирается с `basePath`; Link/router используют внутренние пути, а
Axios, браузерные редиректы и public-файлы — пути с префиксом.

## Подготовка на машине развёртывания

Перенесите весь обновлённый репозиторий, включая новые файлы `src`, `scripts`,
`public/icon-192.png`, `public/icon-512.jpg` и `_docker/nginx/pgpt/tfz.locations.conf`.
Не переносите `node_modules` и `.next` с Windows: Docker собирает Linux-образ заново.
Используйте существующий серверный `.env`, не заменяя его примером.

Для текущего HTTP-адреса в `.env` задайте `COOKIE_SECURE=false`.
При публикации через HTTPS задайте `COOKIE_SECURE=true`.
Куки теперь называются `tfz_access`/`tfz_refresh` и ограничены `Path=/calculate-tfz`:
это исключает конфликт имён с PGPT. После обновления нужно войти заново.
JWT_SECRET и данные Postgres/Redis сохраняются.

Если внешний origin меняется, обновите `APP_ORIGIN` для сборки
(`src/app/layout.tsx`, `next-sitemap.config.js`); по умолчанию используется `http://172.26.4.9`.

## Проверка существующего окружения

На сервере выполните:

```bash
cd ~/tfz
docker compose config --services
docker inspect tfz_nginx_server --format '{{json .Mounts}}'
docker exec tfz_nginx_server nginx -T
docker exec nginx_server nginx -T
curl -sSI http://172.26.4.9/
curl -sSI http://172.26.4.9/pgpt/
```

Сохраните текущий основной конфиг и ответы действующих маршрутов PGPT
(включая его API/статику) для сравнения после подключения TFZ.
`nginx -T` показывает реально загруженные конфиги; сведения из старых записей
не подтверждают текущее состояние сервера. Старые 404 нельзя точно объяснить
без этого вывода и логов.

## Сборка и проверка TFZ на 8084

```bash
cd ~/tfz
docker compose build tfz_app
# Обновляем только приложение, не запускаем повторно мигратор/seed и зависимости.
docker compose up -d --no-deps tfz_app
docker exec tfz_nginx_server nginx -t
# Перезапуск TFZ Nginx обновляет DNS upstream после пересоздания приложения.
docker compose restart tfz_nginx
docker exec tfz_nginx_server nginx -t
curl -sSI http://172.26.4.9:8084/calculate-tfz/
curl -sSI http://172.26.4.9:8084/calculate-tfz/sign-in
```

Это команды обновления уже работающего стека. При первом развёртывании
нужно сначала настроить `.env` и поднять зависимости/мигратор штатным способом:
`docker compose up -d --build`. Основной PGPT использует отдельный compose-проект.

Если на проверяющей машине есть Node.js 22+, запустите готовую HTTP-проверку:

```bash
TFZ_ORIGIN=http://172.26.4.9:8084 node scripts/check-routing.mjs
```

Она проверяет страницы входа/регистрации, защищённые маршруты, точные CSS/JS/fonts
из HTML, изображения, manifest и все его иконки, OpenAPI, 401 API без сессии,
logout без сессии, refresh без токена, Path удаления кук и отклонение чужого Origin.
Данные в БД и учётные записи не изменяются.

В браузере отдельно проверьте настоящий вход, регистрацию с подтверждением,
роли WORKER/ADMIN/SUPERADMIN, автоматический refresh и выход. Для этих проверок
нужны рабочие Postgres/Redis и тестовые учётные записи.

## Подключение основного Nginx на 80

Файл `_docker/nginx/pgpt/tfz.locations.conf` — **фрагмент для существующего
`server {}`**, а не новый server-блок и не замена конфига PGPT.
Он добавляет только `/calculate-tfz` и `/calculate-tfz/`.
Корневые `/`, `/api`, `/_next` продолжают обслуживаться существующим конфигом.

Фрагмент проксирует на `host.docker.internal:8084`, поэтому основному Nginx
не нужно резолвить сервис `tfz_app` из чужой Docker-сети.
Сначала проверьте доступность upstream из основного контейнера:

```bash
docker exec nginx_server getent hosts host.docker.internal
docker exec nginx_server curl -sSI http://host.docker.internal:8084/calculate-tfz/sign-in
```

Если `curl` отсутствует, используйте доступный HTTP-клиент.
Если имя не настроено, используйте существующий доступный адрес Docker-хоста
в `proxy_pass`. Другой вариант — добавить **в compose PGPT**, в сервис основного
Nginx, `extra_hosts: ["host.docker.internal:host-gateway"]`.
Изменение `extra_hosts` требует пересоздания основного контейнера; выполняйте
его отдельно в согласованное окно. Наличие этой настройки в compose TFZ
не добавляет её основному Nginx.

После успешной проверки 8084 и доступности upstream добавьте содержимое
фрагмента внутрь существующего server-блока, обслуживающего `172.26.4.9:80`.
При использовании include монтируйте файл отдельно и указывайте путь внутри
server-блока; не кладите location-фрагмент в автоматически подключаемый
`/etc/nginx/conf.d/*.conf` на уровне http.

Затем проверьте конфигурацию и примените её без остановки PGPT:

```bash
docker exec nginx_server nginx -t
# Выполнять только после успешного nginx -t.
docker exec nginx_server nginx -s reload
TFZ_ORIGIN=http://172.26.4.9 node scripts/check-routing.mjs
curl -sSI http://172.26.4.9/
curl -sSI http://172.26.4.9/pgpt/
```

Сравните ответы PGPT, его API и конкретных статических ресурсов с исходными.
При проблеме восстановите сохранённый основной конфиг, выполните `nginx -t`,
затем reload. TFZ останется доступен на 8084.

## Локальная проверка исходников

```bash
npm ci
node --import tsx --test scripts/routing.test.ts
npm run typecheck
npm run build
```

Сборка включает проверку типов и ESLint. Она скачивает Montserrat через
`next/font/google`, поэтому сборочной машине нужен доступ к Google Fonts.
После сборки можно запустить `COOKIE_SECURE=false npm start -- -p 3005` и
`node scripts/check-routing.mjs` (по умолчанию проверяется localhost:3005).
