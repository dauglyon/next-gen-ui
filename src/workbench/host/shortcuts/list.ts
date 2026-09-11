import { qualifyCommand } from '../../../plugins/sdk';
import type { CommandRegistry } from '../../commands';
import type { HostIndex } from '../installed';
import { iconFor } from '../icons';

// Every installed plugin's manifest `shortcuts`, resolved against the
// registry. Read by the Shortcuts panel and the prompt bar.
export function allShortcuts(source: HostIndex, registry: CommandRegistry) {
  return source.manifests().flatMap((m) =>
    (m.shortcuts ?? []).map((call) => {
      const name = qualifyCommand(call.command, m.id);
      const declared = registry.get(name);
      return {
        key: `${m.id}/${call.command}`,
        name,
        call,
        // What the command declares about itself, once its plugin has registered.
        declaredTitle: declared?.title,
        // A command without its own icon wears its plugin's: provenance.
        Icon: iconFor(m.commands?.find((c) => c.name === declared?.name)?.icon ?? m.icon, m.color),
      };
    }),
  );
}
