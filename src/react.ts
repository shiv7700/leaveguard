import { useEffect } from 'react';
import { leaveguard, type LeaveguardOptions } from './index.js';

/** Guards the page while `dirty` is true. */
export function useLeaveGuard(dirty: boolean, options: LeaveguardOptions = {}): void {
  const { message } = options;
  useEffect(() => (dirty ? leaveguard(() => true, { message }) : undefined), [dirty, message]);
}
