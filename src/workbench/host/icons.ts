import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import {
  Briefcase,
  ChatCircleDots,
  Database,
  Flask,
  FolderOpen,
  Gear,
  GraduationCap,
  HandWaving,
  Lightning,
  ListChecks,
  PushPin,
  SquaresFour,
  Table,
} from '@phosphor-icons/react';

// Manifests name an icon; the host owns the table so a plugin cannot pull
// the whole icon set into the bundle. Unknown names fall back to a pin.
export const ICONS: Readonly<Record<string, ComponentType<IconProps>>> = {
  Briefcase,
  ChatCircleDots,
  Database,
  Flask,
  FolderOpen,
  Gear,
  GraduationCap,
  HandWaving,
  Lightning,
  ListChecks,
  SquaresFour,
  Table,
};

export function iconFor(name: string | undefined): ComponentType<IconProps> {
  return (name && ICONS[name]) || PushPin;
}
