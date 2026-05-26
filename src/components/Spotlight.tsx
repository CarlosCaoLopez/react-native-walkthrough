import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { TargetLayout } from '../types';

// 1. Convertimos el Rect de SVG en un componente que puede recibir animaciones
const AnimatedRect = Animated.createAnimatedComponent(Rect);

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
  const hx = useSharedValue(layout.x);
  const hy = useSharedValue(layout.y);
  const hw = useSharedValue(layout.width);
  const hh = useSharedValue(layout.height);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (layout.width === 0 && layout.height === 0) return;

    if (isFirstRender.current) {
      hx.value = layout.x;
      hy.value = layout.y;
      hw.value = layout.width;
      hh.value = layout.height;
      isFirstRender.current = false;
    } else {
      hx.value = withTiming(layout.x, { duration: animationDuration });
      hy.value = withTiming(layout.y, { duration: animationDuration });
      hw.value = withTiming(layout.width, { duration: animationDuration });
      hh.value = withTiming(layout.height, { duration: animationDuration });
    }
  }, [layout, animationDuration, hx, hy, hw, hh]);

  // 2. Usamos useAnimatedProps para pasar los valores de la animación al SVG
  const animatedHoleProps = useAnimatedProps(() => ({
    x: hx.value,
    y: hy.value,
    width: hw.value,
    height: hh.value,
  }));

  return (
    // pointerEvents="none" asegura que los toques pasen a través del overlay hacia los botones
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Mask id="spotlight-mask">
          {/* El fondo de la máscara en BLANCO (lo que será visible del overlay) */}
          <Rect x="0" y="0" width="100%" height="100%" fill="white" />

          {/* El agujero animado en NEGRO (lo que perforará el overlay) */}
          <AnimatedRect
            animatedProps={animatedHoleProps}
            rx={borderRadius} // Radio en el eje X
            ry={borderRadius} // Radio en el eje Y
            fill="black"
          />
        </Mask>
      </Defs>

      {/* Este es el fondo oscuro real que cubre toda la pantalla */}
      <Rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill={overlayColor}
        mask="url(#spotlight-mask)" // Aplicamos la máscara aquí
      />
    </Svg>
  );
}
