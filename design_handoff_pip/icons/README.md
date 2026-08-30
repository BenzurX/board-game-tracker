# PIP app icon — four-pip die

Cream die tilted −11° on a plum squircle; two of the four pips carry player colours
(jade, bubblegum), two stay ink. Pure geometry — rounded squares and circles only,
which is why it survives to 16px.

## Geometry (as a fraction of the icon side S)
- squircle radius `0.22 S`, fill `#21131F`
- die `0.617 S` square, centred, corner radius `0.27 ×` die, fill `#F7EFE1`, rotated `-11°`
- pips `0.25 ×` die diameter; centres at `0.189 + 0.125` and `0.811 − 0.125` of the die on both axes
- pip colours, clockwise from top-left: `#21131F`, `#3FBE9A` (jade), `#21131F`, `#F576A8` (bubblegum)
- at 16px the rotation is dropped (`pip-icon-16.png`, `pip-icon-flat.svg`)

## Files
**svg/**
| File | Use |
|---|---|
| `pip-icon.svg` | master mark, plum squircle background |
| `pip-icon-flat.svg` | no rotation — favicon and anywhere under ~20px |
| `pip-icon-transparent.svg` | die only, no background — for use on any ground |
| `pip-icon-maskable.svg` | die at 46% inside a full bleed square — Android maskable safe zone |
| `pip-icon-mono.svg` | single-colour, pips knocked out; inherits `currentColor` |

**png/** `16 · 32 · 48 · 64 · 128 · 180 · 192 · 256 · 512 · 1024`,
plus `pip-maskable-{192,512,1024}` and `pip-icon-transparent-{512,1024}`.

180 is apple-touch-icon; 192/512 are the PWA manifest pair.

## Manifest
```json
"theme_color": "#21131F",
"background_color": "#21131F",
"icons": [
  { "src": "/icons/pip-icon-192.png",     "sizes": "192x192", "type": "image/png" },
  { "src": "/icons/pip-icon-512.png",     "sizes": "512x512", "type": "image/png" },
  { "src": "/icons/pip-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
  { "src": "/icons/pip-icon.svg",         "sizes": "any",     "type": "image/svg+xml" }
]
```
Theme colour stays plum in light mode too, so the status bar never flashes white.

No `.ico` is included — generate one from `pip-icon-32.png` + `pip-icon-16.png` if the
target needs legacy favicon support.
