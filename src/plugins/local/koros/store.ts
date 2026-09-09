// Mock state for the assistant, shaped like KOROS as KIND*AI shows it: a
// project holds arcs; an arc is one research question walked through the
// stages FRAME → INVESTIGATE → DELIVER → DONE, with a session the user steers
// by talking to it. Gates, drift and deliverables are left out of the mock.

// What the user attached to a turn when they sent it, kept as it was at send
// time. Enough of each item to show it; the payload stays in the cart item the
// handler was given.
export interface Attached {
  id: string;
  name: string;
  subject?: string;
  path?: string;
}

export type Stage = 'FRAME' | 'INVESTIGATE' | 'DELIVER' | 'DONE';
export const STAGES: Stage[] = ['FRAME', 'INVESTIGATE', 'DELIVER', 'DONE'];

// One line of the session: the user's, or the session's reply.
export interface Turn {
  id: string;
  by: 'you' | 'koros';
  text: string;
  attached: Attached[];
}

export interface Arc {
  slug: string;
  title: string;
  project: string;
  question: string;
  stage: Stage;
  // What the session does next, as its record says.
  next: string;
  // Blocked on a human decision, such as approving the plan.
  needsYou: boolean;
  // The session is working on a turn.
  working: boolean;
  turns: Turn[];
}

export interface Project {
  id: string;
  title: string;
}

const projects: Project[] = [
  { id: 'soil-isolates', title: 'Soil isolates' },
  { id: 'phage-hunt', title: 'Phage hunt' },
];

const arcs = new Map<string, Arc>([
  [
    'nitro',
    arc({
      slug: 'nitro',
      title: 'Nitrogenase in isolate 12',
      project: 'soil-isolates',
      question: 'Which soil isolates carry nifH, and does isolate 12 fix nitrogen?',
      stage: 'INVESTIGATE',
      next: 'ci-verdict on the nifH screen',
    }),
  ],
  [
    'methanol-dh',
    arc({
      slug: 'methanol-dh',
      title: 'Methanol dehydrogenase variants',
      project: 'soil-isolates',
      question: 'Do the lanthanide-dependent MDH variants cluster by soil pH?',
      stage: 'FRAME',
      next: 'plan-approval',
      needsYou: true,
    }),
  ],
  [
    't4-lysis',
    arc({
      slug: 't4-lysis',
      title: 'T4 lysis timing',
      project: 'phage-hunt',
      question: 'When does T4 lysis start at 30 °C?',
      stage: 'DONE',
      next: 'none',
    }),
  ],
]);

function arc(a: Omit<Arc, 'needsYou' | 'working' | 'turns'> & { needsYou?: boolean }): Arc {
  return {
    ...a,
    needsYou: a.needsYou ?? false,
    working: false,
    turns: [{ id: `${a.slug}-0`, by: 'you', text: a.question, attached: [] }],
  };
}

// The arc named by a path: `/nitro`, with any query or fragment dropped.
// Slugs are lowercase, so case never splits one arc into two panels.
export const slugOf = (path: string) => path.split(/[?#]/)[0].slice(1).toLowerCase();

// What the New question page opens with. One page is reused for every open,
// so the prefill travels here rather than on the path; `id` tells the page
// a new one arrived.
export interface Draft {
  id: number;
  project?: string;
  question?: string;
}

// KIND*AI's rule: the arc is named from its question unless the user names it.
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .replace(/-$/, '');

let currentArc: string | null = 'nitro';
let draft: Draft = { id: 0 };
let version = 0;
const listeners = new Set<() => void>();
const notify = () => {
  version += 1;
  listeners.forEach((l) => l());
};

export const koros = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  version: () => version,
  projects: () => projects,
  // Newest first, as KIND*AI sorts its rail.
  arcs: () => [...arcs.values()].reverse(),
  arcsOf: (project: string) => [...arcs.values()].filter((a) => a.project === project),
  project: (id: string) => projects.find((p) => p.id === id),
  arc: (slug: string) => arcs.get(slug),
  current: () => currentArc,
  setCurrent(slug: string) {
    if (currentArc === slug) return;
    currentArc = slug;
    notify();
  },
  draft: () => draft,
  propose(next: Omit<Draft, 'id'>) {
    draft = { ...next, id: draft.id + 1 };
    notify();
  },
  working: () => [...arcs.values()].filter((a) => a.working).length,
  needingYou: () => [...arcs.values()].filter((a) => a.needsYou).length,
  // Where the next free-text message lands, for the prompt bar: the current
  // arc's session, else a new question; every arc is offered as a switch target.
  destination() {
    const arc = currentArc ? arcs.get(currentArc) : undefined;
    return {
      label: arc ? arc.title : 'A new question',
      path: arc ? `/${arc.slug}` : '/new',
      options: [...arcs.values()].map((a) => ({ key: a.slug, label: a.title })),
      select: (key: string) => koros.setCurrent(key),
    };
  },
  // Start an arc for a question. Filed under a project if one is named;
  // otherwise it stands alone, which KIND*AI shows as a project of its own
  // holding the one arc. It opens at FRAME and, a moment later, asks for the
  // plan to be approved, which is where a real one first needs you.
  start(question: string, project?: string, attached: Attached[] = []): Arc {
    let slug = slugify(question) || 'question';
    for (let n = 2; arcs.has(slug); n += 1) slug = `${slugify(question)}-${n}`;
    const title = question.length > 48 ? `${question.slice(0, 47)}…` : question;
    if (!project) {
      project = slug;
      projects.push({ id: slug, title });
    }
    const created: Arc = {
      slug,
      title,
      project,
      question,
      stage: 'FRAME',
      next: 'check-commons',
      needsYou: false,
      working: true,
      turns: [{ id: `${slug}-0`, by: 'you', text: question, attached }],
    };
    arcs.set(slug, created);
    currentArc = slug;
    notify();
    window.setTimeout(() => {
      created.turns = [
        ...created.turns,
        {
          id: `${slug}-1`,
          by: 'koros',
          text: 'FRAME: nothing in the commons answers this yet. Here is a plan; approve it to begin.',
          attached: [],
        },
      ];
      created.next = 'plan-approval';
      created.needsYou = true;
      created.working = false;
      notify();
    }, 1500);
    return created;
  },
  // Cross the human-only gate: the plan is approved and INVESTIGATE begins.
  approve(slug: string) {
    const target = arcs.get(slug);
    if (!target || !target.needsYou) return;
    target.needsYou = false;
    target.stage = 'INVESTIGATE';
    target.next = 'data-validity';
    target.turns = [
      ...target.turns,
      { id: `${slug}-${target.turns.length}`, by: 'you', text: 'Plan approved.', attached: [] },
      {
        id: `${slug}-${target.turns.length + 1}`,
        by: 'koros',
        text: 'INVESTIGATE: running the plan. Next gate: data-validity. (Mock.)',
        attached: [],
      },
    ];
    notify();
  },
  // Steer the session: a turn of the user's, answered a moment later.
  steer(slug: string, text: string, attached: Attached[] = []) {
    const target = arcs.get(slug);
    if (!target) return;
    target.turns = [
      ...target.turns,
      { id: `${slug}-${target.turns.length}`, by: 'you', text, attached },
    ];
    target.working = true;
    target.needsYou = false;
    notify();
    window.setTimeout(() => {
      // The mock reply names what it was given, so the cart's round trip is
      // visible end to end rather than only in the composer.
      const named = attached.map((a) => a.subject ?? a.name).join(', ');
      target.turns = [
        ...target.turns,
        {
          id: `${slug}-${target.turns.length}`,
          by: 'koros',
          text: attached.length
            ? `Noted. Reasoning over ${attached.length} attached ${
                attached.length === 1 ? 'item' : 'items'
              }: ${named}. (Mock reply.)`
            : 'Noted. A real session would act on that here. (Mock reply.)',
          attached: [],
        },
      ];
      target.working = false;
      notify();
    }, 1500);
  },
};
