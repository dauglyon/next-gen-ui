import styles from './Pagination.module.scss';
import { cx } from '../../util/cx';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const pages = getPageRange(page, totalPages);

  return (
    <nav className={cx(styles.root, className)} aria-label="Pagination">
      <button
        type="button"
        className={styles.btn}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <CaretLeft size={12} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className={styles.ellipsis}>
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={cx(styles.btn, p === page && styles.active)}
            onClick={() => onPageChange(p as number)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={styles.btn}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <CaretRight size={12} />
      </button>
    </nav>
  );
}

function getPageRange(page: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (page > 3) pages.push('...');
  for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) pages.push(i);
  if (page < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
