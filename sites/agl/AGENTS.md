# Alex Game Lab website

## Purpose
Public official website for Alex Game Lab, hosted on GitHub Pages.

## Stack and commands
- Vue 3 + TypeScript + Vue Router in `client/`, built with Vite. Static artifacts on GitHub Pages; API and AGL ID on the existing VPS.
- Run `cd client && npm ci && npm run build`, then `python3 tools/build_pages.py --sync-root` from the repository root. Use the managed preview for a short visual review.
- Keep verification proportional: compilation, link checks and focused API/helper checks; full e2e/stack testing is manual opt-in.
- Deployment is configured in `.github/workflows/pages.yml`.

## Boundaries
- Never invent release dates, game store URLs, press coverage, team members, emails or policies.
- Never add tracking, form collection, cookies or external network integrations without approval.
- Never publish private project code or artwork without review.
- Never modify the official site's domain or publishing workflow without approval.
- Keep the built `index.html`, route shells and 404 restoration compatible with GitHub Pages.
