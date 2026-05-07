import type { ReactNode } from 'react';
import { Avatar } from '../Avatar';
import type { AvatarColor } from '../Avatar';

export type TypeBadgeColor = AvatarColor;

export interface TypeBadgeProps {
  color: TypeBadgeColor;
  children: ReactNode;
  className?: string;
}

/**
 * Data-type marker. Avatar preset: square, tinted, mono, 28px.
 * Children should be a 1-2 char abbreviation or a small icon.
 */
export function TypeBadge({ color, children, className }: TypeBadgeProps) {
  return (
    <Avatar shape="square" variant="tint" size={28} color={color} className={className}>
      {children}
    </Avatar>
  );
}
