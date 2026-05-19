import { useCallback } from 'react';
import type { createTourEngine } from '../engine/tourEngine';
import { useTourStore } from '../store/tourStore';
import type { Tour } from '../types';

type TourEngine = ReturnType<typeof createTourEngine>;

export function useTour(engine: TourEngine) {
  const status = useTourStore((s) => s.status);
  const currentStepIndex = useTourStore((s) => s.currentStepIndex);
  const activeTour = useTourStore((s) => s.activeTour);
  const skip = useTourStore((s) => s.skip);

  const start = useCallback((tour: Tour) => engine.start(tour), [engine]);
  const stop = useCallback(() => engine.stop(), [engine]);
  const next = useCallback(() => engine.next(), [engine]);
  const prev = useCallback(() => engine.prev(), [engine]);

  return {
    start,
    stop,
    next,
    prev,
    skip,
    status,
    currentStepIndex,
    activeTour,
    isRunning: status === 'running',
  };
}
