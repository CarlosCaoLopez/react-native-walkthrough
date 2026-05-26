# react-native-quick-walkthrough

<img src="assets/output.gif" width="300" />

[![CI](https://github.com/CarlosCaoLopez/react-native-quick-walkthrough/actions/workflows/ci.yml/badge.svg)](https://github.com/CarlosCaoLopez/react-native-quick-walkthrough/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-quick-walkthrough)](https://www.npmjs.com/package/react-native-quick-walkthrough)

A React Native walkthrough library built for modern navigation — steps survive screen transitions, refs unregister on unmount, and the engine navigates itself so tours can span multiple routes.

---

## Why This Exists

Existing walkthrough libraries (e.g. `react-native-copilot`) assume all tour steps are mounted at the same time. This breaks with Expo Router and React Navigation v7 because refs die when screens unmount. `react-native-quick-walkthrough` solves this: each step declares its route, the engine navigates there, and the registry waits for the ref before measuring.

---

## Architecture

```
Consumer App
  │
  ├── <TourProvider>              ← injects adapters, renders TourOverlay as sibling of children
  │   │
  │   ├── <TourTarget id="a">    ← registers ref on mount, unregisters on unmount
  │   │     {children}
  │   │
  │   └── <TourTarget id="b">
  │         {children}
  │
  └── <TourOverlay>  (sibling View, same container as targets)
        ├── <Spotlight>           ← 4 dark edge strips + 4 rounded corners, UI-thread Reanimated
        └── <Tooltip>             ← auto-positioned via utils/positioning.ts

Engine per step:
  navigate (if route differs)
    → registry.waitFor(targetId, 3000ms)
      → requestAnimationFrame
        → measureInWindow
          → animate Spotlight → show Tooltip

State: Zustand store — selective subscriptions, no re-renders during 60fps animations
Adapters: NavigationAdapter + PersistenceAdapter (both injected by consumer)
```

---

## Installation

```sh
# npm
npm install react-native-quick-walkthrough

# yarn
yarn add react-native-quick-walkthrough
```

### Peer Dependencies

```sh
yarn add react-native-reanimated react-native-safe-area-context
```

For Expo Router:

```sh
# expo-router is already installed in Expo projects — no extra step needed
```

Follow the platform setup guide for [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) before proceeding.

---

## Quickstart

### 1. Define a Tour

Define tours once, outside any component. Each step knows its route and target.

```ts
// tours/onboarding.ts
import { defineTour } from 'react-native-quick-walkthrough';

export const onboardingTour = defineTour({
  id: 'onboarding',
  steps: [
    {
      id: 'welcome',
      route: '/(tabs)/',
      target: 'home-button',
      text: 'This is your home screen. Tap here to get started.',
    },
    {
      id: 'profile',
      route: '/(tabs)/profile',
      target: 'profile-avatar',
      text: 'Tap your avatar to edit your profile.',
    },
  ],
});
```

### 2. Wrap Your App in TourProvider

`createExpoRouterAdapter()` returns `{ adapter, Bridge }`. Pass `adapter` to `TourProvider` and render `<Bridge />` inside it so the adapter receives route changes via `usePathname()`.

```tsx
// app/_layout.tsx
import {
  TourProvider,
  createExpoRouterAdapter,
} from 'react-native-quick-walkthrough';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onboardingTour } from '../tours/onboarding';

const { adapter, Bridge } = createExpoRouterAdapter();

const persistence = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};

export default function RootLayout() {
  return (
    <TourProvider
      tours={[onboardingTour]}
      navigationAdapter={adapter}
      persistence={persistence} // optional
    >
      <Bridge />
      <Stack />
    </TourProvider>
  );
}
```

### 3. Mark Tour Targets

Wrap any element you want to highlight with `TourTarget`. The `id` must match a step's `target` field.

```tsx
// app/(tabs)/index.tsx
import { TourTarget } from 'react-native-quick-walkthrough';

export default function HomeScreen() {
  return (
    <View>
      <TourTarget id="home-button">
        <Pressable onPress={...}>
          <Text>Get Started</Text>
        </Pressable>
      </TourTarget>
    </View>
  );
}
```

### 4. Start the Tour

```tsx
import { useTour } from 'react-native-quick-walkthrough';

export default function HomeScreen() {
  const { start } = useTour();

  return <Button title="Start tour" onPress={() => start('onboarding')} />;
}
```

`start` takes the tour `id` (string). The tour object itself is registered via `TourProvider`'s `tours` prop.

---

## Configuration

### NavigationAdapter

| Adapter     | Import                      | Notes                                                                                               |
| ----------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Expo Router | `createExpoRouterAdapter()` | Returns `{ adapter, Bridge }`. Pass `adapter` to `TourProvider` and render `<Bridge />` as a child. |

React Navigation adapter is not yet shipped.

### TourProvider props

| Prop                  | Type                 | Required | Description                                          |
| --------------------- | -------------------- | -------- | ---------------------------------------------------- |
| `tours`               | `Tour[]`             | yes      | All tours the consumer wants to start by id          |
| `navigationAdapter`   | `NavigationAdapter`  | yes      | Navigation adapter (e.g. `adapter` from Expo Router) |
| `persistence`         | `PersistenceAdapter` | no       | Key-value store for completion state                 |
| `tapOutsideToAdvance` | `boolean`            | no       | Tap outside spotlight to advance                     |
| `blockOutsideTouches` | `boolean`            | no       | Block touches outside the spotlight hole             |

### PersistenceAdapter

Pass any key-value store that implements `{ get, set, remove }`. If omitted, completed tours reset on every app restart.

| Storage      | Package                                     |
| ------------ | ------------------------------------------- |
| AsyncStorage | `@react-native-async-storage/async-storage` |
| MMKV         | `react-native-mmkv`                         |
| In-memory    | Custom implementation                       |

### useTour

```ts
const {
  start,
  stop,
  next,
  prev,
  skip,
  status,
  currentStepIndex,
  activeTour,
  isRunning,
} = useTour();
```

| Member             | Type                            | Description                                      |
| ------------------ | ------------------------------- | ------------------------------------------------ |
| `start(id)`        | `(id: TourId) => Promise<void>` | Begin a tour by id from step 0                   |
| `stop()`           | `() => void`                    | Abort the current tour                           |
| `next()`           | `() => void`                    | Advance to next step                             |
| `prev()`           | `() => void`                    | Go back to previous step                         |
| `skip()`           | `() => void`                    | Skip remaining steps (fires `onSkip`)            |
| `status`           | `TourStatus`                    | `'idle' \| 'running' \| 'paused' \| 'completed'` |
| `currentStepIndex` | `number`                        | Active step index                                |
| `activeTour`       | `Tour \| null`                  | Active tour object                               |
| `isRunning`        | `boolean`                       | Shortcut for `status === 'running'`              |

---

## Compatibility

| React Native | Expo SDK | New Architecture   | Tested Platforms  |
| ------------ | -------- | ------------------ | ----------------- |
| ≥ 0.73       | ≥ 50     | Supported (Fabric) | iOS, Android, Web |

---

## Troubleshooting

**Target not found (timeout after 3s)**

The engine waited 3 seconds for a target ref to appear but it never registered. Check that:

- The `id` in `defineTour` matches the `id` prop on `<TourTarget>` exactly (case-sensitive)
- The `route` in the step matches the actual Expo Router route string (check with `router.pathname`)
- The `TourTarget` is mounted on the screen it belongs to, not conditionally hidden

**Spotlight flickers or misaligns on Android**

Android collapses view hierarchies by default. Add `collapsable={false}` to any `View` that wraps a `TourTarget`:

```tsx
<View collapsable={false}>
  <TourTarget id="...">...</TourTarget>
</View>
```

`TourTarget` sets this automatically on its own wrapper, but parent views can still interfere.

**Tour does not persist between sessions**

No `persistence` adapter was passed to `TourProvider`. Pass an AsyncStorage or MMKV adapter to enable persistence.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions require a [DCO sign-off](./DCO).

## Security

See [SECURITY.md](./SECURITY.md) for the vulnerability reporting process. Do not open public issues for security bugs.

## License

MIT — Copyright (c) 2026 Carlos Cao. See [LICENSE](./LICENSE).
