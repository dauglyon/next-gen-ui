import styles from './Skeleton.module.scss';
import { cx } from '../../util/cx';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export function Skeleton({ width, height, variant = 'text', className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(styles.skeleton, styles[variant], className)}
      style={{ width, height }}
    />
  );
}
