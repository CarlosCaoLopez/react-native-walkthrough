import type { RefObject } from 'react';
import type { View } from 'react-native';
import type { TargetId, TargetLayout } from '../types';
import { notifyWaiters, waitFor as _waitFor } from '../engine/waitFor';

export interface TargetEntry {
  ref: RefObject<View>;
  layout?: TargetLayout;
  onLayoutChange?: (layout: TargetLayout) => void;
}

const targets = new Map<TargetId, TargetEntry>();

function register(id: TargetId, ref: RefObject<View>): void {
  const entry: TargetEntry = { ref };
  targets.set(id, entry);
  notifyWaiters(id, entry);
}

function unregister(id: TargetId): void {
  targets.delete(id);
}

function get(id: TargetId): TargetEntry | undefined {
  return targets.get(id);
}

function waitFor(id: TargetId, timeout: number): Promise<TargetEntry> {
  return _waitFor(id, targets.get.bind(targets), timeout);
}

export const registry = { register, unregister, get, waitFor };
