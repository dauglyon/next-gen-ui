import { Button as BaseButton } from '@base-ui/react/button';
import styles from './Button.module.scss';
import { cx } from '../../util/cx';

export type ButtonVariant = 'primary' | 'teal' | 'purple' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends Omit<BaseButton.Props, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <BaseButton className={cx(styles.btn, styles[variant], styles[size], className)} {...props}>
      {children}
    </BaseButton>
  );
}
