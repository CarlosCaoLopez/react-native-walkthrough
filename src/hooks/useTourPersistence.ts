import { useEffect } from 'react';
import { useTourStore } from '../store/tourStore';
import type { PersistenceAdapter } from '../adapters/types';
import type { Tour, TourId } from '../types';

type TourEngine = { runStep(index: number): Promise<void> };

const PERSISTENCE_KEY = 'rn-walkthrough:progress';

export function useTourPersistence(
  persistence: PersistenceAdapter | undefined,
  engine: TourEngine,
  toursMap: Map<TourId, Tour>
): void {
  useEffect(() => {
    if (!persistence) return;
    (async () => {
      const raw = await persistence.get(PERSISTENCE_KEY);
      if (!raw) return;
      try {
        const { tourId, stepIndex } = JSON.parse(raw) as {
          tourId: TourId;
          stepIndex: number;
        };
        const tour = toursMap.get(tourId);
        if (!tour) return;
        useTourStore.setState({
          activeTour: tour,
          currentStepIndex: stepIndex,
          status: 'running',
          activeLayout: null,
        });
        await engine.runStep(stepIndex);
      } catch {
        // corrupted data — ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!persistence) return;
    return useTourStore.subscribe((state) => {
      if (state.status === 'running' && state.activeTour) {
        persistence.set(
          PERSISTENCE_KEY,
          JSON.stringify({
            tourId: state.activeTour.id,
            stepIndex: state.currentStepIndex,
            status: state.status,
          })
        );
      } else if (state.status === 'idle' || state.status === 'completed') {
        persistence.remove(PERSISTENCE_KEY);
      }
    });
  }, [persistence]);
}
