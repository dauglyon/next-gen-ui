import type { ReactNode } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { CaretDown } from '@phosphor-icons/react';
import styles from './Alert.module.scss';
import { cx } from '../../util/cx';

export type AlertColor = 'green' | 'primary' | 'yellow' | 'red';

export interface AlertProps {
  color: AlertColor;
  icon?: ReactNode;
  children: ReactNode;
  /** Collapsible detail (stack trace, long message) */
  trace?: string;
  /** Action row below message (retry, support link, dismiss) */
  actions?: ReactNode;
  /** Override the default ARIA role (red → alert, others → status). */
  role?: 'alert' | 'status';
  className?: string;
}

export function Alert({ color, icon, children, trace, actions, role, className }: AlertProps) {
  const ariaRole = role ?? (color === 'red' ? 'alert' : 'status');
  return (
    <Collapsible.Root role={ariaRole} className={cx(styles.alert, styles[color], className)}>
      <div className={styles.alertHeader}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div className={styles.body}>
          <div>{children}</div>
          {(trace || actions) && (
            <div className={styles.actions}>
              {actions}
              {trace && (
                <Collapsible.Trigger className={styles.disclose}>
                  Details
                  <CaretDown size={12} weight="bold" className={styles.chevron} />
                </Collapsible.Trigger>
              )}
            </div>
          )}
        </div>
      </div>
      {trace && (
        <Collapsible.Panel className={styles.tracePanel}>
          <pre className={styles.tracePre}>{trace}</pre>
        </Collapsible.Panel>
      )}
    </Collapsible.Root>
  );
}
