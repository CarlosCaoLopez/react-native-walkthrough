import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { TargetId, TargetLayout } from '../types';

export interface TargetEntry {
  ref: RefObject<View>;
  layout?: TargetLayout;
  onLayoutChange?: (layout: TargetLayout) => void;
}

type Waiter = {
  resolve: (entry: TargetEntry) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const targets = new Map<TargetId, TargetEntry>();
const waiters = new Map<TargetId, Waiter[]>();

function register(id: TargetId, ref: RefObject<View>): void {
  const entry: TargetEntry = { ref };
  targets.set(id, entry);

  const pending = waiters.get(id);
  if (pending) {
    for (const waiter of pending) {
      clearTimeout(waiter.timer);
      waiter.resolve(entry);
    }
    waiters.delete(id);
  }
}

function unregister(id: TargetId): void {
  targets.delete(id);
}

function get(id: TargetId): TargetEntry | undefined {
  return targets.get(id);
}

function waitFor(id: TargetId, timeout: number): Promise<TargetEntry> {
  const existing = targets.get(id);
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
    const pending = waiters.get(id) ?? [];
    pending.push(waiter);
    waiters.set(id, pending);
  });
}

export const registry = { register, unregister, get, waitFor };
