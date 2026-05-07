import { Switch as BaseSwitch } from '@base-ui/react/switch';
import styles from './Switch.module.scss';
import { cx } from '../../util/cx';

export interface SwitchProps extends Omit<BaseSwitch.Root.Props, 'className'> {
  className?: string;
}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <BaseSwitch.Root className={cx(styles.root, className)} {...props}>
      <BaseSwitch.Thumb className={styles.thumb} />
    </BaseSwitch.Root>
  );
}
