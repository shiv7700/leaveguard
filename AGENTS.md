# AGENTS.md

This is the guide for anyone working on this repo, human or AI agent. `CLAUDE.md` imports this file.

## What this is

**leaveguard** is an npm package. It warns before the user leaves a page with unsaved changes: on reload and tab close (`beforeunload`), on same-origin link clicks, and on back/forward (Navigation API). It has zero runtime dependencies and works with any frontend framework. A thin React hook lives at `leaveguard/react`.

## Commands

```sh
npm test            # vitest + jsdom
npm run typecheck   # tsc --noEmit
npm run build       # tsc → dist/
```

To try it in a real browser: run `npm run build`, serve the repo root (`python3 -m http.server`), and open `/docs/`.

## Layout

```
src/
  index.ts     leaveguard(isDirty, options) → stop. beforeunload, link-click guard, Navigation API guard.
  react.ts     useLeaveGuard(dirty, options), a thin wrapper over index.ts
test/          one test file per source file
docs/          landing page and live demo (GitHub Pages), loads ../dist/ on localhost
```

## How it decides

- **Reload, tab close, other origins:** `beforeunload`. Browsers show their own text; custom messages are ignored.
- **Same-origin link clicks:** a capture-phase click listener on `window`, so it runs before any router. Declining calls `preventDefault()` and `stopImmediatePropagation()`, so the router never sees the click.
- **Back/forward:** the Navigation API `navigate` event, for same-document traversals.
- **Programmatic `pushState`/`replaceState` is never canceled.** Chrome cancels it silently (no exception), so the URL stays while the router renders the new page. Routers need their own blocker for navigation started in code.
- **One prompt:** after the user says yes, a shared flag skips every other prompt until the next task. Link clicks run `navigate` and `beforeunload` inside the click task (checked in Chrome), so the flag covers them.

## Rules

These hold for every change.

1. **No runtime dependencies.** `dependencies` in package.json stays empty. React is an optional peer, used only by `src/react.ts`.
2. **No framework code in the core.** `src/index.ts` imports nothing. Framework adapters stay thin and only import the core.
3. **Never change the user's DOM.** The guard only listens.
4. **Degrade, don't break.** Without the Navigation API, links and reload are still guarded; only back/forward isn't.
5. **`stop()` removes every listener.** Guards are independent: stopping one never affects another.
6. **Keep the API small.** Every new option needs a real use case. Say no by default.
7. **Tests cover behavior.** New behavior gets a test in `test/`. jsdom has no Navigation API, so tests stub it. Dialog and history behavior must also be checked in `docs/` with a real browser.

## Code style

- TypeScript strict mode, ESM, and `.js` extensions in relative imports (required by NodeNext).
- Small named functions. Write a comment only when the code can't explain *why*.
- If you take a known shortcut, mark it: `// shortcut: <the limit>, <when to upgrade>`.

## Keeping docs current

Docs are part of the change, not a follow-up:

- **User-facing behavior changed?** Update `README.md`, `CHANGELOG.md` and the demo in `docs/index.html`.
- **Made a design choice?** Add it to "How it decides" above.
- **Moved or added files?** Update the layout above.

## Git

Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
