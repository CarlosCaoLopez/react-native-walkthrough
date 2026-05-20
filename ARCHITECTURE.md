# rn-tour-guide — Architecture

App-walkthrough library for React Native designed to work correctly with modern navigation (Expo Router, React Navigation v7, nested stacks, modals, and tabs).

---

## 1. Motivation

Existing libraries like `react-native-copilot` have a clean API but assume that **the entire walkthrough lives in a single simultaneously-mounted component tree**. This assumption breaks with modern navigation because:

1. **Ephemeral refs**: `measureInWindow` operates on live refs. When navigating to another screen, the previous one unmounts (or freezes in background) and the ref dies or returns stale coordinates.
2. **Overlay decoupled from navigator**: the overlay lives in a provider above the navigator, survives navigations, but loses context of which screen is active.
3. **Imperative step registration**: `walkthroughable(Component)` + `CopilotStep` require all steps to be mounted at once. Impossible if step 3 lives on a different route.

This library solves all three problems via a **declarative tour design**, a **target registry by id**, and an **engine that orchestrates navigation + measurement**.

---

## 2. Architecture decisions

### 2.1. The tour is a declarative state machine, not a component tree

The tour is defined **once, outside any screen**, as a plain object:

```ts
export const onboardingTour = defineTour({
  id: 'onboarding',
  steps: [
    {
      id: 'welcome',
      route: '/(tabs)/home',
      target: 'home.search',
      text: '...',
    },
    {
      id: 'profile',
      route: '/(tabs)/profile',
      target: 'profile.avatar',
      text: '...',
    },
    {
      id: 'settings',
      route: '/settings',
      target: 'settings.notifs',
      text: '...',
    },
  ],
});
```

Each step knows **which route its target lives on**. This allows the tour engine to navigate between steps itself without depending on the current component tree.

**Benefits**:

- Steps can live on different screens that are never mounted simultaneously.
- The tour is serializable, testable, and persistable.
- TypeScript can infer the union of `targetId`s from the steps array for autocomplete.

### 2.2. Global target registry by id

Instead of passing refs directly, each target is identified by a string and registered in a global map when mounted:

```tsx
<TourTarget id="home.search-button">
  <SearchButton />
</TourTarget>
```

- On mount: `registry.register(id, ref)`.
- On unmount: `registry.unregister(id)`.
- The engine requests the target by id; if it doesn't exist yet, it **waits with a timeout** (`registry.waitFor(id, 3000)`) before showing the spotlight.

This eliminates the classic race condition of "navigated but ref doesn't exist yet" when advancing to a step whose screen is still mounting.

### 2.3. Engine that orchestrates navigation + measurement

```ts
async function runStep(step) {
  const currentRoute = adapter.getCurrentRoute();
  if (step.route && step.route !== currentRoute) {
    await adapter.navigate(step.route);
  }
  const target = await registry.waitFor(step.target, 3000);
  await new Promise((r) => requestAnimationFrame(r)); // one frame for stability
  const layout = await measure(target.ref);
  tourStore.setLayout(layout);
}
```

Three clear phases: **navigate if needed → wait for target to register → measure absolute layout**.

### 2.4. Overlay via root-level Portal

The overlay (mask + spotlight + tooltip) renders inside a Portal mounted in the root `_layout`, above the navigator. It survives navigations because it lives outside the navigator tree.

`@gorhom/portal` is used because it integrates well with Reanimated and native modals. Discarded alternatives: transparent `Modal` (statusbar issues on Android, conflicts with bottom sheets) and an absolute `View` in the root layout (can't be elevated above navigator modals).

### 2.5. Injectable navigation adapter

The library does not depend directly on Expo Router. It defines an interface:

```ts
interface NavigationAdapter {
  navigate(route: string): void | Promise<void>;
  getCurrentRoute(): string | null;
  subscribe(listener: (route: string) => void): () => void;
}
```

And provides two implementations:

- `createExpoRouterAdapter()`
- `createReactNavigationAdapter(navigationRef)`

The consumer can inject their own. This avoids coupling the lib to a specific router and facilitates testing.

### 2.6. Global state with Zustand, not Context

Tour state (`activeTour`, `currentStepIndex`, `status`, `activeLayout`) lives in a Zustand store.

**Reason**: React Context triggers re-renders in all consumers when any part of the state changes. Zustand allows selective subscriptions (`useTourStore(s => s.currentStep)`) and avoids unnecessary re-renders across the app — critical when the overlay updates 60 times per second during an animation.

`TourContext` (engine + toursMap) and `useTourContext` live in `store/tourContext.ts`, separate from `TourProvider`. This breaks the require cycle that would exist if `TourOverlay` imported from `TourProvider` and `TourProvider` imported `TourOverlay`.

### 2.7. Spotlight with Skia + Reanimated

The mask with an illuminated "hole" is implemented with `@shopify/react-native-skia`:

```tsx
<Canvas style={StyleSheet.absoluteFill}>
  <Mask
    mode="luminance"
    mask={
      <Group>
        <Rect x={0} y={0} width={W} height={H} color="white" />
        <RoundedRect
          x={hx}
          y={hy}
          width={hw}
          height={hh}
          r={12}
          color="black"
        />
      </Group>
    }
  >
    <Rect x={0} y={0} width={W} height={H} color="rgba(0,0,0,0.7)" />
  </Mask>
</Canvas>
```

`hx, hy, hw, hh` are Reanimated `SharedValue`s, animated with `withTiming` between steps. Skia integrates natively with shared values, so the hole transition from target A → target B happens on the UI thread without jank.

**Reason over alternatives**:

- `react-native-svg`: works, but SVG masks in RN have bugs on Android and animation performance is worse.
- View overlays with 4 rectangles (classic copilot technique): no smooth rounded corners or feathering, and edge animations feel "jumpy".
- Skia: GPU rendering, clean masks, direct Reanimated integration, supports effects (`Blur`, `Shadow`) if needed.

### 2.8. Reactive re-measurement

Layouts can change due to: rotation, keyboard, scroll, screen animations. `TourTarget`:

- Uses `onLayout` to detect local target changes.
- Subscribes to `Dimensions.addEventListener('change')` for orientation.
- Re-measures in `useFocusEffect` when returning to the screen.
- Applies `collapsable={false}` on Android (without this, RN can flatten the View and `measureInWindow` fails).

### 2.9. Optional injectable persistence

The library does not decide between `AsyncStorage`, MMKV, or SecureStore. It defines an interface:

```ts
interface PersistenceAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
```

If the consumer injects an adapter, progress (`{ tourId, stepIndex, status }`) is saved on every change. On provider mount, it hydrates. If nothing is injected, the tour starts from scratch each session.

### 2.10. Pause and resume

If the user manually navigates away from the current step's route during a tour, the engine detects it via `adapter.subscribe`. Behavior is configurable per step:

- `onUserNavigatedAway: 'pause'` — hides the overlay, waits for the user to return to the correct route.
- `onUserNavigatedAway: 'returnToStep'` — navigates back automatically.
- `onUserNavigatedAway: 'cancel'` — ends the tour.

Default: `pause`.

### 2.11. Targets in lists (FlatList, ScrollView)

If a target is inside a `FlatList`, it may not be mounted (windowing) or may be outside the viewport. The step can declare:

```ts
{ target: 'feed.item-5', route: '/feed', scrollTo: true }
```

When `scrollTo: true`, the engine asks `TourTarget` to also register a scroll function (via ancestor FlatList context) and invokes it before measuring. Implementation detail to be refined in v2.

### 2.12. Modal and bottom sheet support

Modals and bottom sheets render above the navigator, so the tour overlay needs a higher `zIndex`/elevation. A prop is exposed:

```tsx
<TourProvider overlayLevel="modal" /> // 'navigator' | 'modal' | 'system'
```

Internally this controls the Portal host and `elevation` (Android) / `zIndex` (iOS).

### 2.13. Auto-positioned tooltip

`utils/positioning.ts` calculates the preferred tooltip position:

1. Tries `preferredPlacement` (default: `'bottom'`).
2. If it doesn't fit (overflow against safe area), tries the opposite side.
3. If that doesn't fit either, goes lateral.
4. If nothing fits (huge target), renders fixed at the bottom center.

Respects `useSafeAreaInsets`.

---

## 3. Tech stack

| Layer          | Library                                              | Reason                                        |
| -------------- | ---------------------------------------------------- | --------------------------------------------- |
| State          | `zustand`                                            | Selective subscriptions, no global re-renders |
| Animation      | `react-native-reanimated` v3                         | Shared values on UI thread, Skia integration  |
| Mask rendering | `@shopify/react-native-skia`                         | GPU rendering, clean masks, animatable        |
| Portal         | `@gorhom/portal`                                     | Compatible with native modals and Reanimated  |
| Navigation     | `expo-router` or `react-navigation` (peer, optional) | Injectable adapter                            |
| Persistence    | injectable (`AsyncStorage`, MMKV, etc.)              | Lib does not impose                           |

---

## 4. Public API

```ts
// Definition
defineTour(tour: Tour): Tour

// Components
<TourProvider tours navigationAdapter persistence? overlayLevel?>
<TourTarget id={TargetId}>{children}</TourTarget>

// Hook
useTour(): {
  start(tourId): void;
  stop(): void;
  next(): void;
  prev(): void;
  skip(): void;
  status: 'idle' | 'running' | 'paused' | 'completed';
  currentStep: TourStep | null;
}

// Adapters
createExpoRouterAdapter(): NavigationAdapter
createReactNavigationAdapter(ref): NavigationAdapter
```

---

## 5. Project structure

```
react-native-walkthrough/
├── src/
│   ├── index.ts                  Public API (re-exports)
│   ├── types.ts                  Shared types
│   ├── defineTour.ts             Typed helper for defining tours
│   ├── store/
│   │   ├── tourStore.ts          Zustand tour store
│   │   ├── registry.ts           Target registry (id → ref map)
│   │   └── tourContext.ts        React context + useTourContext (isolated to break circular dep)
│   ├── components/
│   │   ├── TourProvider.tsx      Root provider + adapter injection
│   │   ├── TourTarget.tsx        Wrapper that registers refs by id
│   │   ├── TourOverlay.tsx       Portal + mask + tooltip
│   │   ├── Spotlight.tsx         Skia mask with animated hole
│   │   └── Tooltip.tsx           Floating box with text + buttons
│   ├── hooks/
│   │   ├── useTour.ts            Public API for start/stop/next/prev
│   │   ├── useTargetLayout.ts    Measures and observes layout changes
│   │   └── useTourPersistence.ts Hydrates/saves progress
│   ├── adapters/
│   │   ├── types.ts              NavigationAdapter + PersistenceAdapter
│   │   ├── expoRouter.ts         Adapter for expo-router
│   │   └── reactNavigation.ts    Adapter for react-navigation
│   ├── engine/
│   │   ├── tourEngine.ts         Orchestrator (navigate → wait → measure)
│   │   └── waitFor.ts            Waits for a target to register
│   └── utils/
│       ├── positioning.ts        Tooltip positioning logic
│       └── safeArea.ts           Safe area helpers
└── example/
    └── app/
        ├── _layout.tsx           TourProvider + Stack
        ├── (tabs)/
        │   ├── home.tsx
        │   └── profile.tsx
        ├── settings.tsx
        └── tours/
            └── onboarding.ts     Example tour
```

---

## 6. Decisions NOT made here

Decisions explicitly delegated to the consumer:

- **Storage**: `AsyncStorage` vs MMKV vs SecureStore.
- **Router**: Expo Router vs plain React Navigation.
- **Tooltip visual style**: the lib provides a default, but the consumer can pass `renderTooltip` to replace it entirely.
- **Tour trigger**: the app decides when to call `start()` (first login, feature flag, help button, etc.).
- **i18n**: texts live in the tour definition; the consumer translates before passing them.

---

## 7. Roadmap

**v0.1 (MVP)**:

- Declarative tour, registry, engine, Skia spotlight, basic tooltip.
- Expo Router adapter.
- No persistence, no pause/resume, no scrollTo.

**v0.2**:

- Injectable persistence.
- Pause/resume on manual navigation.
- React Navigation adapter.

**v0.3**:

- `scrollTo` for targets in lists.
- `overlayLevel` for modals.
- Custom `renderTooltip`.

**v1.0**:

- Multiple chained tours.
- Branching (next step depends on user action).
- E2E tests with Maestro.
