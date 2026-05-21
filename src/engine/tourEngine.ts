import type { TargetEntry } from '../store/registry';
import type { NavigationAdapter } from '../adapters/types';
import { registry } from '../store/registry';
import { useTourStore } from '../store/tourStore';
import type { TargetId, Tour } from '../types';

const WAIT_TIMEOUT = 4000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

async function waitForWithRetry(
  id: TargetId,
  retries: number
): Promise<TargetEntry> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await registry.waitFor(id, WAIT_TIMEOUT);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise<void>((r) => setTimeout(r, RETRY_DELAY));
    }
  }
  throw new Error(`TourTarget "${id}" not registered after ${retries} retries`);
}

async function runStep(
  stepIndex: number,
  adapter: NavigationAdapter
): Promise<void> {
  const { activeTour } = useTourStore.getState();
  if (!activeTour) return;

  const step = activeTour.steps[stepIndex];
  if (!step) return;

  if (step.route && adapter.getCurrentRoute() !== step.route) {
    await adapter.navigate(step.route);
  }

  const entry = await waitForWithRetry(step.target, MAX_RETRIES);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      entry.ref.current?.measureInWindow((x, y, width, height) => {
        useTourStore.getState().setLayout({ x, y, width, height });
        resolve();
      });
    });
  });
}

export function createTourEngine(adapter: NavigationAdapter) {
  return {
    async start(tour: Tour): Promise<void> {
      useTourStore.getState().start(tour);
      try {
        await runStep(0, adapter);
      } catch (err) {
        useTourStore.getState().stop();
        throw err;
      }
    },

    stop(): void {
      useTourStore.getState().stop();
    },

    async next(): Promise<void> {
      useTourStore.getState().next();
      const { status, currentStepIndex } = useTourStore.getState();
      if (status !== 'running') return;
      try {
        await runStep(currentStepIndex, adapter);
      } catch (err) {
        useTourStore.getState().stop();
        throw err;
      }
    },

    async prev(): Promise<void> {
      useTourStore.getState().prev();
      const { currentStepIndex } = useTourStore.getState();
      try {
        await runStep(currentStepIndex, adapter);
      } catch (err) {
        useTourStore.getState().stop();
        throw err;
      }
    },

    runStep: (stepIndex: number) => runStep(stepIndex, adapter),
  };
}
