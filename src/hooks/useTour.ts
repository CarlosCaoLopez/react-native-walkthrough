import { useCallback } from 'react';
import { useTourContext } from '../components/TourProvider';
import { useTourStore } from '../store/tourStore';
import type { TourId } from '../types';

export function useTour() {
  const { engine, toursMap } = useTourContext();
  const status = useTourStore((s) => s.status);
  const currentStepIndex = useTourStore((s) => s.currentStepIndex);
  const activeTour = useTourStore((s) => s.activeTour);
  const skip = useTourStore((s) => s.skip);

  const start = useCallback(
    (tourId: TourId) => {
      const tour = toursMap.get(tourId);
      if (!tour) throw new Error(`Tour "${tourId}" not found`);
      return engine.start(tour);
    },
    [engine, toursMap]
  );
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
