import type { ReactNode } from 'react';
import { Check } from '@phosphor-icons/react';
import styles from './Stepper.module.scss';
import { cx } from '../../util/cx';

export interface StepDef {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepDef[];
  activeStep: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children?: ReactNode;
}

export function Root({
  steps,
  activeStep,
  orientation = 'horizontal',
  className,
  children,
}: StepperProps) {
  return (
    <div className={cx(styles.root, styles[orientation], className)}>
      <div className={styles.steps} role="list">
        {steps.map((step, i) => {
          const status = i < activeStep ? 'completed' : i === activeStep ? 'active' : 'upcoming';
          return (
            <div key={i} className={cx(styles.step, styles[status])} role="listitem">
              <div className={styles.dot}>
                {status === 'completed' ? <Check size={10} weight="bold" /> : <span>{i + 1}</span>}
              </div>
              {i < steps.length - 1 && <div className={styles.connector} />}
              <div className={styles.labelGroup}>
                <span className={styles.label}>{step.label}</span>
                {step.description && <span className={styles.desc}>{step.description}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {children && <div className={styles.content}>{children}</div>}
    </div>
  );
}
