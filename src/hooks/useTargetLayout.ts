import { useCallback, useEffect, useState } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { Dimensions } from 'react-native';
import type { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { TargetLayout } from '../types';
import { measureWithRetry } from '../utils/measure';

export function useTargetLayout(
  ref: RefObject<ComponentRef<typeof View> | null>
): { onLayout: () => void; layout: TargetLayout | null } {
  const [layout, setLayout] = useState<TargetLayout | null>(null);

  const measure = useCallback(async () => {
    try {
      const layout = await measureWithRetry(ref);
      setLayout(layout);
    } catch {
      // target unmounted or unavailable
    }
  }, [ref]);

  const onLayout = useCallback(() => {
    requestAnimationFrame(measure);
  }, [measure]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', measure);
    return () => sub.remove();
  }, [measure]);

  useFocusEffect(
    useCallback(() => {
      measure();
    }, [measure])
  );

  return { onLayout, layout };
}
