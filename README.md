# react-native-walkthrough

[![CI](https://github.com/CarlosCaoLopez/react-native-walkthrough/actions/workflows/ci.yml/badge.svg)](https://github.com/CarlosCaoLopez/react-native-walkthrough/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-walkthrough)](https://www.npmjs.com/package/react-native-walkthrough)

A React Native walkthrough library built for modern navigation — steps survive screen transitions, refs unregister on unmount, and the engine navigates itself so tours can span multiple routes.

---

## Why This Exists

Existing walkthrough libraries (e.g. `react-native-copilot`) assume all tour steps are mounted at the same time. This breaks with Expo Router and React Navigation v7 because refs die when screens unmount. `react-native-walkthrough` solves this: each step declares its route, the engine navigates there, and the registry waits for the ref before measuring.

---

## Architecture

```
Consumer App
  │
  ├── <TourProvider>              ← injects adapters, mounts TourOverlay via Portal
  │   │
  │   ├── <TourTarget id="a">    ← registers ref on mount, unregisters on unmount
  │   │     {children}
  │   │
  │   └── <TourTarget id="b">
  │         {children}
  │
  └── <TourOverlay>  (Portal → root, above navigator)
        ├── <Spotlight>           ← Skia Canvas, UI-thread Reanimated SharedValues
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
npm install react-native-walkthrough

# yarn
yarn add react-native-walkthrough
```

### Peer Dependencies

```sh
yarn add @shopify/react-native-skia react-native-reanimated @gorhom/portal react-native-safe-area-context
```

For Expo Router:

```sh
# expo-router is already installed in Expo projects — no extra step needed
```

For React Navigation:

```sh
yarn add @react-navigation/native
```

Follow the platform setup guides for [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) and [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/docs/getting-started/installation) before proceeding.

---

## Quickstart

### 1. Define a Tour

Define tours once, outside any component. Each step knows its route and target.

```ts
// tours/onboarding.ts
import { defineTour } from 'react-native-walkthrough';

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

```tsx
// app/_layout.tsx
import {
  TourProvider,
  createExpoRouterAdapter,
} from 'react-native-walkthrough';
import AsyncStorage from '@react-native-async-storage/async-storage';

const navigationAdapter = createExpoRouterAdapter();

const persistenceAdapter = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};

export default function RootLayout() {
  return (
    <TourProvider
      navigationAdapter={navigationAdapter}
      persistenceAdapter={persistenceAdapter} // optional
    >
      <Stack />
    </TourProvider>
  );
}
```

### 3. Mark Tour Targets

Wrap any element you want to highlight with `TourTarget`. The `id` must match a step's `target` field.

```tsx
// app/(tabs)/index.tsx
import { TourTarget } from 'react-native-walkthrough';

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
import { useTour } from 'react-native-walkthrough';
import { onboardingTour } from '../tours/onboarding';

export default function HomeScreen() {
  const { start } = useTour();

  return <Button title="Start tour" onPress={() => start(onboardingTour)} />;
}
```

---

## Configuration

### NavigationAdapter

| Adapter          | Import                              | Notes                              |
| ---------------- | ----------------------------------- | ---------------------------------- |
| Expo Router      | `createExpoRouterAdapter()`         | No arguments required              |
| React Navigation | `createReactNavigationAdapter(ref)` | Pass your `NavigationContainerRef` |

### PersistenceAdapter

Pass any key-value store that implements `{ get, set, remove }`. If omitted, completed tours reset on every app restart.

| Storage      | Package                                     |
| ------------ | ------------------------------------------- |
| AsyncStorage | `@react-native-async-storage/async-storage` |
| MMKV         | `react-native-mmkv`                         |
| In-memory    | Custom implementation                       |

### useTour

```ts
const { start, stop, next, prev, status, currentStep } = useTour();
```

| Member        | Type                   | Description                       |
| ------------- | ---------------------- | --------------------------------- |
| `start(tour)` | `(tour: Tour) => void` | Begin a tour from step 0          |
| `stop()`      | `() => void`           | Abort the current tour            |
| `next()`      | `() => void`           | Advance to next step              |
| `prev()`      | `() => void`           | Go back to previous step          |
| `status`      | `TourStatus`           | `'idle' \| 'running' \| 'paused'` |
| `currentStep` | `TourStep \| null`     | Active step definition            |

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

No `persistenceAdapter` was passed to `TourProvider`. Pass an AsyncStorage or MMKV adapter to enable persistence.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All contributions require a [DCO sign-off](./DCO).

## Security

See [SECURITY.md](./SECURITY.md) for the vulnerability reporting process. Do not open public issues for security bugs.

## License

MIT — Copyright (c) 2026 Carlos Cao. See [LICENSE](./LICENSE).
