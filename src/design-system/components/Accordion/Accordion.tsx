import type { ReactNode } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import styles from './Accordion.module.scss';
import { cx } from '../../util/cx';
import { CaretDown } from '@phosphor-icons/react';

export interface AccordionProps extends Omit<Collapsible.Root.Props, 'className' | 'title'> {
  title: ReactNode;
  /** Optional leading icon shown before the title. */
  icon?: ReactNode;
  className?: string;
}

export function Accordion({ title, icon, className, children, ...props }: AccordionProps) {
  return (
    <Collapsible.Root className={cx(styles.root, className)} {...props}>
      <Collapsible.Trigger className={styles.trigger}>
        <span className={styles.titleRow}>
          {icon && (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{title}</span>
        </span>
        <CaretDown size={12} className={styles.chevron} />
      </Collapsible.Trigger>
      <Collapsible.Panel className={styles.panel}>{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}
