# Pip - two Claude Design prompts

## Prompt 1: the Pip logo (name + die mark)

Attach: the identity artboard with the cream die icon at 192/32/16px, and the palette/type panel.

---

The app now has a name: **Pip**. Three letters, one syllable, and it is already the word for the dots on a die, so the name and the mark are the same idea. I am attaching your identity artboard - the cream squircle die tilted 11 degrees with two of its four pips swapped to jade and bubblegum - plus the palette and type panel. Keep that mark's logic. Design the logo that fuses the name into it.

Explore lockups where the die is not merely placed next to the word but is structurally part of it. Directions worth testing, at minimum:

- The die as the dot of a lowercase **i** in "Pip", so the mark sits inside the word rather than beside it.
- The counter of the **P** replaced by a single coloured pip, making the letterform itself a die face.
- The three letters spaced so their round elements read as a three-pip die face when the word is squinted at or scaled down.
- A stacked lockup where the die sits above the wordmark, for a splash screen and a square social avatar.

Rules the result must satisfy:

- **Type**: Lilita One for the wordmark, per-glyph rotation no more than plus or minus 4 degrees, cream base with one or two accent letters. Restraint over rainbow.
- **Legibility ladder**: the mark must survive at 512, 192, 64, 32 and 16px. At 16px it can be only circles on a rounded square - no strokes, no fine detail, no text. Show every size rendered, not just the large one.
- **Colour**: use only the palette you defined. The plum ground stays the constant so the PWA theme colour and splash never flash a foreign colour.
- **Maskable icon**: supply a version that survives Android's circular and squircle masks, with the safe area marked.
- **Monochrome**: a single-colour cream-on-plum and plum-on-cream version for favicons, watermarks and print.
- **Construction**: pure geometry, buildable as inline SVG with no raster assets. Give me the SVG source for the final mark, and note the grid or ratio it was built on so I can redraw it later.

Deliver: the primary horizontal lockup, the stacked lockup, the bare app-icon mark at all five sizes, the maskable variant, the monochrome variant, and one shot of the wordmark in use as the home-screen header at 380px phone width, in both plum and cream modes.

---

## Prompt 2: ambient linework background system

Attach: a Stage 5 tracker artboard so the density can be judged against real content.

---

Design an ambient background system for Pip made of **stroked linework shapes** rather than filled blobs. The feeling I want is playful and calm: a few large outlined shapes drifting behind the content, moving slowly enough that you notice them only if you stop and look. Think of a rounded-corner eight-point star drawn in an 8px yellow stroke, slowly rocking back and forth as if it were on a soft spring in a light breeze - never completing a rotation, never travelling far, just gently oscillating.

Design the family, not one shape. I want a small set of primitives I can place and recolour:

- An eight-point rounded star, oscillating rotation.
- A large open circle or arc, drifting slowly across a long distance.
- A rounded triangle or squircle outline, rocking on a different, non-matching period so shapes never sync up.
- A short run of dashes, ticks or a wavy line, evoking tally marks without being literal.
- One or two spare glyph-like marks (a plus, a sparkle four-point star) at small scale for punctuation.

Rules:

- **Stroke only.** No fills. Consistent stroke weight per size tier (roughly 8px for large shapes, 4px for small), round caps and round joins throughout.
- **Colour** comes from the accent palette, but at low opacity against the ground: legible as shape, never as a competing element. State the exact opacity per mode - the cream light mode almost certainly needs a different value than plum dark to feel equally quiet.
- **Motion**: slow, eased, and looping with no visible snap at the loop point. Every shape gets a different period, in the range of roughly 12 to 40 seconds, with periods deliberately non-multiples of each other so the composition never resolves into a repeating beat. Oscillation and drift only - nothing spins continuously, nothing bounces, nothing changes colour.
- **Placement rules**: which regions of each screen can host a shape and which are off limits. The score table and any row of numbers a person is comparing must sit on a clean ground - shapes may live in the header, the margins, behind the home grid, and behind empty states, but never behind tabular data. Give me a maximum count per screen.
- **Implementation**: CSS and inline SVG only, no images and no JavaScript, no build step. Must be GPU-cheap enough to run continuously on a mid-range Android phone - transform and opacity animation only, nothing that triggers layout or paint per frame. Everything must stop completely under `prefers-reduced-motion: reduce`, leaving the shapes rendered but static.
- **Layering**: the whole system sits on one non-interactive layer behind content, with `pointer-events: none`, never overlapping an interactive target's hit area visually enough to confuse it.

Deliver: the shape library drawn at true scale and true opacity, a motion spec table (shape, transform range, period, easing), a placement map for the home, tracker and winner screens, the CSS custom properties the system reads, and the SVG source for each primitive. Show one artboard with the system on and one with it off, at 380px phone width, so I can judge whether it is genuinely quiet enough.
