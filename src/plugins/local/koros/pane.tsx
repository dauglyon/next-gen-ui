import { useState, useSyncExternalStore } from 'react';
import { Plus } from '@phosphor-icons/react';
import { Button, Chip, Tree } from '@kbase/design-system';
import { definePane, fromReact, useHost, usePanelTitle } from '@kbase/plugin-sdk';
import { koros } from './store';
import styles from './koros.module.css';

// KIND*AI's Projects rail, reduced: the projects, their arcs, and on each arc
// the one thing that matters at a glance — that it needs you, else its stage.
// New question is the rail's own button there too, and each project has a +
// that files the question under it.
function Projects() {
  usePanelTitle('Projects');
  useSyncExternalStore(koros.subscribe, koros.version, koros.version);
  const host = useHost();
  // Expanded unless folded here: a project that appears later, for a question
  // just asked, opens with its arc showing rather than hiding it.
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const items = koros.projects().map((p) => ({
    id: `project:${p.id}`,
    label: p.title,
    actions: (
      <Button
        variant="ghost"
        size="xs"
        aria-label={`New question in ${p.title}`}
        onClick={(e) => {
          e.stopPropagation();
          koros.propose({ project: p.id });
          host.openRoute('/new');
        }}
      >
        <Plus size={14} aria-hidden="true" />
      </Button>
    ),
    children: koros.arcsOf(p.id).map((a) => ({
      id: `arc:${a.slug}`,
      label: a.title,
      suffix: a.needsYou ? (
        <Chip color="purple" label="needs you" />
      ) : (
        <span className={`caption ${styles.stage}`}>{a.stage.toLowerCase()}</span>
      ),
    })),
  }));
  return (
    <div className={styles.pane}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          koros.propose({});
          host.openRoute('/new');
        }}
      >
        <Plus size={14} aria-hidden="true" />
        New question
      </Button>
      <Tree.Root
        aria-label="Projects and arcs"
        items={items}
        selected={koros.current() ? `arc:${koros.current()}` : undefined}
        expanded={items.map((i) => i.id).filter((id) => !folded.has(id))}
        onExpandedChange={(ids) =>
          setFolded(new Set(items.map((i) => i.id).filter((id) => !ids.includes(id))))
        }
        onSelect={(id) => {
          if (id.startsWith('arc:')) host.openRoute(`/${id.slice(4)}`);
        }}
      />
    </div>
  );
}

export default definePane(fromReact(Projects));
