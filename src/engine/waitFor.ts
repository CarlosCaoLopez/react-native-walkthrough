import type { TargetEntry } from '../store/registry';
import type { TargetId } from '../types';

type Waiter = {
  resolve: (entry: TargetEntry) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const waiters = new Map<TargetId, Waiter[]>();

export function notifyWaiters(id: TargetId, entry: TargetEntry): void {
  const pending = waiters.get(id);
  if (!pending) return;
  for (const waiter of pending) {
    clearTimeout(waiter.timer);
    waiter.resolve(entry);
  }
  waiters.delete(id);
}

export function waitFor(
  id: TargetId,
  getEntry: (id: TargetId) => TargetEntry | undefined,
  timeout: number
): Promise<TargetEntry> {
  const existing = getEntry(id);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const pending = waiters.get(id);
      if (pending) {
        const idx = pending.findIndex((w) => w.timer === timer);
        if (idx !== -1) pending.splice(idx, 1);
        if (pending.length === 0) waiters.delete(id);
      }
      reject(
        new Error(`TourTarget "${id}" not registered within ${timeout}ms`)
      );
    }, timeout);

    const waiter: Waiter = { resolve, reject, timer };
    const existing2 = waiters.get(id) ?? [];
    existing2.push(waiter);
    waiters.set(id, existing2);
  });
}
