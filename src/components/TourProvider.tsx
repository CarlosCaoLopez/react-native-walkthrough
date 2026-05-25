import { useMemo, type ReactNode } from 'react';
import { createTourEngine } from '../engine/tourEngine';
import type { NavigationAdapter, PersistenceAdapter } from '../adapters/types';
import type { Tour } from '../types';
import { TourOverlay } from './TourOverlay';
import { useTourPersistence } from '../hooks/useTourPersistence';
import { TourContext } from '../store/tourContext';

export { useTourContext } from '../store/tourContext';

interface TourProviderProps {
  tours: Tour[];
  navigationAdapter: NavigationAdapter;
  persistence?: PersistenceAdapter;
  tapOutsideToAdvance?: boolean;
  blockOutsideTouches?: boolean;
  children: ReactNode;
}

export function TourProvider({
  tours,
  navigationAdapter,
  persistence,
  tapOutsideToAdvance,
  blockOutsideTouches,
  children,
}: TourProviderProps) {
  const engine = useMemo(
    () => createTourEngine(navigationAdapter),
    [navigationAdapter]
  );

  const toursMap = useMemo(() => new Map(tours.map((t) => [t.id, t])), [tours]);

  useTourPersistence(persistence, engine, toursMap);

  return (
    <TourContext.Provider value={{ engine, toursMap }}>
      {children}
      <TourOverlay
        tapOutsideToAdvance={tapOutsideToAdvance}
        blockOutsideTouches={blockOutsideTouches}
      />
    </TourContext.Provider>
  );
}
