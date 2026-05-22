import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';
import type { TargetLayout } from '../types';

const MEASURE_TIMEOUT = 300;
const MEASURE_RETRIES = 3;
const RETRY_DELAY = 100;

async function attemptMeasure(
  node: ComponentRef<typeof View>
): Promise<TargetLayout | null> {
  if (typeof (node as any).getBoundingClientRect === 'function') {
    const rect = (node as any).getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }
  return new Promise<TargetLayout | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), MEASURE_TIMEOUT);
    (node as any).measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        clearTimeout(timer);
        resolve({ x, y, width, height });
      }
    );
  });
}

export async function measureWithRetry(
  ref: RefObject<ComponentRef<typeof View> | null>
): Promise<TargetLayout> {
  for (let attempt = 0; attempt <= MEASURE_RETRIES; attempt++) {
    const node = ref.current;
    if (node) {
      const layout = await attemptMeasure(node);
      if (layout) return layout;
    }
    if (attempt < MEASURE_RETRIES) {
      await new Promise<void>((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error('measureWithRetry: failed to measure target after retries');
}
