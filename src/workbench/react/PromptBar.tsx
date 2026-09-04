import { useEffect, useRef, useState } from 'react';
import { PromptInput } from '@kbase/design-system';
import { parse, resolve } from '../commands';
import { useLayout, useMode, useRun, useServices } from './context';
import { focusPanelElement } from './useFocusSync';
import styles from './Workbench.module.css';

// The bottom bar. A leading slash makes it a command; anything else is a
// prompt for the assistant. Completion and the assistant handler arrive in
// later commits; this version resolves and runs commands.
export function PromptBar() {
  const [value, setValue] = useState('');
  const { registry, announcer, prompt } = useServices();
  const layout = useLayout();
  const mode = useMode();
  const run = useRun();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(
    () => prompt.register(() => wrapper.current?.querySelector('textarea')?.focus()),
    [prompt],
  );

  const submit = async (text: string) => {
    const parsed = parse(text);
    if (parsed.kind === 'prompt') {
      announcer.announce('No assistant is set up yet. Type / for commands.');
      return;
    }
    const focusKind = layout.focus ? (layout.panels[layout.focus]?.kind ?? null) : null;
    const resolved = resolve(registry, text, { mode, focusKind });
    if (!resolved.ok) {
      announcer.announce(resolved.message);
      return;
    }
    setValue('');
    await run(resolved.command.name, resolved.values);
  };

  return (
    <div
      ref={wrapper}
      className={styles.promptBar}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          focusPanelElement(layout.focus);
        }
      }}
    >
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={(text) => void submit(text)}
        label="Prompt"
        placeholder="Ask the assistant, or type / for commands"
        hint={null}
        flush
        maxRows={4}
      />
    </div>
  );
}
