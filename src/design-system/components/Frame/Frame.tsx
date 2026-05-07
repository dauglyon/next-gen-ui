import type { ReactNode, CSSProperties } from 'react';
import styles from './Frame.module.scss';
import { cx } from '../../util/cx';

export interface FrameProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Frame({ children, className, style }: FrameProps) {
  return (
    <div className={cx(styles.frame, className)} style={style}>
      {children}
    </div>
  );
}
