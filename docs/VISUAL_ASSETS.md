# AGL decorative artwork generation

Generated with the built-in image_gen tool, exactly one call per asset. No API/CLI fallback and no image synthesis or retouching outside image_gen. Originals were copied unchanged into the workspace.

| Asset | Dimensions | Mode | Workspace path |
|---|---|---|---|
| Homepage hero | 1672 × 941 | RGB PNG | /workspace/scratch/04310c715fd9/vue-agl-assets/agl-worlds-v2.png |
| Workshop cover | 1672 × 941 | RGB PNG | /workspace/scratch/04310c715fd9/vue-agl-assets/agl-workshop-v2.png |
| Orbit icon | 1254 × 1254 | RGBA PNG | /workspace/scratch/04310c715fd9/vue-agl-assets/agl-orbit-v2.png |

QA: visually inspected all three. No people, readable writing, logos, or obvious malformed objects. Hero retains substantial dark negative space on the left; workshop uses abstract geometric concept cards. Orbit icon has genuine alpha (0–255), fully transparent corners and open ring gaps, and was checked composited over both ink and warm cream backgrounds. It has no checkerboard baked into the image. All three PNGs are unmodified generated originals.

## Homepage hero prompt

Use case: stylized-concept
Asset type: polished wide 16:9 website homepage hero artwork for an independent game creation studio.
Primary request: an original, imaginative miniature game world floating just above a dark worktable, sculpted as a small landscaped island with an elegant portal arch, rounded building blocks, winding inset pathways, two small layered world tiles, and a few refined creative tools resting nearby.
Style/medium: high-end tactile 3D miniature diorama, premium editorial rendering, matte clay and softly frosted glass with beautifully controlled details.
Composition/framing: extra-wide landscape frame. The entire illuminated miniature world occupies the RIGHT 60% of the picture, seen from an inviting three-quarter camera angle. The LEFT 40% is quiet near-black ink negative space suitable for a large headline; keep that area visually empty and clean. Keep every main subject comfortably inside the frame. A graceful low oval worktable edge anchors the world.
Lighting/mood: cinematic soft studio light, restrained violet rim light and subtle lime accents, deep elegant shadows, inviting and imaginative rather than toy-store busy.
Color palette: dark ink #0b0c16 backdrop and table; lavender violet #b6a3f5 clay and glass; soft lime #c2fd78 foliage and small accents; sparing warm cream on pathways and tool handles.
Materials/textures: finely textured matte clay terrain, smooth ceramic blocks, translucent lavender portal insert, sculpted lime treetops, soft beveled edges. Clear material separation and crisp, intentional forms.
Constraints: no text, no letters, no typography, no logos, no watermark, no people, no workers, no characters, no humanoid forms. This is a decorative abstract game-creation world, not a scene from any specific existing game. No UI overlays or screens. Do not fill the empty left side.

## Workshop cover prompt

Use case: stylized-concept
Asset type: polished wide 16:9 About and Projects cover artwork for an independent game creation studio.
Primary request: an imaginary game-creation workshop arranged as a beautifully art-directed miniature still life on a dark rounded worktable, viewed from overhead at a three-quarter angle. A central layered terrain model in violet clay and lime green rises across square scene tiles; nearby are refined abstract concept-sketch cards with simple blank geometric line studies, an elegant articulated studio lamp, a cream stylus, and a small orderly cluster of chunky code-like blocks shaped as rounded bars and nested brackets.
Style/medium: premium tactile 3D miniature diorama with matte sculpted clay, smooth ceramic, and softly frosted lavender glass details. High-end cinematic editorial polish, coherent with an imaginative floating game-world hero.
Composition/framing: wide landscape, cohesive workshop centered and extending gently from left to right; close enough to appreciate the crafted scene tiles while preserving breathing room around the outside. Clearly separate the terrain, the cards, and the lamp. No cropped main objects.
Lighting/mood: warm cream lamp illumination, soft lavender rim lighting against an ink-dark background, gentle contact shadows, restrained glow. Curious, calm, carefully crafted.
Color palette: dark ink #0b0c16 worktable and backdrop; lavender violet #b6a3f5 for terrain blocks and lamp; soft lime #c2fd78 for sculpted landscape foliage and small accents; warm cream for paper cards, pathways, and stylus.
Materials/textures: rounded beveled corners, subtle fine-grain clay surfaces, frosted glass scene panels, paper-like concept cards, small abstract topographic forms and trees. Crisp intentional construction.
Constraints: no people, no workers, no characters, no humanoid figures. No text, no letters, no words, no numbers, no readable writing, no logos, no watermark, no UI overlay. Concept-sketch cards contain only simple abstract paths and shapes. Decorative game-creation imagery, not a scene from any specific existing game. Avoid clutter, harsh neon, overglow, and excessive tiny detail.

## Orbit icon prompt

Use case: stylized-concept
Asset type: square transparent-background decorative 3D website icon for an independent game creation studio.
Primary request: one elegant lavender violet orbital ring sweeping around a small soft-lime cube, with exactly two tiny floating miniature world tiles nearby. The two tiles are simple beveled violet clay squares topped by a minimal lime landscape mound; one has a tiny cream portal arch and the other one small rounded lime tree. Make a clear unified emblem that remains recognizable when displayed small.
Style/medium: premium tactile 3D miniature object, matching an imaginative clay-and-frosted-glass game-creation world. Sculpted matte ceramic cube and terrain, smoothly beveled details, softly frosted lavender orbital ring, restrained highlights.
Composition/framing: centered isolated emblem in a SQUARE frame, complete ring and both tiles fully visible with generous transparent padding around all sides; dynamic three-quarter perspective. Ring crosses behind and then in front of the central cube to give a graceful orbit. Balanced simple silhouette with sparse detail.
Lighting/mood: soft studio lighting, beautiful material definition, gentle violet and warm cream highlights, subtle contact shading contained within the objects, minimal glow.
Color palette: lavender violet #b6a3f5, soft lime #c2fd78, tiny warm cream accents, subtle dark ink #0b0c16 only within shaded surfaces.
Background: genuinely TRANSPARENT alpha everywhere outside the emblem, including through the open center of the orbital ring and between the cube and floating tiles. No backdrop, no floor, no ambient background, no shadow plane, no colored square, no checkerboard pattern.
Constraints: no text, no letters, no logos, no watermark, no people, no characters, no UI elements. This is a decorative original abstract emblem, not game canon. Preserve actual transparent alpha, not a simulated background.



WebP производные находятся в `sites/agl/static/assets`. Исходные PNG не включаются в публичную сборку. Иконки интерфейса: @lucide/vue (ISC), сохранён единый набор в components/Icon.vue.
