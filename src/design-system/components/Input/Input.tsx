import { Input as BaseInput } from '@base-ui/react/input';
import styles from './Input.module.scss';
import { cx } from '../../util/cx';

export interface InputProps extends Omit<BaseInput.Props, 'className'> {
  variant?: 'standard' | 'pill';
  className?: string;
}

export function Input({ variant = 'standard', className, ...props }: InputProps) {
  return (
    <BaseInput
      className={cx(styles.input, variant === 'pill' && styles.pill, className)}
      {...props}
    />
  );
}
