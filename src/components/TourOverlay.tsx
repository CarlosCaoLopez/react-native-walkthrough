import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTourStore } from '../store/tourStore';
import { computeTooltipPosition } from '../utils/positioning';
import { Spotlight } from './Spotlight';
import { Tooltip } from './Tooltip';
import { useTourContext } from '../store/tourContext';

interface TourOverlayProps {
  tapOutsideToAdvance?: boolean;
  blockOutsideTouches?: boolean;
}

export function TourOverlay({
  tapOutsideToAdvance = false,
  blockOutsideTouches,
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

  const effectiveBlock =
    step.blockOutsideTouches ??
    activeTour.blockOutsideTouches ??
    blockOutsideTouches ??
    false;

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
      {(effectiveBlock || tapOutsideToAdvance) && (
        <>
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              height: ty,
            }}
            onPress={tapOutsideToAdvance ? next : undefined}
          />
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: ty + th,
              right: 0,
              bottom: 0,
            }}
            onPress={tapOutsideToAdvance ? next : undefined}
          />
          <Pressable
            style={{
              position: 'absolute',
              left: 0,
              top: ty,
              width: tx,
              height: th,
            }}
            onPress={tapOutsideToAdvance ? next : undefined}
          />
          <Pressable
            style={{
              position: 'absolute',
              left: tx + tw,
              top: ty,
              right: 0,
              height: th,
            }}
            onPress={tapOutsideToAdvance ? next : undefined}
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
        onPrev={currentStepIndex > 0 && !step.hidePrevButton ? prev : undefined}
        onNext={next}
        onSkip={step.hideSkipButton ? undefined : skip}
        onLayout={handleTooltipLayout}
      />
    </View>
  );

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={undefined}
    >
      {content}
    </Modal>
  );
}
