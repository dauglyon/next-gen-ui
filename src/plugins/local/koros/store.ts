// Mock state for the assistant. Nouns follow KIND*AI: a project holds arcs,
// an arc holds the questions asked in it. Sessions are ephemeral and not
// modelled here.

// What the user attached to the question when they asked it, kept as it was at
// send time. Enough of each item to show it and to reopen it — the payload
// itself stays in the cart item the handler was given.
export interface Attached {
  id: string;
  plugin: string;
  kind: string;
  name: string;
  subject?: string;
  path?: string;
}

export interface Question {
  id: string;
  text: string;
  attached: Attached[];
  answer: string | null;
}

export interface Arc {
  slug: string;
  title: string;
  project: string;
  questions: Question[];
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
    arc('nitro', 'Nitrogenase in isolate 12', 'soil-isolates', ['Which isolates carry nifH?']),
  ],
  ['methanol-dh', arc('methanol-dh', 'Methanol dehydrogenase variants', 'soil-isolates', [])],
  [
    't4-lysis',
    arc('t4-lysis', 'T4 lysis timing', 'phage-hunt', ['When does lysis start at 30 °C?']),
  ],
]);

function arc(slug: string, title: string, project: string, asked: string[]): Arc {
  return {
    slug,
    title,
    project,
    questions: asked.map((text, i) => ({
      attached: [],
      id: `${slug}-${i}`,
      text,
      answer: 'Answered earlier (mock).',
    })),
  };
}

let currentArc: string | null = 'nitro';
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
  arcsOf: (project: string) => [...arcs.values()].filter((a) => a.project === project),
  arc: (slug: string) => arcs.get(slug),
  current: () => currentArc,
  setCurrent(slug: string) {
    if (currentArc === slug) return;
    currentArc = slug;
    notify();
  },
  answering: () =>
    [...arcs.values()].reduce((n, a) => n + a.questions.filter((q) => !q.answer).length, 0),
  newArc(): Arc {
    const n = [...arcs.keys()].filter((k) => k.startsWith('q-')).length + 1;
    const created = arc(`q-${n}`, `Question ${n}`, 'soil-isolates', []);
    arcs.set(created.slug, created);
    currentArc = created.slug;
    notify();
    return created;
  },
  ask(slug: string, text: string, attached: Attached[] = []) {
    const target = arcs.get(slug);
    if (!target) return;
    const question: Question = {
      id: `${slug}-${target.questions.length}`,
      text,
      attached,
      answer: null,
    };
    target.questions = [...target.questions, question];
    notify();
    setTimeout(() => {
      // The mock answer names what it was given, so the cart's round trip is
      // visible end to end rather than only in the composer.
      const named = attached.map((a) => a.subject ?? a.name).join(', ');
      question.answer = attached.length
        ? `Mock answer to “${text}”, reasoning over ${attached.length} attached ${
            attached.length === 1 ? 'item' : 'items'
          }: ${named}.`
        : `Mock answer to “${text}”. A real assistant would reason over the arc's data here.`;
      target.questions = [...target.questions];
      notify();
    }, 1500);
  },
};
