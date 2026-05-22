import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import type { ComponentRef } from 'react';
import type { View } from 'react-native';
import { registry } from '../../store/registry';
import type { TargetEntry } from '../../store/registry';
import { useTourStore } from '../../store/tourStore';
import type { NavigationAdapter } from '../../adapters/types';
import type { Tour } from '../../types';
import { createTourEngine } from '../tourEngine';

jest.mock('../../store/registry');
jest.useFakeTimers();

function makeMeasureEntry(x = 0, y = 0, width = 0, height = 0): TargetEntry {
  return {
    ref: {
      current: {
        measureInWindow: jest.fn((cb: any) => cb(x, y, width, height)),
      } as unknown as ComponentRef<typeof View>,
    },
  };
}

function makeAdapter(currentRoute: string | null = null): NavigationAdapter {
  return {
    navigate: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getCurrentRoute: jest
      .fn<() => string | null>()
      .mockReturnValue(currentRoute),
    subscribe: jest.fn<() => () => void>().mockReturnValue(() => {}),
  };
}

function makeTour(overrides: Partial<Tour> = {}): Tour {
  return {
    id: 'test-tour',
    steps: [
      { id: 's1', target: 'target-1', text: 'Step 1' },
      { id: 's2', target: 'target-2', text: 'Step 2' },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  useTourStore.getState().stop();
  jest.mocked(registry.waitFor).mockReset();
});

afterEach(() => {
  jest.clearAllTimers();
});

describe('createTourEngine', () => {
  describe('start', () => {
    it('sets store status to running at step 0', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const engine = createTourEngine(makeAdapter());

      const promise = engine.start(makeTour());
      await jest.runAllTimersAsync();
      await promise;

      const state = useTourStore.getState();
      expect(state.status).toBe('running');
      expect(state.currentStepIndex).toBe(0);
    });

    it('navigates when step.route differs from current route', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const adapter = makeAdapter('/other');
      const engine = createTourEngine(adapter);
      const tour = makeTour({
        steps: [
          { id: 's1', target: 'target-1', text: 'Step 1', route: '/home' },
        ],
      });

      const promise = engine.start(tour);
      await jest.runAllTimersAsync();
      await promise;

      expect(adapter.navigate).toHaveBeenCalledWith('/home');
    });

    it('skips navigation when route matches current route', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const adapter = makeAdapter('/home');
      const engine = createTourEngine(adapter);
      const tour = makeTour({
        steps: [
          { id: 's1', target: 'target-1', text: 'Step 1', route: '/home' },
        ],
      });

      const promise = engine.start(tour);
      await jest.runAllTimersAsync();
      await promise;

      expect(adapter.navigate).not.toHaveBeenCalled();
    });

    it('skips navigation when step has no route', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const adapter = makeAdapter('/home');
      const engine = createTourEngine(adapter);

      const promise = engine.start(
        makeTour({ steps: [{ id: 's1', target: 't1', text: 'x' }] })
      );
      await jest.runAllTimersAsync();
      await promise;

      expect(adapter.navigate).not.toHaveBeenCalled();
    });

    it('calls registry.waitFor with step target and 3s timeout', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const engine = createTourEngine(makeAdapter());
      const tour = makeTour({
        steps: [{ id: 's1', target: 'my-target', text: 'x' }],
      });

      const promise = engine.start(tour);
      await jest.runAllTimersAsync();
      await promise;

      expect(registry.waitFor).toHaveBeenCalledWith('my-target', 3000);
    });

    it('propagates rejection when registry.waitFor rejects', async () => {
      jest
        .mocked(registry.waitFor)
        .mockRejectedValue(
          new Error('TourTarget "t1" not registered within 3000ms')
        );
      const engine = createTourEngine(makeAdapter());
      const tour = makeTour({ steps: [{ id: 's1', target: 't1', text: 'x' }] });

      const promise = engine.start(tour);
      await Promise.all([
        expect(promise).rejects.toThrow('not registered within 3000ms'),
        jest.runAllTimersAsync(),
      ]);
    });

    it('stores measured layout in activeLayout', async () => {
      const entry = makeMeasureEntry(10, 20, 100, 50);
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const engine = createTourEngine(makeAdapter());

      const promise = engine.start(makeTour());
      await jest.runAllTimersAsync();
      await promise;

      expect(useTourStore.getState().activeLayout).toEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
    });
  });

  describe('stop', () => {
    it('resets store to idle and clears activeTour', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const engine = createTourEngine(makeAdapter());

      const promise = engine.start(makeTour());
      await jest.runAllTimersAsync();
      await promise;

      engine.stop();

      const state = useTourStore.getState();
      expect(state.status).toBe('idle');
      expect(state.activeTour).toBeNull();
    });
  });

  describe('next', () => {
    it('advances to next step and updates layout', async () => {
      const entry1 = makeMeasureEntry(0, 0, 100, 50);
      const entry2 = makeMeasureEntry(10, 20, 200, 80);
      jest
        .mocked(registry.waitFor)
        .mockResolvedValueOnce(entry1)
        .mockResolvedValueOnce(entry2);
      const engine = createTourEngine(makeAdapter());

      let promise = engine.start(makeTour());
      await jest.runAllTimersAsync();
      await promise;

      promise = engine.next();
      await jest.runAllTimersAsync();
      await promise;

      const state = useTourStore.getState();
      expect(state.currentStepIndex).toBe(1);
      expect(state.activeLayout).toEqual({
        x: 10,
        y: 20,
        width: 200,
        height: 80,
      });
    });

    it('completes tour on last step without running another step', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const engine = createTourEngine(makeAdapter());
      const tour = makeTour({ steps: [{ id: 's1', target: 't1', text: 'x' }] });

      const promise = engine.start(tour);
      await jest.runAllTimersAsync();
      await promise;

      await engine.next();

      expect(useTourStore.getState().status).toBe('completed');
      expect(registry.waitFor).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete callback on last step', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const onComplete = jest.fn();
      const engine = createTourEngine(makeAdapter());
      const tour = makeTour({
        steps: [{ id: 's1', target: 't1', text: 'x' }],
        onComplete,
      });

      const promise = engine.start(tour);
      await jest.runAllTimersAsync();
      await promise;

      await engine.next();

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('prev', () => {
    it('decrements step index and re-measures', async () => {
      const entry1 = makeMeasureEntry(0, 0, 100, 50);
      const entry2 = makeMeasureEntry(10, 20, 200, 80);
      const entry1again = makeMeasureEntry(5, 5, 90, 45);
      jest
        .mocked(registry.waitFor)
        .mockResolvedValueOnce(entry1)
        .mockResolvedValueOnce(entry2)
        .mockResolvedValueOnce(entry1again);
      const engine = createTourEngine(makeAdapter());

      let promise = engine.start(makeTour());
      await jest.runAllTimersAsync();
      await promise;

      promise = engine.next();
      await jest.runAllTimersAsync();
      await promise;

      promise = engine.prev();
      await jest.runAllTimersAsync();
      await promise;

      const state = useTourStore.getState();
      expect(state.currentStepIndex).toBe(0);
      expect(state.activeLayout).toEqual({ x: 5, y: 5, width: 90, height: 45 });
    });

    it('no-op when already at step 0', async () => {
      const entry = makeMeasureEntry();
      jest.mocked(registry.waitFor).mockResolvedValue(entry);
      const engine = createTourEngine(makeAdapter());

      const promise = engine.start(makeTour());
      await jest.runAllTimersAsync();
      await promise;

      // prev from index 0 — store guard prevents decrement but runStep still called
      // (tourStore.prev is a no-op at 0, runStep(0) re-runs current step)
      const prevPromise = engine.prev();
      await jest.runAllTimersAsync();
      await prevPromise;

      expect(useTourStore.getState().currentStepIndex).toBe(0);
    });
  });

  describe('runStep (direct)', () => {
    it('can run an arbitrary step by index', async () => {
      const entry0 = makeMeasureEntry(0, 0, 100, 50);
      const entry1 = makeMeasureEntry(30, 40, 150, 60);
      jest
        .mocked(registry.waitFor)
        .mockResolvedValueOnce(entry0)
        .mockResolvedValueOnce(entry1);
      const engine = createTourEngine(makeAdapter());

      const startPromise = engine.start(makeTour());
      await jest.runAllTimersAsync();
      await startPromise;

      const runPromise = engine.runStep(1);
      await jest.runAllTimersAsync();
      await runPromise;

      expect(registry.waitFor).toHaveBeenLastCalledWith('target-2', 3000);
      expect(useTourStore.getState().activeLayout).toEqual({
        x: 30,
        y: 40,
        width: 150,
        height: 60,
      });
    });
  });
});
