# AGL redesign — stage 1 checkpoint

Updated: 10 November 2026 (Moscow). Plan: AGL_full_redesign_plan_2026-11-09.md, Library file libfile_53b4620372f4819196fd3a44226545a4.

## Scope implemented

- Separate workspace shell, grouped permission-aware navigation, readable controls, mobile section menu, fixed mobile editor actions. Public marketing footer is excluded from workspace routes.
- News/article kinds, simple news creation, optional cover, uploaded image selection, kind filters and appropriate reading-time labels.
- Debounced server drafts. Editing a published article leaves its public edition intact until explicit publication. Local recovery remains account-scoped; version conflicts stop automatic saves.
- Owner-only homepage editor: title, introduction, channel label/HTTPS URL and optional hero image, with private draft, preview, revision, publication and ten previous published editions.
- Owner-only raster media upload and separate public-availability action. Browser preparation strips original metadata and limits image size; the API rejects non-raster content and bounds bytes/dimensions. Binary image data is stored with the existing application database and included in database backups.
- Public homepage/footer read the published page data, with default/cached published content if the API is temporarily unavailable. Default studio channel: https://t.me/alex_game_lab; personal contact remains distinct.
- AGL ID form-first layout, readable input, inline errors and valid modern HTML nickname constraints. Existing subjects, clients, PKCE, callback and Android links remain unchanged.

## Repositories and release state

- Frontend: Alex-Game-Lab/Alex-Game-Lab.github.io, branch `feat/redesign-stage1-20261110`, base `67cd05266eed4cd0d443133e8fb3d130cfeeef33`.
- Backend: Alex-Game-Lab/backend, branch `feat/redesign-stage1-20261110`; source head `a5cc185af75f720853bb67189b28ca141cfffbb0`.
- Backend PRs [#5](https://github.com/Alex-Game-Lab/backend/pull/5), [#6](https://github.com/Alex-Game-Lab/backend/pull/6) and [#7](https://github.com/Alex-Game-Lab/backend/pull/7) are merged. Backend production release: `7d01bb6d0e016fb25b3e033afa6896617a493db1`. New public routes returned HTTP 200 before the dependent client was merged.
- Personal site: akaAlexey/akaalexey, main `f05a03f9375ad53919a674d47fb97332d47cc2ad`, unchanged in this foundation stage. Full public redesign belongs to stage 2.

## Migration and compatibility

`0005_editorial_content` is additive: Article.kind (legacy default article), cover_media_id, unpublished draft JSON, media_assets and site_documents. The existing demo announcement changes kind to news without changing its ID, URL, text, author or dates. Runtime role grants cover the new tables. The release creates a private pre-migration application database dump before upgrading.

During deployment verification, successful build jobs were found to stop before container update because a Docker exec probe consumed SSH script stdin. Docker commands now detach stdin and an EXIT guard rejects incomplete deployments. Do not equate a green job with a live new API: verify `/v1/site-content/agl/home` and `/v1/media` as well as health.

## Validation completed

- Frontend TypeScript/Vite build and four existing helper tests passed.
- Combined Pages artifact: 28 pages, 276 references passed. The link checker was corrected to allow the existing noindex Android callback `/auth/rublemet/callback/`, leaving the callback itself unchanged.
- 48 local identity/deployment checks passed; PostgreSQL-backed API tests ran in GitHub CI because local server sockets are unavailable.
- Existing quick API suite passed in final CI (63 tests in 6.25 seconds), including news/public draft separation, version conflicts, Owner-only content, public/private media and invalid media rejection.
- Focused isolated registration workflow passed on final backend source `a5cc185`: invalid/duplicate nickname, short password, empty optional email, real OIDC+PKCE callback, profile and repeated login. This is not a physical Android test.
- Isolated browser fixture exercises actual Vue components with synthetic data only. Reviewed editor at 1440/768/390/320 CSS px; no horizontal overflow at measured narrow widths. Verified draft status, preview, synthetic publication and homepage draft/publish/history. A single simulated HTTP 503 preserved the text and showed an honest failure status; manual retry saved successfully. Medialibrary empty/upload state was reviewed; inputs are 16 px and key actions at least 44 px.
- Temporary fixture lives only under ignored `client/.openai/`; it must never enter a commit or production. Public API and identity hosts were not used by the synthetic browser fixture.

## Stage 2 continuation

1. Read the final release note appended below and current GitHub heads; continue existing work rather than repeating the audit.
2. Complete the public AGL and independent personal-site redesign from the plan. Use existing Vue/API/Keycloak and the separate personal repository.
3. Extend the typed content mechanism to other public fields/pages and the personal site; stage 1 supports only `agl/home`. Add suitable published static snapshots/metadata for link previews.
4. Finish project-page unification (`/games/rublemet/` and `/projects/rublemet/`) while preserving legacy links.
5. Generate and integrate the limited new image set and restrained motion; preserve both themes and reduced motion.
6. Verify real Android/Yandex keyboard and browser-return behavior when an actual device is available; Safari/iPhone remains unverified. Email recovery remains unavailable until real delivery is configured and verified.
7. Media foundation currently supports upload/list/publish and image selection. Alt-text editing after upload, advanced search, deletion/archiving and broader page fields remain for later iteration.

No Telegram messages were sent, no domains changed, and no real production test accounts or test posts were created.

## Final release verification

Verified on 9 November 2026, 23:39 UTC (10 November, 02:39 Moscow).

| Component | Reviewed source / merge | Production evidence |
| --- | --- | --- |
| Backend | source `a5cc185af75f720853bb67189b28ca141cfffbb0`; main release `7d01bb6d0e016fb25b3e033afa6896617a493db1` | [Run 42720926024](https://github.com/Alex-Game-Lab/backend/actions/runs/42720926024), quick tests and deploy-vps succeeded; private schema and public HTTPS readiness logged |
| Isolated identity | source `a5cc185af75f720853bb67189b28ca141cfffbb0` | [Registration run 42720152973](https://github.com/Alex-Game-Lab/backend/actions/runs/42720152973) succeeded with real Keycloak/API and a synthetic account, not production |
| AGL frontend | source `1ddf82d28ade5d975b1bcb7cba72623bb91ef81e`; main release `b43f6f1ee02ad3b9b1ee8ea487737863bc2a59f1`; [PR #7](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/pull/7) | [Vue checks 42721312960](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42721312960), [main checks 42721418543](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42721418543) and [Pages release 42721418377](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42721418377) succeeded |
| Personal site | `f05a03f9375ad53919a674d47fb97332d47cc2ad` | Existing homepage responds HTTP 200. No stage 1 code or release; public redesign remains stage 2 |

Live observations:

- `/v1/site-content/agl/home`: HTTP 200, published/default revision 0 and correct `https://t.me/alex_game_lab`. Revision 0 is intentional: no Owner-authored production page draft has been created or published during this run.
- `/v1/media`: HTTP 200, empty list; `/health/ready`: HTTP 200. The additive `0005_editorial_content` contract is live; no downgrade was applied.
- `https://alexgamelab.ru/`: HTTP 200, actual HTML references `index-DtCaJhhG.js`; browser shows the new channel links and news label. Root CSS bundle: `index-V4Aiw5R5.css`.
- Existing first publication `528e9846-8fc5-4060-9919-896110059a36` remains at the same URL with the same title, excerpt, body, author and dates. It appears in the news filter with `kind=news`; public browser flow home → project → publication completed.
- `/games/rublemet/`, `/projects/rublemet/`, `/workspace/content/`, `/workspace/media/`, `/auth/rublemet/callback/` and `/.well-known/assetlinks.json` remain available. Android callback source and assetlinks are unchanged. The Android browser-return endpoint is `/auth/rublemet/callback/`.
- Production AGL ID registration visibly shows nickname/password/optional email before the story panel; actual inputs are 16 px and retain username/new-password/email autocomplete. It clearly states that recovery mail is not sent. No production signup was submitted.

Owner entry points: `/workspace/content/` for the homepage title/introduction/channel and `/workspace/media/` for media. Save a draft, inspect preview, then publish explicitly. The public edition updates from the existing API without a code commit or Pages rebuild; broader static social metadata remains stage 2.

Limits: Owner browser workflows used actual Vue components with isolated synthetic transport; server persistence/permissions/versioning were exercised separately against real PostgreSQL in CI. A live production Owner session, physical Android keyboard/return, Safari/iPhone and field Core Web Vitals were not tested. Existing ordinary workspace actions continue to use the current session; security-sensitive account operations retain their existing fresh-authentication flow.

Rollback: a previous frontend can use the additive server contract. Keep migration 0005 and runtime grants when correcting backend issues; use a forward fix instead of dropping production content/media tables. Pre-migration dumps are private under `/opt/agl/shared/pre-migration/`; no restore was performed.

No release blocker remains for the stage 1 scope. Stage 2 must complete the public AGL and personal redesign, new art/motion, remaining editable pages and legacy project consolidation. Do not repeat the full audit or the completed fast test set without new changes or a specific failure.

## Stage 2 — implementation in progress, 10 November 2026

Branches: `feat/redesign-stage2-20261110` in all affected repositories. Bases: AGL `8760f16`, backend `7d01bb6`, personal `f05a03f`.

Backend PR #8 extends existing page editions to 13 AGL/portfolio documents, constrained blocks/gallery/links, public site bundles, published HTML/OG snapshots and media metadata. No new database migration. Existing identity subjects, roles, native callbacks and assetlinks remain unchanged.

The latest owner corrections supersede the earlier contact and introductory-copy plan:

- News begins with a compact single-row project/date/search toolbar, followed by the first publication. No large introduction, publication counter or news/article filter. Type remains available in the editor.
- Both the profile entry screen and Keycloak are reduced to forms/actions and essential data links. Marketing artwork/story is removed from authentication.
- Direct personal Telegram links and first-name introductions are removed from both sites. AGL emphasizes projects/work, portfolio uses `akaalexey`.
- The administration Telegram bot remains a separate future integration. No working bot identity/inbox was supplied or configured; no live support/recovery promise is displayed.
- Data inventory from schemas is recorded in backend `docs/DATA_INVENTORY_2026-11-10.md`; a factual public data notice replaces the obsolete no-account claim. Formal operator details, retention/deletion rules and a working request channel remain to be established.

Exactly three generated originals are integrated as optimized assets, with source prompts/references in `docs/REDESIGN_ART.md`. Personal-site art has its own provenance copy. Browser-width tests will be reported separately from physical mobile verification.
