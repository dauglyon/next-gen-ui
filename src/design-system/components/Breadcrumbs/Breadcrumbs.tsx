import styles from './Breadcrumbs.module.scss';
import { cx } from '../../util/cx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cx(styles.root, className)} aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className={styles.separator}>/</span>}
          {i === items.length - 1 ? (
            <span className={styles.current} aria-current="page">
              {item.label}
            </span>
          ) : (
            <a className={styles.link} href={item.href}>
              {item.label}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}
