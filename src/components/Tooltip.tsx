import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { TooltipPlacement } from '../utils/positioning';

interface TooltipProps {
  title?: string;
  text: string;
  stepIndex: number;
  totalSteps: number;
  position: { x: number; y: number };
  resolvedPlacement: TooltipPlacement;
  onPrev?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
}

const ARROW = 14;
const ARROW_HALF = ARROW / 2;

const arrowStyle: Record<TooltipPlacement, object> = {
  bottom: { top: -ARROW_HALF, left: '50%', marginLeft: -ARROW_HALF },
  top: { bottom: -ARROW_HALF, left: '50%', marginLeft: -ARROW_HALF },
  right: { left: -ARROW_HALF, top: '50%', marginTop: -ARROW_HALF },
  left: { right: -ARROW_HALF, top: '50%', marginTop: -ARROW_HALF },
};

export function Tooltip({
  title,
  text,
  stepIndex,
  totalSteps,
  position,
  resolvedPlacement,
  onPrev,
  onNext,
  onSkip,
  onLayout,
}: TooltipProps) {
  const isLast = stepIndex === totalSteps - 1;

  return (
    <View
      style={[styles.card, { left: position.x, top: position.y }]}
      onLayout={onLayout}
    >
      <View style={[styles.arrow, arrowStyle[resolvedPlacement]]} />
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.text}>{text}</Text>
      <View style={styles.footer}>
        {onSkip ? (
          <TouchableOpacity onPress={onSkip} hitSlop={HIT_SLOP}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text style={styles.counter}>
          {stepIndex + 1} / {totalSteps}
        </Text>
        <View style={styles.navRow}>
          {onPrev ? (
            <TouchableOpacity
              onPress={onPrev}
              hitSlop={HIT_SLOP}
              style={styles.navBtn}
            >
              <Text style={styles.navText}>Prev</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={onNext}
            hitSlop={HIT_SLOP}
            style={[styles.navBtn, styles.nextBtn]}
          >
            <Text style={styles.nextText}>{isLast ? 'Finish' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    minWidth: 220,
    maxWidth: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  arrow: {
    position: 'absolute',
    width: ARROW,
    height: ARROW,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 7,
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 6,
    color: '#111',
  },
  text: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    fontSize: 13,
    color: '#999',
  },
  counter: {
    fontSize: 12,
    color: '#bbb',
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  navText: {
    fontSize: 13,
    color: '#555',
  },
  nextBtn: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  nextText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
});
