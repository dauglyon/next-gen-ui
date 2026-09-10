import { createEmitter } from '../../sdk/emitter';
import { pathParam } from '../../sdk/routes';

// Mock state for the assistant, shaped like KOROS as KIND*AI shows it: a
// project holds arcs; an arc is one research question walked through the
// stages FRAME → INVESTIGATE → DELIVER → DONE, with a session the user steers
// by talking to it. Gates, drift and deliverables are left out of the mock.

// What the user attached to a turn when they sent it, kept as it was at send
// time; the payload stays in the cart item the handler was given.
export interface Attached {
  id: string;
  name: string;
  subject?: string;
}

export type Stage = 'FRAME' | 'INVESTIGATE' | 'DELIVER' | 'DONE';
export const STAGES: Stage[] = ['FRAME', 'INVESTIGATE', 'DELIVER', 'DONE'];

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
  stage: Stage;
  // What the session does next, as its record says.
  next: string;
  // Blocked on a human decision, such as approving the plan.
  needsYou: boolean;
  // The session is working on a turn.
  working: boolean;
  turns: Turn[];
}

// Project id → title.
const projects: Record<string, string> = {
  'soil-isolates': 'Soil isolates',
  'phage-hunt': 'Phage hunt',
};

const say = (a: Arc, by: Turn['by'], text: string, attached: Attached[] = []) => {
  a.turns = [...a.turns, { id: `${a.slug}-${a.turns.length}`, by, text, attached }];
};

// A seeded arc's question is its first turn.
function arc(
  a: Omit<Arc, 'needsYou' | 'working' | 'turns'> & { needsYou?: boolean; question: string },
) {
  const { question, ...rest } = a;
  const made: Arc = { ...rest, needsYou: a.needsYou ?? false, working: false, turns: [] };
  say(made, 'you', question);
  return [a.slug, made] as const;
}

const arcs = new Map<string, Arc>([
  arc({
    slug: 'nitro',
    title: 'Nitrogenase in isolate 12',
    project: 'soil-isolates',
    question: 'Which soil isolates carry nifH, and does isolate 12 fix nitrogen?',
    stage: 'INVESTIGATE',
    next: 'ci-verdict on the nifH screen',
  }),
  arc({
    slug: 'methanol-dh',
    title: 'Methanol dehydrogenase variants',
    project: 'soil-isolates',
    question: 'Do the lanthanide-dependent MDH variants cluster by soil pH?',
    stage: 'FRAME',
    next: 'plan-approval',
    needsYou: true,
  }),
  arc({
    slug: 't4-lysis',
    title: 'T4 lysis timing',
    project: 'phage-hunt',
    question: 'When does T4 lysis start at 30 °C?',
    stage: 'DONE',
    next: 'none',
  }),
]);

// An arc that has not been asked yet: New question opened it, and the first
// message sent to it is its question.
export const isEmpty = (a: Arc) => a.turns.length === 0;

export const slugOf = (path: string) => pathParam(path, { lower: true });

let currentArc: string | null = 'nitro';
const { subscribe, version, notify } = createEmitter();

export const koros = {
  subscribe,
  version,
  // Newest first, as KIND*AI sorts its rail.
  arcs: () => [...arcs.values()].reverse(),
  project: (id: string) => projects[id],
  arc: (slug: string) => arcs.get(slug),
  current: () => currentArc,
  // The arc free text goes to; null means the next message is a new question.
  setCurrent(slug: string | null) {
    if (currentArc === slug) return;
    currentArc = slug;
    notify();
  },
  working: () => [...arcs.values()].filter((a) => a.working).length,
  needingYou: () => [...arcs.values()].filter((a) => a.needsYou).length,
  // For the prompt bar: the current arc's session; every arc is a switch
  // target. New is the bar's own item and calls `newConversation`.
  destination() {
    const arc = currentArc ? arcs.get(currentArc) : undefined;
    return {
      label: arc ? arc.title : 'New question',
      path: arc ? `/${arc.slug}` : undefined,
      options: [...arcs.values()].map((a) => ({ key: a.slug, label: a.title })),
      select: (key: string) => koros.setCurrent(key),
    };
  },
  // An arc with no question yet, its own page, and the place the next
  // message lands. An empty one already open is that arc; a second would be
  // a second blank page. Standing alone, it is a project of its own, which
  // is how KIND*AI files an arc not filed under a project.
  newArc(): Arc {
    let empty = [...arcs.values()].find(isEmpty);
    if (!empty) {
      let n = 1;
      while (arcs.has(`new-${n}`)) n += 1;
      const slug = `new-${n}`;
      projects[slug] = 'New question';
      empty = {
        slug,
        title: 'New question',
        project: slug,
        stage: 'FRAME',
        next: 'your question',
        needsYou: false,
        working: false,
        turns: [],
      };
      arcs.set(slug, empty);
    }
    currentArc = empty.slug;
    notify();
    return empty;
  },
  // Cross the human-only gate: the plan is approved and INVESTIGATE begins.
  approve(slug: string) {
    const target = arcs.get(slug);
    if (!target || !target.needsYou) return;
    target.needsYou = false;
    target.stage = 'INVESTIGATE';
    target.next = 'data-validity';
    say(target, 'you', 'Plan approved.');
    say(target, 'koros', 'INVESTIGATE: running the plan. Next gate: data-validity. (Mock.)');
    notify();
  },
  // A message to the session, answered a moment later. To an arc not yet
  // asked it is the question: the arc takes its name from it, as KIND*AI
  // names an arc from its question, and FRAME begins, which a moment later
  // needs the plan approved.
  steer(slug: string, text: string, attached: Attached[] = []) {
    const target = arcs.get(slug);
    if (!target) return;
    const asking = isEmpty(target);
    if (asking) {
      target.title = text.length > 48 ? `${text.slice(0, 47)}…` : text;
      if (projects[target.project] === 'New question') projects[target.project] = target.title;
      target.next = 'check-commons';
    }
    say(target, 'you', text, attached);
    target.working = true;
    target.needsYou = false;
    notify();
    // The mock reply names what it was given, so the cart's round trip is
    // visible end to end rather than only in the composer.
    const named = attached.map((a) => a.subject ?? a.name).join(', ');
    const reply = asking
      ? 'FRAME: nothing in the commons answers this yet. Here is a plan; approve it to begin.'
      : attached.length
        ? `Noted. Reasoning over ${attached.length} attached ${
            attached.length === 1 ? 'item' : 'items'
          }: ${named}. (Mock reply.)`
        : 'Noted. A real session would act on that here. (Mock reply.)';
    window.setTimeout(() => {
      say(target, 'koros', reply);
      if (asking) {
        target.next = 'plan-approval';
        target.needsYou = true;
      }
      target.working = false;
      notify();
    }, 1500);
  },
};
