import {
  cloneElement,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import styles from './NavIcon.module.scss';
import { cx } from '../../util/cx';

export interface NavIconProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  'aria-label': string;
  className?: string;
  // Render the (single) child element directly with nav-icon styles
  // applied. For use with a routing <Link>, anchor, etc., where a
  // wrapping <button> would produce invalid markup.
  asChild?: boolean;
}

export const NavIcon = forwardRef<HTMLElement, NavIconProps>(function NavIcon(
  { active, children, onClick, 'aria-label': ariaLabel, className, asChild, ...rest },
  ref,
) {
  const merged = cx(styles.navIcon, active && styles.active, className);

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<HTMLAttributes<HTMLElement> & { ref?: Ref<unknown> }>;
    // Spread caller-injected props (e.g. Tooltip.Trigger's hover/focus
    // handlers and ref) onto the cloned child so wrappers like Tooltip
    // can bind to the actual rendered element.
    return cloneElement(child, {
      ...rest,
      ref,
      className: cx(child.props.className, merged),
      // Caller wins on aria-label and onClick: NavIcon owns the
      // semantic role (and any tracked click handler), the child
      // element is just the rendering surface (Link, anchor, etc.).
      'aria-label': ariaLabel ?? child.props['aria-label'],
      onClick: onClick ?? child.props.onClick,
    });
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      className={merged}
      onClick={onClick}
      aria-label={ariaLabel}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
});
