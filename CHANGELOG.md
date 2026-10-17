# Changelog

## 0.1.0 (2026-10-17)

First version.

- `leaveguard(isDirty, options)` warns before the user leaves while `isDirty()` is true: on reload and tab close (`beforeunload`), on same-origin link clicks (before any router sees them), and on back/forward where the Navigation API exists.
- Saying yes once lets the page leave without a second prompt, even with several guards active.
- `useLeaveGuard(dirty, options)` React hook from `leaveguard/react`.
