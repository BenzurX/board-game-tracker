# Claude Design brief - playful identity for the score tracker

## Attach these three screenshots

1. **Current app** - the "NOW" reference frames (Ocean dark home + tracker).
2. **Stage 5 redesign** - the chosen direction (dark home, tracker, cream light mode).
3. **Design system panel** - palette swatches, type ramp, sticker button rules.

## The prompt

I am redesigning a mobile-first web app that keeps score for in-person board and card games (Farkle, Yahtzee, Cribbage, Euchre, Liar's Dice, and a generic score sheet). It is a pure HTML/CSS/JS progressive web app with no build step, no framework, and a single stylesheet driven by CSS custom properties. It runs on a phone propped on a table, in a lit room, usually with four to six people looking at it at once. Screens: a game-picker home grid, a player setup screen, and a score table with a fixed action bar.

I am attaching three screenshots: the current app, a Stage 5 mockup of a playful redesign direction I like, and the design system panel behind that mockup.

I want you to design the next iteration of this direction. Do not copy the Stage 5 palette. Take its intent - dark plum ink ground, warm cream text, a set of saturated candy accents, chunky rounded display type, sticker-like buttons with hard offset shadows - and produce your own palette that hits the same emotional note with different, better hues. I want a palette that feels hand-mixed rather than picked off a default swatch grid, and where the accents still read as distinct player identities when they sit next to each other in one table header.

### Keep

- Zebra-striped score rows. Row legibility at a glance is the app's core job.
- Slightly rotated buttons and tiles with real drop-shadow depth, and the press-down interaction where the element lands into its own shadow.
- A heavy rounded display face in the spirit of Lilita One for the wordmark and headings, with a lighter rounded companion for body and numerals. Numerals must be tabular and readable at small sizes.
- Dark plum and cream as the two grounds: a dark mode and a cream-paper light mode, both first class.

### Remove

- Scattered multicolour confetti dots in the background. Too noisy, reads as clutter.
- The starburst "12 GAMES" sticker badge on the home screen.
- The cream "Free / No downloads / Works offline" capsule at the bottom of home. This is marketing copy inside the product.

### Add

Replace the removed decoration with a quiet ambient background system: faint, large, slow-moving abstract shapes behind the content that give the app a sense of life without competing with the score table. Think soft blurred blobs, subtle grain, or lazily drifting geometry at very low contrast against the ground. It must be implementable in CSS alone (transforms, gradients, blur, keyframes, or inline SVG), must never sit above interactive content, must fully disable under `prefers-reduced-motion: reduce`, and must be cheap enough to run continuously on a mid-range Android phone without draining battery. Show me the shapes at their actual intended opacity, not an exaggerated demo version.

### Deliverables

1. **Palette** - grounds, surfaces, text, muted text, borders, plus a set of six player accent colours. For every accent, state the paired foreground colour (ink or cream) and its contrast ratio, so text on a filled chip is never a per-use decision. Give the dark-mode and cream-light-mode values for the whole set.
2. **Type system** - display face, UI face, and the scale: wordmark, screen title, card title, button label, body, micro label, and table numerals. Google Fonts only, and keep the total to two families.
3. **Shape and elevation rules** - radii, shadow offsets, the press interaction, and where rotation is allowed versus forbidden (rotation must never touch rows of numbers a person is comparing).
4. **Ambient background system** - the shapes, their motion, opacity, and the reduced-motion fallback.
5. **A visual identity** - a wordmark treatment, a mascot or symbol mark that works as a 192px app icon and a favicon, and a theme-colour choice for the PWA manifest and splash screen. It should read as a game night, not as a spreadsheet.
6. **Artboards** - home game grid, score tracker mid-game, score entry sheet, and the winner celebration moment, each at 380px wide phone width, in both dark and cream-light modes.

### Constraints

- Everything must express as CSS custom properties on a `:root`-level theme block. The app already switches themes by setting `data-theme` and `data-mode` on the html element, so the output needs to slot into that shape.
- No images or icon fonts for core UI. Emoji and inline SVG are fine.
- Mobile portrait is the design target. The score table can scroll horizontally when there are many players, but the row labels and totals must stay readable at 380px.
- Accessibility: body text at 4.5:1 or better against its ground, large display text at 3:1 or better, tap targets 44px minimum, and colour must never be the only signal for who is winning.

Show your reasoning for the palette choices briefly, then give me the artboards.
