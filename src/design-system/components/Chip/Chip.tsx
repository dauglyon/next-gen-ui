import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import styles from './Chip.module.scss';
import { cx } from '../../util/cx';

export type ChipColor =
  | 'primary'
  | 'teal'
  | 'ocean'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple';

export interface ChipProps {
  color: ChipColor;
  /** Use on-white tint when inside a white card/frame */
  onWhite?: boolean;
  /** When provided, renders an X dismiss button */
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
}

export function Chip({ color, onWhite, onDismiss, children, className }: ChipProps) {
  return (
    <span className={cx(styles.chip, styles[color], onWhite && styles.onWhite, className)}>
      {children}
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Remove">
          <X size={8} weight="bold" />
        </button>
      )}
    </span>
  );
}
