# AGENTS.md

## Cursor Cloud specific instructions

### What this project is
`moa-goods-maker` (모아 굿즈메이커) is a **client-side only** goods-design tool. There is **no backend, database, or external service** — all image processing runs locally in the Electron renderer / browser. See `README.md` for the product overview and `package.json` for scripts.

### Running the app (dev)
- Desktop (primary): `npm start` (runs `electron .`, loads `app/index.html`).
- In this cloud VM, Electron must run against the Desktop display and needs the container sandbox disabled:
  - Run with `ELECTRON_DISABLE_SANDBOX=1 npm start -- --no-sandbox` on `DISPLAY=:1`.
  - Harmless noise you can ignore in logs: `Failed to connect to the bus` (no D-Bus in container) and `Exiting GPU process due to errors` (Electron falls back to software rendering and the window still shows). Successful boot logs include `페이지 로드 완료` (page load complete) and `창 표시됨` (window shown).
  - Boot diagnostics are written to `$TMPDIR/moa-goods-maker-boot.log`.
- Web version (no Electron needed): open `app/index.html` or the self-contained `모아굿즈메이커_단일파일.html` in a browser. All JS libs are vendored under `app/` (ag-psd, jszip, jspdf), so no network/CDN is required.

### Lint / test / build
- **No lint script and no automated tests exist** (no `test`/`lint` in `package.json`, no test framework). Do not expect `npm test` to work.
- Build (production, not needed for dev): `npm run dist` (Windows), `npm run dist:mac`, `npm run dist:linux`. Packaging via electron-builder; CI (`.github/workflows/build.yml`) only builds on `v*` tags. Building is not required to develop or verify functionality.

### Testing changes
Core flow to verify manually: launch the app, upload a transparent PNG, and confirm a cutline (칼선) outline is auto-generated in the preview; optionally export PSD/PDF/SVG/ZIP. UI-affecting changes should be verified against the running app on the Desktop display.
