import { defineIntent } from '@kbase/plugin-sdk';
import type { CommandIndex } from './rank';
import { buildCommandIndex, rankCommands } from './rank';
import { tagText } from './tag';

// The bundled intent: every declared command ranked against the text by
// character n-grams over its declaration, arguments filled from the
// identifiers the text carries. The catalog is indexed once; a keystroke
// costs one short vector and a dot product per command.
let index: CommandIndex | null = null;

export default defineIntent({
  index: (commands) => {
    index = buildCommandIndex(commands);
  },
  suggest: ({ text, terms }) => {
    if (!index || !text) return [];
    return rankCommands(index, text, tagText(text), terms ?? []).map((r) => {
      const filled = Object.values(r.args);
      return {
        call: {
          label: filled.length ? `${r.title}: ${filled.join(', ')}` : r.title,
          command: r.command,
          args: r.args,
        },
        score: r.score,
      };
    });
  },
});
