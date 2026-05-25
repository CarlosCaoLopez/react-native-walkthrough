import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Modal,
  Platform,
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
  const calibrationRef = useRef<any>(null);
  const [originOffset, setOriginOffset] = useState({ x: 0, y: 0 });

  const handleTooltipLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setTooltipSize({ width, height });
    }
  }, []);

  const handleCalibration = useCallback(() => {
    if (Platform.OS !== 'android') return;
    calibrationRef.current?.measureInWindow((x: number, y: number) => {
      setOriginOffset({ x, y });
    });
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

  const adjustedLayout =
    Platform.OS === 'android'
      ? {
          ...activeLayout,
          x: activeLayout.x - originOffset.x,
          y: activeLayout.y - originOffset.y,
        }
      : activeLayout;

  const { x, y, resolvedPlacement } = computeTooltipPosition({
    target: adjustedLayout,
    screen: { width: screenWidth, height: screenHeight },
    tooltip: tooltipSize,
    insets,
    placement: step.placement ?? 'auto',
  });

  const { x: tx, y: ty, width: tw, height: th } = adjustedLayout;

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
      <Spotlight layout={adjustedLayout} />
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
      <View
        ref={calibrationRef}
        onLayout={handleCalibration}
        style={styles.calibration}
        pointerEvents="none"
      />
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  calibration: { position: 'absolute', top: 0, left: 0, width: 1, height: 1 },
});
