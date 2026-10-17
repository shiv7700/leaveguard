<div align="center">

# leaveguard

**Warn before users leave with unsaved changes: on reload, tab close, link clicks and back/forward in single-page apps. Zero dependencies, any framework.**

[![npm version](https://img.shields.io/npm/v/leaveguard.svg)](https://www.npmjs.com/package/leaveguard)
[![bundle size](https://img.shields.io/bundlephobia/minzip/leaveguard)](https://bundlephobia.com/package/leaveguard)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](package.json)
[![types](https://img.shields.io/npm/types/leaveguard)](src/index.ts)
[![license](https://img.shields.io/npm/l/leaveguard.svg)](#license)

**[▶ Try the live demo](https://shiv7700.github.io/leaveguard/)**

</div>

---

## Why leaveguard?

A user spends ten minutes on a form, clicks a link by accident, and it's all gone. `beforeunload` only catches reloads and tab closes. Router blockers only catch that router's navigation, and every framework has a different one.

- 🚪 **Every way out.** Reload, tab close, same-origin link clicks and back/forward.
- 🧭 **Before your router.** Link clicks are checked before React Router, Vue Router, Angular or any other router sees them.
- 🙋 **One prompt, not two.** Say yes once and the page leaves, even with several guards active.
- 🧩 **Works with any framework.** One function, plus a React hook.
- 🪶 **Tiny.** About 0.7 kB minified and gzipped, with zero dependencies.
- 🔷 **TypeScript.** Types are included.

## Use cases

- 📝 **Forms and settings pages** with a Save button.
- ✍️ **Editors:** posts, emails, notes, code.
- 🛒 **Long flows:** checkouts, onboarding, wizards.

## Installation

```sh
npm install leaveguard
```

## Quick start

```js
import { leaveguard } from 'leaveguard';

let dirty = false;
form.addEventListener('input', () => (dirty = true));
form.addEventListener('submit', () => (dirty = false));

const stop = leaveguard(() => dirty, { message: 'Discard your changes?' });

// Later, when the form goes away:
stop();
```

leaveguard calls your function at the moment the user tries to leave, so it always sees the current state. Set your dirty flag back to `false` when the user saves, or the save itself may ask.

## Framework guides

### React

```jsx
import { useLeaveGuard } from 'leaveguard/react';

function Editor({ saved }) {
  const [text, setText] = useState(saved);
  useLeaveGuard(text !== saved);
  return <textarea value={text} onChange={(e) => setText(e.target.value)} />;
}
```

### Vue

```js
const dirty = ref(false);
let stop;
onMounted(() => (stop = leaveguard(() => dirty.value)));
onUnmounted(() => stop());
```

### Svelte 5

```js
let dirty = $state(false);
$effect(() => leaveguard(() => dirty));
```

### Angular

```ts
export class EditorComponent implements OnDestroy {
  form = inject(FormBuilder).group({ title: '' });
  private stop = leaveguard(() => this.form.dirty);
  ngOnDestroy() { this.stop(); }
}
```

## API

### `leaveguard(isDirty, options?) => stop`

| Argument | Type | Description |
| --- | --- | --- |
| `isDirty` | `() => boolean` | Called when the user tries to leave. Return `true` to ask first. |
| `options.message` | `string` | Text for the confirm dialog on link clicks and back/forward. Default: `"You have unsaved changes. Leave anyway?"` |

Returns `stop()`, which removes the guard. You can run several guards at once. Each has its own `isDirty`, and the user is asked at most once per navigation.

### `useLeaveGuard(dirty, options?)` from `leaveguard/react`

Guards the page while `dirty` is `true`. It cleans up on unmount.

## What's guarded

| The user… | Guarded by | Dialog |
| --- | --- | --- |
| Reloads, closes the tab, types a URL, follows a link to another site | `beforeunload` | The browser's own. Custom text is ignored by every modern browser. |
| Clicks a same-origin link (SPA route or normal page) | Click listener on `window`, capture phase | `confirm(message)` |
| Presses Back/Forward inside your app | Navigation API `navigate` event | `confirm(message)` |

Not guarded, on purpose:

- **Links that open elsewhere:** `target="_blank"`, downloads, Ctrl/Cmd/Shift/Alt-clicks, middle clicks and `#hash` links on the same page.
- **Navigation started in code**, like `router.push('/x')` after a button click. Canceling a router's `pushState` leaves the URL behind while the router renders the new page. Check your dirty state before navigating in code, or use your router's own blocker for these.

## Browser support

- Reload, tab close and link clicks: all modern browsers.
- Back/forward inside the app: browsers with the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API). Elsewhere it's skipped without errors.

## FAQ

**Why doesn't my message show when I reload?** Browsers stopped showing custom `beforeunload` text years ago, to stop scam pages. Your message is used for link clicks and back/forward.

**Does it work with my router?** Link clicks are checked before any router (the listener is on `window` in the capture phase). If the user declines, the router never sees the click.

**Why do I sometimes see no dialog on reload?** Chrome only shows the `beforeunload` dialog after the user has interacted with the page.

## Contributing

See [AGENTS.md](AGENTS.md). Run `npm run typecheck && npm test` before opening a PR.

## License

MIT © Shivang Ramola
