# AGL and portfolio — redesign checkpoint

Updated: 10 November 2026 (Moscow). Plan: AGL_full_redesign_plan_2026-11-09.md, Library file libfile_53b4620372f4819196fd3a44226545a4.

Current state: stages 1 and 2 and the access/Player follow-up below are released on the existing production hosts. The stage 1 sections below are historical; the stage 2 corrections and final release table supersede their public copy, personal-contact references and remaining implementation list.

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

## Stage 2 — released implementation, 10 November 2026

Branches: `feat/redesign-stage2-20261110` in all affected repositories. Bases: AGL `8760f16`, backend `7d01bb6`, personal `f05a03f`.

Backend PR #8 extends existing page editions to 13 AGL/portfolio documents, constrained blocks/gallery/links, public site bundles, published HTML/OG snapshots and media metadata. No new database migration. Existing identity subjects, roles, native callbacks and assetlinks remain unchanged.

The latest owner corrections supersede the earlier contact and introductory-copy plan:

- News begins with a compact single-row project/date/search toolbar, followed by the first publication. No large introduction, publication counter or news/article filter. Type remains available in the editor.
- Both the profile entry screen and Keycloak are reduced to forms/actions and essential data links. Marketing artwork/story is removed from authentication.
- Direct personal Telegram links and first-name introductions are removed from both sites. AGL emphasizes projects/work, portfolio uses `akaalexey`.
- The administration Telegram bot remains a separate future integration. No working bot identity/inbox was supplied or configured; no live support/recovery promise is displayed.
- Data inventory from schemas is recorded in backend `docs/DATA_INVENTORY_2026-11-10.md`; a factual public data notice replaces the obsolete no-account claim. Formal operator details, retention/deletion rules and a working request channel remain to be established.

Exactly three generated originals are integrated as optimized assets, with source prompts/references in `docs/REDESIGN_ART.md`. Personal-site art has its own provenance copy. Browser-width tests will be reported separately from physical mobile verification.


### Stage 2 validation and release notes

- Backend source `3d0e7b60ca940906783baeff03c089147f243296`, merged/released `117ff75b4fe2427d1179ae6ddd29434e6d7e55c9`, PR [#8](https://github.com/Alex-Game-Lab/backend/pull/8). Backend check run 42757794182 and production run 42757996743 succeeded. No schema migration beyond 0005 was needed.
- Public API returned HTTP 200 for both site bundles (6 AGL and 7 portfolio documents), published page/article HTML snapshots and date-filtered news. The actual CORS response permits `https://akaalexey.ru`. New server contract was verified before merging the dependent clients.
- AGL source `d4f024537bd0e7c91b0866bb0f2f4ffb29858d3a`, PR [#9](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/pull/9). Both push/PR Vue checks passed: 42759917048, 42759922564. Local final artifact: 29 pages / 310 references. Main JS `index-eO39EN_F.js`, CSS `index-0P2jGTfC.css`.
- Portfolio source `ec98082760900c27594fd71bfc69502d4e47adee` in PR [#1](https://github.com/akaAlexey/akaalexey/pull/1), then `0672fdeec8ea82fd6a37b602d79f31014088cfc2` in PR [#2](https://github.com/akaAlexey/akaalexey/pull/2) adds deterministic asset version queries for returning visitors. Generator/link checks: 8 pages / 164 references; JavaScript syntax passed. First release run 42759468711 succeeded; final release evidence follows below.
- Three generated originals plus optimized derivatives are used in real pages. Original references, prompts, filenames/dimensions and byte budgets are in `docs/REDESIGN_ART.md` and personal `site/docs/REDESIGN_ART.md`. No additional generation was performed.
- Short browser review used actual Vue components with public snapshots and synthetic Owner transport, and the built portfolio in a local mount. The fixture is ignored under `client/.openai/` and is not in production. Reviewed AGL/news/profile at desktop/390 px, portfolio at 1440/390 px and both themes, home→case→contact navigation, and a 320 px stress case. No horizontal overflow in measured 375/305/753 px inner viewports.
- News first heading starts at y≈200 CSS px in the 390 px frame; toolbar height 57 px. The search field replaces the filter row on narrow screens without adding a new vertical block.
- Owner page editor at tablet 768 px: input 16 px; selected personal/about, saved revision 1, published revision 2, restored the previous content and published revision 4. Server rights/persistence/conflicts were tested separately against PostgreSQL in CI. No real production test post, account or Owner draft was created.
- A simulated HTTP 503 retained the visible published news snapshot; one retry cleared the error. Prior stage 1 text-preservation and registration/PKCE/profile checks remain applicable; no auth client, subject mapping or Android return logic changed.
- Removed direct personal Telegram links and first-name introductions from both rendered sites, including the 404 fallback. The first publication's author/body/ID/URL are not rewritten.

### Actual remaining work and verification limits

1. The administration Telegram bot is a future integration requested by the owner, not a working feature of this release. It needs a real bot identity/configuration and inbox access before incoming messages or automated replies can be implemented. No Telegram messages were sent.
2. The data notice now describes actual account-related storage. A complete legal operator policy still requires verified operator details, retention/deletion rules and a working request channel; none were invented. See backend `docs/DATA_INVENTORY_2026-11-10.md`.
3. Canonical GitHub Pages HTML carries release-time metadata. Content updates through Owner are immediate in the live UI; always-current share HTML/OG is available at `/v1/previews/{site}/{page}` and `/v1/previews/news/{slug}`. The editor and article page expose these share snapshots. Canonical static metadata changes with the next ordinary Pages build; this static-host limitation is not hidden.
4. Physical Android/Yandex keyboard, Android app return and Safari/iPhone were not exercised on a device. Native callback and assetlinks source bytes are unchanged. Field LCP/INP/CLS have not been measured. No full Docker/e2e suite was run.

No domain or hosting-workflow changes were made. The remaining items above are separate integrations, legal input and physical/field verification, not unpublished source for the main redesign.

### Stage 2 final production verification

Verified on 10 November 2026, 05:18 UTC / 08:18 Moscow. All redesign implementation PRs below are merged; this checkpoint is a later documentation-only commit and does not identify a new application release.

| Component | Production code revision | Release evidence |
| --- | --- | --- |
| API and Keycloak | `117ff75b4fe2427d1179ae6ddd29434e6d7e55c9`, source `3d0e7b60ca940906783baeff03c089147f243296`; [PR #8](https://github.com/Alex-Game-Lab/backend/pull/8) | [Production run 42757996743](https://github.com/Alex-Game-Lab/backend/actions/runs/42757996743): quick API tests and deploy-vps succeeded. 67 tests passed in 7.78 seconds; full stack was intentionally skipped. |
| Public AGL and workspace | `5a2d299442a54ae2dc9aa0b27fe9a0bbcc92f8a8`, source `d4f024537bd0e7c91b0866bb0f2f4ffb29858d3a`; [PR #9](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/pull/9) | [Main checks 42760347108](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42760347108) and [Pages release 42760347373](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42760347373) succeeded. Actual HTML loads `index-eO39EN_F.js` / `index-0P2jGTfC.css`. |
| Personal portfolio | `156d06c7a07103ead6ef57dc7afeb6651c572154`, source `0672fdeec8ea82fd6a37b602d79f31014088cfc2`; PRs [#1](https://github.com/akaAlexey/akaalexey/pull/1) and [#2](https://github.com/akaAlexey/akaalexey/pull/2) | [Pages release 42760352555](https://github.com/akaAlexey/akaalexey/actions/runs/42760352555) succeeded. Actual HTML uses fingerprint `616bc9f0e568` on theme/site CSS/JS assets. |

Live acceptance observations:

- `https://alexgamelab.ru/`, `/news/`, the original first-post URL, both Rublemet paths and `https://akaalexey.ru/` returned HTTP 200. Generated WebP assets from both hosts also returned HTTP 200.
- The production browser shows the compact project/date/search row immediately above the first news title, with no marketing hero or type tabs. The personal homepage identifies the author as `akaalexey`, without the first-name introduction or direct personal Telegram link.
- Public `/profile/` now shows only AGL ID, login/registration actions, the nickname/password/optional-email note and the data notice link. A read-only visit to the actual production Keycloak registration form confirmed nickname/password/optional email, 16 px inputs, username/new-password/email autocomplete and the explicit statement that recovery/confirmation mail is not sent. No credentials were entered and no production signup was submitted.
- The existing first publication matches the captured original in ID, slug, title, excerpt, body, author, creation/update/publication dates and revision; `kind=news` remains intact.
- `/games/rublemet/` and `/projects/rublemet/` serve the same page with canonical `https://alexgamelab.ru/projects/rublemet/`. The original first-news link has its own static HTTP 200 shell and post-specific metadata.
- Android callback and assetlinks returned HTTP 200 and exactly matched their preserved source bytes. SHA-256: callback `754972ed20551848aa55622ed532af88fecbb1badfbb3ca42113a38d2c33661c`; assetlinks `70969c34eb9846dfe131192807fda49179336b1eb5a9f75bbae2bf3a6e166348`. This is compatibility evidence, not a physical Android app-return test.
- Both public content bundles respond with the published defaults/snapshots. The 13-page Owner editor is reached at `https://alexgamelab.ru/workspace/content/`; media metadata and uploaded images at `/workspace/media/`. Private drafts require the current Owner session; ordinary actions do not request the password again.

Acceptance totals remain one final TypeScript/Vite build plus four helper tests and 29-page / 310-reference Pages validation for AGL, the 8-page / 164-reference generator check plus JavaScript syntax for the portfolio, and the targeted backend suite above. No additional full audit, Docker suite or broad e2e run was added. The actual production browser review supplements, rather than relabels, the isolated tablet/narrow-width checks.

Next work must start from the four explicit remaining items above (administration bot, verified legal policy inputs, canonical static metadata delivery, physical/field checks), not repeat the redesign or publish test content into production.


## Access management and Player follow-up — 10 November 2026

This follow-up supersedes earlier multi-role UI descriptions. Work stayed in the existing Vue/API/Keycloak repositories; the personal site and the Owner's public text were not redesigned again.

### Implemented behavior

- Project permissions are an action/scope matrix: edit, publish/hide, manage members and delete/restore, each for trusted or all projects. Creation is separate. Developer membership or an explicit per-project grant defines trusted scope; tester membership alone confers no management. Personal denials and bans remain effective.
- Role creation, editing, assignment and deletion are separate. Review editing no longer implicitly controls deletion. Existing grants were translated without silently removing earlier capabilities. Newly introduced project/account deletion and note-mutation permissions initially belong only to Owner until explicitly granted.
- Projects, custom roles and accounts have revision-checked trash/restore with target confirmation, stated effects, reasons and audit records. Projects return unpublished; related materials and game saves remain. System roles and the pinned Owner account are protected. The acting account cannot delete itself.
- Staff account cards show the registration nickname separately from the chosen profile name, IDs, existing profile fields, creation/update dates, version, one role, project memberships, restrictions, personal grants and existing-record counts. An update date is not labelled last login. Passwords, Keycloak email and save contents are not exposed.
- Private notes use separate create, edit-own, delete-own, edit-others and delete-others rights. Text, deleted-note lists and counts are visible only to the note author, Admin and Owner. Others' note IDs return 404; ordinary account-read permission exposes no colleagues' note text. Admin visibility does not confer edit/delete rights; others' mutation rights work only for Admin. Owner-authored notes stay Owner-protected.
- Note saves are explicit, revision checked and recoverable from account-scoped session drafts. A failed save preserves the input. Audit records note IDs/actions/revisions/reasons, never note text. Public profiles, authors and account lists contain no private notes.
- Every account now has exactly one role. System Player (`player`, «Игрок») is the default; the configured Owner identity remains pinned to Owner. Removing a custom role resets its accounts to Player. Earlier multiple-role combinations are converted to one custom role with the same permission union, preserving derived Admin visibility and protection. A database unique constraint enforces at most one assignment; empty legacy selections reset to Player.
- Own-profile/save abilities are base account capabilities, not role-editor switches. The misleading own-profile control is excluded from the editable matrix.
- Private registration nicknames refresh from the signed `preferred_username` claim and are backfilled for existing profiles through the existing bootstrap stdin transport. No new admin credential is persisted in API configuration. Phone-derived/email identifiers are excluded. Staff lists and selectors show the registered nickname first; selected display names and public author names are preserved. `/me` response shape used by Android is unchanged.

### Code, migrations and release evidence

Branches: `feat/scoped-access-notes-20261110` and `feat/player-role-nicknames-20261110` in both repositories.

| Component | Final code release | Evidence |
| --- | --- | --- |
| API / identity metadata | `aebf69c10a59e7b5892d48ffe3a195b6c459d8ff`; Player source `e215c79a33969aae3a72d5e73ffbb0a7170bc049` | Backend PRs [#9](https://github.com/Alex-Game-Lab/backend/pull/9), [#10](https://github.com/Alex-Game-Lab/backend/pull/10), [#11](https://github.com/Alex-Game-Lab/backend/pull/11). [Final release 42808503076](https://github.com/Alex-Game-Lab/backend/actions/runs/42808503076): 74 quick tests passed in 12.28 seconds, deploy-vps passed, private schema and public HTTPS readiness verified. Nickname sync completed and updated one existing profile. |
| AGL client | `dd351d7936cb86151148616d342f988ffaa5064d`; Player source `a7ebc7828766f5bd6291e46bb52b742f7c469fed` | Frontend PRs [#11](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/pull/11), [#12](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/pull/12). Branch checks 42808755626 and 42808748372 passed. [Final Pages release 42809000241](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42809000241), [main client checks 42809000410](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42809000410) and built-in Pages run 42808999864 all succeeded. |

Migrations `0006_scoped_access_notes` and `0007_player_identity` are additive and applied through the existing deployment process, with a private pre-migration dump. Runtime grants include the private notes table. No schema downgrade or restoration was performed. The readiness probe was corrected from the previous hard-coded schema revision; the final fast suite now checks real `/health/ready` so the mismatch cannot pass unnoticed. Final readiness expects `0007_player_identity`.

### Acceptance and limits

- Final TypeScript/Vite build passed; existing four helper tests passed in the access implementation. The combined final Pages artifact passed 29 pages / 310 references. The latest Player follow-up uses the native single-choice select; no extra image generation or full Docker/e2e run was needed.
- Short isolated browser review used actual Vue components and synthetic Owner transport: tablet role matrix at 768 px, saving an independent trusted-project deletion grant, deleting an assigned custom role and opening/restoring it from trash, account details and private notes at 390 px, a 320 px stress case, and desktop project actions/confirmation at 1440 px. Measured document widths matched 768/390/320 px without horizontal overflow; the note field was 16 px. A simulated 503 left the text intact and one retry saved it. Server privacy, scope, revisions and persistence were tested separately against signed identities and PostgreSQL in CI.
- No production test users, posts, notes or deletion actions were created. The production browser was logged out; a private production Owner session was not used. Physical Android/iPhone, native app return and field performance were not re-tested. Native callback and assetlinks sources are unchanged.
- The Owner's current published AGL page editions (home/projects/project-rublemet revision 2, remaining pages revision 0) were captured as static fallbacks and matched the public API after release. Their prose was not rewritten. The earlier first-post snapshot was found stale: the Owner had already published revision 15 at 08:16 UTC with the 11 November announcement. The public JSON snapshot is refreshed verbatim from that published edition; no article mutation request was made.
- Account trash closes application/API access, including existing tokens, and preserves records for restoration. It is not permanent Keycloak identity/credential erasure; the UI says this before confirmation. A complete identity-erasure/retention process remains separate.

User guide: `docs/ACCESS_MANAGEMENT.md`; API/security behavior: backend `docs/ACCESS_AND_ACCOUNT_NOTES.md`. Earlier stage 2 remaining items (administration bot, verified legal policy inputs, canonical static metadata refresh and physical/field checks) remain separate. No Telegram messages or domain changes were made.

Final follow-up release time recorded: 2026-11-10 14:42 MSK. Live API readiness returned HTTP 200 after the Player deployment.

Final public HTTP acceptance before the snapshot refresh: role/user route shells and the native one-role UI bundle returned 200; API readiness returned 200; Owner page data matched all six captured editions; callback and assetlinks bytes matched preserved sources. Final Player bundle at that point: `index-C7-lmOFC.js`, CSS `index-BJsMSgrw.css`. A later snapshot-only frontend release is recorded below.

Published-news snapshot refresh: source `23269c44040c798e13240a2cfaec6115fcf4c2bb`, [frontend PR #13](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/pull/13), captures the existing first post at revision 15 and the other published post at revision 14 verbatim from the API. Final rebuilt artifact: 30 pages / 322 references, TypeScript/Vite passed. Expected bundle: `index-CDz88iGa.js`; CSS remains `index-BJsMSgrw.css`. This changes fallback snapshots/static metadata only; it does not write articles or change the already-published role/identity contract.

Snapshot release verified: frontend main `3ca9e2422d39d1f7a9e570902b88afbe59db7bfc`; [Pages release 42810713538](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42810713538), [main Vue checks 42810713508](https://github.com/Alex-Game-Lab/Alex-Game-Lab.github.io/actions/runs/42810713508) and built-in Pages run 42810713181 succeeded. This is the final published frontend artifact for the follow-up; the earlier `dd351d7` entry identifies the unchanged Player/account feature code. A subsequent documentation-only commit does not identify another application release.

Final checkpoint recorded 2026-11-10 14:53 MSK. No pending implementation PR remains for the requested scoped rights, one-role default, nickname display, account notes or reversible deletion. Permanent identity erasure and physical-device verification remain the explicit limits above.
