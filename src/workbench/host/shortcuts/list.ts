import type { ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import { qualifyCommand } from '../../../plugins/sdk';
import type { CommandCall } from '../../../plugins/sdk';
import type { CommandRegistry } from '../../commands';
import type { HostIndex } from '../installed';
import { iconFor } from '../icons';

export interface ShortcutRow {
  key: string;
  name: string;
  call: CommandCall;
  // What the command declares about itself, once its plugin has registered.
  detail: string | undefined;
  Icon: ComponentType<IconProps>;
}

// Every installed plugin's manifest `shortcuts`, resolved against the
// registry. Read by the Shortcuts panel and the prompt bar.
export function allShortcuts(source: HostIndex, registry: CommandRegistry): ShortcutRow[] {
  return source.manifests().flatMap((m) =>
    (m.shortcuts ?? []).map((call) => {
      const name = qualifyCommand(call.command, m.id);
      const declared = registry.get(name);
      return {
        key: `${m.id}/${call.command}`,
        name,
        call,
        detail: declared?.title,
        // A command without its own icon wears its plugin's: provenance.
        Icon: iconFor(m.commands?.find((c) => c.name === declared?.name)?.icon ?? m.icon, m.color),
      };
    }),
  );
}
