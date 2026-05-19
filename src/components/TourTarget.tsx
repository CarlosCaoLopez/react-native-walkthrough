import React, { useEffect, useRef } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { View } from 'react-native';
import { registry } from '../store/registry';
import { useTourStore } from '../store/tourStore';
import { useTargetLayout } from '../hooks/useTargetLayout';
import type { TargetId } from '../types';

interface TourTargetProps {
  id: TargetId;
  children: ReactNode;
}

export function TourTarget({ id, children }: TourTargetProps) {
  const viewRef = useRef<ComponentRef<typeof View>>(null);
  const { onLayout, layout } = useTargetLayout(viewRef);

  const isActiveTarget = useTourStore(
    (s) => s.activeTour?.steps[s.currentStepIndex]?.target === id
  );
  const setLayout = useTourStore((s) => s.setLayout);

  useEffect(() => {
    registry.register(id, viewRef);
    return () => registry.unregister(id);
  }, [id]);

  useEffect(() => {
    if (isActiveTarget && layout) setLayout(layout);
  }, [isActiveTarget, layout, setLayout]);

  return (
    <View ref={viewRef} onLayout={onLayout} collapsable={false}>
      {children}
    </View>
  );
}
