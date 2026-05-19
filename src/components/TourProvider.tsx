import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { PortalProvider } from '@gorhom/portal';
import { createTourEngine } from '../engine/tourEngine';
import { useTourStore } from '../store/tourStore';
import type { NavigationAdapter, PersistanceAdapter } from '../adapters/types';
import type { Tour, TourId } from '../types';
import { TourOverlay } from './TourOverlay';

const PERSISTENCE_KEY = 'rn-walkthrough:progress';

type TourEngine = ReturnType<typeof createTourEngine>;

interface TourContextValue {
  engine: TourEngine;
  toursMap: Map<TourId, Tour>;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTourContext must be used within TourProvider');
  return ctx;
}

interface TourProviderProps {
  tours: Tour[];
  navigationAdapter: NavigationAdapter;
  persistence?: PersistanceAdapter;
  overlayLevel?: 'navigator' | 'modal' | 'system';
  tapOutsideToAdvance?: boolean;
  children: ReactNode;
}

export function TourProvider({
  tours,
  navigationAdapter,
  persistence,
  overlayLevel = 'navigator',
  tapOutsideToAdvance,
  children,
}: TourProviderProps) {
  const engine = useMemo(
    () => createTourEngine(navigationAdapter),
    [navigationAdapter]
  );

  const toursMap = useMemo(() => new Map(tours.map((t) => [t.id, t])), [tours]);

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
          })
        );
      } else if (state.status === 'idle' || state.status === 'completed') {
        persistence.remove(PERSISTENCE_KEY);
      }
    });
  }, [persistence]);

  const hostName = overlayLevel === 'navigator' ? undefined : overlayLevel;

  return (
    <TourContext.Provider value={{ engine, toursMap }}>
      <PortalProvider>
        {children}
        <TourOverlay
          hostName={hostName}
          tapOutsideToAdvance={tapOutsideToAdvance}
        />
      </PortalProvider>
    </TourContext.Provider>
  );
}
