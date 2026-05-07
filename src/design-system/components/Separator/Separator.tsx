import { Separator as BaseSeparator } from '@base-ui/react/separator';
import styles from './Separator.module.scss';
import { cx } from '../../util/cx';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({ orientation = 'horizontal', className }: SeparatorProps) {
  return (
    <BaseSeparator
      className={cx(styles.separator, orientation === 'vertical' && styles.vertical, className)}
    />
  );
}
