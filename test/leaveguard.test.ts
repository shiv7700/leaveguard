import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { leaveguard } from '../src/index.js';

const tick = () => new Promise((resolve) => setTimeout(resolve));
let stops: Array<() => void> = [];
let routerSaw: string[] = [];
let confirm: ReturnType<typeof vi.spyOn>;

function guard(isDirty: () => boolean, message?: string) {
  const stop = leaveguard(isDirty, { message });
  stops.push(stop);
  return stop;
}

function link(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = 'go';
  for (const [name, value] of Object.entries(attrs)) a.setAttribute(name, value);
  document.body.append(a);
  return a;
}

function click(el: Element, init: MouseEventInit = {}) {
  return el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
}

function beforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

// Stands in for a SPA router: it sees the click after leaveguard, and stops jsdom from navigating.
function router(event: Event) {
  routerSaw.push((event.target as HTMLAnchorElement).getAttribute('href') ?? '');
  event.preventDefault();
}

beforeEach(() => {
  routerSaw = [];
  confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  document.addEventListener('click', router);
});

afterEach(async () => {
  stops.forEach((stop) => stop());
  stops = [];
  document.removeEventListener('click', router);
  document.body.replaceChildren();
  vi.restoreAllMocks();
  await tick();
});

describe('beforeunload', () => {
  it('prompts only while dirty', () => {
    let dirty = false;
    guard(() => dirty);
    expect(beforeUnload()).toBe(false);
    dirty = true;
    expect(beforeUnload()).toBe(true);
  });
});

describe('link clicks', () => {
  it('asks before a same-origin link and blocks it (and the router) when declined', () => {
    guard(() => true, 'Discard your draft?');
    const a = link('/settings');
    click(a);
    expect(confirm).toHaveBeenCalledWith('Discard your draft?');
    expect(routerSaw).toEqual([]);
  });

  it('lets the link through when the user agrees, without a second prompt from beforeunload', async () => {
    confirm.mockReturnValue(true);
    guard(() => true);
    click(link('/settings'));
    expect(routerSaw).toEqual(['/settings']);
    expect(beforeUnload()).toBe(false);
    await tick();
    expect(beforeUnload()).toBe(true);
  });

  it('does nothing while clean', () => {
    guard(() => false);
    click(link('/settings'));
    expect(confirm).not.toHaveBeenCalled();
    expect(routerSaw).toEqual(['/settings']);
  });

  it.each([
    ['a new tab', () => click(link('/a', { target: '_blank' }))],
    ['a download', () => click(link('/a', { download: '' }))],
    ['a hash on this page', () => click(link('#section'))],
    ['another origin', () => click(link('https://example.com/'))],
    ['a modified click', () => click(link('/a'), { ctrlKey: true })],
    ['a middle click', () => click(link('/a'), { button: 1 })],
    ['a click on plain text', () => click(document.body.appendChild(document.createElement('p')))],
  ])('ignores %s', (_, run) => {
    guard(() => true);
    run();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('finds the link from a click on its child', () => {
    guard(() => true);
    const span = link('/a').appendChild(document.createElement('span'));
    click(span);
    expect(confirm).toHaveBeenCalledOnce();
  });
});

describe('Navigation API', () => {
  let navigation: EventTarget;

  beforeEach(() => {
    navigation = new EventTarget();
    Object.defineProperty(window, 'navigation', { value: navigation, configurable: true });
  });

  afterEach(() => {
    delete (window as { navigation?: unknown }).navigation;
  });

  function navigate(init: Partial<Record<'navigationType' | 'userInitiated' | 'hashChange' | 'downloadRequest' | 'sameDocument' | 'cancelable', unknown>> = {}) {
    const { cancelable = true, sameDocument = true, ...rest } = init;
    const event = Object.assign(new Event('navigate', { cancelable: cancelable as boolean }), {
      navigationType: 'traverse',
      userInitiated: true,
      hashChange: false,
      downloadRequest: null,
      destination: { sameDocument },
      ...rest,
    });
    navigation.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it('asks before back/forward and cancels when declined', () => {
    guard(() => true);
    expect(navigate()).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('lets back/forward through when the user agrees', () => {
    confirm.mockReturnValue(true);
    guard(() => true);
    expect(navigate()).toBe(false);
  });

  it('guards back/forward started by code too', () => {
    guard(() => true);
    expect(navigate({ userInitiated: false })).toBe(true);
  });

  it.each([
    ["a router's own pushState", { navigationType: 'push', userInitiated: false }],
    ['a hash change', { hashChange: true }],
    ['a download', { downloadRequest: '' }],
    ['a cross-document navigation (beforeunload asks instead)', { sameDocument: false }],
    ['an event that cannot be canceled', { cancelable: false }],
  ])('ignores %s', (_, init) => {
    guard(() => true);
    expect(navigate(init)).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('does nothing while clean', () => {
    guard(() => false);
    expect(navigate()).toBe(false);
  });

  it('stop() removes the navigate listener', () => {
    guard(() => true)();
    expect(navigate()).toBe(false);
  });
});

describe('several guards', () => {
  it('ask once in total when the user agrees', () => {
    confirm.mockReturnValue(true);
    guard(() => true);
    guard(() => true);
    click(link('/a'));
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('a clean guard does not block a dirty one', () => {
    guard(() => false);
    guard(() => true);
    expect(beforeUnload()).toBe(true);
  });

  it('stopping one leaves the other working', () => {
    const stopFirst = guard(() => true);
    guard(() => true);
    stopFirst();
    expect(beforeUnload()).toBe(true);
  });
});

it('stop() removes every listener', () => {
  guard(() => true)();
  click(link('/a'));
  expect(confirm).not.toHaveBeenCalled();
  expect(beforeUnload()).toBe(false);
});
