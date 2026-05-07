import type { ReactNode, CSSProperties } from 'react';
import styles from './Row.module.scss';
import { cx } from '../../util/cx';

export interface RowProps {
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function Row({ title, meta, children, onClick, className, style }: RowProps) {
  return (
    <div
      className={cx(styles.row, className)}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={styles.content}>
        {children && <div className={styles.leading}>{children}</div>}
        <div>
          <div className={styles.title}>{title}</div>
          {meta && <div className={styles.meta}>{meta}</div>}
        </div>
      </div>
    </div>
  );
}
