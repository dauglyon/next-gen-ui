import type { ReactNode } from 'react';
import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import styles from './Avatar.module.scss';
import { cx } from '../../util/cx';

export type AvatarColor =
  | 'primary'
  | 'teal'
  | 'ocean'
  | 'green'
  | 'purple'
  | 'orange'
  | 'red';

export type AvatarShape = 'circle' | 'square';

/**
 * solid: saturated color background, white text, sans font.
 *        Use for people avatars and identity surfaces.
 * tint:  washed background, tint-contrast text, mono font.
 *        Use for data-type abbreviations (TypeBadge is a preset).
 */
export type AvatarVariant = 'solid' | 'tint';

export interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  /** Falls back to `initials` then '?' when no src/children. */
  children?: ReactNode;
  size?: 20 | 24 | 28 | 32 | 40 | 64 | 80;
  color?: AvatarColor;
  shape?: AvatarShape;
  variant?: AvatarVariant;
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({
  src,
  alt,
  initials,
  children,
  size = 32,
  color,
  shape = 'circle',
  variant = 'solid',
  className,
  style,
}: AvatarProps) {
  return (
    <BaseAvatar.Root
      className={cx(
        styles.root,
        styles[`size${size}`],
        styles[variant],
        color && styles[color],
        shape === 'square' && styles.square,
        className,
      )}
      style={style}
    >
      {src && <BaseAvatar.Image src={src} alt={alt ?? ''} className={styles.image} />}
      <BaseAvatar.Fallback className={styles.fallback}>
        {children ?? initials ?? '?'}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
}
