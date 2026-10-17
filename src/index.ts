export interface LeaveguardOptions {
  /** Shown in the confirm dialog for in-app navigation. Browsers ignore custom text on reload and tab close. */
  message?: string;
}

const DEFAULT_MESSAGE = 'You have unsaved changes. Leave anyway?';

// Shared by every guard: once the user agrees to leave, no other guard (or the
// beforeunload that follows a link click in the same task) asks again.
let leaving = false;

function approveLeave(): void {
  leaving = true;
  setTimeout(() => (leaving = false));
}

function ask(message: string): boolean {
  if (leaving) return true;
  const ok = window.confirm(message);
  if (ok) approveLeave();
  return ok;
}

function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function findLink(event: MouseEvent): HTMLAnchorElement | undefined {
  return event.composedPath().find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement && el.hasAttribute('href'));
}

/** True for a same-origin link that navigates this tab away from the current page. */
function leavesPage(link: HTMLAnchorElement): boolean {
  if (link.hasAttribute('download')) return false;
  if (link.target && link.target !== '_self') return false;
  const url = new URL(link.href, location.href);
  // Cross-origin links unload the page, so beforeunload covers them.
  if (url.origin !== location.origin) return false;
  const samePage = url.pathname === location.pathname && url.search === location.search;
  return !(samePage && url.hash !== '');
}

interface NavigateEventLike extends Event {
  readonly cancelable: boolean;
  readonly navigationType: 'push' | 'replace' | 'reload' | 'traverse';
  readonly userInitiated: boolean;
  readonly hashChange: boolean;
  readonly downloadRequest: string | null;
  readonly destination: { readonly sameDocument: boolean };
}

/** In-app navigations a guard should stop: back/forward and user-started pushes inside the same document. */
function shouldGuardNavigate(event: NavigateEventLike): boolean {
  if (!event.cancelable || event.hashChange || event.downloadRequest !== null) return false;
  // Cross-document navigations fire beforeunload, which already asks.
  if (!event.destination.sameDocument) return false;
  // Canceling a router's own pushState leaves the URL behind while the router renders the new page.
  return event.navigationType === 'traverse' || event.userInitiated;
}

/**
 * Warn before the user leaves while `isDirty()` is true: on reload and tab close,
 * on same-origin link clicks (before your router sees them), and on back/forward
 * where the Navigation API exists. Returns a function that removes the guard.
 */
export function leaveguard(isDirty: () => boolean, options: LeaveguardOptions = {}): () => void {
  const message = options.message ?? DEFAULT_MESSAGE;

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (leaving || !isDirty()) return;
    event.preventDefault();
    // Older browsers only prompt when returnValue is set.
    event.returnValue = '';
  };

  const onClick = (event: MouseEvent) => {
    if (!isPlainClick(event) || !isDirty()) return;
    const link = findLink(event);
    if (!link || !leavesPage(link) || ask(message)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const onNavigate = (event: Event) => {
    const navigate = event as NavigateEventLike;
    if (!shouldGuardNavigate(navigate) || !isDirty() || ask(message)) return;
    navigate.preventDefault();
  };

  const navigation = (window as { navigation?: EventTarget }).navigation;
  window.addEventListener('beforeunload', onBeforeUnload);
  // Capture on window runs before any router's click handler.
  window.addEventListener('click', onClick, true);
  navigation?.addEventListener('navigate', onNavigate);

  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    window.removeEventListener('click', onClick, true);
    navigation?.removeEventListener('navigate', onNavigate);
  };
}
