#!/usr/bin/env python3
"""Check the combined public artifact, including absolute cross-site links."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / '_site'
HOST = 'alexgamelab.ru'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for attr in ('href', 'src'):
            if attr in attrs:
                self.refs.append(attrs[attr])
        if 'srcset' in attrs:
            self.refs.extend(value.strip().split()[0] for value in attrs['srcset'].split(','))

pages = {}
for path in ROOT.rglob('*.html'):
    text = path.read_text()
    assert 'silkenapple4.chatgpt.site' not in text, path
    assert 'ChatGPT Sites' not in text, path
    assert 'noindex,nofollow' not in text or path.name == '404.html', path
    page = Page()
    page.feed(text)
    pages[path.resolve()] = page
required = ("index.html", "about/index.html", "projects/index.html", "projects/rublemet/index.html", "news/index.html", "profile/index.html", "workspace/index.html", "workspace/articles/new/index.html", "workspace/roles/index.html", "auth/callback/index.html", "auth/silent/index.html", "games/rublemet/index.html", "privacy/index.html", "akaalexey/index.html")
assert all((ROOT / name).resolve() in pages for name in required), "Missing required page"

references = 0
for path, page in pages.items():
    for ref in page.refs:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            if url.netloc != HOST:
                continue
        references += 1
        if not url.path:
            target = path
        elif url.path.startswith('/'):
            target = ROOT / unquote(url.path.lstrip('/'))
        else:
            target = path.parent / unquote(url.path)
        if target.is_dir():
            target /= 'index.html'
        assert target.exists(), (path, ref, 'missing target')
        if url.fragment and target.resolve() in pages:
            assert unquote(url.fragment) in pages[target.resolve()].ids, (path, ref, 'missing anchor')

for css in ROOT.rglob('*.css'):
    for ref in re.findall(r'url\([\'"]?([^\)\'"\s]+)', css.read_text()):
        if not urlsplit(ref).scheme:
            target = ROOT / ref.lstrip('/') if ref.startswith('/') else css.parent / ref
            assert target.is_file(), (css, ref)
for sitemap in ROOT.rglob('sitemap.xml'):
    for loc in ET.parse(sitemap).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
        url = urlsplit(loc.text)
        assert url.scheme == 'https' and url.netloc == HOST, loc.text
        assert (ROOT / url.path.lstrip('/') / 'index.html').is_file(), loc.text
for file in ROOT.rglob('*'):
    if file.is_file():
        assert file.suffix not in ('.py', '.env', '.md', '.yml'), file
        assert file.name not in ('AGENTS.md', 'site_config.json'), file
assert (ROOT / 'CNAME').read_text().strip() == HOST
print(json.dumps({'pages': len(pages), 'references': references, 'result': 'passed'}))
