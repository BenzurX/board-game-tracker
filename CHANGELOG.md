# Changelog

Newest entries first. Version scheme: flat decimal starting at 0.01, incrementing by 0.01 per release (0.01, 0.02 … 0.09, 0.10 …). Version 1.0 is not assigned without explicit approval. Minor additions increment by 0.01; significant grouped releases may skip ahead by more at the author's discretion.

## 0.27 - 2026-08-30

Keyboard support on desktop, a one-player floor, and the turn outline that drifted off its own column.

### Changed
- `Claude:` **Setup names the two modes by what they actually are.** "Solo / Same Device" and "Multiplayer Room" are now **Single Device** and **Multi-Device Room**. The distinction was never how many people are playing - a single device happily holds eight - it is how many devices are in the room, and the old wording said the opposite of that to anyone reading it quickly.
- `Claude:` **A game can be set up with one player.** The two-player floor was a rule about the game being played, not about the tracker: a lone player keeping a running score, and a host opening a room before anyone has arrived, were both blocked by it. `minSetupPlayers()` now returns 1 flat and the start-game guard reads it instead of carrying its own copy of the rule, so the two can no longer disagree.
- `Claude:` **The room code hides below 640px.** The bar had room for the code and one button, so the scoring button was wrapping onto a line of its own. The code is what gives up its space rather than the button: it is still on the invite sheet, which is where anyone reading it out loud is already headed, and a button that sits on one row at some widths and two at others is worse than one that never moves.
- `Claude:` **Enter works in the score fields.** Enter moves to the next field, and on the last field it saves the round. Only the last field saves, so a keyboard entering five scores cannot submit four blanks by pressing Enter out of habit. The guard is the field's position rather than a desktop check, because a phone keyboard's Go button sends the same key.
- `Claude:` **Enter joins a room.** The join modal's code field holds the whole form, so Enter now means Join. It routes through the button's own click rather than repeating the lookup, so the disabled state that stops a double submit covers this path too.
- `Claude:` **Tab walks name to name on setup.** The colour dot is out of the tab order (`tabindex="-1"`): tabbing down a list of names should land on the next name, not stop at a swatch nobody reached for. It is still a button, so a pointer and a screen reader both still get to it.
- `Claude:` **The floating score button is marigold.** It was punch red, which is the app's danger colour and reads as a destructive control - wrong for the button standing in for Enter Score while the action bar is collapsed. It now matches the button it replaces.
- `Claude:` **The final-round announcement is a headed toast.** "FINAL ROUND" sits above the sentence in the display face, and the sentence itself loses the shouted double exclamation mark. It is the longest and most consequential thing the toast ever says and was arriving as one run-on line of bold body text. `showToast` takes an optional `title` for this, so any later notice worth a heading can have one.

### Fixed
- `Claude:` **The turn outline drifted off the column it was outlining.** The frame is an absolutely positioned overlay, measured once from the header cell it belongs to - but the columns are `max-content`, so a score going from 950 to 1,250, or a total counting up digit by digit, changes that column's width *after* the measurement was taken. The outline stayed where it was while the column moved out from under it, which the tint painted into the cells underneath made unmissable. Both the turn frame and the winner frame now follow their column via a `ResizeObserver` on the header cells, rebound on each show because the table is rebuilt wholesale on every render and the cells watched a moment ago are detached nodes.
- `Claude:` **The confetti canvas is capped at 2x device pixels.** iOS limits how large a canvas backing store may be, and past that limit the resize fails silently: the canvas keeps its old dimensions, every draw lands outside them, and the celebration is simply missing with no error anywhere. Two device pixels per CSS pixel is already past what a falling 8px rectangle can show. This is the one silent failure in that path and a plausible cause of the confetti not firing on an iPad; if it recurs there, check Settings > Accessibility > Motion > Reduce Motion, because `fireConfetti` returns immediately when that is on.

### Testing
- `Claude:` New assertions cover the ResizeObserver that keeps the column frames on their column and its rebinding, the flat one-player floor, the colour dot's `tabindex`, both Enter paths (next field, save on the last, join on the code field), the room code's mobile hide, the marigold floating button, both setup mode labels, the headed final-round toast, and the confetti DPR cap.

---

## 0.26 - 2026-08-30

Follow-up to the Pip redesign: the two screens it never got to (a splash and a 404), a reworked Enter Score sheet, an explicit away state for multiplayer, and three bug fixes.

### Added
- `Claude:` **Splash screen.** The app now opens on the Pip mark: the die spins around the centre pip while that pip steps through all eight player colours, over the caption "Whose turn is it anyway?". Design A of the staged options, and deliberately not slowed down - it is dismissed on the first painted frame (two `requestAnimationFrame` passes, with `window.load` as a backstop) rather than held for a minimum duration, so it covers the load instead of adding to it. The SVG's viewBox is square and oversized (`5 -12 122 122`) because the plate is tilted and rotating: the circle it sweeps has a radius of about 59 including the stroke, and the old box clipped the top of the die at the peak of the spin.
- `Claude:` **404 page.** `404.html` is a styled not-found screen sharing the splash's mark and the app's ambient background, with a Back to Home button. The numerals read four, the die's own centre pip, four, with the 4s pulled `-1.1em` over the plate so the three read as one group rather than three objects. `wrangler.jsonc` gains `"not_found_handling": "404-page"` so Cloudflare actually serves it, and it is cached by `sw.js` so it works offline. Marked `noindex`.
- `Claude:` **An explicit "away" state in multiplayer.** Tapping a player's name now shows a coloured connection dot: green in the game, amber away, red disconnected. Away fires about ten seconds after a device's tab goes hidden, via an explicit `presence` message on `visibilitychange` rather than by inferring a gap in the heartbeat, because background tabs throttle timers and an inferred signal would be indistinguishable from a slow network. **This is cosmetic and nothing branches on it** - a regression assertion enforces that, because `connected` gates turn skipping, round advance, the struck-out name, rejoin reservations and the abandoned-room timer, so anything reading presence would quietly shrink the five-minute grace window into a ten-second one.

### Changed
- `Claude:` **Enter Score sheet, rebuilt from the redesign mock.** The heading names the round ("Round 7") in the display face rather than carrying a dialog label. Each row leads with the player's name on the same chip the board's header uses, the field sits immediately after it, and the field being typed into is outlined in that player's own bright fill. A **New Total** column on the right projects what the total becomes if the score is saved, updating as the digits land. Save Scores leads and Cancel follows it, renamed from "Save Round". The mock's arrows, its +50/+100/+500 keys and its backspace key were dropped: they suit Farkle and fall apart in every game that needs a typed number.
- `Claude:` The whole sheet is **one grid with `display: contents` rows**, so the name column is `max-content` across all rows at once and every chip is exactly as wide as the longest name. A grid per row sizes each name column to its own name, which is what left the chips ragged. The score fields are capped at 124px with the remaining space falling to the totals column, so the gap between the two grows with the sheet rather than being a fixed guess.
- `Claude:` The projected total **counts to its new value** the way the board's totals row does, sharing `countUpTotal` rather than getting a second animator. It counts over 240ms instead of the board's 420ms and starts from whatever is on screen, so consecutive digits chain into one continuous climb; at the board's duration a fast typist outruns the number and watches it trail digits already entered. It runs under its own `turn:` key namespace, because the board's totals row may be counting under the plain board key at the same moment and the two must not hand each other cells.
- `Claude:` In **Farkle the projection rounds to the nearest 50**, through the same `normalizeFarkleScore` the save path uses and behind the same `!state.generic` guard, so it can never name a total the board will not then show.
- `Claude:` **The current-turn tint moved into the cells and under the text.** It was a fill on the frame laid over the column, which meant translucent colour sitting on top of dark score numbers and coloured name chips. Each highlighted cell is now its own stacking context (`isolation: isolate`) with the tint painted by a `z-index: -1` pseudo-element: inside a stacking context that paints after the cell's own background and before its content, which is exactly the layer the tint belongs in. Opacity dropped to 14% as well. The pseudo-element is what makes the shape possible - `background` is a shorthand carrying every layer, so a `border-radius` on the cell would have clipped the plum ground along with the tint, where the requirement was a rounded tint sitting inside square corners that still show the ground.
- `Claude:` The tint now covers the **3px rules above the totals row and below the names** (`#2d202c` and `#271b27`), which were standing out as untinted strips across the highlighted column. Absolutely positioned children lay out against the padding box, so `inset: 0` stops at the border rather than covering it; the header's tint extends by one border width downwards and the totals row's upwards.
- `Claude:` **Multiplayer scoring button** is pistachio rather than punch red - it is an action, not a warning. The player panel's three buttons sit on one row from 640px up (`display: contents` again, to let the stack's children join the parent's flex row) and stay full width below it.
- `Claude:` **The victory fanfare is now Kalimba Sparkle**, replacing round 1's Arcade Jackpot. A six-note pentatonic thumb-piano run with a shimmer tail, picked from seven fresh candidates staged in `stage/victory-fanfare-round-2.html` (Dice Cascade, Coin Shower, Tavern Whistle, Pinball Bonus, Ukulele Strum, Synthwave Riser, Kalimba Sparkle), with the shipped sound playable on the same page for comparison. `sfx.js` gains a `pluck` helper - instant attack, an octave partial dying at 45% of the body's length, and a breath of finger noise - because `tone` alone cannot give a tine its attack. The run is pentatonic deliberately: `play()` applies a random pitch variant of up to two semitones, and a scale with semitones in it would let that variant land the phrase on a dissonance.

### Fixed
- `Claude:` **A device holding several seats had every seat but its own silently dropped from a score submission.** The Worker's `canScoreFor` allowed two cases, the seat being your own and the seat having nominated you as scorer, and never checked `groupLeaderId` - the field that records a group join, where one device brings several players into the room. The batch was not rejected, only trimmed: the extra seats' scores vanished, `roundSubmitted` stayed false for them, and `findNextUnsubmittedPlayerId` handed the turn straight back to the seat whose score had just been discarded, so a guest scoring for two players entered both and was immediately asked for the second one again. Group leaders may now write their group's columns, matching what the rename and edit paths already allowed. **Requires a Worker redeploy; a static deploy alone does not ship it.**
- `Claude:` **The floating button could be left hovering over the board with the bars still visible.** `setTrackerChromeCollapsed`'s early-return read only `chrome-top-hidden`, so if the two chrome classes ever drifted apart the footer stayed collapsed for good while the top bars came back - and a locked-out floating button is painted in the neutral surface colour, so it read as a broken disabled control. The guard now reads both classes.
- `Claude:` The **sign toggle left the projected total stale.** It sets the field's value directly, which fires no event, so the listener behind the new-total column never ran. It now dispatches a bubbling `input` event.
- `Claude:` The header row of the Enter Score sheet was painting an **empty chip** - a stray rounded bar above the first plate. Its blank name cell was still matching the chip rules; those are now scoped to `:not(.turn-header-row)`.

### Testing
- `Claude:` One assertion was **superseded and rewritten rather than dropped**: "the turn highlight fill must be the rounded frame, not a square background on the cells" described the v0.25 fix for a hard-cornered block inside a rounded border. That block is now impossible for a different reason - the tint is a pseudo-element clipped to its own radius - so the assertion was rewritten onto the new source with a comment recording what it used to guard, and paired with checks that the frame itself stays transparent and that the cells carry `isolation: isolate`.
- `Claude:` New assertions cover the 404 page and its `not_found_handling`, the presence protocol (including the negative check that nothing branches on `present`), the tint's move into the cells and its border-covering insets, the scroll-tail's per-column cells, the reworked sheet's title, button order and labels, the sign toggle's `input` dispatch, the projected total's count-up and its separate key namespace, the Farkle rounding sharing the save path's function, the group-leader scoring permission, the two-class chrome guard, and the fanfare's pentatonic run and `pluck` helper. The harness now reads `style.css`, `sfx.js`, `404.html` and `wrangler.jsonc` alongside the files it already read.

---

## 0.25 - 2026-08-29

Milestone release: a major visual UI/UX rework. The Pip redesign rebuilds the app from a Claude Design handoff and adds sound. Every screen changed, so this entry is grouped by area rather than by file.

### Added
- `Claude:` **Sound.** `sfx.js` is a new procedural Web Audio layer - no audio files ship, every sound is synthesized, so the app stays offline-capable and each effect is tunable in source. Two sounds exist: a soft rising `pop` on every button press, and `victory` on a win. Both run through a five-step pitch variant picked at random per play (±2 semitones), because a button pressed twenty times in a row must not sound like the same recording twenty times. The AudioContext is created lazily on the first gesture to satisfy browser autoplay policy; before that `play()` is a silent no-op rather than an error. Master gain is capped at 0.3 and scaled by a new Volume slider in Settings, so 100% is a designed ceiling rather than raw 1.0.
- `Claude:` The victory fanfare is **Arcade Jackpot**, chosen from eight candidates staged in `stage/victory-fanfare.html` (Brass Herald, Bell Tower Peal, Arcade Jackpot, Orchestral Swell, Big Band Shout, Music Box Cascade, Drum Roll and Crash, Choir Hallelujah). The other seven are still playable there if the call needs revisiting. It fires inside the `!state.celebrated` gate beside the confetti, not at `state.gameOver = true` - `checkWin()` re-runs on every render once a game is decided, so the fanfare would otherwise replay on every repaint.
- `Claude:` App icons for the new identity: `pip-mark.svg` (master), `pip-mark-flat.svg` (favicon, unrotated for legibility under ~20px), and regenerated 192/512/apple-touch/maskable PNGs. `manifest.json` now declares the SVG at `"sizes": "any"` alongside the raster set.

### Changed
- `Claude:` **Design system.** One `pip` theme in dark (mulberry plum) and light (cream paper) modes replaces the three-theme Ember/Ocean/Forest picker; Settings now offers Display Mode and Volume only. Type is Lilita One for display and Nunito 400-900 for UI, with tabular numerals on the board. Each mode block declares the Pip token names and then maps the old semantic names (`--bg`, `--card`, `--accent`, `--radius` and the rest) onto them, so the existing stylesheet kept working through the rebuild instead of being rewritten in one pass.
- `Claude:` **One physical button model** for every control: a hard offset shadow with zero blur, and a press that moves the element down by exactly the shadow offset while the shadow collapses, so the button lands in its own shadow rather than scaling. Accent-filled controls always carry a 3px border in their own deep hue; neutral controls carry none. Hover is a `filter` only, never a transform, and is gated behind `@media (hover: hover)` so a phone shows the press and nothing else.
- `Claude:` **Eight player accents**, each paired with an ink foreground and a deep border hue. Text on an accent fill is always the dark ink, never white or cream - white on punch is 3.2:1, under the 4.5:1 floor. The lightness of the eight deliberately varies rather than being levelled; that spread, not hue, is what keeps four filled chips apart in one table header for red-green colour blindness.
- `Claude:` **Home screen.** Game tiles are accent stickers, each with its own colour and a small fixed tilt, content bottom-aligned. The logo now leads the header with "Whose turn is it anyway?" as the subtitle, replacing both the old eyebrow line and "Pick a game to get started". Coming-soon tiles stay neutral and untilted.
- `Claude:` **Player count is a die.** The setup screen's add/remove player controls are replaced by a large cream die with ± buttons: 2 to 8 players, and the pips light in each player's own colour as the count rises. Seven and eight pips are not real die faces and are used anyway, since the die is the counter, not a simulation. Name fields sit below it and survive shrinking then re-growing the count. Rotation is allowed on the die, the tiles, the chips and the floating button, and forbidden anywhere a run of comparable numbers appears - the score table, totals and standings are never tilted.
- `Claude:` **The same die runs both multiplayer paths.** Hosting shows the die and the name fields before the room is created and carries those names in as the host's seats. Joining shows a compact version of it, starting at 1 and capped to the room's remaining capacity, with distinct toasts for the three walls: the room's 8-player maximum, only one seat left, and only N seats left. This replaces the old Players dropdown.
- `Claude:` **Score board.** Zebra-striped rows with no row borders, header names as filled chips in the player's colour with a crown on the leader, and totals underlined for the leader rather than prefixed. The round column header reads "Rd." instead of "#".
- `Claude:` The **turn indicator** is now a rounded frame like the winner's, and both its outline and its translucent fill come from a single `--turn-color` custom property, so they cannot drift apart. The tint used to be a `background` on the cells themselves, which can only ever paint a hard-cornered rectangle - that is what left a square block sitting inside a rounded border.
- `Claude:` **Room bar.** Invite and Scoring are filled chips on the shared button model, jade and punch, each tilted. The Scoring button reads "Scoring" instead of the scorer's name (which was "You" on your own device and read as a label for the wrong thing); the name is still in its tooltip. The room code is a bordered pill with its prefix set as a micro label.
- `Claude:` The **Basic Rules panel is gone from setup** - it duplicated the Scoring and Custom Rules popup, which is one tap away and is where the same text already lives. The "See Scoring and Custom Rules" button remains.

### Fixed
- `Claude:` **Multiplayer seat colours were broken server-side and had been since the palette changed.** `worker/src/room.ts` still held the pre-Pip eight, a set completely disjoint from the client's, and it is used for two things: assigning a colour to each new seat, and validating every `update-color` message against an allow-list. So auto-assigned seats arrived in colours the client has no ink or border pairing for, and every manual colour change a player made was silently rejected by the server. The Worker now carries the same eight values in the same order, and a new regression assertion extracts both arrays and compares them, so they cannot diverge again. **This fix requires a Worker redeploy to take effect; a static deploy alone does not ship it.**
- `Claude:` The **Remove from Game** button was unstyled and its label looked smeared. `.btn-danger` was defined twice, and the second block sat about 600 lines after the shared button model, so every declaration it repeated won on source order: square corners, no border, an opacity hover, a `scale()` press, and `font-weight: 700` on Lilita One - a single-weight face, which the browser then synthetically bolded. It now carries only fill, ink and its deep border, inheriting everything else. Declare Current Turn was unaffected because nothing redefined `.btn-primary` later.
- `Claude:` Three controls set white text on an accent fill (`.btn-danger`, the update toast's Reload button, `.btn-delete-rule:hover`); all three now use the ink colour. The Reload button also picked up the full physical model at toast scale, so it matches Enter Score rather than being a flat pill.
- `Claude:` The **Back button** no longer squishes on narrow screens. It was the only header control without `flex-shrink: 0` - the icon-only buttons beside it were holding their width by accident of their content, not by rule.
- `Claude:` Setup colour swatches keep their visual size but take a larger tap area via a pseudo-element (40px on setup, 30px in the header), sized to stay inside the row gap so they cannot steal taps from the name field beside them. Both swatch hover scales moved inside `@media (hover: hover)`, so a tap no longer leaves one stuck enlarged on a phone.

### Testing
- `Claude:` Regression assertions superseded by this release were rewritten onto the new source rather than dropped: the group-size `<select>` and its chevron became the compact join die, `paintDieFace`, and the seats-left toast. New assertions cover the client/Worker palette parity, the fanfare's position inside the celebration gate, the turn frame's single-property fill, `.btn-back { flex-shrink: 0 }`, `.btn-danger` having exactly one standalone block that restates no shared-model property, and the Reload button's ink-on-marigold. Each new assertion was checked by temporarily violating the invariant and confirming it fails.

---

## 0.24 - 2026-08-27

### Fixed
- `Claude:` A custom game set to "Lowest wins (golf)" now actually crowns the lowest total. The direction was read with an unscoped `document.querySelector('.dir-btn.active')`, and `.dir-btn` is a shared button style the multiplayer section uses too - its active button ("Solo / Same Device") sits earlier in the document and carries no `data-dir`, so the lookup returned `undefined` and every custom game silently fell back to highest-wins. The query is now scoped to `#scoring-section .dir-btn.active[data-dir]`. The winner logic itself was already correct: crossing the target only ends the game, and the winner is then whichever total is best for the scoring direction, which in golf is usually not the player who crossed.
- `Claude:` Negative scores can now be entered on a phone. Mobile keypads have no minus key and no `inputmode` value adds one (`tel` offers + * #, `decimal` offers a period), so a ± button now sits beside each score field and flips the sign of what is typed - tapping it on an empty field leaves a bare "-" for the digits to land after. It appears only where negatives are legal: custom games and the built-in games that allow them. Both entry paths have it, the Enter Score modal and the tap-a-cell inline editor, so a mistyped cell can be corrected to a negative too. The toggle deliberately does not take focus (`preventDefault` on pointerdown and mousedown), because the inline editor commits on blur and would otherwise close before the tap landed.

### Changed
- `Claude:` Score fields are `type="text"` with `inputmode="numeric"` instead of `type="number"`. The keypad is unchanged, but a number input silently rejects the lone "-" that exists while a negative is still being typed. Consequences handled in code: `min`/`max` no longer clamp, so both entry paths clamp to ±99999 themselves, and a field holding only "-" is read as blank rather than as 0. One visible loss: Farkle's desktop spinner arrows no longer step by 50 (`step` was a number-input attribute) - entered values are unaffected, since scores are still rounded to the nearest 50 on commit.
- `Claude:` Nine regression assertions added covering both fixes: the scoped direction lookup, winner-by-best-total rather than by whoever crossed, and the sign toggle's markup, focus behaviour and parsing rules.

---

## 0.23 - 2026-08-17

### Changed
- `Claude:` Tracker bars now hide on an idle timer instead of on scroll position. The title bar, room-code bar and action bar share one collapse state and go three seconds after the last manual scroll, and any real input on the board - wheel, finger drag, or a scrolling key - brings all three back at once and restarts the countdown. The reveal deliberately hangs off input events rather than the `scroll` event: the app scrolls the board itself whenever a round lands or the turn moves, and a `scroll` listener cannot tell those apart from a person, so auto-scroll used to flash the bars back at players who never asked for them. Touch momentum counts as part of the gesture (scroll events keep the countdown alive for 150ms past the last one), so the bars no longer vanish mid-glide.
- `Claude:` Collapsing the top bars now corrects `scrollTop` by their measured height. The bars are in flow, so collapsing them grows the scrollport upwards and would slide the board up the screen even though nothing scrolled - harmless when the collapse only ever fired at a scroll edge, visible now that it fires mid-board. The action bar needs no correction, since it collapses off the bottom edge and does not move the top of the scrollport.
- `Claude:` The floating ⊕ button rests at 72% opacity (was 60%) and its glyph grew from 22px to 30px inside the same 54px circle.

### Fixed
<!-- `Claude:` Shipped into the already-released 0.23 at Ben's instruction rather than opening 0.24. -->
- `Claude:` A device holding several seats was still offered a score row for the seat whose turn ended the game. With the host on seats 1-3, the guest on 4-6 and seat 3 crossing the target, seats 4-6 finish that round and seats 1-2 take the extra turn - but the host was shown inputs for 1, 2 *and* 3, letting the crosser add to the total nobody was supposed to be able to beat by playing again. The rule was already written down in `finalLapSettled()`, which is what decides when to crown a winner; it just never fed the question of who may score. A new `finalLapClosedSeats()` derives the answer from the same trigger and turn order - once the extra round opens, every seat from the crosser onward in the crossing round's order is done - and `mpTurnEntryRun()` now skips those seats. Host-scoring rooms enter the whole round in one pass and had the same hole, so their player list is filtered through the same set.
- `Claude:` Tapping an empty cell walked around that exclusion. The score-table click handler let a host correct any cell, which in the extra round included dropping a fresh score into a closed seat's blank cell - the modal refused it, the board did not. Blank cells in the open round now honour the closed set; correcting a score that was genuinely played, the crosser's own included, still works.
- `Claude:` The your-turn card could announce a turn the app would then refuse. The Worker has no final-round concept and cycles `currentTurnPlayerId` onto whoever has not submitted, closed seats included, so `mpAnnounceTurn()` now stays quiet for them. Server-side enforcement is still absent by design and is logged in PROGRESS.md as a known gap.
- `Claude:` In solo play a crossing by the leftmost seat ended the game on the spot with no extra round at all, contradicting the FINAL ROUND toast it had just shown. The `crosserPos === 0` shortcut is multiplayer reasoning - it holds because seats answer one after another inside the round - and a solo round is entered whole, so nobody has answered the crossing yet. It is now guarded by `state.multiplayer`. Found by a review pass over the fix above, not by the original report.

### Removed
- `Claude:` The position-derived collapse logic and the oscillation guards it needed (`CHROME_EDGE_SLACK`, the `gapToEnd`/`hiddenViewport` band, `chromeBottomBarHeight`). With the decision no longer read from any measurement the collapse itself moves, there is no loop left to guard against. Their regression assertions are replaced rather than dropped: the suite now covers input-only reveal, the momentum grace period, the `scrollTop` correction, the shared collapse state, and the short-board guard.
- `Claude:` The auto-scroll's tail-row slack is unchanged, but its reason has narrowed - it exists to keep the newest round clear of the sticky totals row, no longer to avoid landing at a bottom that would summon the action bar.

## 0.22 - 2026-08-16

### Added
- `Claude:` Presence grace window in the Worker. A closing socket no longer marks its player disconnected on the spot: the room records `graceUntil = now + PRESENCE_GRACE_MS` (5 minutes) and keeps `connected: true`, so a refresh taken on your own turn, a phone that locks, or a background tab the OS throttles no longer strikes the name out of the roster, skips the turn, or leaves a ✗ in the round. A new `expireGracePeriods` alarm handler retires windows that genuinely lapse, and a single `refreshAlarm()` now schedules the earliest of the outstanding grace deadlines and the 30-minute abandoned-room deletion, replacing `updateAbandonedRoomAlarm` (removed) - one Durable Object has one alarm, so the two deadlines could not each own it. Turn advancement only skips a player once their grace has actually run out.
- `Claude:` Client keepalive and silent reconnect. The client sends a `ping` every 25s and the Worker answers `pong` (a new message type), any inbound frame counts as proof of life, a socket that has gone 75s without one is treated as half-open and force-closed, and the reconnect then backs off 1s / 2s / 4s / 8s across four attempts. A backgrounded tab also reconnects the moment it becomes visible again rather than waiting for the next timer tick, since mobile browsers freeze the timer along with the tab. Combined with the grace window, a phone that sleeps mid-game comes back to the same seat with nothing lost. Two things the retry loop gets right that are easy to get wrong: starting a retry clears only the pending timer and not the attempt budget (resetting the count each time would pin the backoff at one second and make the disconnected modal unreachable), and a deliberate close is recorded against the socket itself in a `WeakSet` rather than in a shared flag, because `close` fires a turn later - by then a replacement socket may already be live, and a late report from the old one must not stop its keepalive or trigger a reconnect.
- `Claude:` Disconnected modal. When the silent retries are exhausted the app stops pretending and shows `#modal-disconnected`, a non-dismissible alertdialog with a single Reconnect button that reloads the page, rather than a timed toast that scrolls away unseen while the room carries on without you. The saved session rejoins the room automatically on boot, so the reload is the whole recovery.
- `Claude:` Auto-scroll follows play. A new round scrolls every device down to the live row, a turn change scrolls the board horizontally to centre the current player's column, and joining or rejoining lands on the latest round and the current turn instead of round 1. With 6-8 players the active column is usually off-screen, so without this a player's own turn could arrive with nothing on screen to show it.
- `Claude:` New Game inside a live room now restarts in place. A host with at least one other player in the room keeps the same room code and the same roster, and the board returns to round 1 with every score cleared and the host holding the first turn (host-only `reset-game` message, `game-reset` broadcast, and a toast for guests so the reset is not silent). Playing a second game no longer means closing the room and re-sharing the code. Closing the room outright is still what the Back button does, and a solo host or a guest keeps the old leave behaviour.

### Changed
- `Claude:` The "Players:" label in the create/join room modal now sits directly against its dropdown instead of being pushed to the far edge of the row. With the width of the modal between them it read as a heading for everything below it rather than as the label for that one select.
- `Claude:` The toast is 10% wider (380px to 418px). The final-round announcement is the longest string the app shows and was orphaning its last word onto a line by itself.
- `Claude:` Tapping the winner banner again adds confetti instead of replacing it. The burst in flight used to be cancelled outright, so celebrating twice in a row read as an interruption rather than as more confetti. Up to three bursts now run at once, which bounds the particle count no matter how fast anyone taps. Past three the oldest is retired rather than dropped on the spot: it fades out over 350ms while the new burst is already falling, so the tap reads as adding confetti rather than deleting some. Bursts already fading do not count against the cap, or a fourth tap would retire a live burst to make room for one on its way out.
- `Claude:` Scrollbars are themed. They are drawn from the same custom properties as the rest of the app - a translucent accent thumb on a transparent track, rounded and inset - so switching theme or mode repaints them with no JS. Both the Firefox `scrollbar-width`/`scrollbar-color` form and the WebKit pseudo-elements are declared, since neither engine understands the other.
- `Claude:` The tracker's three bars now get out of the way. On a phone the title bar, the room-code bar and the Enter Score / New Game bar together claim most of the screen before a single score row is drawn, so each one collapses while the board is scrolled away from the end it belongs to: scrolled to the top you get the title and room bars, scrolled to the bottom you get the action bar, and everywhere in between the board has the full height. A board with little to scroll keeps all three pinned, since collapsing would buy nothing and could stop it overflowing at all. Honors `prefers-reduced-motion`.
- `Claude:` A pass of board animations, all of them carrying information rather than decorating. Totals count up to their new value over 420ms, so a round landing shows you who jumped rather than silently swapping the number. A new round row slides in from just above, in step with the scroll that follows it, instead of simply already being there. A score that changed since the last paint - most often another device entering theirs while you were looking elsewhere - gets a one-shot tint that fades. The turn highlight fades onto the column that just took the turn, which matters most at 6-8 players where the turn can jump right across the screen. Modal sheets rise on a snappier curve, and the round chips, back button and danger button finally take a visible press like the primary and secondary buttons always did. Every one of them is skipped outright under `prefers-reduced-motion`, including the winner banner's pop, which had never been guarded.
- `Claude:` Fixed five defects in the animation pass above, found by a review pass before any of it shipped. Solo players carry no `id` (only multiplayer seats get one), so keying the render memory on `id` collapsed every solo column onto the same entry and let one player's total count up from another player's score - solo now falls back to column index. The changed-cell flash animated `background-color`, which `.current-turn` and `.score-cell:hover` both set `!important`, so it silently did nothing on exactly the cells most worth flashing; it is now an overlay like the turn highlight, on `::before` so the two can coexist on one cell. The turn highlight's `position: relative` was applied to every cell including the sticky header and totals rows, which would have knocked them loose mid-scroll, and is now scoped to tbody. The modal sheet had no reduced-motion guard. And the reduced-motion guard on button presses was being undone by `.btn-danger:active` and `.btn-qr:active`, both declared later in the file at equal specificity - all reduced-motion rules now live in one block at the end of the stylesheet, since a media query carries no weight of its own and only source order settles it.
- `Claude:` Board animations are driven by a render-to-render diff rather than CSS transitions, because `renderTable()` rebuilds the whole table on every call and the two nodes a transition would animate between never coexist. The render remembers the previous totals, cell values, round count and current turn, and hands each freshly built node the animation class its own change earned. A board arriving whole - new game, resumed game, room joined, host reset - drops that memory first, so the first paint does not light up every cell at once.
- `Claude:` The auto-scroll now stops at the newest round instead of the bottom of the screen. Entering a score, starting a round and resuming a game all scrolled the board the whole way down, which is exactly where the action bar comes back - so the scroll that was meant to show the live round also undid the space the collapsing bar had just freed. A blank tail row under the last round provides the slack: the scroll stops that row's height short of the end, landing the newest round flush above the sticky totals row with the action bar still collapsed and the floating button still in place. Resuming a saved solo game now scrolls to the round in progress too, which only the multiplayer rejoin did before.
- `Claude:` A floating Enter Score button covers the gap the collapsing action bar leaves. It fades in exactly when that bar collapses and out when it returns, so the same action is never offered twice, and the rule is pure CSS off the same `chrome-bottom-hidden` class rather than a second scroll listener. It sits bottom left over the round-number gutter - the only column where covering a cell costs nothing - and rests at 60% opacity so the round numbers stay readable through it, going solid on touch or focus. Its height off the bottom is measured, not fixed: the sticky totals row plus the round being played, so neither is ever covered whatever the row height works out to. Clicks delegate to the real Enter Score button, which keeps the multiplayer turn lock and the toast naming whose turn it is in one place instead of deriving them twice. Three left-side treatments were staged in `stage/enter-score-fab.html` first; this is variant B.
- `Claude:` The Enter Score popup is now gated on whose turn it is. In "Each Player Enters Score" rooms a device that holds several seats (a group join, or players who nominated it as their scorer) used to be offered every one of its unsubmitted seats at once, which made it impossible to tell whose turn was actually being entered. It now offers a contiguous run starting at the current turn: the seat whose turn it is, plus each seat immediately behind it in turn order that the same device also plays, stopping dead at the first seat another device holds. A host holding players 1-3 whose third player leads off is asked for that one score; a guest holding players 4 and 5 sees both when player 4 is up and only player 5 when player 5 is up. Off-turn the button reads as locked and tapping it names whose turn it is, so nobody enters a score before their turn comes round. Host-scoring rooms are untouched - there the host still enters the whole round in one pass.
- `Claude:` The room now records which seat led each round off (`roundStarts`, parallel to `rounds`) and broadcasts it with every payload that carries rounds, plus on `turn-update`. Farkle tables roll dice to decide who goes first and the host declares that player, so turn order rotates from an arbitrary seat rather than always running left to right from column one - both the final-round rule and the Enter Score run need to know where a round actually began. Declaring a turn into a round nobody has scored in yet moves that round's start with it. Rooms persisted before this shipped are backfilled to column one, which is the order they were played in. Removing a player hands any round they led off to the next surviving seat in that round's rotation, so the recorded order survives them leaving instead of quietly collapsing back to column order.
- `Claude:` Renaming in multiplayer is no longer self-only. A player can rename their own seat, any seat they added through a group join, and the host can rename anyone, which finally makes a typo in a group member's name fixable without removing and re-adding them. The client sends `rename-self` with an explicit `playerId` instead of implying the sender, and the Worker's `handleRenamePlayer` authorizes the three cases (self, own group member, current host) server-side rather than trusting the client's own check. Guests tap a name they own to edit it inline, the same gesture the host already had.
- `Claude:` The player options sheet (host taps a player's name) is now three stacked full-width actions - Declare Current Turn, Rename Player, Remove from Game - with Cancel alone on the bottom row. Cancel previously sat beside Remove from Game, which put the destructive action and the escape hatch a thumb-width apart.

### Fixed
- `Claude:` Farkle's final round now actually happens. The game ended as soon as the row after the trigger round was created, so the extra turn the house rule promises was never played. The last lap now belongs to whoever crossed the target: if player 4 of 6 crosses, players 5 and 6 finish that round and players 1, 2 and 3 take their turn in the next one, and only then is it over. `findWinTrigger()` returns the crossing seat as well as the round it happened in, and `finalLapSettled()` decides when the lap is done - multiplayer can settle it mid-row from `mpRoundSubmitted`, skipping players who genuinely dropped out, while solo scoring still enters whole rounds at a time. The FINAL ROUND toast names the player who crossed. This supersedes the shared `roundsNeededToWin()` helper introduced in 0.21, which assumed the lap was always a whole number of rounds.
- `Claude:` The final lap is measured in turn order, not column order. The rule is "everyone who played before the crosser in that round gets one more turn", and with a declared first player those are not the same seats: if player 3 leads the round off and crosses, players 4, 5, 6, 1 and 2 all answer inside that same round, so the game ends when the round does and nobody gets a second turn. `finalLapSettled()` now takes the crosser's position from `mpTurnOrder()`, which rotates the seats from the round's recorded starter, and a crosser who led off settles the moment their round completes.

- `Claude:` Farkle no longer draws a distinction it does not have. A turn that scored something but missed the 500-point entry threshold was marked ✗ while a true Farkle was marked F, implying the two differed - at the table they do not, both bank zero. In Farkle both now read F. Games that have an entry threshold without a Farkle concept keep the ✗, where "not on the board yet" really is a state of its own.

- `Claude:` The total count-up no longer dies a few frames in. The board is rebuilt wholesale on every render, and renders fire for reasons unrelated to the number mid-count - the round completing, the turn moving on, a presence update. The second render inside the 420ms window looked up the render memory, found it already holding the new total, concluded nothing had changed and painted the final value. It was most visible on the last column, whose score is the one that completes the round and triggers the extra render, so that player's total appeared to snap while everyone else's counted. Counts in flight are now tracked by column; a render that finds one already heading for the same total hands it the new cell and leaves its clock alone, and one that finds a different target restarts from the number currently on screen rather than snapping backwards first.

- `Claude:` The tracker bars no longer strobe at the ends of the board. The action bar's visibility was decided by distance to `maxScroll`, which is measured against `clientHeight` - and revealing the bar shrinks `clientHeight` by the bar's own height, so the reveal immediately made the test read "not at the bottom any more", which hid the bar, which put the scroll back at the bottom. The answer moved the question, several times a second. The gap from `scrollTop` to the end of the content is now the measure instead, since neither term moves when a bar collapses, and it is compared against the viewport as it stands with the bar hidden - one band that both states agree on, which takes scrolling up past the bar's full height to leave rather than a single pixel. The bar's height is kept as a running maximum, because a sample taken mid-collapse catches it part-way through its transition and an under-estimate is exactly what would bring the oscillation back; it is dropped on resize and when a new game is built. The top bars needed no change: they are decided on `scrollTop` alone, which revealing them cannot alter.

### Tests
- `Claude:` Thirteen assertions for turn order: that the Worker records and broadcasts `roundStarts`, that only `openRound()` may open a round row (a count assertion, so a fourth `rounds.push` anywhere in the file fails the suite rather than silently leaving a round with no recorded starter), that declaring a turn only moves a round's start while nobody has scored in it, that a reset clears the recorded order, and on the client that `mpTurnOrder` rotates from the starter, that the Enter Score run stops at the first seat another device plays, that the off-turn toast names the current player, that the button locks off-turn, that a turn change re-evaluates the button, and that a payload from an older Worker leaves the recorded order alone rather than resetting it. The `finalLapSettled` assertion was rewritten to pin the turn-order form, and one was added for the crosser-led-off case.
- `Claude:` Assertions for the presence grace window and unified alarm, the ping/pong keepalive and reconnect backoff, the disconnected modal, the rename authorization paths, the auto-scroll on round and turn change, and the in-place `reset-game` restart. The two assertions that pinned the old `roundsNeededToWin` shape were rewritten to pin `finalLapSettled` / `findWinTrigger` instead, since the behaviour they guarded moved wholesale into those two functions. Three more pin the reconnect state machine: the retry budget surviving a retry, the per-socket `WeakSet` of deliberate closes, and the guard that makes a superseded socket's late close a no-op. All three came out of a verification pass that caught the first two as live bugs.
- `Claude:` Assertions for the Farkle F/✗ rule (both the Farkle branch and the surviving ✗ branch, so the fix cannot be over-applied to every game), for the bar-collapse measurement (the content-relative gap, the hidden-state viewport it is compared against, the running-maximum bar height, and the reset on resize), for the confetti cap and the single shared loop, and a `doesNotMatch` on the old `cancelAnimationFrame` that used to kill the burst in flight. The count-up assertion was rewritten - the guard it pinned moved onto the tracked record - and three more added for the in-flight registry.

---

## 0.21 - 2026-08-15

### Added
- `Claude:` "Your turn" announcement in multiplayer. When the turn moves to a column this device is responsible for, a centre card pops in with a shimmer running through the title text (the gradient is clipped to the glyphs and slid across), then clears itself after 2.4s; tapping it dismisses early. It fires only on an actual turn *change* into one of this device's columns, so re-renders, reconnects and other players' turns stay silent, and it is suppressed on join/rejoin, once the game is over, and while the tracker screen is not showing. Group members and players who nominated this device as their scorer count as "yours" - those read "<Name>'s turn / You enter their score" rather than "Your turn". Honors `prefers-reduced-motion`. Four variants were staged in `stage/your-turn-toast.html` first; this is variant C.

### Changed
- `Claude:` The app version now appears in the top left of the home screen, reading from the same `APP_VERSION` constant as the settings popup. Shipped in a follow-up push that deliberately kept the version at 0.21 (see the note at the end of this entry).
- `Claude:` The your-turn card dims the screen behind it while it is up, and tapping the dimmed area dismisses it the same way tapping the card does.
- `Claude:` The your-turn card no longer fires on the turn handoff that ends the game. It now guards on `mpGameDecided()`, which recomputes the outcome from the score data, rather than on `state.gameOver`: `turn-update` and `roster-update` do not run `checkWin`, so the server could push the final turn change before the round row that ends the game and the card would appear a beat before the winner banner. The final-round rule that makes this specific to Farkle (everyone gets one more round after the target is crossed, so the game is not decided the instant it is hit) moved into a shared `roundsNeededToWin()` helper used by both `checkWin` and the announcement, so the two cannot drift apart. Turns during that extra round still announce - players have to play them. `checkWin` and the game-over handler also dismiss any card still on screen so it cannot sit over the winner banner.
- `Claude:` The your-turn card's border shimmers along with its title. Both use the same keyframes and the same highlight colour (`--turn-shimmer-hi`), so one highlight appears to pass over the whole card. The border ring is a gradient rectangle masked to the 1px border band, gated behind `@supports` for mask compositing - without that support the plain accent border is kept, since the fallback would be a gradient slab across the card.
- The home screen's settings button now reuses the shared `.btn-rules` / `.btn-settings-header` styling instead of its own bespoke `.btn-settings` rules, leaving `.btn-settings-home` to carry only its absolute positioning. Keeps the gear consistent with the other header buttons.
- The multiplayer setup hint now also mentions that in "Each Player Enters Score" rooms a player can nominate someone else to score for them, which was previously only discoverable during the join flow.

### Tests
- `Claude:` Three assertions pinning the game-decided guard (the predicate itself, its use in the announcement, and the shared final-round helper) and two for the dimming backdrop.
- `Claude:` Two assertions for the home version label (present, and read from `APP_VERSION` rather than hardcoded) and two for the border shimmer (masked ring, shared keyframes).
- `Claude:` Four assertions covering the your-turn toast: that it fires only on a real turn change, that join/rejoin passes `announce: false`, that it is gated on `mpEntersScoresFor`, and that the shimmer clips its gradient to the text.

<!-- `Claude:` 0.21 covers two pushes. The second and third (home version label, border shimmer, dimming backdrop, game-decided guard; sw.js CACHE v38 then v39) were released on Ben's explicit call to leave the version number where it was, so devices already on 0.21 pick those changes up on a later reload rather than through the update toast, which compares APP_VERSION and sees no change. -->

---

## 0.20 - 2026-08-09

### Changed
- `Codex:` One device can now claim up to all 8 seats in a room, not just 4. Creating a room lets the host allocate the full table from a single device; joining caps the dropdown to the room's remaining capacity.
- `Codex:` Reordered the multiplayer create/join modal: the player-count row now sits above the name fields rather than below, under a compact "Players:" label. The explanatory hint below the fields was dropped as redundant, and the count row stays visible (with the control disabled) when only one seat is available, instead of disappearing.

### Added
- `Claude:` `tests/regressions.mjs` - a dependency-free regression harness run with `node tests/regressions.mjs`. It reads `app.js`, `index.html`, and `worker/src/room.ts` as text and asserts that previously fixed behaviour is still present, plus one real unit test of the roster-reconciliation helper via `node:vm`. Now step 0 of the pre-push gate. Guards against silently regressing behaviour that has no automated coverage otherwise.

### Fixed
- `Codex:` Added proper inset spacing for the player-count dropdown chevron.

### Docs
- `Claude:` PROGRESS.md was still describing multiplayer as unshipped with an undeployed Worker and a placeholder URL; rewritten against the current state, with detail files added for group join and the v0.19 work. Three of the six beta scope cuts recorded in `progress/multiplayer-rooms.md` (custom win score, entry threshold, past-round editing) had since been lifted and are now marked as such. CLAUDE.md gained the test suite as step 0 of the pre-push gate, the `wrangler deploy -c wrangler.toml` requirement for the Worker (without it, wrangler run from `worker/` silently redeploys the static site instead), and a cross-agent provenance convention. `tests` and `progress` are now excluded from the public static deploy via `.assetsignore`.

---

## 0.19 - 2026-08-09

### Added
- Multiplayer turn indicator: the host starts as the current turn, can tap any player name to change it, and the selected player's full score column receives a strong highlight. The highlight advances to the next player after the current player's score is submitted.
- Invite sheet replaces Show QR, with a join link, copy and native Share actions, QR code, and room code. Added a tracker-header refresh button.
- Update-available toast: when a new service-worker build activates in the background, a top-of-screen notification shows the available app version, offers Reload, and can be dismissed with its X or by tapping outside it. Reload uses a cache-busted URL so the new build is fetched immediately.
- Proxy scoring in multiplayer rooms where the host chose "each player scores their own": a joining player can nominate another player already in the room to enter scores on their behalf. The picker appears in the join flow after the name step (the roster now rides along with the room-code existence check so it can be shown before joining), and the choice can be changed at any time from the new ✍ button in the room bar. The nominated player's Enter Score modal grows a row per player they're scoring for, all submitted together, and they can correct those players' cells in past rounds too. Nominations are one level deep only: a player who is already someone else's scorer can't hand their own entry off, and a player who has nominated someone can't be nominated in turn. If a scorer leaves or is removed, everyone who nominated them falls back to entering their own scores. Not offered in host-scoring rooms, where there's nothing to delegate.
- Group join: the name step of both the create-room and join-room flows now has a "Players on this device" dropdown (1-4). Picking more than one reveals a name field per extra person, and all of them join the room together as full players with their own score columns. The device that entered them keeps score for the whole group - its Enter Score modal shows a row per person, and it can correct their cells in past rounds - so several people at one table can play from a single phone. The group is fixed at join time; the host can still remove any of them individually, and removing the person holding the device removes everyone they entered. Group members go offline and come back with that device, and a refresh or reconnect restores the whole group. Names must all be different, and a group that no longer fits the 8-player room is told how many seats are left rather than just "room full". Because the device already scores for its group, it can't also nominate someone else to enter its own scores.

### Changed
- Enter Scores now drops down from the top. Installed PWAs may rotate to any screen orientation. Farkle zeroes use a stylized `F`, including before the entry threshold is met. Host-name stars were removed.
- Once a winner is declared, the current-turn highlight disappears and one continuous animated spectrum frame surrounds the winner's full score column.

### Fixed
- Player colors can be edited during multiplayer and now persist for everyone in the room.
- Voluntarily leaving or removing a player deletes that player's historical score column immediately; later joiners receive a new empty column instead of inheriting old scores.
- The tracker refresh button now uses a cache-busted navigation so it fetches the latest deployed build instead of reopening the service worker's stale cached copy.
- Leaving a hosted room now hides the room bar immediately but gives the WebSocket leave message time to reach the Worker before closing, preventing abandoned joinable rooms.
- Same-device, same-name reconnects now use a stable device identity as a fallback when the saved player session ID is unavailable.
- Unknown newer client message types return a non-fatal error instead of closing the WebSocket, preventing static-app/Worker deployment skew from desynchronizing the host.
- Score-entry fields now start empty. Blank fields are skipped instead of becoming zero, so a player scoring for several people can submit only the scores they have; an explicitly entered `0` still records a real zero/Farkle.
- Disconnected guests now keep a same-device identity reservation for 10 minutes, allowing refresh and hard-refresh reconnects to reclaim the existing names and score columns. Expired disconnected guests are pruned when the next player joins.
- Multiplayer turn advancement skips disconnected players and players who already scored, preventing proxy-scored columns from trapping the turn indicator on an ineligible player.

---

## 0.18 - 2026-07-31

### Added
- Screen Wake Lock keeps the display on while the tracker screen is active, so mid-game score entry isn't interrupted by the device auto-locking. Re-acquires automatically if the OS releases it (app switch, screen lock) while still on the tracker. Requires a secure context (HTTPS or localhost) - won't activate over plain-HTTP LAN preview.

---

## 0.17 - 2026-07-30

### Added
- Tapping the victory banner replays the win bounce animation and confetti burst. In multiplayer, a tap by any player (host or guest) syncs the replay to everyone in the room.
- Farkle house rule: once a player crosses the winning score target, every other player gets one more full round to beat it before a winner is crowned - works identically for solo scoring, host-scoring multiplayer, and each-player-scores-their-own multiplayer, since it's derived purely from the shared round history rather than a separately tracked flag.
- Enter Scores modal (renamed from "Add Scores") now shows each player's current total (before this round) next to their score input, under a "Total" column heading and in bold, so it's visible while entering new scores instead of only after saving. Added a rules shortcut to the modal header too, since the score inputs were previously unreachable behind the modal while checking a rule.

### Fixed
- PWA installed on mobile devices failed to open ("can't reach" the URL) because `manifest.json` `start_url` pointed at `./index.html`, which Cloudflare Workers static-assets redirects (308) to `./` — standalone launch didn't follow it reliably. `start_url` now matches `./` directly.

---

## 0.16 - 2026-07-26

### Added
- Removed guest now sees a dismissable toast on the home screen ("The host has removed you from the game.") instead of a blocking alert
- Standardized toast duration to 8 seconds, with optional close button

### Changed
- Static site now hosted on Cloudflare (Workers static-assets deploy) instead of GitHub Pages

### Fixed
- Editing an earlier still-off-board round after a later round already put the player on board no longer skips the entry-threshold check

## 0.15 - 2026-07-26

### Added
- **Live-synced house rules for multiplayer rooms** - guests now see the host's edited rule text and house-rule list for the duration of the room instead of their own saved rules; a callout banner at the top of the rules sheet tells the host their rules are shared, and tells guests whose rules they're viewing. Guests get a read-only view (no edit/delete controls); everything reverts to their own saved rules on leaving the room.

### Changed
- Room code display now visually distinguishes the "Room Code:" label from the code itself, both in the room bar and the QR modal
- Rules modal's "Reset to default" button redesigned as an icon-only control

## 0.14 - 2026-07-24

### Added
- **Multiplayer Rooms** - Jackbox-style joinable rooms for remote score tracking, backed by a Cloudflare Worker + Durable Object (SQLite storage, WebSocket Hibernation API), deployed separately from the static site
  - Host declares scoring mode in setup before opening the room - each player enters their own score (default), or host scores for everyone
  - 4-letter join code, plus a QR code that deep-links straight into the app with the code pre-filled
  - Room capacity capped at 8 players; duplicate names in a lobby are rejected
  - Round auto-advances once every player has submitted, unless a player has already won
  - Players can only enter/edit their own score; host can remove a player from the scoreboard (with confirmation)
  - Reconnect support - a dropped WiFi connection or reload silently rejoins the same room as the same player
  - Beta scope: no payment gating yet (deferred to before v1.0); unavailable for Solitaire, Generic Game, and Crazy Eights; no host reassignment if the host disconnects mid-game (documented in `worker/README.md`)
- **App now deployed to Cloudflare Workers (static assets)**, separate from the public GitHub repo, so beta testers get a private link instead of a public-repo GitHub Pages URL

---

## 0.13 - 2026-07-21

### Added
- **Device back-button support** - screen changes now push into browser/PWA history, so the hardware/gesture back button navigates the same screen stack as the in-app back buttons instead of closing the app; leaving an in-progress tracker still triggers the confirmation modal
- **Collapsible Basic Rules text** - long game intros on the setup screen clamp to 4 lines with a "Show more/less" toggle
- **Per-game default player count** - each built-in game now sets its own default player count instead of always defaulting to 4
- **Solitaire single-player support** - games with `defaultPlayers: 1` (Solitaire) allow starting and playing with a single player instead of requiring a minimum of 2
- Replaced emoji gear/back icons with inline SVG icons for consistent rendering across platforms

### Fixed
- **Crazy Eights round-closer tracking** - `trackCloser` is now actually read from the game definition instead of being hardcoded to `false`, so "went out first" is flagged as intended

## 0.12 - 2026-07-20

### Added
- **Installable as a PWA** - added `manifest.json`, app icons (`icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png`), and manifest/icon/theme-color links in `index.html` so the app can be installed to a home screen or desktop; service worker cache list now includes the new assets

---

## 0.11 - 2026-07-19

### Fixed
- **Qwirkle's home-screen icon rendered as an oversized fallback glyph** - the icon used an unassigned Unicode codepoint (`&#126124;`) instead of the mahjong tile emoji, so browsers rendered it as a tall "tofu" box; swapped in the correct mahjong tile codepoint (`&#126980;`, the mahjong tile emoji)
- Restored the "More Coming" placeholder card under the Custom Games and More section, which had been dropped from the home screen

---

## 0.10 - 2026-07-19

### Added
- **Version-history snapshots for v0.06 and v0.09** - `snapshots/v0.06/` and `snapshots/v0.09/` now hold live copies of the app at those releases, filling gaps left since v0.04. v0.05, v0.07, and v0.08 were never committed as standalone states (each got folded into the following version's commit before it was pushed), so there's no accurate code to snapshot for them - the version-history timeline still lists them with their changelog summary, but says so instead of linking to a snapshot that doesn't exist

---

## 0.09 - 2026-07-19

### Added
- **10 new built-in games** - Yahtzee, Qwirkle, Cribbage, Euchre, Crazy Eights, Left Right Center, Poker, Gin Rummy, Liar's Dice, and Solitaire, each with a full intro and scoring-rules reference, joining Farkle on the home screen under new Dice/Card/Tile Game category dividers
- **Per-game score entry rules** - fixed (non-Custom) games now declare their own score step, whether negative scores are allowed, and win direction (highest or lowest total wins), instead of every non-Custom game reusing Farkle's rounding-to-50 and floor-at-zero behavior

### Fixed
- **Score entry silently corrupted non-Farkle fixed games** - the Add Turn modal and inline score editor rounded every non-Custom game's scores to the nearest 50 and blocked negative values, which is only correct for Farkle's dice combinations; other fixed games would have had small scores (e.g. Euchre's 1-4 point hands) rounded down to 0
- **Fixed games with no natural win target defaulted to a bogus 10,000-point target** - leaving the win-score field at 0 (intended as "no target," same as Custom Game supports) fell through to a hardcoded fallback instead of being honored

---

## 0.08 - 2026-07-19

### Added
- **Up to 8 players per game** (was 6) - the player color palette already had 8 colors defined but the setup screen capped adding players at 6
- **Basic Rules on the setup screen** - picking a game now goes straight to setup, with a Basic Rules panel (the game's intro) shown above the player list and a "See Scoring and Custom Rules" button that opens the full Rules modal (the ? button) for individual scoring lines and house rules. No more pop-up between the tile and setup
- **Home screen category grouping** - the Custom Game catch-all is now pinned above all category sections; Farkle sits under a new "Dice Games" divider, with a "More Coming" divider above the placeholder tile

### Changed
- **Elaborated Farkle rules** - rewrote the intro as three paragraphs covering turn order, the "still rolling!" (hot dice) mechanic, and a full worked example turn; added "still rolling" as its own rule line
- Bumped the in-app version string (Settings) to match CHANGELOG, which had drifted a release behind

### Fixed
- **System display mode didn't stick** - the Settings sheet was reading the resolved dark/light value instead of the stored preference, so the System button never showed as selected on reopen, and switching color themes while in System mode silently pinned the mode to whichever it currently resolved to. Both now read/write the actual `system` preference
- **Hard refresh resumed a game with no scores** - the auto-save resume check only looked at player count, so a brand-new game (0 rounds logged) auto-resumed on reload instead of returning to the home screen. Resume now requires at least one scored round

---

## 0.07 - 2026-07-19

### Changed
- **Forest dark theme accent color** - swapped the neon lime accent (#5ca832/#78cc44) for a muted sage green (#6b9c52/#85b869) that reads calmer against the dark background; Forest light mode is unchanged

---

## 0.06 - 2026-07-16

### Added
- **Player color customization** - the color dot next to each player is now a tappable button on both the setup screen and the active tracker header; opens a palette popover to pick a different color mid-game. Dots enlarged for easier tapping on mobile. Two new palette colors (pink, indigo) added, and Player 1's default color changed from red to blue
- **Settings button on every screen** - the gear icon now appears on the setup and tracker screens, not just Home
- **App version shown in Settings** - displayed at the bottom of the Settings sheet
- **System display mode** - Settings now include a System option (follows OS light/dark preference) alongside Dark/Light, listed first; System is the default for new visitors

### Changed
- Unified the rule-edit button styling across the built-in rules intro, scoring lines, and custom house rules into one square, rounded-corner icon button, replacing the old bullet/text-link styles
- Renamed "Custom Notes" to "Custom Rules" in the rules modal, and simplified the modal's title to a static "Game Rules"
- Restyled the delete-custom-rule button as a square, red-bordered danger button
- Swept stray em dashes into regular dashes across the app and docs

---

## 0.05 - 2026-07-09

### Added
- **Auto-save + resume** - the active game saves to `localStorage` on every change (scores, renames, house rules, win state). Closing the tab or locking the phone mid-game no longer loses the scores: reopening the app resumes the unfinished game directly on the tracker screen. Finished games are not resumed, and deliberately leaving a game (Back -> Leave) clears the save

### Fixed
- Inline score editing now applies the same entry-threshold rule as the Add Turn modal: a player not yet on the board must reach the minimum score in a single turn, otherwise the edited cell stays off the board (`✗`). Previously any edited score above 0 incorrectly put the player on the board
- Backing out of a resumed game no longer lands on an empty setup form

---

## 0.04 - 2026-07-06

Milestone release: second game type, plus win/round-tracking flair.

### Added
- **Custom Game tracker** - a freeform score sheet for games like Skyjo: name the game, log a score per player per round, no fixed rules. Selectable from a new "Custom Game" card on the home screen
- **Golf scoring toggle** - per custom game, choose "Highest wins" or "Lowest wins (golf)"; the winner banner and the totals-row 👑 leader marker both respect the direction
- **Negative round scores** in custom games (Skyjo can go below zero); the Add Turn modal and inline cell editing both accept them
- **No-limit target** - a custom game's win target can be set to 0 to just track scores with no automatic end
- **Win confetti** - a classic confetti burst (colored from the player palette) fires when a game is won, with a subtle pop on the winner banner; fires once per win and honors `prefers-reduced-motion`
- **"Track who goes out first"** - an opt-in per-custom-game toggle. When on, the Add Turn modal shows a tap-to-toggle "Who went out first?" selector, and that round's closer gets a ⚑ flag next to their score

### Fixed
- Theme class-name collision: the scoring-direction buttons shared the `.mode-btn` class and were triggering the theme handler, which wrote an invalid mode to `localStorage` and blanked the theme (white screen). Scoring buttons now use a dedicated `.dir-btn` class
- Hardened theme loading - invalid stored `theme`/`mode` values fall back to Ocean/Dark instead of leaving CSS variables unresolved

---

## 0.03 - 2026-06-30

### Added
- Service worker (`sw.js`) for PWA offline support and cache-first asset serving; cache version bumped on every push so installed Android PWAs auto-update on next launch
- Version history page (`snapshots/index.html`) - timeline of milestones with live links to each saved snapshot; snapshots stored in `snapshots/vX.XX/`

---

## 0.02 - 2026-06-28

### Added
- Color themes (Ember, Ocean, Forest) × dark/light mode; 6 CSS variable blocks; Ocean dark is the default
- Settings gear button on home screen opens a bottom-sheet theme/mode picker; preference persists in `localStorage`
- Anti-flash inline script in `<head>` applies saved theme before first paint
- Entry threshold mechanic - players must score ≥ 500 in one turn to get on the board; scores below threshold stored as `null` and shown as `✗` on an accent-tinted cell
- Inline player name editing - tap a column header to rename mid-game
- Inline score editing - tap any cell to correct a score; totals and win check recalculate immediately
- Confirmation modal when tapping Back during an active game
- Rules button on the setup screen (mirrors the tracker screen button)
- Custom house-rule notes in the rules modal (add/delete at runtime, session-only)
- Responsive breakpoints: tablet 700px, desktop 1080px
- Commissioner font (Google Fonts, weights 700/800/900)

### Changed
- Global base font size increased from 16px to 17px
- Back button styled with border + border-radius
- App subtitle styled with letter-spacing, uppercase, and decorative rule lines
- Player name inputs now have consistent vertical gap
- Not-on-board indicator changed from muted italic `—` to `✗` on accent-dim background
- Default theme changed to Ocean dark

---

## 0.01 - 2026-06-27

### Added
- Single-page app: Home → Setup → Score Tracker screens
- Farkle with running totals and configurable first-to-10,000 win condition
- Add Turn bottom-sheet modal with per-player score inputs
- Rules modal with built-in Farkle rules
- 2–6 players with distinct color-coded columns
- Winner banner on win condition reached
