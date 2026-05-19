import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Group,
  Mask,
  Rect,
  RoundedRect,
} from '@shopify/react-native-skia';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import type { TargetLayout } from '../types';

interface SpotlightProps {
  layout: TargetLayout;
  borderRadius?: number;
  overlayColor?: string;
  animationDuration?: number;
}

export function Spotlight({
  layout,
  borderRadius = 8,
  overlayColor = 'rgba(0,0,0,0.7)',
  animationDuration = 300,
}: SpotlightProps) {
  const { width: W, height: H } = useWindowDimensions();

  const hx = useSharedValue(layout.x);
  const hy = useSharedValue(layout.y);
  const hw = useSharedValue(layout.width);
  const hh = useSharedValue(layout.height);

  useEffect(() => {
    hx.value = withTiming(layout.x, { duration: animationDuration });
    hy.value = withTiming(layout.y, { duration: animationDuration });
    hw.value = withTiming(layout.width, { duration: animationDuration });
    hh.value = withTiming(layout.height, { duration: animationDuration });
  }, [layout, animationDuration, hx, hy, hw, hh]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
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
              r={borderRadius}
              color="black"
            />
          </Group>
        }
      >
        <Rect x={0} y={0} width={W} height={H} color={overlayColor} />
      </Mask>
    </Canvas>
  );
}
