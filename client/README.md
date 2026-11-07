# Vue-портал AGL

Vue 3, TypeScript, Vue Router и Vite. GitHub Pages отдаёт готовые файлы;
API и AGL ID остаются на VPS. Домен и workflow публикации Pages сохранены.

```sh
cd client
npm ci
npm test
npm run build
cd ..
python3 tools/build_pages.py --sync-root
```

`sites/agl/vue-dist` содержит проверяемую сборку. CI сравнивает её с исходниками;
Pages использует Python-экспорт и не требует Node в runtime. Статические
страницы игры, конфиденциальность и личный сайт продолжают собираться отдельно.

Маршруты: главная, `/projects/`, `/projects/:slug/`, `/about/`, `/news/`,
`/news/:slug/`, `/profile/`, кабинет команды `/workspace/` с отдельными разделами.
Фиксированные пути получают физический index.html. GitHub Pages 404 восстанавливает
динамические ссылки только внутри projects/news/workspace на том же origin.
`/account/` и `/portal/` сохраняют совместимость со старыми ссылками.

OIDC Authorization Code + PKCE S256. Закреплённые API и issuer в `lib/content.ts`,
токены только в памяти, state и черновики текущей вкладки — в sessionStorage,
тема — в localStorage. Silent SSO callback `/auth/silent/` восстанавливает вход.
Пароль вводится на AGL ID. Чувствительные изменения требуют повторного пароля
через `agl-console`, без мобильного аутентификатора. Решение о праве всегда
принимает API, скрытие кнопки его не заменяет.

Редактор: Markdown, предпросмотр, локальные обложки/иллюстрации, черновики,
публикация и конфликт версий. DOMPurify очищает вывод; произвольные внешние
изображения не загружаются. Старые статьи с format=plain остаются обычным текстом.
Матрица ролей использует серверные пределы делегирования и readonly Owner.

Проверки: TypeScript + production build, ссылки/ресурсы экспорта и несколько
небольших unit-проверок текстовых помощников. Браузерных e2e в этом пакете нет.
