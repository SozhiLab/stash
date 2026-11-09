# Штуки (Stash)

Личное хранилище графических элементов: папки → карточки → тап копирует PNG в буфер обмена.

## Запуск

Копирование в буфер, Share и офлайн-режим работают только по **HTTPS** или на `localhost`
(двойной клик по `index.html` не подойдёт).

- Локально: `python3 -m http.server 8000` и открыть http://localhost:8000
- Бесплатный хостинг: перетащить папку на Netlify Drop, либо GitHub Pages / Cloudflare Pages
- На телефоне: открыть ссылку в Safari/Chrome → «Поделиться» → «На экран Домой»
  (так iOS не удаляет данные сайта)

## Структура

```
index.html · manifest.webmanifest · sw.js
css/       tokens (темы) · base · layout · components
js/
  main.js        роутер (#/, #/folder/id, #/favorites, #/recent), горячие клавиши, drop файлов
  store.js       состояние и действия (папки, элементы, избранное, недавние)
  data/          db.js (IndexedDB) · repository.js (граница хранения) · defaults.js
  lib/           dom · icons · image (миниатюры, PNG-конвертация) · format · id
  logic/         search.js
  services/      clipboard.js · share.js
  actions/       copy / share / download
  ui/            компоненты
  views/         HomeView · ElementsView
tools/build_single_file.py   сборка preview/index.html (один файл)
```

## Хранение и синхронизация

Данные лежат в IndexedDB браузера (оригиналы + миниатюры). Все обращения к хранилищу идут через
`js/data/repository.js`. Для синхронизации между устройствами заменяется только он
(например, Supabase: Postgres + Storage + Auth). UI не меняется.

## Горячие клавиши (desktop)

`/` — поиск · `N` — добавить элементы · `Esc` — закрыть окно / назад
Перетащите файлы на окно, чтобы добавить их в текущую папку.

## Ограничения браузеров

- В буфер гарантированно попадает только PNG; JPG/WebP/SVG конвертируются автоматически.
- Share API с файлами: iOS Safari 15+, Android Chrome, десктопный Safari/Chrome. Иначе файл скачивается.
- SVG и GIF отправляются как PNG.
