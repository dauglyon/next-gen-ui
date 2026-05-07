import type { ReactNode } from 'react';
import styles from './SegmentedControl.module.scss';
import { cx } from '../../util/cx';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cx(styles.root, className)} role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={cx(styles.btn, opt.value === value && styles.active)}
          onClick={() => onChange(opt.value)}
          aria-label={opt.label}
          aria-checked={opt.value === value}
          role="radio"
        >
          {opt.icon ?? opt.label}
        </button>
      ))}
    </div>
  );
}
