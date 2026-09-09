import { useSyncExternalStore } from 'react';
import { Chip, Tree } from '@kbase/design-system';
import { definePane, fromReact, useHost, usePanelTitle } from '@kbase/plugin-sdk';
import { koros } from './store';

function Projects() {
  usePanelTitle('Projects');
  useSyncExternalStore(koros.subscribe, koros.version, koros.version);
  const host = useHost();
  const items = koros.projects().map((p) => ({
    id: `project:${p.id}`,
    label: p.title,
    children: koros.arcsOf(p.id).map((a) => ({
      id: `arc:${a.slug}`,
      label: a.title,
      suffix: a.questions.some((q) => !q.answer) ? (
        <Chip color="purple" label="answering" />
      ) : undefined,
    })),
  }));
  return (
    <Tree.Root
      aria-label="Projects and arcs"
      items={items}
      selected={koros.current() ? `arc:${koros.current()}` : undefined}
      defaultExpanded={items.map((i) => i.id)}
      onSelect={(id) => {
        if (id.startsWith('arc:')) host.openRoute(`/${id.slice(4)}`);
      }}
    />
  );
}

export default definePane(fromReact(Projects));
