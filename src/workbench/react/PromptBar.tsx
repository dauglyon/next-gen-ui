import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { KeyboardEvent } from 'react';
import { ArrowUpRight, CaretUpDown, Check } from '@phosphor-icons/react';
import { Menu, PromptInput } from '@kbase/design-system';
import type { PromptContext } from '../../plugins/sdk';
import { makePanel } from '../core';
import type { Suggestion } from '../commands';
import { complete, parse, resolve, usage } from '../commands';
import { useDispatch, useLayout, useRun, useServices } from './context';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ctx() reads the layout, which changes how commands filter but should not refetch on every layout change
  }, [value, registry]);

  const parsed = parse(value);
  const known = parsed.kind === 'command' ? registry.get(parsed.name) : undefined;
  // Free-text destination is the row above the bar; the hint slot only
  // ever explains the command being typed.
  const hint =
    parsed.kind === 'command' && known && known.args?.length
      ? `${usage(known.name, known.args)} — ${known.title}`
      : null;

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
        footer={<PromptDestination />}
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

// Where free text will land: the assistant, and — once its module has
// loaded — the conversation it reports via usePromptContext. Lives inside
// the composer's footer row, like an email's To line.
function PromptDestination() {
  const { source, settings } = useServices();
  const assistant = useSyncExternalStore(settings.subscribe, settings.get, settings.get).assistant;
  useSyncExternalStore(source.subscribe, source.version, source.version);
  if (!assistant) {
    return (
      <p className={styles.promptContext}>
        Free text needs an assistant — pick one in the catalog.
      </p>
    );
  }
  const title = source.manifest(assistant)?.title ?? assistant;
  const usePromptContext = source.loaded(assistant)?.usePromptContext;
  return (
    <p className={styles.promptContext}>
      <span>To</span>
      <span className={styles.promptDestination}>{title}</span>
      {usePromptContext && (
        <AssistantContext assistant={assistant} usePromptContext={usePromptContext} />
      )}
    </p>
  );
}

// The destination control: a switcher over the assistant's offered
// targets, and a jump to the destination's document.
function AssistantContext({
  assistant,
  usePromptContext,
}: {
  assistant: string;
  usePromptContext: () => PromptContext | null;
}) {
  const context = usePromptContext();
  const dispatch = useDispatch();
  if (!context) return null;
  const { label, documentParams, options, select } = context;
  const switchable = !!options?.length && !!select;
  return (
    <>
      <span aria-hidden="true">·</span>
      {switchable ? (
        <Menu.Root>
          <Menu.Trigger
            render={<button type="button" className={styles.promptTarget} />}
            aria-label={`Prompt destination: ${label}. Change destination`}
          >
            {label}
            <CaretUpDown size={12} aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Popup>
            {options.map((option) => (
              <Menu.Item key={option.key} onClick={() => select(option.key)}>
                <Check
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  style={{ visibility: option.label === label ? 'visible' : 'hidden' }}
                />
                {option.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Root>
      ) : (
        <span className={styles.promptDestination}>{label}</span>
      )}
      {documentParams && (
        <button
          type="button"
          className={styles.promptTarget}
          aria-label={`Go to ${label}`}
          onClick={() =>
            dispatch({ type: 'open', panel: makePanel(assistant, 'document', documentParams) })
          }
        >
          <ArrowUpRight size={13} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
