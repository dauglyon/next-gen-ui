import { Progress as BaseProgress } from '@base-ui/react/progress';
import styles from './Progress.module.scss';
import { cx } from '../../util/cx';

export type ProgressColor = 'primary' | 'green' | 'yellow' | 'red' | 'purple';

export interface ProgressProps extends Omit<BaseProgress.Root.Props, 'className'> {
  color?: ProgressColor;
  className?: string;
}

export function Progress({ color = 'primary', className, ...props }: ProgressProps) {
  return (
    <BaseProgress.Root className={cx(styles.root, className)} {...props}>
      <BaseProgress.Track className={styles.track}>
        <BaseProgress.Indicator className={cx(styles.indicator, styles[color])} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
