"""Export the precompiled Vue portal into the existing GitHub Pages artifact."""
from pathlib import Path
import html
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
    'workspace/projects': ('Управление проектами · AGL', 'Настройки и участники проектов.'),
    'workspace/roles': ('Роли и права · AGL', 'Роли команды и разрешения.'),
    'workspace/users': ('Участники · AGL', 'Управление аккаунтами и персональными правами.'),
    'workspace/reports': ('Тестирование · AGL', 'Закрытые отчёты о тестировании проектов.'),
    'workspace/metrics': ('Игровые показатели · AGL', 'Метрики и управление игровыми показателями.'),
    'workspace/audit': ('Журнал действий · AGL', 'История действий в рабочем пространстве.'),
    'auth/callback': ('Завершаем вход · AGL ID', 'Возвращаемся в AGL ID после входа.'),
    'auth/silent': ('AGL ID', 'Восстановление сессии AGL ID.'),
}
PUBLIC = {'', 'projects', 'projects/rublemet', 'about', 'news'}


def build(output):
    source = ROOT / 'sites/agl/vue-dist'
    if not (source / 'index.html').is_file():
        raise RuntimeError('Run npm ci && npm run build in client before building Pages')
    # Keep legacy game, privacy and personal pages; replace only the portal shell.
    shutil.copytree(source / 'app-assets', output / 'app-assets', dirs_exist_ok=True)
    static = ROOT / 'sites/agl/static/assets'
    if static.is_dir():
        shutil.copytree(static, output / 'assets', dirs_exist_ok=True)
    template = (source / 'index.html').read_text()
    for path, (title, description) in PAGES.items():
        private = path not in PUBLIC
        page = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title) + '</title>', template)
        page = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m[1] + html.escape(description, quote=True), page)
        page = re.sub(r'(<meta name="robots" content=")[^"]*', lambda m: m[1] + ('noindex,follow' if private else 'index,follow'), page)
        canonical = 'https://alexgamelab.ru/' + (path + '/' if path else '')
        page = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m[1] + canonical, page)
        page = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m[1] + html.escape(title, quote=True), page)
        page = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m[1] + html.escape(description, quote=True), page)
        page = page.replace('</head>', '<meta property="og:url" content="' + canonical + '"></head>')
        if path:
            fallback = '<main id="main"><h1>' + html.escape(title) + '</h1><p>' + html.escape(description) + '</p><p>Для этого раздела нужен JavaScript.</p><nav><a href="/">Главная</a> · <a href="/projects/">Проекты</a> · <a href="/about/">О нас</a> · <a href="/games/rublemet/">Рублемёт</a></nav></main>'
            page = re.sub(r'<div id="app">.*?</div>', lambda _: '<div id="app">' + fallback + '</div>', page, flags=re.S)
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
