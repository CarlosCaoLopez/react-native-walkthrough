import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  TourProvider,
  createExpoRouterAdapter,
} from 'react-native-walkthrough';
import { onboardingTour } from '../src/tours/onboarding';

const { adapter, Bridge } = createExpoRouterAdapter();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Bridge />
      <TourProvider tours={[onboardingTour]} navigationAdapter={adapter}>
        <Stack screenOptions={{ headerShown: false }} />
      </TourProvider>
    </SafeAreaProvider>
  );
}
