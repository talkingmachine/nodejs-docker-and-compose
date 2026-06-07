# План выполнения проекта «КупиПодариДай»: докеризация и деплой

Пошаговый план от текущего состояния репозитория до сдачи на ревью.
Цель — соответствие чек-листу №24 (`checklist-24.pdf`) и инструкции (`instructions.md`).

---

## Смысловые группы (обзор)

| # | Группа | Что входит | Этапы | Где выполняется |
|---|--------|-----------|-------|-----------------|
| **A** | Подготовка исходного кода | Правки в коде бэка и фронта (env, npm, адрес API, nginx-конфиг) | 1–3 | Локально, в репозитории |
| **B** | Докеризация и оркестрация | Dockerfile'ы, pm2, docker-compose, env-файлы, `.gitignore` | 4–7 | Локально, в репозитории |
| **C** | Локальная проверка | Запуск всего стека через `docker-compose up` | 8 | Локальная машина |
| **D** | Деплой и инфраструктура | Домены, сервер в Яндекс Облаке, nginx + SSL | 9–11 | Сервер / внешние сервисы |
| **E** | Финализация и сдача | README, финальная сверка по чек-листу, публикация | 12–13 | Репозиторий / платформа |

---

## Текущее состояние (что уже есть)

- ✅ Исходный код бэкенда (NestJS) в `backend/src/`
- ✅ Исходный код фронтенда (React CRA) в `frontend/src/`
- ✅ `JWT_SECRET` уже читается из переменных окружения
- ⚠️ Параметры БД читаются под именами `DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME` и `PORT` — **их нужно переименовать** под требования чек-листа (`POSTGRES_*`)
- ⚠️ В бэкенде есть только `pnpm-lock.yaml`, а по заданию сборка должна идти через `npm i`/`npm ci`
- ❌ Нет `backend/Dockerfile`
- ❌ Нет файла экосистемы pm2
- ❌ Нет `frontend/Dockerfile`
- ❌ Нет `frontend/nginx/conf.d/default.conf`
- ❌ Нет `docker-compose.yml`
- ❌ Нет `.env`, `.env.example`, `.gitignore`
- ❌ В `README.md` нет IP и URL фронтенда/бэкенда
- ⚠️ В `frontend/src/utils/constants.js` адрес API захардкожен (`http://167.235.140.175:3001`)

---
---

# Группа A. Подготовка исходного кода

> Правки в самих исходниках, не зависящие от Docker. Можно делать первыми.

## Этап 1. Переменные окружения бэкенда

**Файл: `backend/src/app.module.ts`** — переименовать переменные окружения под требования задания:

| Сейчас        | Должно стать      |
|---------------|-------------------|
| `DB_HOST`     | `POSTGRES_HOST`   |
| `DB_PORT`     | `POSTGRES_PORT` (опционально, по умолчанию 5432) |
| `DB_USER`     | `POSTGRES_USER`   |
| `DB_PASSWORD` | `POSTGRES_PASSWORD` |
| `DB_NAME`     | `POSTGRES_DB`     |

- [ ] Обновить `useFactory` в `TypeOrmModule.forRootAsync` на новые имена.
- [ ] Проверить, что `JWT_SECRET` уже читается из env (он читается в `auth.module.ts` и `jwt.strategy.ts` — менять не нужно).
- [ ] Убедиться, что `PORT` читается в `main.ts` (есть, по умолчанию 3000 — внутри контейнера слушаем этот порт).

**Переменные окружения проекта (итоговый список):**
`JWT_SECRET`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_HOST`, `PGDATA`.

> `PGDATA` используется контейнером PostgreSQL для указания директории данных (том/volume).

## Этап 2. Переход бэкенда на npm

По заданию установка зависимостей в Dockerfile — через `npm i`/`npm ci`, поэтому нужен `package-lock.json`.

- [ ] В папке `backend/` выполнить `npm install` (сгенерируется `package-lock.json`).
- [ ] Удалить `pnpm-lock.yaml` (чтобы не путать сборку и кеширование).
- [ ] Проверить локально: `npm run build` собирается без ошибок, в `dist/` появляется `main.js`.

## Этап 3. Подготовка фронтенда

- [ ] В `frontend/src/utils/constants.js` заменить захардкоженный `URL` на зарегистрированный домен бэкенда:
  `export const URL = "https://api.<your-domain>.<zone>";`
  (см. Этап 9 — регистрация доменов; значение можно подставить после регистрации).
- [ ] Создать директорию `frontend/nginx/conf.d/` и файл `default.conf`:

```nginx
server {
    listen       80;
    server_name  localhost;

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        # Исправляем роутинг на фронтенде (React Router)
        try_files $uri $uri/ /index.html;
    }
}
```

---
---

# Группа B. Докеризация и оркестрация

> Сборка образов и сведение всех частей в один compose. Зависит от Группы A.

## Этап 4. Файл экосистемы pm2 + Dockerfile бэкенда

**4.1. `backend/ecosystem.config.js`** — конфигурация запуска собранного приложения:

```js
module.exports = {
  apps: [
    {
      name: 'kupipodariday-backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
    },
  ],
};
```

**4.2. `backend/Dockerfile`** — требования чек-листа:
- `WORKDIR /app`
- базовый образ `node:16-alpine`
- **multi-stage build**: этап сборки + этап запуска
- зависимости ставятся через `npm i`/`npm ci`
- корректное кеширование (сначала копируем `package*.json`, потом `npm ci`, потом исходники)
- в финальном образе **нет** `src`, dev-зависимостей и лишних конфигов
- pm2 ставится глобально через npm
- запуск через `pm2-runtime`
- указан `EXPOSE` с портом сервиса

```dockerfile
# --- этап сборки ---
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- этап запуска ---
FROM node:16-alpine
WORKDIR /app
RUN npm install -g pm2
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./
EXPOSE 3000
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

- [ ] Создать `backend/ecosystem.config.js`.
- [ ] Создать `backend/Dockerfile`.
- [ ] Создать `backend/.dockerignore` (`node_modules`, `dist`, `.env`, и т.д.).
- [ ] **Проверка кеширования:** собрать образ, изменить порт, собрать повторно — этап `npm ci` должен пройти с пометкой `CACHED`.

## Этап 5. Dockerfile фронтенда

**`frontend/Dockerfile`** — требования чек-листа:
- **multi-stage build**: этап 1 — `node:16-alpine` (сборка), этап 2 — `nginx:latest` (раздача)
- на втором этапе копируется билд + конфиг nginx в `/etc/nginx/conf.d`
- в финальном образе нет исходников

```dockerfile
# --- этап сборки ---
FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- этап запуска nginx ---
FROM nginx:latest
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] Создать `frontend/Dockerfile`.
- [ ] Создать `frontend/.dockerignore` (`node_modules`, `build`, и т.д.).

## Этап 6. docker-compose.yml (корень репозитория)

Требования чек-листа:
- три сервиса: `backend`, `frontend`, `database`
- для каждого: `container_name` и `build` (context)
- переменные окружения — из внешнего `.env`-файла (через `env_file` или `environment`)
- настроены связи между сервисами (`depends_on`, общая сеть)
- для каждого сервиса — политика перезапуска (`restart`)
- порты: backend → `4000`, nginx с фронтендом → `8081`
- порт БД доступен **только во внутренней сети**, только бэкенду (не публиковать наружу)
- `PGDATA` хранится в volume

```yaml
services:
  database:
    image: postgres:14
    container_name: kupipodariday-db
    restart: always
    env_file: .env
    environment:
      PGDATA: ${PGDATA}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backnet
    # ports НЕ публикуем наружу

  backend:
    build:
      context: ./backend
    container_name: kupipodariday-backend
    restart: always
    env_file: .env
    ports:
      - "4000:3000"
    depends_on:
      - database
    networks:
      - backnet
      - frontnet

  frontend:
    build:
      context: ./frontend
    container_name: kupipodariday-frontend
    restart: always
    ports:
      - "8081:80"
    depends_on:
      - backend
    networks:
      - frontnet

volumes:
  pgdata:

networks:
  backnet:
  frontnet:
```

> Важно: `POSTGRES_HOST` в `.env` должен быть равен имени сервиса БД (`database`), чтобы бэкенд находил её по внутренней сети.

- [ ] Создать `docker-compose.yml`.

## Этап 7. Переменные окружения и .gitignore

- [ ] Создать `.gitignore` в корне со строками для env-файлов:
  ```
  .env
  *.env
  !.env.example
  node_modules
  dist
  build
  ```
- [ ] Создать **`.env`** (НЕ коммитить) с настоящими значениями:
  `JWT_SECRET`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST=database`, `PGDATA=/var/lib/postgresql/data`.
- [ ] Создать **`.env.example`** (коммитить) с примерами. Значения для следующих переменных **должны отличаться** от настоящих:
  - `POSTGRES_USER`
  - `JWT_SECRET`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_DB`
- [ ] Убедиться, что `.env` реально игнорируется (`git status` его не показывает).

---
---

# Группа C. Локальная проверка

> Контрольная точка перед деплоем. Зависит от Групп A и B.

## Этап 8. Запуск всего стека через docker-compose

- [ ] `docker-compose up --build` — все три сервиса стартуют без ошибок.
- [ ] Фронтенд открывается на `http://localhost:8081`.
- [ ] Бэкенд отвечает на `http://localhost:4000`.
- [ ] Базовая функциональность работает: регистрация, вход, создание подарка, вишлисты, заявки.
- [ ] Фронтенд корректно ходит в бэкенд (проверить, что `constants.js` указывает на правильный адрес; для локального теста можно временно проверить на api-домене или localhost:4000).

---
---

# Группа D. Деплой и инфраструктура

> Внешние сервисы и сервер. Зависит от Группы C (проверенный локально стек).

## Этап 9. Регистрация и настройка доменов

- [ ] Зарегистрировать 2 домена через сервис «Домены для диплома»: для фронтенда и для бэкенда.
- [ ] Бэкенд разместить на поддомене `api.<домен_фронтенда>`.
- [ ] Убедиться, что `frontend/src/utils/constants.js` указывает на `https://api.<домен>` (Этап 3).

## Этап 10. Сервер в Яндекс Облаке

- [ ] Создать ВМ, установить **Docker** и **Docker Compose**.
- [ ] Проверка: `sudo docker version` и `sudo docker-compose version` выполняются без ошибок.
- [ ] Склонировать репозиторий на сервер.
- [ ] Создать на сервере `.env` с боевыми значениями (его нет в репозитории).
- [ ] Запустить: `sudo docker-compose up -d`.
- [ ] Проверить логи контейнеров — стартуют без ошибок (`docker-compose logs`).

## Этап 11. Nginx на сервере + SSL

- [ ] Написать конфиг nginx (на хосте/сервере) для **бэкенда**: проксирование на порт `4000`, `server_name api.<домен>`.
- [ ] Написать конфиг nginx для **фронтенда**: проксирование на порт `8081` контейнера (не раздача статики с диска!), `server_name <домен>`.
- [ ] Выпустить SSL-сертификаты через **certbot** для обоих доменов.
- [ ] Проверить доступность по `http` и по `https`.
- [ ] Проверить сертификат: https://www.sslshopper.com/ssl-checker.html — выпущен и активен.

---
---

# Группа E. Финализация и сдача

> Документация и сдача. Зависит от Группы D (рабочий деплой).

## Этап 12. README.md

- [ ] Добавить в `README.md` по шаблону:
  ```
  IP адрес x.x.x.x
  Frontend https://<домен>
  Backend https://api.<домен>
  ```
- [ ] Убедиться, что по IP из README сервер доступен.

## Этап 13. Финальная проверка и сдача

- [ ] Проверить весь чек-лист «Работа отклоняется от ревью» — ни один пункт не должен выполняться:
  - В README указаны IP и URL фронтенда/бэкенда ✔
  - Сервер доступен по IP из README ✔
  - В репозитории есть код бэкенда и фронтенда ✔
  - Вся функциональность реализована ✔
  - В работе нет вопросов/просьб к ревьюеру ✔
- [ ] Проверить блок «Работа принимается»:
  - Домен доступен по http и https ✔
  - Сертификат активен ✔
  - Бэкенд на поддомене `api` ✔
  - JWT и параметры БД — из env ✔
  - Бэкенд докеризирован (Dockerfile, node:16-alpine, кеш, 2 этапа, нет src/dev в финале) ✔
  - Фронтенд докеризирован (node:16-alpine + nginx:latest, 2 этапа, нет src в финале) ✔
  - docker-compose корректен (3 сервиса, имена/контекст, env из файла, связи, restart) ✔
  - env-файлы в `.gitignore`, не в репозитории ✔
  - `docker-compose up` без ошибок ✔
  - Задеплоенный фронт корректно работает с бэком ✔
  - Переадресация в nginx для React настроена ✔
- [ ] `git add` / `commit` / `push` всех изменений.
- [ ] Сделать репозиторий публичным.
- [ ] Нажать «Отправить на ревью».

---
---

## Итоговый список новых/изменённых файлов

| Файл | Действие | Группа |
|------|----------|--------|
| `backend/src/app.module.ts` | изменить — переименовать env-переменные на `POSTGRES_*` | A |
| `backend/package-lock.json` | создать (`npm install`) | A |
| `backend/pnpm-lock.yaml` | удалить | A |
| `frontend/src/utils/constants.js` | изменить — адрес API на api-домен | A |
| `frontend/nginx/conf.d/default.conf` | создать | A |
| `backend/ecosystem.config.js` | создать | B |
| `backend/Dockerfile` | создать | B |
| `backend/.dockerignore` | создать | B |
| `frontend/Dockerfile` | создать | B |
| `frontend/.dockerignore` | создать | B |
| `docker-compose.yml` | создать | B |
| `.gitignore` | создать | B |
| `.env` | создать (НЕ коммитить) | B |
| `.env.example` | создать (коммитить) | B |
| `README.md` | изменить — IP и URL | E |
