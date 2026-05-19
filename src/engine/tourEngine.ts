import type { NavigationAdapter } from '../adapters/types';
import { registry } from '../store/registry';
import { useTourStore } from '../store/tourStore';
import type { Tour } from '../types';

const WAIT_TIMEOUT = 3000;

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

  const entry = await registry.waitFor(step.target, WAIT_TIMEOUT);

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
      await runStep(0, adapter);
    },

    stop(): void {
      useTourStore.getState().stop();
    },

    async next(): Promise<void> {
      useTourStore.getState().next();
      const { status, currentStepIndex } = useTourStore.getState();
      if (status !== 'running') return;
      await runStep(currentStepIndex, adapter);
    },

    async prev(): Promise<void> {
      useTourStore.getState().prev();
      const { currentStepIndex } = useTourStore.getState();
      await runStep(currentStepIndex, adapter);
    },

    runStep: (stepIndex: number) => runStep(stepIndex, adapter),
  };
}
