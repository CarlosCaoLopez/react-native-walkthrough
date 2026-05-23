import { useMemo, type ReactNode } from 'react';
import { PortalProvider } from '@gorhom/portal';
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
  overlayLevel?: 'navigator' | 'modal' | 'system';
  tapOutsideToAdvance?: boolean;
  blockOutsideTouches?: boolean;
  children: ReactNode;
}

export function TourProvider({
  tours,
  navigationAdapter,
  persistence,
  overlayLevel = 'navigator',
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

  const hostName = overlayLevel === 'navigator' ? undefined : overlayLevel;

  return (
    <TourContext.Provider value={{ engine, toursMap }}>
      <PortalProvider>
        {children}
        <TourOverlay
          hostName={hostName}
          tapOutsideToAdvance={tapOutsideToAdvance}
          blockOutsideTouches={blockOutsideTouches}
        />
      </PortalProvider>
    </TourContext.Provider>
  );
}
