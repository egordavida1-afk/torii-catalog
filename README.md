# Тории — каталог фильмов, сериалов и аниме

Next.js 14 (App Router) + Prisma + PostgreSQL. Проект рассчитан на GitHub + Vercel и базу Neon.

## Что уже есть

- отдельные разделы **Фильмы / Сериалы / Аниме**;
- блок **Новинки**;
- жанровые подборки;
- жанры создаются и удаляются из админки;
- поиск по названию, описанию и жанрам с разбором нескольких слов;
- фильтры по разделу, формату и жанру;
- отдельный фон для каждого тайтла;
- для фильма — одна видеоссылка, для сериала — сезоны и серии;
- просмотр закрыт для незарегистрированных пользователей;
- администратор входит через обычную страницу `/login`: `/admin` автоматически отправляет на неё, отдельная админская страница входа больше не нужна;
- адаптивная мобильная верстка;
- автозагрузка метаданных из TMDB: фильмы, сериалы и японская анимация;
- ручная кнопка синхронизации в админке и ежедневная Vercel Cron-синхронизация;
- импортирует названия, описания, даты, жанры, постеры и фоны; **видео из TMDB не импортируется** — ссылку на просмотр добавляй только на контент, который разрешено размещать;
- базовая защита: проверка прав на сервере, ограничение попыток входа, безопасные сессии, проверка URL/чисел/ID и подтверждение удаления;
- секреты не должны попадать в GitHub.

## Локальный запуск на Windows

В PowerShell в папке проекта можно использовать `.cmd`, если выполнение `npm.ps1`/`npx.ps1` заблокировано политикой PowerShell:

```powershell
npm.cmd install
Copy-Item .env.example .env
Copy-Item .env.example .env.local
```

Заполни `.env` и `.env.local` одинаковыми значениями:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

ADMIN_USER="admin"
ADMIN_PASSWORD="свой-длинный-пароль"
ADMIN_SECRET="случайная-строка-минимум-24-символа"

TMDB_ACCESS_TOKEN="твой-TMDB-API-Read-Access-Token"
CRON_SECRET="длинная-случайная-строка-для-cron"
```

Затем:

```powershell
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run seed
npm.cmd run dev
```

Открой адрес, который напечатает Next.js, обычно `http://localhost:3000`.

## Админка и вход

Публичная навигация не содержит ссылку «Админка».

Переход на `/admin` без админской cookie автоматически отправляет на `/login?next=/admin`.

На странице входа можно ввести либо email обычного пользователя, либо `ADMIN_USER`. При корректных админских реквизитах создаётся отдельная админская cookie-сессия и открывается `/admin`.

Обычный зарегистрированный пользователь получает доступ к просмотру тайтлов после входа.

## Автозагрузка TMDB + Kodik

Torii умеет обновлять каталог из двух независимых источников. TMDB используется для метаданных, а Kodik — как источник материалов для просмотра, озвучек и серий. Если тайтла нет в TMDB, но он есть в Kodik, Torii всё равно создаёт карточку и не требует TMDB для импорта.

Для TMDB используются `/discover` и локализация `ru-RU`; TMDB поддерживает Bearer API Read Access Token. citeturn206938search3turn206938search5

Для Kodik поддерживается два режима: можно указать свой `KODIK_API_TOKEN`, либо включить автоматический поиск рабочего публичного токена (по умолчанию включён). В автоматическом режиме Torii читает опубликованный файл `kdk_tokns/tokens.json` из репозитория AnimeParsers, расшифровывает кандидатов по описанному там алгоритму и проверяет их запросом к Kodik. citeturn309113view0turn171083view0

Для локальной среды достаточно:

```env
TMDB_ACCESS_TOKEN="..."
KODIK_AUTO_TOKEN="true"
KODIK_API_BASE="https://kodik-api.com"
CRON_SECRET="..."
```

`KODIK_API_TOKEN` остаётся необязательным override: если он задан, Torii использует его вместо автоматического токена. `KODIK_TOKEN_SOURCE_URL` тоже необязателен и по умолчанию указывает на `kdk_tokns/tokens.json` из репозитория AnimeParsers. **Не добавляй реальные токены в GitHub.**

В админке кнопка **«Обновить каталог»** запускает Kodik даже без `KODIK_API_TOKEN`; именно это позволяет не вводить токен вручную.

Kodik импортирует:

- русское название и оригинальное название, если они есть;
- описание, жанры, год и постер/скриншот;
- тип контента (фильм / сериал / аниме);
- доступные источники/озвучки и их ссылки;
- для сериалов — сезоны и серии, если API их возвращает. `with_episodes_data` в документации описан как режим, автоматически добавляющий сезоны, эпизоды, названия эпизодов и скриншоты. citeturn156101view1

На странице тайтла можно выбрать доступный вариант Kodik. Для сериалов используются сохранённые ссылки сезонов/эпизодов; если подробные серии не переданы, встраивается основной Kodik-плеер.

Документация Kodik, которую использует интеграция, **неофициальная**, поэтому API-контракт может меняться; перед Production обязательно проверь актуальность своего токена и права на использование соответствующего API/плеера. citeturn149422view0

Автоматический запуск выполняется через Vercel Cron один раз в сутки для Production.

## Vercel

В `Settings → Environment Variables` добавь:

```text
DATABASE_URL
DIRECT_URL
ADMIN_USER
ADMIN_PASSWORD
ADMIN_SECRET
TMDB_ACCESS_TOKEN
KODIK_AUTO_TOKEN
KODIK_API_BASE
KODIK_TOKEN_SOURCE_URL
CRON_SECRET
```

После изменения Environment Variables нужен новый deployment/redeploy. citeturn611594search9

Для первого production-развёртывания:

1. GitHub подключён к Vercel.
2. В Vercel добавлены переменные выше.
3. Neon содержит применённую Prisma migration.
4. В Neon один раз выполнены:

```powershell
npx.cmd prisma migrate deploy
npm.cmd run seed
```

5. В Vercel сделан Redeploy.

## GitHub

```powershell
git add .
git commit -m "Update catalog UI and TMDB sync"
git push
```

После push в `main` Vercel создаст новый production deployment, если GitHub integration настроен на `main`.

## Видео

GitHub не должен использоваться для хранения больших видеофайлов. Для просмотра лучше хранить видео в разрешённом тобой хранилище/CDN, а в админке сохранять URL. Сам импорт TMDB видео не добавляет.

## Бесплатный запуск

Для небольшого личного/некоммерческого проекта подходит связка:

**GitHub → Vercel → Neon**.

Проверь текущие лимиты и условия бесплатных тарифов непосредственно в кабинетах провайдеров: они меняются.


### Последние изменения
Kodik теперь может самостоятельно создавать тайтлы без TMDB, сохранять несколько озвучек и ссылки на сезоны/серии; TMDB используется как дополнительное обогащение, а русское название из Kodik сохраняется при совместной записи.

Поиск теперь ищет по точному фрагменту названия и по словам, а фильтр «Любой формат» удалён. Добавлена настройка общего фона в админке и выбор цвета кнопок для пользователя, который сохраняется в браузере.


### Плеер Kodik
Нормализация видеоссылок поддерживает kodik.info, kodik.online, kodik.biz, kodik.cc и kodikplayer.com как iframe-источники; это важно, поскольку документы AnimeParsers показывают embed-ссылки вида kodikplayer.com.


## v11 changes
- Animated home selection screen for movies, series, and anime.
- Account-based favorites with a dedicated /favorites page.
- Dynamic accent color now applies consistently to accent UI elements.
- Favorite state is stored in PostgreSQL.

- Welcome screen is now the homepage; catalog lives at `/catalog` with category-aware new releases and genres.
- Added account favorites with persistent PostgreSQL storage.
- Accent color applies to all intended accent UI rather than legacy gold tokens.
