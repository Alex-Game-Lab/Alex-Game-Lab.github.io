#!/usr/bin/env python3
"""Build only public site files for GitHub Pages, using the standard library."""
from pathlib import Path
import argparse
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from build_portal import build as build_portal

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sync-root', action='store_true', help='Refresh the tracked static export for branch-based Pages compatibility')
    args = parser.parse_args()
    for site in ('agl', 'akaalexey'):
        base = ROOT / 'sites' / site
        subprocess.run([sys.executable, str(base / 'build.py')], check=True)
        subprocess.run([sys.executable, str(base / 'tools/check_site.py')], check=True)
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    shutil.copytree(ROOT / 'sites/agl/dist', OUTPUT)
    shutil.copytree(ROOT / 'sites/akaalexey/dist', OUTPUT / 'akaalexey')
    shutil.copy2(ROOT / 'CNAME', OUTPUT / 'CNAME')
    build_portal(OUTPUT)
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', namespace)
    sitemap = ET.parse(OUTPUT / 'sitemap.xml')
    for entry in ET.parse(OUTPUT / 'akaalexey/sitemap.xml').getroot():
        sitemap.getroot().append(entry)
    sitemap.write(OUTPUT / 'sitemap.xml', encoding='UTF-8', xml_declaration=True)
    subprocess.run([sys.executable, str(ROOT / 'tools/check_pages.py')], check=True)
    if args.sync_root:
        # Remove stale hashed chunks from the branch export, not user source.
        for relative in ("app-assets", "portal/assets"):
            old = ROOT / relative
            if old.is_dir():
                shutil.rmtree(old)
        shutil.copytree(OUTPUT, ROOT, dirs_exist_ok=True)
    print(f'GitHub Pages artifact: {OUTPUT}')

if __name__ == '__main__':
    main()
