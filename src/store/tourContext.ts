import { createContext, useContext } from 'react';
import type { createTourEngine } from '../engine/tourEngine';
import type { Tour, TourId } from '../types';

type TourEngine = ReturnType<typeof createTourEngine>;

export interface TourContextValue {
  engine: TourEngine;
  toursMap: Map<TourId, Tour>;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTourContext must be used within TourProvider');
  return ctx;
}
