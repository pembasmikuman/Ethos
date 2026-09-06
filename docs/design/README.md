# Ethos design mockups

Static HTML mockups of the app screens, dark and light.

- `gen.ts` builds the six `*.dc.html` files. Run `bun run gen.ts` for dark, `THEME=light bun run gen.ts` for light.
- `shot.ts` screenshots them through Obscura (`obscura serve --port 9222` first). Needs `playwright-core`.
- Open any `.dc.html` in a browser to view.

## Language
- Type: Doto (round dot-matrix) for numbers and titles, JetBrains Mono caps for labels. Both from Google Fonts.
- Accent `#FF4D1C` only on things that need action: done checks, overload flag, start button, timer progress.
- Dark `#0A0A0B` / `#141416` cards. Light `#EDEAE4` / `#F7F5F1` cards. Same structure, ink swaps.
- Dot graphics carry data (timer ring, weekly volume columns), never decoration.
- Keys and rows 56px, checkbox 44px. Readable from the floor.
