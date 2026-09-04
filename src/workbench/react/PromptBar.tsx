import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { PromptInput } from '@kbase/design-system';
import { makePanel } from '../core';
import type { Suggestion } from '../commands';
import { complete, parse, resolve, usage } from '../commands';
import { useLayout, useMode, useRun, useServices } from './context';
import { focusPanelElement } from './useFocusSync';
import styles from './Workbench.module.css';

// The bottom bar. A leading slash makes it a command, completed from the
// registry before any plugin code loads; anything else goes to the
// assistant the user chose in the catalog.
export function PromptBar() {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { registry, announcer, prompt, settings, source, dispatch } = useServices();
  const layout = useLayout();
  const mode = useMode();
  const run = useRun();
  const wrapper = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const listId = useId();
  const assistant = useSyncExternalStore(settings.subscribe, settings.get, settings.get).assistant;
  const assistantTitle = assistant ? source.manifest(assistant)?.title : undefined;

  useEffect(
    () => prompt.register(() => wrapper.current?.querySelector('textarea')?.focus()),
    [prompt],
  );

  const ctx = () => ({
    mode,
    focusKind: layout.focus ? (layout.panels[layout.focus]?.kind ?? null) : null,
  });

  // Completion follows the text; a stale async result for older text is dropped.
  useEffect(() => {
    let live = true;
    // complete() answers [] for anything that is not a slash command.
    void complete(registry, value, ctx()).then((list) => {
      if (!live) return;
      setSuggestions(list);
      setHighlight(0);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ctx() reads layout/mode, which change how commands filter but should not refetch on every layout change
  }, [value, registry]);

  const parsed = parse(value);
  const known = parsed.kind === 'command' ? registry.get(parsed.name) : undefined;
  const hint =
    parsed.kind === 'command' && known && known.args?.length
      ? `${usage(known.name, known.args)} — ${known.title}`
      : busy
        ? 'Answering…'
        : assistantTitle
          ? `Free text goes to ${assistantTitle}. Type / for commands.`
          : 'No assistant is set. Pick one in the catalog, or type / for commands.';

  const accept = (s: Suggestion) => {
    setValue(s.value);
    setSuggestions([]);
  };

  const submit = async (text: string) => {
    setError(null);
    const parsed = parse(text);
    if (parsed.kind === 'command') {
      const resolved = resolve(registry, text, ctx());
      if (!resolved.ok) {
        setError(resolved.message);
        announcer.announce(resolved.message);
        return;
      }
      setValue('');
      await run(resolved.command.name, resolved.values);
      return;
    }
    if (!assistant) {
      const message = 'No assistant is set. Pick one in the catalog.';
      setError(message);
      announcer.announce(message);
      return;
    }
    const handler = await source.promptHandler(assistant);
    if (!handler) {
      const message = `${assistantTitle ?? assistant} cannot answer prompts.`;
      setError(message);
      announcer.announce(message);
      return;
    }
    setValue('');
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    try {
      await handler(
        { text, signal: controller.signal },
        {
          openDocument: (params) =>
            void dispatch({ type: 'open', panel: makePanel(assistant, 'document', params) }),
          runCommand: (name, values) => run(name, values ?? {}),
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The assistant failed.';
      setError(message);
      announcer.announce(message);
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setBusy(false);
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (suggestions.length) setSuggestions([]);
      else focusPanelElement(layout.focus);
      return;
    }
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (
      event.key === 'Tab' ||
      (event.key === 'Enter' && suggestions[highlight]?.value !== value)
    ) {
      event.preventDefault();
      accept(suggestions[highlight]);
    }
  };

  const open = suggestions.length > 0;
  return (
    <div ref={wrapper} className={styles.promptBar}>
      {open && (
        <ul id={listId} role="listbox" aria-label="Completions" className={styles.completions}>
          {suggestions.map((s, i) => (
            <li
              key={s.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={styles.completion}
              data-highlighted={i === highlight || undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                accept(s);
              }}
            >
              <span className={styles.completionLabel}>{s.label}</span>
              {s.detail && <span className="caption">{s.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={(text) => void submit(text)}
        label="Prompt"
        placeholder="Ask the assistant, or type / for commands"
        hint={hint}
        error={error}
        busy={busy}
        onStop={() => abort.current?.abort()}
        flush
        maxRows={4}
        fieldProps={{
          role: 'combobox',
          'aria-expanded': open,
          'aria-controls': open ? listId : undefined,
          'aria-activedescendant': open ? `${listId}-${highlight}` : undefined,
          'aria-autocomplete': 'list',
          onKeyDown,
        }}
      />
    </div>
  );
}
