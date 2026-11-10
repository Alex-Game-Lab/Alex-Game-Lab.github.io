"""Export the precompiled Vue portal into the existing GitHub Pages artifact."""
from pathlib import Path
import html
import json
import re
import shutil
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    '': ('Alex Game Lab — игры, идеи, люди', 'Независимая команда разработки игр. Проекты, новости и единый аккаунт AGL ID.'),
    'projects': ('Проекты · Alex Game Lab', 'Игры и приложения Alex Game Lab. Знакомьтесь с проектами, следите за разработкой и делитесь впечатлениями.'),
    'projects/rublemet': ('Рублемёт · Alex Game Lab', 'Рублемёт — игра о работе, деньгах и переменах. Игровые механики, история и новости проекта.'),
    'about': ('О нас · Alex Game Lab', 'Что создаёт Alex Game Lab, как мы работаем и кто стоит за проектом.'),
    'news': ('Новости · Alex Game Lab', 'Новости проектов, дневники разработки и статьи команды Alex Game Lab.'),
    'profile': ('Профиль · AGL ID', 'Ваш профиль, облачные сохранения и доступ к проектам Alex Game Lab.'),
    'account': ('Аккаунт · AGL ID', 'Вход и регистрация в едином аккаунте AGL ID.'),
    'portal': ('Пространство · Alex Game Lab', 'Новости, проекты и аккаунт AGL ID.'),
    'workspace': ('Рабочее пространство · AGL', 'Публикации, проекты и инструменты команды AGL.'),
    'workspace/articles': ('Публикации · AGL', 'Статьи команды и черновики.'),
    'workspace/articles/new': ('Новая статья · AGL', 'Редактор публикаций AGL.'),
    'workspace/content': ('Содержимое сайта · AGL', 'Редактирование главной и канала AGL.'),
    'workspace/media': ('Медиатека · AGL', 'Изображения для публикаций и страниц.'),
    'workspace/projects': ('Управление проектами · AGL', 'Настройки и участники проектов.'),
    'workspace/roles': ('Роли и права · AGL', 'Роли команды и разрешения.'),
    'workspace/users': ('Участники · AGL', 'Управление аккаунтами и персональными правами.'),
    'workspace/reports': ('Тестирование · AGL', 'Закрытые отчёты о тестировании проектов.'),
    'workspace/metrics': ('Игровые показатели · AGL', 'Метрики и управление игровыми показателями.'),
    'workspace/audit': ('Журнал действий · AGL', 'История действий в рабочем пространстве.'),
    'auth/callback': ('Завершаем вход · AGL ID', 'Возвращаемся в AGL ID после входа.'),
    'auth/silent': ('AGL ID', 'Восстановление сессии AGL ID.'),
}
PUBLIC = {'', 'projects', 'projects/rublemet', 'games/rublemet', 'about', 'news', 'privacy'}


def build(output):
    source = ROOT / 'sites/agl/vue-dist'
    if not (source / 'index.html').is_file():
        raise RuntimeError('Run npm ci && npm run build in client before building Pages')
    # One implementation and matching published metadata for both game addresses.
    content = json.loads((ROOT / 'client/src/content/published.json').read_text())
    news = json.loads((ROOT / 'client/src/content/news.json').read_text())['items']
    page_keys = {'': 'home', 'projects': 'projects', 'projects/rublemet': 'project-rublemet',
                 'games/rublemet': 'project-rublemet', 'about': 'studio', 'news': 'news'}
    PAGES['games/rublemet'] = PAGES['projects/rublemet']
    PAGES['privacy'] = ('Данные и конфиденциальность · AGL', 'Какие данные используются сайтом, API и AGL ID.')
    for item in news:
        path = 'news/' + item['slug']
        PAGES[path] = (item['title'] + ' · AGL', item['excerpt'] or item['body'][:180])
        PUBLIC.add(path)
    # Source images are copied into both supported Pages exports.
    shutil.copytree(ROOT / 'assets/redesign', output / 'assets/redesign', dirs_exist_ok=True)
    shutil.copytree(source / 'app-assets', output / 'app-assets', dirs_exist_ok=True)
    static = ROOT / 'sites/agl/static/assets'
    if static.is_dir():
        shutil.copytree(static, output / 'assets', dirs_exist_ok=True)
    template = (source / 'index.html').read_text()
    for path, (title, description) in PAGES.items():
        document = content.get('agl/' + page_keys.get(path, ''))
        if document:
            title, description = document['seo_title'] or document['title'], document['seo_description'] or document['intro']
        private = path not in PUBLIC
        page = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title) + '</title>', template)
        page = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m[1] + html.escape(description, quote=True), page)
        page = re.sub(r'(<meta name="robots" content=")[^"]*', lambda m: m[1] + ('noindex,follow' if private else 'index,follow'), page)
        canonical = 'https://alexgamelab.ru/' + ('projects/rublemet/' if path == 'games/rublemet' else path + '/' if path else '')
        page = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m[1] + canonical, page)
        page = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m[1] + html.escape(title, quote=True), page)
        page = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m[1] + html.escape(description, quote=True), page)
        page = page.replace('</head>', '<meta property="og:url" content="' + canonical + '"></head>')
        esc = lambda value: html.escape(str(value or ''), quote=True)
        cover = '/assets/redesign/agl-hero-social.jpg'
        if document:
            cover = document['seo_image'] or document['hero_image'] or cover
            if 'redesign/rublemet-cover' in cover:
                cover = '/assets/redesign/rublemet-cover-social.jpg'
            elif 'redesign/agl-hero' in cover:
                cover = '/assets/redesign/agl-hero-social.jpg'
        if path.startswith('news/'):
            item = next(row for row in news if row['slug'] == path.split('/', 1)[1])
            cover = '/assets/redesign/rublemet-cover-social.jpg' if item['project_slug'] == 'rublemet' else cover
        absolute_cover = 'https://alexgamelab.ru' + cover if cover.startswith('/') else cover
        page = re.sub(r'(<meta\s+property="og:image"\s+content=")[^"]*', lambda m: m[1] + esc(absolute_cover), page)
        fallback = '<main id="main" class="container"><h1>' + esc(document['title'] if document else title) + '</h1><p>' + esc(document['intro'] if document else description) + '</p>'
        if document and document['hero_image']:
            fallback += '<img src="' + esc(document['hero_image']) + '" alt="' + esc(document['hero_alt']) + '" width="1600" height="900">'
        if document:
            for block in document['sections']:
                fallback += '<section><h2>' + esc(block['title']) + '</h2><p>' + esc(block['body']) + '</p>'
                if block.get('image'):
                    fallback += '<img src="' + esc(block['image']) + '" alt="' + esc(block.get('alt')) + '" width="1200" height="720" loading="lazy">'
                for link in block.get('links', []):
                    if link['url']:
                        fallback += '<p><a href="' + esc(link['url']) + '">' + esc(link['label']) + '</a></p>'
                fallback += '</section>'
        if path == 'news':
            fallback = '<main id="main" class="container news-feed"><h1 class="visually-hidden">Новости AGL</h1>'
            for item in news:
                fallback += '<article><time>' + esc(item['published_at'][:10]) + '</time><h2><a href="/news/' + esc(item['slug']) + '/">' + esc(item['title']) + '</a></h2><p>' + esc(item['excerpt']) + '</p></article>'
        elif path.startswith('news/'):
            fallback += '<p>' + esc(item['excerpt']) + '</p><p>' + esc(item['author']) + '</p>'
            for source in re.findall(r'!\[[^\]]*\]\((/assets/[a-zA-Z0-9_/-]+\.(?:webp|jpg|png))\)', item['body']):
                fallback += '<img src="' + esc(source) + '" alt="Материал публикации" width="1200" height="675">'
        elif path == 'privacy':
            source = (ROOT / 'client/src/views/PrivacyView.vue').read_text()
            legal = re.search(r'<template>(.*?)</template>', source, re.S).group(1)
            fallback = '<main id="main">' + re.sub(r'<Icon[^>]*/>', '', legal)
        fallback += '<nav><a href="/">Главная</a> · <a href="/projects/">Проекты</a> · <a href="/news/">Новости</a> · <a href="/about/">Команда</a> · <a href="/privacy/">Данные</a></nav></main>'
        page = re.sub(r'<div id="app">.*?</div>', lambda _: '<div id="app"><div class="public-site">' + fallback + '</div></div>', page, flags=re.S)
        base = output / path
        base.mkdir(parents=True, exist_ok=True)
        (base / 'index.html').write_text(page)
    # GitHub Pages has no rewrites: fixed routes have real index files; new article,
    # project and editor links return through a bounded same-origin restoration.
    restore = """const p=location.pathname;if(/^\\/(projects|news|workspace)\\//.test(p)&&p.length<1024&&!p.includes('\\\\'))location.replace('/?agl_path='+encodeURIComponent(p+location.search+location.hash));"""
    (output / 'app-assets/route-restore.js').write_text(restore)
    not_found = re.sub(r'<title>.*?</title>', '<title>Страница не найдена · AGL</title>', template)
    not_found = not_found.replace('content="index,follow"', 'content="noindex,nofollow"')
    not_found = not_found.replace('</head>', '<script src="/app-assets/route-restore.js"></script></head>')
    not_found = re.sub(r'<div id="app">.*?</div>', lambda _: '<div id="app"><main id="main"><h1>Страница не найдена</h1><a href="/">На главную</a></main></div>', not_found, flags=re.S)
    (output / '404.html').write_text(not_found)
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    sitemap = ET.parse(output / 'sitemap.xml')
    existing = {x.text for x in sitemap.iter('{' + namespace + '}loc')}
    for path in sorted(PUBLIC):
        loc = 'https://alexgamelab.ru/' + (path + '/' if path else '')
        if loc not in existing:
            entry = ET.SubElement(sitemap.getroot(), '{' + namespace + '}url')
            ET.SubElement(entry, '{' + namespace + '}loc').text = loc
    sitemap.write(output / 'sitemap.xml', encoding='UTF-8', xml_declaration=True)
