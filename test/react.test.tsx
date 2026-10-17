import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useLeaveGuard } from '../src/react.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function beforeUnload() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

function Form({ dirty }: { dirty: boolean }) {
  useLeaveGuard(dirty);
  return null;
}

afterEach(() => vi.restoreAllMocks());

it('guards while dirty and stops when clean or unmounted', () => {
  const root = createRoot(document.createElement('div'));
  act(() => root.render(<Form dirty={false} />));
  expect(beforeUnload()).toBe(false);
  act(() => root.render(<Form dirty />));
  expect(beforeUnload()).toBe(true);
  act(() => root.render(<Form dirty={false} />));
  expect(beforeUnload()).toBe(false);
  act(() => root.render(<Form dirty />));
  act(() => root.unmount());
  expect(beforeUnload()).toBe(false);
});
