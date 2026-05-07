import styles from './Textarea.module.scss';
import { cx } from '../../util/cx';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cx(styles.textarea, className)} {...props} />;
}
