# @kbase/plugin-sdk

What a next-gen-ui workbench plugin imports. A plugin is two things: a **manifest** the registry
serves (read by the host before any code loads) and a **module** the host loads on first use.

## Manifest

```json
{
  "id": "jobs",
  "title": "Jobs",
  "contractVersion": 1,
  "icon": "ListChecks",
  "navigator": {},
  "document": { "route": "/job/$id" },
  "commands": [
    {
      "name": "cancel",
      "title": "Cancel a job",
      "args": [{ "name": "id", "type": "string", "required": true }]
    }
  ],
  "promptHandler": false,
  "entry": { "url": "jobs/remoteEntry.js", "module": "./plugin" }
}
```

`ManifestSchema` validates it. Ids are `^[a-z][a-z0-9-]{1,40}$` and never change once published.
`document.route` uses `$name` segments; those names are the document's params and its identity.

## Module

```tsx
import { definePlugin, usePanel, usePanelTitle, useHost } from '@kbase/plugin-sdk';

function Navigator() {
  usePanelTitle('Jobs');
  const host = useHost();
  return <button onClick={() => host.openDocument({ id: '12' })}>Job 12</button>;
}

function Document() {
  const { params } = usePanel();
  usePanelTitle(`Job ${params.id}`);
  return <p>{params.id}</p>;
}

export default definePlugin({
  navigator: Navigator,
  document: Document,
  commands: {
    cancel: ({ id }, host) => {
      /* … */
    },
  },
  useStatus: () => [{ text: '1 running' }],
});
```

- One `navigator` component and one `document` component at most; both read `usePanel()` for
  their id, params, focus state and `setTitle`. A panel shows the plugin title until it sets one.
- `commands` implement what the manifest declared; the host validates arguments before calling.
- `prompt(request, host)` makes the plugin an assistant candidate (`promptHandler: true`).
- `useStatus` is a hook returning `{ text, command? }` items for the status bar; called once the
  module has loaded.
- `usePromptContext` is a hook naming where free text will land (the open conversation, or what
  submitting would create): `{ label, documentParams?, options?, select? }`. Shown above the
  prompt bar once the module has loaded; `options` + `select` let the user switch the destination
  before sending, `documentParams` lets them jump to its document.
- `AppFrame` renders an iframe that survives its panel being moved between groups.

## Building a remote

```ts
// vite.config.ts
import { pluginFederation } from '@kbase/plugin-sdk/vite';
export default { plugins: [pluginFederation({ name: 'jobs' }), react()] };
```

Emits `remoteEntry.js` exposing `./plugin`. `react`, `react-dom`, `zod`, `@kbase/design-system`
and this SDK are shared singletons with the host.
