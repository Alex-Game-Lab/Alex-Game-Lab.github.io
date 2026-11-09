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
- Backend PRs #5 and #6 add the contract and runtime grants; PR #7 fixes noninteractive deployment input and mobile nickname validation. Production verification is required after PR #7 before frontend publication.
- Personal site: akaAlexey/akaalexey, main `f05a03f9375ad53919a674d47fb97332d47cc2ad`, unchanged in this foundation stage. Full public redesign belongs to stage 2.

## Migration and compatibility

`0005_editorial_content` is additive: Article.kind (legacy default article), cover_media_id, unpublished draft JSON, media_assets and site_documents. The existing demo announcement changes kind to news without changing its ID, URL, text, author or dates. Runtime role grants cover the new tables. The release creates a private pre-migration application database dump before upgrading.

During deployment verification, successful build jobs were found to stop before container update because a Docker exec probe consumed SSH script stdin. Docker commands now detach stdin and an EXIT guard rejects incomplete deployments. Do not equate a green job with a live new API: verify `/v1/site-content/agl/home` and `/v1/media` as well as health.

## Validation completed

- Frontend TypeScript/Vite build and four existing helper tests passed.
- Combined Pages artifact: 28 pages, 276 references passed. The link checker was corrected to allow the existing noindex Android callback, leaving the callback itself unchanged.
- 48 local identity/deployment checks passed; PostgreSQL-backed API tests ran in GitHub CI because local server sockets are unavailable.
- Existing quick API suite passed in CI, including news/public draft separation, version conflicts, Owner-only content, public/private media and invalid media rejection.
- Focused isolated registration workflow passed for the editorial contract/runtime grants: invalid/duplicate nickname, short password, empty optional email, real OIDC+PKCE callback, profile and repeated login. This is not a physical Android test.
- Isolated browser fixture exercises actual Vue components with synthetic data only. Reviewed editor at 1440/768/390/320 CSS px; no horizontal overflow at measured narrow widths. Verified draft status, preview and homepage draft/publish/history; inputs are 16 px and key actions at least 44 px.
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

Pending production checks; this section is replaced with exact commits, deployment runs and observed API responses after publication.
