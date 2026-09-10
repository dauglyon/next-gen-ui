import { useSyncExternalStore } from 'react';
import { Chip, Tree } from '@kbase/design-system';
import { definePane, fromReact, useHost, usePanelTitle } from '@kbase/plugin-sdk';
import { COLORS, jobStore } from './store';

function JobList() {
  usePanelTitle('Jobs');
  useSyncExternalStore(jobStore.subscribe, jobStore.version, jobStore.version);
  const host = useHost();
  const items = jobStore.all().map((job) => ({
    id: job.id,
    label: job.name,
    content: (
      <span title={`${job.name} · #${job.id} · ${job.app}`}>
        {job.name}
        <span className="caption">{` · #${job.id} · ${job.app}`}</span>
      </span>
    ),
    suffix: <Chip color={COLORS[job.status]} label={job.status} />,
  }));
  return <Tree.Root aria-label="Jobs" items={items} onSelect={(id) => host.openRoute(`/${id}`)} />;
}

export default definePane(fromReact(JobList));
