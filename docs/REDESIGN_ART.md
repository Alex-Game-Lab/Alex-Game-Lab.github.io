# Redesign image sources · 10 November 2026

Three original assets were generated with the built-in image generation tool. No additional generations or regeneration passes were used. All reference images were opened and visually reviewed before generation.

These are illustrative promotional materials. The Rublemet image is world art, not a game screenshot; the personal image is an anime illustration, not a real photograph. The existing confirmed character and personal portrait identities were preserved.

## References and invariants

- AGL: `assets/agl-hero.webp` and the existing violet/lime world-building identity. The new architectural portal keeps the studio motif while changing scale, material and composition.
- Rublemet: `assets/rublemet-cover.webp`, `assets/rublemet-street.webp`, `assets/rublemet-character.webp`. Same cream suit/gold vest/black shirt character, same brick riverside town, food kiosk and turquoise garage.
- Personal: AGL `assets/alexey-portrait.webp` and personal `assets/alexey-workspace.webp`. Same brown hair, rectangular glasses, face and patterned blue shirt. No awards, other people or unconfirmed achievements were added.

## Optimized assets

| Repository / asset | Dimensions | Bytes | Use |
| --- | --- | ---: | --- |
| AGL `assets/redesign/agl-hero.webp` | 1600 × 900 | 107810 | Desktop hero |
| AGL `assets/redesign/agl-hero-mobile.webp` | 768 × 1024 | 81366 | Mobile crop, portal preserved |
| AGL `assets/redesign/agl-hero-social.jpg` | 1200 × 675 | 113563 | Social preview |
| Both `assets/redesign/rublemet-cover.webp` | 1600 × 900 | 247862 | Project cover |
| Both `assets/redesign/rublemet-cover-small.webp` | 800 × 450 | 135310 | Smaller responsive cover |
| Both `assets/redesign/rublemet-cover-social.jpg` | 1200 × 675 | 247955 | Social preview |
| Personal `site/assets/redesign/personal-studio.webp` | 1600 × 900 | 172914 | Portfolio composition |
| Personal `site/assets/redesign/personal-studio-small.webp` | 800 × 450 | 58380 | Smaller responsive composition |
| Personal `site/assets/redesign/personal-studio-social.jpg` | 1200 × 675 | 154549 | Social preview |

Personal source assets live under `site/assets/redesign/`; AGL source assets live under `assets/redesign/`. Public URL paths for both are `/assets/redesign/…`. Generated originals were 1672 × 941 PNG. Only resizing, encoding and the explicitly requested mobile crop were applied after generation; no creative raster edits were performed in Python. Derived files were visually inspected. Each output is below 250 KB.

## Final prompts

### 1. hero

Use case: stylized-concept. Asset type: original wide website hero for Alex Game Lab, independent game studio. Input image is a reference only for the existing purple/lime world-building motif, not an edit target. Create an ambitious, beautifully art-directed 16:9 landscape: a sculptural architectural gateway built from dark graphite and ivory stone, a luminous acid-lime rectangular portal opening onto a tiny atmospheric game-world landscape with violet haze. Suspended architectural fragments form a clear flowing path from foreground into the gateway. A few restrained storyboarding sheets at foreground establish the maker's craft, without readable writing. Premium cinematic editorial render, materially rich stone, brushed metal, subtle grain, controlled dramatic lighting, sophisticated scale and believable perspective. Central portal and route must remain fully visible in a centered 3:4 crop for mobile. Edge margins have quiet near-black space. Palette charcoal, warm ivory, vivid acid-lime, deep indigo. This image is illustrative studio art, not a screenshot. No people, no game controller, no generic plastic toy collection, no floating UI, no text, no logos, no watermark. Landscape 16:9, high visual clarity.

### 2. rublemet

Use case: illustration-story. Asset type: a new original landscape 16:9 promotional illustration for the existing Russian game Rublemet. Images 1 and 3 are strict world/location references; image 2 is the exact character design reference. Preserve this same warm old Russian brick town beside the river, the small food kiosk with red-and-cream striped awning on the left, the turquoise-blue garage on the right, sunset skyline with small church domes and cranes in the distance. Preserve the same recognizable stylized stocky man with wavy dark brown hair, thick dark moustache, large round nose, cream suit, patterned gold waistcoat over black shirt, yellow pocket square and black shoes. Show him at three-quarter view on the right third, looking thoughtfully toward the small kiosk. His expression is warm and determined, not boastful. Both hands anatomically correct: one relaxed near jacket lapel, the other inside trouser pocket, no extra fingers. Maintain existing illustration identity, but improve cinematic composition with a slightly lower camera, coherent long golden shadows, rich brick and cobblestone texture, restrained small details and calm sky. No new buildings, no people, no invented gameplay elements, no text, no logo, no watermark. This is promotional world art, not a gameplay screenshot. Main character and kiosk remain legible in a wide project card.

### 3. personal

Use case: identity-preserve / stylized-concept. Asset type: landscape 16:9 illustration for the independent personal portfolio of Alexey akaalexey, game and software developer. Image 1 is the strict identity reference: retain exactly the same youthful male anime face, warm brown eyes, rectangular black glasses, tousled short brown hair and blue patterned button-up shirt. Image 2 is a reference for his existing desk scene. Create a new more editorial and thoughtful composition showing the same Alexey in three-quarter profile seated at a graphite desk, thoughtfully reviewing a few untitled storyboard sheets and a simple notebook next to an open laptop. Crop around waist-up, hands naturally resting on the desk, not intertwined; no extra fingers. Laptop screen is angled away and has no visible UI or code. Setting is a calm intimate creative workspace with ivory walls, a large window off-frame casting soft morning light, a single green plant and a deep indigo notice board containing abstract unlettered paper sketches. Sophisticated semi-realistic anime illustration, crisp face and glasses, tactile paper and fabric, restrained composition. Charcoal, warm ivory, muted blue, restrained lime stationery accent. Keep Alexey's face as the focal point on the right half while leaving breathing room on left. No trophies, no company logos, no text, no awards, no extra people, no watermark. Do not imply this is a real photograph.


