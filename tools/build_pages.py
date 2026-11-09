#!/usr/bin/env python3
"""Build only public site files for GitHub Pages, using the standard library."""
from pathlib import Path
import argparse
import shutil
import subprocess
import sys
from build_portal import build as build_portal

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sync-root', action='store_true', help='Refresh the tracked static export for branch-based Pages compatibility')
    args = parser.parse_args()
    for site in ('agl',):
        base = ROOT / 'sites' / site
        subprocess.run([sys.executable, str(base / 'build.py')], check=True)
        subprocess.run([sys.executable, str(base / 'tools/check_site.py')], check=True)
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    shutil.copytree(ROOT / 'sites/agl/dist', OUTPUT)
    shutil.copy2(ROOT / 'CNAME', OUTPUT / 'CNAME')
    build_portal(OUTPUT)
    # Public Android App Link metadata and the browser return page.
    native = ROOT / 'native-android'
    if native.is_dir():
        shutil.copytree(native, OUTPUT, dirs_exist_ok=True)
    # The personal website is now owned and built by akaAlexey/akaalexey.
    # Keep old public links useful without publishing a second portfolio.
    for old, new in (('', ''), ('privacy/', 'privacy/'), ('projects/rublemet/', 'projects/rublemet/')):
        target = 'https://akaalexey.ru/' + new
        directory = OUTPUT / 'akaalexey' / old
        directory.mkdir(parents=True, exist_ok=True)
        (directory / 'index.html').write_text(
            '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<meta name="robots" content="noindex,follow">'
            '<link rel="canonical" href="' + target + '">'
            '<script src="/app-assets/personal-redirect.js"></script>'
            '<meta http-equiv="refresh" content="0;url=' + target + '">'
            '<title>Личный сайт переехал · akaalexey</title></head>'
            '<body><main><h1>Личный сайт переехал</h1><p>'
            '<a href="' + target + '">Открыть akaalexey.ru</a>'
            '</p></main></body></html>')
    (OUTPUT / 'app-assets/personal-redirect.js').write_text(
        "const sections={about:'about/',projects:'projects/',experience:'experience/',contact:'contact/'};"
        "const path=location.pathname.replace(/^\\/akaalexey\\//,'');"
        "location.replace('https://akaalexey.ru/'+(path?path:sections[location.hash.slice(1)]||''));")
    subprocess.run([sys.executable, str(ROOT / 'tools/check_pages.py')], check=True)
    if args.sync_root:
        # Remove stale hashed chunks from the branch export, not user source.
        for relative in ("app-assets", "portal/assets"):
            old = ROOT / relative
            if old.is_dir():
                shutil.rmtree(old)
        personal = ROOT / 'akaalexey'
        if personal.is_dir():
            shutil.rmtree(personal)
        shutil.copytree(OUTPUT, ROOT, dirs_exist_ok=True)
    print(f'GitHub Pages artifact: {OUTPUT}')

if __name__ == '__main__':
    main()

