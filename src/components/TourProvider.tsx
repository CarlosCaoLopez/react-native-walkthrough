import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { PortalProvider } from '@gorhom/portal';
import { createTourEngine } from '../engine/tourEngine';
import type { NavigationAdapter, PersistenceAdapter } from '../adapters/types';
import type { Tour, TourId } from '../types';
import { TourOverlay } from './TourOverlay';
import { useTourPersistence } from '../hooks/useTourPersistence';

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
  persistence?: PersistenceAdapter;
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

  useTourPersistence(persistence, engine, toursMap);

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
