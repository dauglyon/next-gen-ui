import type { ChipColor } from '@kbase/design-system';
import { createEmitter } from '../../sdk/emitter';
import { pathParam } from '../../sdk/routes';

export type JobStatus = 'queued' | 'running' | 'done' | 'cancelled' | 'failed';

export const idOf = (path: string) => pathParam(path);

export const COLORS: Record<JobStatus, ChipColor> = {
  queued: 'neutral',
  running: 'purple',
  done: 'green',
  cancelled: 'neutral',
  failed: 'red',
};

export interface Job {
  id: string;
  name: string;
  status: JobStatus;
  progress: number;
  app: string;
}

const jobs: Job[] = [
  { id: '12', name: 'Assemble reads', status: 'running', progress: 0.35, app: 'SPAdes' },
  { id: '13', name: 'Annotate isolate 12', status: 'queued', progress: 0, app: 'RAST' },
  { id: '20', name: 'nifH search', status: 'done', progress: 1, app: 'BLAST' },
  { id: '21', name: 'Bin metagenome', status: 'failed', progress: 0.6, app: 'MetaBAT' },
];

const emitter = createEmitter();
let subscribers = 0;

// Running jobs creep forward while any listener is attached.
let timer: ReturnType<typeof setInterval> | null = null;
function ensureTicking() {
  if (timer || subscribers === 0) return;
  timer = setInterval(() => {
    let changed = false;
    for (const job of jobs) {
      if (job.status !== 'running') continue;
      job.progress = Math.min(1, job.progress + 0.02);
      if (job.progress >= 1) job.status = 'done';
      changed = true;
    }
    const queued = jobs.find((j) => j.status === 'queued');
    if (queued && !jobs.some((j) => j.status === 'running')) {
      queued.status = 'running';
      changed = true;
    }
    if (changed) emitter.notify();
    if (subscribers === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

export const jobStore = {
  subscribe(listener: () => void) {
    subscribers += 1;
    ensureTicking();
    const off = emitter.subscribe(listener);
    return () => {
      subscribers -= 1;
      off();
    };
  },
  version: emitter.version,
  all: () => jobs,
  get: (id: string) => jobs.find((j) => j.id === id),
  running: () => jobs.filter((j) => j.status === 'running').length,
  cancel(id: string): boolean {
    const job = jobs.find((j) => j.id === id);
    if (!job || (job.status !== 'running' && job.status !== 'queued')) return false;
    job.status = 'cancelled';
    emitter.notify();
    return true;
  },
};
