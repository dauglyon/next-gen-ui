import { z } from 'zod';

// The manifest: what the host learns about a plugin before loading any of
// its code. Served by the registry, validated here. Bump CONTRACT_VERSION
// when a change would make an older plugin misbehave under a newer host.

export const CONTRACT_VERSION = 1;

const NAME = /^[a-z][a-z0-9-]*$/;

export const ArgDeclSchema = z.object({
  name: z.string().regex(NAME),
  description: z.string().optional(),
  required: z.boolean().optional(),
});
export type ArgDecl = z.infer<typeof ArgDeclSchema>;

// A command the user can type: `/cancel 12`. Declared so the prompt bar can
// complete and validate it before the plugin's code exists.
export const SlashCommandSchema = z.object({
  // The slash name, without the slash. Registered as "<id>:<name>".
  name: z.string().regex(NAME),
  title: z.string(),
  description: z.string().optional(),
  // Typed in this order.
  args: z.array(ArgDeclSchema).optional(),
  // A name from the host's icon table, for surfaces that show the command
  // as a button.
  icon: z.string().optional(),
});
export type SlashCommand = z.infer<typeof SlashCommandSchema>;

// A call to a command with its arguments filled in: what a launcher, a
// shortcut button, a recommendation or a status line runs when pressed.
export const CommandCallSchema = z.object({
  label: z.string().min(1),
  // "plugin:name"; a bare "name" is the declaring plugin's own.
  command: z.string().regex(/^(?:[a-z][a-z0-9-]*:)?[a-z][a-z0-9-]*$/),
  args: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
export type CommandCall = z.infer<typeof CommandCallSchema>;

// Plugin ids are URL-visible (`/p/<id>/...`), so they are restricted to what
// reads well there and never change once published.
export const PluginIdSchema = z.string().regex(/^[a-z][a-z0-9-]{1,40}$/);

export const ManifestSchema = z.object({
  id: PluginIdSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  contractVersion: z.literal(CONTRACT_VERSION),
  // A name from the host's icon table; unknown names fall back to a pin.
  icon: z.string().optional(),
  // A name from the host's colour table, tinting this plugin's icon
  // wherever it appears. Unknown or absent draws in the surrounding ink.
  color: z.string().optional(),
  navigator: z
    .object({
      // `content`: the sidebar block hugs its content instead of taking a
      // share of the stack's height — for toolbars and status panels.
      fit: z.literal('content').optional(),
    })
    .optional(),
  document: z
    .object({
      // Path under /p/<id>, TanStack style: `/arc/$slug`. `/` for a document
      // with no params (an app that is one page).
      route: z.string().regex(/^\/([A-Za-z0-9_$-]+(\/[A-Za-z0-9_$-]+)*)?$/),
    })
    .optional(),
  commands: z.array(SlashCommandSchema).optional(),
  // Buttons in the sidebar's Shortcuts block.
  shortcuts: z.array(CommandCallSchema).optional(),
  // The button on Browse. Without one the plugin is not listed there.
  launcher: CommandCallSchema.optional(),
  // Set when the module exports `prompt`; lets the catalog offer the plugin
  // as an assistant before its code has loaded.
  promptHandler: z.boolean().optional(),
  // Where the code is. Absent for plugins bundled with the host.
  entry: z
    .object({
      // Module Federation remote entry, resolved against the registry origin.
      url: z.string(),
      // Exposed module name, e.g. './plugin'.
      module: z.string(),
      // A second exposed module, default-exporting the plugin's Matcher.
      // Separate from `module` because matching runs on every keystroke and
      // cannot wait for a UI bundle: the host fetches this one eagerly, so it
      // holds a matcher and nothing else. Absent means the plugin makes no
      // offers, which is the normal answer.
      matcher: z.string().optional(),
      // A third exposed module, exporting `related`. Separate from `module`
      // for the matcher's reason inverted: this one does I/O and is slow, so
      // it is fetched only when the pane has terms to ask about rather than
      // eagerly or with the UI bundle.
      related: z.string().optional(),
    })
    .optional(),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export function parseManifest(raw: unknown): Manifest {
  return ManifestSchema.parse(raw);
}

// "plugin:name" as written in a CommandCall or typed after the slash; a bare
// name belongs to `owner`.
export function qualifyCommand(command: string, owner: string): string {
  return command.includes(':') ? command : `${owner}:${command}`;
}
