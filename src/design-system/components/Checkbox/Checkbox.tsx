import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import styles from './Checkbox.module.scss';
import { cx } from '../../util/cx';
import { Check, Minus } from '@phosphor-icons/react';

export interface CheckboxProps extends Omit<BaseCheckbox.Root.Props, 'className'> {
  className?: string;
}

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <BaseCheckbox.Root className={cx(styles.root, className)} {...props}>
      <BaseCheckbox.Indicator className={styles.indicator}>
        <Check className={styles.iconCheck} size={10} weight="bold" />
        <Minus className={styles.iconMinus} size={10} weight="bold" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
