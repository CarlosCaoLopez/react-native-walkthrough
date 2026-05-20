import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Portal } from '@gorhom/portal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTourStore } from '../store/tourStore';
import { computeTooltipPosition } from '../utils/positioning';
import { Spotlight } from './Spotlight';
import { Tooltip } from './Tooltip';
import { useTourContext } from '../store/tourContext';

interface TourOverlayProps {
  hostName?: string;
  tapOutsideToAdvance?: boolean;
}

export function TourOverlay({
  hostName,
  tapOutsideToAdvance = false,
}: TourOverlayProps) {
  const activeTour = useTourStore((s) => s.activeTour);
  const currentStepIndex = useTourStore((s) => s.currentStepIndex);
  const status = useTourStore((s) => s.status);
  const activeLayout = useTourStore((s) => s.activeLayout);
  const { engine } = useTourContext();
  const { next, prev } = engine;
  const skip = useTourStore((s) => s.skip);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [tooltipSize, setTooltipSize] = useState({ width: 260, height: 120 });

  const handleTooltipLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setTooltipSize({ width, height });
    }
  }, []);

  if (status !== 'running' || !activeLayout || !activeTour) {
    return null;
  }

  const step = activeTour.steps[currentStepIndex];
  if (!step) return null;

  const { x, y, resolvedPlacement } = computeTooltipPosition({
    target: activeLayout,
    screen: { width: screenWidth, height: screenHeight },
    tooltip: tooltipSize,
    insets,
    placement: step.placement ?? 'auto',
  });

  const { x: tx, y: ty, width: tw, height: th } = activeLayout;

  const content = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {tapOutsideToAdvance && (
        <>
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              height: ty,
            }}
            onPress={next}
          />
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: ty + th,
              right: 0,
              bottom: 0,
            }}
            onPress={next}
          />
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: ty,
              width: tx,
              height: th,
            }}
            onPress={next}
          />
          <Pressable
            style={{
              position: 'absolute',
              left: tx + tw,
              top: ty,
              right: 0,
              height: th,
            }}
            onPress={next}
          />
        </>
      )}
      <Spotlight layout={activeLayout} />
      <Tooltip
        title={step.title}
        text={step.text}
        stepIndex={currentStepIndex}
        totalSteps={activeTour.steps.length}
        position={{ x, y }}
        resolvedPlacement={resolvedPlacement}
        onPrev={currentStepIndex > 0 ? prev : undefined}
        onNext={next}
        onSkip={skip}
        onLayout={handleTooltipLayout}
      />
    </View>
  );

  return hostName ? (
    <Portal hostName={hostName}>{content}</Portal>
  ) : (
    <Portal>{content}</Portal>
  );
}
