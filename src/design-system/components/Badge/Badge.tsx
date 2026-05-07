import type { ReactNode } from 'react';
import styles from './Badge.module.scss';
import { cx } from '../../util/cx';

export interface BadgeProps {
  count?: number;
  color?: 'primary' | 'red' | 'green';
  children: ReactNode;
  className?: string;
}

export function Badge({ count, color = 'primary', children, className }: BadgeProps) {
  const showBadge = count !== undefined && count > 0;

  return (
    <span className={cx(styles.root, className)}>
      {children}
      {showBadge && (
        <span className={cx(styles.badge, styles[color])}>{count > 99 ? '99+' : count}</span>
      )}
    </span>
  );
}
