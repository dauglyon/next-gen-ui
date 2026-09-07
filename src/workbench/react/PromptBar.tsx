import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentType, KeyboardEvent } from 'react';
import { ArrowUpRight, CaretRight, CaretUpDown, Check } from '@phosphor-icons/react';
import type { IconProps } from '@phosphor-icons/react';
import { Menu, PromptInput, cx } from '@kbase/design-system';
import type { Manifest, PromptContext } from '../../plugins/sdk';
import { makePanel } from '../core';
import type { Suggestion } from '../commands';
import { complete, parse, resolve, usage } from '../commands';
import { iconFor } from '../host/icons';
import { routeParams } from '../host/routes';
import { CartTray } from './CartTray';
import { useDispatch, useLayout, useRun, useServices } from './context';
import { focusPanelElement } from './useFocusSync';
import styles from './Workbench.module.css';

// A suggestion that acts directly, for offers whose params no command
// string could carry, and that says whose it is.
type BarSuggestion = Suggestion & {
  run?: () => void;
  icon?: ComponentType<IconProps>;
  // A command name is code and set in the mono face; an offer is a
  // phrase and is not.
  mono?: boolean;
};

// The bottom bar. A leading slash makes it a command, completed from the
// registry before any plugin code loads; anything else goes to the
// assistant the user chose in the catalog.
export function PromptBar() {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<BarSuggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { registry, announcer, prompt, settings, source, dispatch, preview, cart } = useServices();
  const layout = useLayout();
  const run = useRun();
  const wrapper = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  const listId = useId();
  const assistant = useSyncExternalStore(settings.subscribe, settings.get, settings.get).assistant;
  // Read here rather than inside the tray: a component that renders null is
  // still a non-null element, so passing it unconditionally would open the
  // composer's attachments row — border, padding and all — around nothing.
  useSyncExternalStore(cart.subscribe, cart.version, cart.version);
  const inCart = cart.items().length;
  const assistantTitle = assistant ? source.manifest(assistant)?.title : undefined;

  useEffect(
    () => prompt.register(() => wrapper.current?.querySelector('textarea')?.focus()),
    [prompt],
  );

  const ctx = () => ({
    focusKind: layout.focus ? (layout.panels[layout.focus]?.kind ?? null) : null,
  });

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
      // The cart as it stands at send time, and then emptied: the attachments
      // belong to the message, the way a photo does. Leaving them would attach
      // them again to the next one.
      const attachments = cart.items();
      cart.clear();
      await handler(
        { text, signal: controller.signal, attachments },
        {
          openDocument: (params) =>
            void dispatch({ type: 'open', panel: makePanel(assistant, 'document', params) }),
          runCommand: (name, values) => run(name, values ?? {}),
          cart: {
            add: (item) => cart.add({ ...item, plugin: assistant, addedAt: Date.now() }),
            remove: (id) => cart.remove(id),
            has: (id) => cart.has(id),
            count: () => cart.items().length,
            subscribe: (listener) => cart.subscribe(listener),
          },
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

  // What plugins volunteered for this text, ahead of name matches: a
  // plugin recognising its own data is a better answer than a plugin
  // whose description happens to share a word.
  const offerSuggestions = (text: string): BarSuggestion[] =>
    source
      .offers(text.trim())
      .slice(0, 4)
      .map(({ plugin, title, offer }) => ({
        value: text,
        // The offer says where you land; the app is who takes you.
        label: offer.label,
        detail: title,
        icon: iconFor(source.manifest(plugin)?.icon, source.manifest(plugin)?.color),
        run: () =>
          void dispatch({
            type: 'open',
            panel: makePanel(plugin, 'document', offer.action),
          }),
      }));

  // Row zero is what Enter will do. Nothing is guessed: the assistant
  // stays the default and the alternatives sit under it, visible before
  // the key is pressed rather than hidden behind knowing to press down.
  const defaultSuggestion = (text: string): BarSuggestion[] =>
    assistant
      ? [
          {
            value: text,
            // `Ask` only fits a question, and most of what is typed here is
            // an accession or a name. Send is what the row does, and the word
            // the composer's own button already uses.
            label: `Send to ${assistantTitle ?? assistant}`,
            icon: iconFor(source.manifest(assistant)?.icon, source.manifest(assistant)?.color),
            run: () => void submit(text),
          },
        ]
      : [];

  // Every term must appear somewhere in a plugin's name, id or
  // description; a name being typed outranks a description hit. Shared
  // by the app and panel rows below.
  const nameHits = (text: string, of: (m: Manifest) => boolean): Manifest[] => {
    const query = text.trim().toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    if (query.length < 2) return [];
    return source
      .manifests()
      .filter(of)
      .flatMap((m) => {
        const title = m.title.toLowerCase();
        const haystack = `${title} ${m.id} ${m.description?.toLowerCase() ?? ''}`;
        if (!terms.every((t) => haystack.includes(t))) return [];
        return [{ m, rank: title.startsWith(terms[0]) || m.id.startsWith(terms[0]) ? 0 : 1 }];
      })
      .sort((a, b) => a.rank - b.rank || a.m.title.localeCompare(b.m.title))
      .slice(0, 3)
      .map(({ m }) => m);
  };

  // The omnibox path to page-like plugins: "protein evidence" reaches
  // Function Junction without knowing it exists.
  const appSuggestions = (text: string): BarSuggestion[] =>
    nameHits(text, (m) => Boolean(m.document) && routeParams(m.document!.route).length === 0).map(
      (m) => ({
        value: `/open ${m.id}`,
        label: `Open ${m.title}`,
        detail: m.description,
        icon: iconFor(m.icon, m.color),
        run: () => void submit(`/open ${m.id}`),
      }),
    );

  // Panels are reached the way Home reaches them: a pinned navigator is
  // focused where it already lives, an unpinned one is previewed. The
  // bar never changes the layout to show you something.
  const panelSuggestions = (text: string): BarSuggestion[] =>
    nameHits(text, (m) => Boolean(m.navigator)).map((m) => {
      const pinned = layout.sidebar.pinned.includes(m.id);
      return {
        value: text,
        label: `Show ${m.title}`,
        detail: pinned ? 'In the sidebar' : m.description,
        icon: iconFor(m.icon, m.color),
        run: () =>
          pinned
            ? void dispatch({ type: 'open', panel: makePanel(m.id, 'navigator') })
            : preview.set(m.id),
      };
    });

  // The verbs plugins put on the Shortcuts toolbar, reachable by name as
  // well as by button. One that takes arguments completes into the bar
  // instead of running, since the bar is where they get typed.
  const shortcutSuggestions = (text: string): BarSuggestion[] => {
    const query = text.trim().toLowerCase();
    if (query.length < 2) return [];
    return source
      .manifests()
      .flatMap((m) =>
        (m.commands ?? [])
          .filter((c) => c.shortcut)
          .map((c) => ({ m, c, label: typeof c.shortcut === 'string' ? c.shortcut : c.title })),
      )
      .filter(({ c, label }) => `${label} ${c.title} ${c.name}`.toLowerCase().includes(query))
      .slice(0, 3)
      .map(({ m, c, label }) => {
        const needsArgs = (c.args ?? []).some((a) => a.required);
        return {
          value: `/${c.name}${needsArgs ? ' ' : ''}`,
          label,
          detail: c.title,
          icon: iconFor(c.icon ?? m.icon, m.color),
          run: needsArgs ? undefined : () => void run(c.name),
        };
      });
  };

  // The full-density form of the same search, for when the rows above are
  // guesses rather than answers.
  const browseSuggestion: BarSuggestion = {
    value: '/open home',
    label: 'Browse everything',
    icon: iconFor(source.manifest('home')?.icon, source.manifest('home')?.color),
    run: () => void submit('/open home'),
  };

  // Completion follows the text; a stale async result for older text is dropped.
  useEffect(() => {
    let live = true;
    // complete() answers [] for anything that is not a slash command.
    void complete(registry, value, ctx()).then((list) => {
      if (!live) return;
      // A command's icon is its plugin's; the workbench's own have none.
      const commands: BarSuggestion[] = list.map((s) => {
        const owner = registry.get(s.value.trim().replace(/^\//, '').split(/\s+/)[0])?.source;
        const manifest = owner ? source.manifest(owner) : undefined;
        return {
          ...s,
          mono: true,
          icon: manifest ? iconFor(manifest.icon, manifest.color) : undefined,
        };
      });
      // Priority order, painted bottom-up: a plugin recognising its own
      // data beats a shortcut's name, which beats a word shared with a
      // description.
      // An offer is a plugin saying it recognises this text and what it would
      // do with it. The rows under it are name and description matches — the
      // same search the Browse page runs, inline.
      const offers = list.length ? [] : offerSuggestions(value);
      const guesses = list.length
        ? []
        : [...shortcutSuggestions(value), ...appSuggestions(value), ...panelSuggestions(value)];
      const alternatives = [...offers, ...guesses];
      // Nothing worth choosing between: no list, and Enter behaves as if
      // there were none.
      // Browse only where it adds something: no plugin claimed the text, so
      // what is on offer is a name match and the full list may do better. With
      // an offer present it was a fourth row saying "or look somewhere else"
      // under an answer.
      const found = list.length
        ? commands
        : alternatives.length
          ? [
              ...defaultSuggestion(value),
              ...alternatives,
              ...(offers.length ? [] : [browseSuggestion]),
            ]
          : [];
      setSuggestions(found);
      // Row zero is always the default action, so it is always selected;
      // arrowing away from it changes what Enter does, visibly.
      setHighlight(found.length ? 0 : -1);
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

  const accept = (s: BarSuggestion) => {
    // A row that acts has nothing to complete; a command completion is
    // text the user may still add arguments to.
    if (s.run) {
      setValue('');
      setSuggestions([]);
      s.run();
      return;
    }
    setValue(s.value);
    setSuggestions([]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (suggestions.length) setSuggestions([]);
      else focusPanelElement(layout.focus);
      return;
    }
    if (!suggestions.length) return;
    // The list opens upward, so the arrows follow the screen, not the
    // array: Up walks away from the field, Down walks back toward it.
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length : h) - 1);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      accept(suggestions[Math.max(0, highlight)]);
    } else if (event.key === 'Enter' && highlight >= 0) {
      const chosen = suggestions[highlight];
      // A row that acts always acts; a completion is skipped when it
      // would only retype what is already there.
      if (chosen.run || chosen.value !== value) {
        event.preventDefault();
        accept(chosen);
      }
    }
  };

  const open = suggestions.length > 0;
  return (
    <div ref={wrapper} className={styles.promptBar}>
      {open && (
        <ul id={listId} role="listbox" aria-label="Completions" className={styles.completions}>
          {suggestions.map((s, i) => (
            <li
              // By position: several rows can share a value (every offer
              // for one query carries the text that produced it), and a
              // duplicate key renders the list wrong.
              key={i}
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
              <span className={styles.completionIcon} aria-hidden="true">
                {s.icon ? <s.icon size={14} /> : null}
              </span>
              <span className={s.mono ? styles.completionLabel : styles.completionText}>
                {s.label}
              </span>
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
        placeholder="Type a name, an id, or a question — / for commands"
        hint={hint}
        error={error}
        busy={busy}
        onStop={() => abort.current?.abort()}
        footer={<PromptDestination />}
        // Inside the composer, because the cart is part of what Send sends.
        attachments={inCart > 0 ? <CartTray /> : undefined}
        maxRows={4}
        fieldProps={{
          role: 'combobox',
          'aria-expanded': open,
          'aria-controls': open ? listId : undefined,
          'aria-activedescendant': open && highlight >= 0 ? `${listId}-${highlight}` : undefined,
          'aria-autocomplete': 'list',
          onKeyDown,
        }}
      />
    </div>
  );
}

// Where free text will land, written as a trail: the assistant, then the
// conversation inside it that the message joins. The same shape as a panel's
// breadcrumbs, because it is the same kind of fact — a place inside a plugin —
// and the destination is a place the reader can also navigate to.
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
  const manifest = source.manifest(assistant);
  const title = manifest?.title ?? assistant;
  const Mark = iconFor(manifest?.icon, manifest?.color);
  const usePromptContext = source.loaded(assistant)?.usePromptContext;
  return (
    <p className={styles.promptContext}>
      <Mark size={13} className={styles.promptMark} aria-hidden="true" />
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
      <CaretRight size={11} className={styles.promptThread} aria-hidden="true" />
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
          className={cx(styles.promptTarget, styles.promptJump)}
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
