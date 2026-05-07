import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import styles from './Radio.module.scss';
import { cx } from '../../util/cx';

export interface RadioProps extends Omit<BaseRadio.Root.Props, 'className'> {
  className?: string;
}

export function Radio({ className, ...props }: RadioProps) {
  return (
    <BaseRadio.Root className={cx(styles.root, className)} {...props}>
      <BaseRadio.Indicator className={styles.indicator} />
    </BaseRadio.Root>
  );
}

export interface RadioGroupProps extends Omit<RadioGroup.Props, 'className'> {
  className?: string;
}

export function Group({ className, ...props }: RadioGroupProps) {
  return <RadioGroup className={cx(styles.group, className)} {...props} />;
}
