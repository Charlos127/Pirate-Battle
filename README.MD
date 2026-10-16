# Pirate Battle

2D top-down naval shooter built with React, TypeScript (strict), PixiJS, TanStack Query, Axios, MSW and Playwright.

**Live demo:** https://pirate-battle-bay-sigma.vercel.app/

## Setup

```bash
npm ci
npm run dev        # development
npm run build      # production build
npm run preview    # serve the build on :4173
npm run lint
npm run typecheck
npm test           # unit/integration (Vitest)
npm run e2e        # Playwright (desktop + mobile, Chromium)
npm run e2e:report # open HTML report
```

Environment variables: `VITE_API_TIMEOUT_MS` (default 5000), `VITE_E2E=1` (enables test hooks).

## Assets

Game art and sounds come from the challenge pack (`assets/`), copied to `public/assets/`:
`png/default` (1x) and `png/retina` (2x, chosen automatically when DPR >= 1.5), `sounds/` and `ui_scene_background.png`.
Sprite choices live in `src/game/render/assets.ts` (`MANIFEST`). See `LICENSES.md` for credits.

## Controls

| Action                 | Keyboard                                 | Touch                  |
| ---------------------- | ---------------------------------------- | ---------------------- |
| Move forward           | ↑ / W                                    | ▲                      |
| Rotate                 | ← → / A D                                | ⟲ ⟳                    |
| Front shot             | Space                                    | Fire front             |
| Left / right broadside | Q / E                                    | Fire left / Fire right |
| Pause                  | Pause button (also on blur / hidden tab) | Pause                  |

Supported mobile orientation: landscape.

## Gameplay configuration

All balance values live in `src/game/core/config.ts` (`DEFAULT_CONFIG`). Player options: session 60–180 s, spawn interval 0.5–10 s.

## Network scenarios (MSW)

Select with `?scenario=<name>&seed=<n>` or the debug panel (`?debug=1`). Reset data with _Reset mock data_.
`success, empty, multi-page, slow, jitter, out-of-order, timeout, network-error, http-400, http-500, ranking-fails, history-fails, timeout-after-register, down-then-recover`

## Reproducing failures

<one example per scenario>

## Reports

`docs/PERFORMANCE.md`, `playwright-report/`, `ARCHITECTURE.md`. Asset/font licenses: `LICENSES.md`.
