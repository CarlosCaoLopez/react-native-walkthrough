export type TargetId = string;
export type TourId = string;

export interface TourStep<T extends TargetId = TargetId> {
  id: string;
  target: T;
  route?: string;
  text: string;
  title?: string;
  scrollTo?: boolean;
  onBeforeShow?: () => Promise<void> | void;
  placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  hidePrevButton?: boolean;
  hideSkipButton?: boolean;
  blockOutsideTouches?: boolean;
}

export interface Tour {
  id: TourId;
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  blockOutsideTouches?: boolean;
}

export interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}
