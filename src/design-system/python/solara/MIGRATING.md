# Migrating a Solara portal onto the KBase design system

The wheel ships two kinds of stylesheet. `tokens.css`, `utilities.css`, `prose.css` and
`solara/vuetify.css` carry the tokens, type utilities, long-form text styling and Vuetify
widget styling. `components.css` and `chrome.css` are about 4,000 lines that select `kb-*`
class names and match nothing else. A skin — a stylesheet of token overrides — reaches an
element only through those names: an element carrying none of them keeps whatever the portal
painted, under every skin, however small the component's rules behind the name.

Migration puts the names on the markup and deletes the portal rules that painted it. Every stage
is checked against one render: **the page with the portal's own rules stripped, standing on the
packaged sheets alone.** `grep -rohE '\bkb-[a-z0-9-]+' src/ | sort -u | wc -l` counts names
whether or not a portal rule still paints the element underneath, so the count rises while that
render stays broken.

The finished portal is **base + brand**: the packaged sheets, one app sheet holding what every
brand of this portal shares, and one brand file — the portal's skin — holding what a brand swap
replaces.

---

## Sources of truth

This file holds the procedure. The components themselves are documented by their source — React
in `kbase/next-gen-ui` under `src/design-system/`, compiled into the classes a Solara portal
consumes. The wheel is installed first; it carries only the compiled CSS, so the sources come
from the repository, at the tag the installed version names:

```
pip install "kbase-design-system @ git+https://github.com/kbase/next-gen-ui.git@ds-vX.Y.Z#subdirectory=src/design-system"
git clone --branch ds-v$(python -c "from importlib.metadata import version; print(version('kbase-design-system'))") \
    https://github.com/kbase/next-gen-ui
```

A failed clone — offline, or the tag missing — goes to the user with the §1 batch; markup
written from the compiled CSS alone has invented classes that do not exist.

Three kinds of material there:

- **The showcase sections** — `src/design-system/sections/Section00–12.tsx`, thirteen files —
  render every component in composition and state what each is for: Section06 assigns statuses
  to Chip, Section07 assigns counts to Badge, Section09 separates Accordion from Collapsible.
  Planning starts after all thirteen are read, and the §1 plan records one line per section,
  Section00 through Section12, naming what it assigns; a section with no line has not been
  read. A "which component is this element" decision cites the section that assigns the
  purpose.
- **A component's `.tsx`** — `src/design-system/components/<Name>/<Name>.tsx` — decides which
  element carries which name. `Table.tsx` puts `styles.wrapper` on the scrolling div,
  `styles.table` on the `<table>`, and leaves `<tbody>` bare; the compiled selectors alone show
  none of that, and markup written from them has put the root on the wrapper and used a
  `kb-table--table` that does not exist. Placing a component's names starts with its `.tsx`.
- **`components.css` and `src/design-system/README.md`** answer what exists:
  `grep -oE '\.kb-[a-z-]+' components.css | sort -u` lists every packaged name (names without
  `--` are component roots), and the README's skin section lists the colour tokens and the
  non-colour levers. The list is re-run at each triage decision; a copy made at the start
  drifts from the installed version.

Components compose Base UI (`@base-ui/react`); patterns no `.tsx` explains are its conventions.

A migrated portal — `function-junction`, `enigma-strata` — shows working idiom: sheet loading,
invariant tests, widget wrapping. Its page layouts belong to its product, and its helpers share
names with siblings while diverging in shape — a call site copied without reading the local
signature has crashed the app bar, which no test renders.

---

## Invariants

- **A portal rule whose replacement lives in the packaged sheets is deleted only in §4 step 3**,
  after the element's `kb-*` name is placed and verified. Deleted earlier, the element renders
  unstyled wherever the name is wrong or the package is absent, and nothing warns.
- **The packaged sheets are never edited.** The load order (§3) puts the portal's sheets after
  them, so a portal rule wins any property it states at equal specificity. A component rule that
  is wrong for this portal — a border on the wrong edge, a padding the layout rejects — is one
  cancelling line in the app sheet, under the component's own name. An element declines a name
  on two grounds: it means something else, or no component exists — and the `components.css`
  grep in _Sources of truth_ settles the second.
- **One app sheet, one brand file, split by what a brand swap replaces.** The brand file holds
  the identity — the token literals the README's skin section names, plus the treatments that
  are the brand: signature paint, brand state fills. The app sheet holds what every brand
  shares: layout, geometry the markup depends on, bridge corrections. A second token family
  (`--<app>-*`), a `var(--c-x, var(--app-y))` fallback, or a fresh class restyling a named
  component each hides part of the brand from `theme.vuetify()` and from every future skin.
- **A component is chosen by what its element means**, with the showcase section as the cite,
  and each meaning is implemented once across the portal. `components.css` keys states on
  attributes — `[data-active]`, `[data-checked]`, `[data-selected]` — so a state written as a
  class matches no packaged rule.
- **A colour that encodes a datum stays a literal.** A heat ramp in a table cell belongs to the
  figure; no token stands behind it. Inline styles that state only layout — a `max-width` on a
  Select, a `gap` on a Row — block no skin and stay.

---

## Decisions that belong to the user

Collected during §1, asked as one batch before any markup changes. For one discovered later,
getting the answer is that stage's next step.

- Which portal, and how far — the target, and any stop short of the full route.
- The instance and URL the reviewer will watch (§9); every closing render happens there.
- The brand palette when sources disagree: a repo constant against a sampled logo, a stylesheet
  against a style guide.
- Named exclusions and additions to scope. Each is recorded in the plan with its owner, so a
  later pass does not re-propose it.
- Domain icon and colour meanings. A warning triangle for a warning needs no approval; a glyph
  or hue chosen for a domain concept decides what the concept means, and the proposed table
  precedes the edits.
- Verdicts on genuine component gaps: local rule, upstream ask, or leave it.
- Architectural changes the migration surfaces — a render path that gives a loading state no
  frame to paint in, a data model no component expresses.
- Crossing the stop-line, the PR that deletes the last portal rule (§2); it does not reverse.

Everything else is decided from the sources above and reported as the choice made, in one line.
A question the showcase or a gate in this file answers is not put to the user.

---

## The checklist

The stage list is the plan. It goes into the tracker verbatim, and each stage ends done or
deferred with its reason; stagings written fresh from an inventory have dropped stages without
anyone deciding to. A planning subagent receives this file, not a summary of it.

```
- [ ] §1 Read and inventory
- [ ] §2 Declare the dependency
- [ ] §3 Load the sheets
- [ ] §4 The naming rule and the mechanic
- [ ] §5 Chrome
- [ ] §6 Forms and actions
- [ ] §7 Content
- [ ] §8 Prose, type and icons
- [ ] §9 Proof
```

A stage closes on the matrix render for its views — design-system-only and branded, light and
dark (§9) — and against the standing list: this file's invariants plus every constraint the
user has added. §9 holds the full protocol and the closing audits.

§1–§6 complete against a landing page with no data. §7 onward needs data or fixtures; a portal
whose backend is unreachable locally stops before §7 rather than shipping unrendered markup.

---

## §1 · Read and inventory

Counting starts after the reading in _Sources of truth_ is finished. Four measurements:

- **Every class in the portal's stylesheet**, routed three ways: a component exists — the markup
  gains a `kb-*` name and the rule is deleted in §4; a genuine gap — checked against the grep
  first, since claimed gaps have shipped under names the inventory missed; portal-specific —
  domain visualisations and one-off layouts, which stay.
- **Every inline style site**, split paint-bearing from layout-only. An inline `style=` outranks
  every stylesheet, so each paint-bearing site is an element no skin can repaint; those sites
  are the conversion targets. Layout-only sites stay, and the paint-bearing count runs well
  below the raw count.
  Colour inside sandboxed iframes and canvas figures is carried by the portal's Python
  constants and stays out of the conversion (Appendix 9).
- **The funnels**: the helper functions that render tables, cards and chips for many call sites.
  A funnel is one edit regardless of its call-site count, and most paint-bearing volume sits in
  a handful of them.
- **The render primitives**: how much of the page is raw HTML strings, how much framework
  widgets, how much Markdown. Each converts differently (§4, §6, §8).

A genuine gap blocks nothing: the portal's rule stays, the nearest name is adopted or none, and
the upstream ask is filed after the stage ships, with the working rule as the specification.

The inventory becomes a written plan, checked against the stage list — all nine present, each
deferral stated — and the user-decision batch goes out. §2 and §3's sheet loading proceed while
answers are out; the brand file waits on the palette answer, and §4's first edit waits on the
whole batch.

---

## §2 · Declare the dependency

The package belongs in `[project.dependencies]`, pinned to a `ds-v` tag: a missing install then
fails in pip, at install time. In an optional extra it fails in the browser, as an unstyled
page. The icons module is imported plainly — a missing package raises `ImportError` naming it,
where a soft-import shim serves the page with no icons and no styling.

A portal migrating across many PRs may hold the pin in an optional extra while its own rules
still paint everything. The window's loading code guards on the package's presence — a
`has_design_system()` check around the sheet loading and theme wiring; when the
import fails, the guarded block loads nothing — and the stop-line PR deletes the guard along
with the extra. The plain import
above is the end state; the condemned shim is the _permanent_ soft import, which leaves a
`kb-*`-named page unstyled forever rather than for a bounded window. The window closes at the
stop-line: the PR that deletes the last portal rule moves the pin into `[project.dependencies]`
in the same change, because past it the sheets are load-bearing.

The stop-line is also where the pre-migration appearance ceases to exist — it lived in the
deleted rules. A frozen "legacy" stylesheet kept past that point snapshots nothing and drifts
with every later change. Reversibility comes from the brand file instead: a brand is one file —
palette block and treatments — under version control, and any past brand is a checkout away.
The portal implements one lookup: `<APP>_SKIN`, else the fleet-wide `KBASE_SKIN`, read at
startup, selects the brand file by name or path — the string §3 loads as `BRAND_CSS` — and an
unmatched value (`legacy`, say) falls to the default brand.

---

## §3 · Load the sheets

A portal carrying its own copy of the sheets keeps resolving to that copy; Function Junction
deleted 5,250 vendored lines before the packaged sheets took effect. Vendored copies are
deleted before anything loads.

Six sheets, read from the installed package, in this order, ahead of the portal's own:

```
tokens.css → utilities.css → prose.css → solara/vuetify.css → components.css → chrome.css
```

then the app sheet, then the brand file, last. `vuetify.css` loads **before** `components.css`
and `chrome.css`; its header is the contract: _"Only geometry is reset. Colour and type stay
with components.css, which loads after this file and wins on order."_ Loaded last instead, it
re-wins every property that order had settled, and the components stop painting shared
elements. Order is verified by rendering one stock component — a `kb-chip` on a scratch
element. With the order right it takes the packaged geometry and colour; with `vuetify.css`
late, Vuetify's box wins on it. A selector-specificity script resolves selector pairs and says
nothing about properties settled by order. The order is pinned by a test that asserts the
six-sheet sequence and quotes the header contract in its failure message.

`global.css` sets page defaults a Solara app already sets, and `prism.css` styles Prism's
markup; neither loads.

`vuetify.css` opens with four `@import` rules — the Oxygen and Fira Code faces, three Phosphor
icon weights. A browser discards an `@import` that follows any other rule, so joining the
sheets into one string costs the portal its typeface and every icon, and raises nothing. One
`solara.Style` per sheet:

```python
from importlib.resources import files

SHEETS = ("tokens.css", "utilities.css", "prose.css",
          "solara/vuetify.css", "components.css", "chrome.css")

for name in SHEETS:
    solara.Style(files("kbase_design_system").joinpath(name).read_text())
solara.Style(APP_CSS)      # shared by every brand: layout, bridge corrections
solara.Style(BRAND_CSS)    # the brand file §2's skin lookup selected
```

The block above is the end state; during §2's window it sits behind the window guard.

### The brand file

A `:root` block of token overrides, then the brand's own treatments. `tokens.css` declares
`--c-primary` outside any `light-dark()` and derives `--ct-primary` from it once per scheme, so
one hue stated in the block produces both schemes and every primary-family token follows. The
README's skin section lists the literal-carrying tokens and the derived rest; any of them may
be set, and a derived token gives way when named directly. `theme.vuetify()` reads the `:root`
block and ignores the treatments, so the widget palette follows the same file. A hex anywhere
else in the portal is a colour no skin will ever reach.

### Vuetify's palette

Vuetify stores its theme as comma-separated RGB triplets and reads them as
`rgba(var(--v-theme-surface), α)`. No CSS expression decomposes a colour into three numbers, so
ipyvuetify's traits carry the values from Python, and Vuetify derives the rest — including the
on-colours it picks by contrast. Left unset, the widgets blend against Material's `#6200ee`.

```python
from kbase_design_system.solara import theme
for scheme, colours in theme.vuetify(BRAND_CSS).items():
    target = getattr(solara.lab.theme.themes, scheme)
    for trait, value in colours.items():
        setattr(target, trait, value)
```

`BRAND_CSS` is the same string the page loads. `theme.vuetify()` lays its declarations over the
packaged tokens as the cascade would, evaluates the `oklch(from …)` expressions as arithmetic,
and returns thirteen traits per scheme. Passing a colour instead of the stylesheet leaves ten
of the thirteen on the packaged palette — a brand that moves the page background, the
text-colour ramp or a semantic colour moves tokens no single hue carries — so the sheets follow
the brand and the widgets do not.

`vuetify.css` sets `color-scheme` on `.v-theme--light` and `.v-theme--dark`, so every
`light-dark()` pair in `tokens.css` resolves to whichever theme Vuetify holds. Scheme needs no
further wiring.

### Prose

`prose.css` styles descendants of a `.prose` container. `solara.Markdown` takes no `classes=`
argument and renders into a fixed `<div class="solara-markdown">`, so the sheet does not reach
it on its own. Two shapes work: the few long-form blocks wrapped in
`solara.Div(classes=["prose"])`, or the sheet rescoped at load time — `.prose` →
`:is(.prose, .solara-markdown)` — as the migrated portals do. `prose.css` sets a 68ch measure
meant for columns of text, so a rescope pairs with one release rule —
`.solara-markdown:not(.prose) { max-width: none }` — and the measure applies only where an
explicit `.prose` asks for it. (Scoping
`.solara-markdown` upstream in `prose.css` is an open ask; the rescope machinery is checked
against it before being duplicated.)

§3 closes on a screenshot of the landing page — widgets in the brand's primary, the brand
typeface loaded — and, while §2's window is open, on `pip uninstall` restoring the previous
rendering exactly (the §2 guard skips the loading and the portal's own rules still paint).

---

## §4 · The naming rule and the mechanic

`gen_portal_css.py` derives every public class name from the component's CSS module:

```
root, or a local named after its component  ->  kb-<component>
every other local                           ->  kb-<component>--<local>
```

A local named after its component takes the short name when the module declares no `root`;
Badge declares both, so `.root` becomes `kb-badge` and `.badge` becomes `kb-badge--badge`.
Which element carries which name is decided in the TSX (§ Sources of truth), so placement reads
the component's `.tsx`.

Conversion runs three steps per painted element, each separately checkable:

1. **Lift.** The element's inline declarations move into a named rule in the app sheet,
   verbatim. Renders byte-identically.
2. **Name.** The `kb-*` class joins the portal's own class on the element. Still renders
   identically — the portal's rule loads later and wins what it states — and the element is now
   reachable by the system. This step is additive and belongs in the first PR that touches the
   element.
3. **Delete.** The portal's rule goes and the component paints. The only step that changes
   pixels. It runs per element family, screenshotted before and after, judged against the
   showcase.

Steps 1–2 ship in bulk, swept by declaration family across the whole codebase — every muted
caption, then every secondary label — because a family shares one rule and one review. Step 3
is a queue tracked in the plan; a family that renders only in data-bearing views queues its
step 3 under §7, and §4's queue holds the rest. §4 closes when the queue is empty or each remaining entry
carries one of three reasons: a genuine gap with its upstream ask filed (§1), a user-granted
exclusion by name (§ Decisions), or portal-specific paint per the §1 routing. An entry with any
other reason keeps the stage open. A migration that stops after step 2 has adopted
nothing: every name is inert under the portal's rules, and the acceptance render shows it.

The bulk sweep follows a pilot: one element family taken through all three steps, chosen at
middle complexity — the easiest family exercises nothing the rest will hit. What the pilot
taught is written down and applied in bulk.

`utilities.css` is the one unprefixed vocabulary — `.caption`, `.note`, `.section-label` and
the other type utilities carry no `kb-`, and the intro's name count does not see them: one more
reason the render, not the count, measures progress. One muted caption among dozens:

```python
# before
solara.HTML("span", "updated daily", style="font-size:11px;color:#8a93a3")
# after step 2 (app sheet holds: .app-cap { font-size:11px; color:#8a93a3 })
solara.HTML("span", "updated daily", classes=["app-cap", "caption"])
# after step 3 (the .app-cap rule is deleted; utilities.css paints it)
solara.HTML("span", "updated daily", classes=["caption"])
```

---

## §5 · Chrome

Renders on a landing page with no data.

`kb-masthead`, `kb-mark`, `kb-breadcrumbs`, a light/dark control and a version badge take over
from the portal's own topbar, in both directions: chrome the portal has is rebuilt
on the system's names, and chrome the portal lacks is added where the showcase expects it. A
portal whose navigation state shows only in which button looks pressed gains a breadcrumb
trail; the reference portals gained theirs during migration. `chrome.css` holds the masthead
and mark; `components.css` holds Breadcrumbs.

Elements that are the brand — a logo, a signature motif — keep their markup and take their
paint from the brand file, so a swapped brand swaps them too; their geometry stays app-side.

---

## §6 · Forms and actions

Renders on a landing page with no data.

Every Solara widget accepts `classes=`, and `vuetify.css` bridges the component names to the
widgets by two mechanisms; each decides where a name goes.

**Descendant selectors.** `.kb-field .v-input` and `.kb-search-bar .v-input` reach the Vuetify
internals under a wrapper, so those names go on a container around the widget. On the widget
itself the selector matches nothing, and nothing reports it.

**Named geometry resets.** Vuetify's 36px height floor, 64px min-width, ripple and Material
radius give way only for a `v-btn` carrying one of the classes `vuetify.css` names — the same
mechanism that sets `padding: 0` on `.v-btn.kb-breadcrumbs--link`, because Solara renders a
breadcrumb step as a `v-btn` once its target is a callback and Vuetify's 16px side padding
lands there. A widget outside the named list keeps Vuetify's box, and only an
`!important` moves it from the portal side; that pairing is an upstream ask, filed per §1.

---

## §7 · Content

Needs data, or fixtures in place of it.

Frames, stats, alerts, tables, badges, accordions, empty states — each lands by the §4
mechanic, chosen by the showcase section that assigns its purpose. The assignments that have
gone wrong repeatedly, with the section that settles each: a status is a Chip whose shape
carries the meaning and whose colour reinforces it, never a bare coloured glyph (Section06); an
empty result is an EmptyState and an event is an Alert (Section06); a count on a control is a
Badge overlay, never label text (Section07); a Frame accent marks category, and state is a Chip
(Section09); an element that navigates is a link or a button, never a Chip (Section05); a
titled section folds with Accordion, a control-triggered aside with Collapsible (Section09).

`kb-viz-container` is excluded from migrations: it reads as a generic frame and gets applied
where Frame is correct. A visualization keeps its own frame; where a design-system frame is
wanted, `kb-frame` is the component.

Loading states belong to this stage even in a portal that has none. Skeleton defaults to
`variant='text'`, and a `kb-skeleton` with no variant has no height; a card placeholder is a
composition of variants, which the showcase holds. The Loader's entry plays from CSS; its exit
starts from the pose its animations hold when asked to stop, which exists only at runtime, so
the wheel ships `loader.js`, emitted once via `icons.loader_script()`. Portal code sets one
attribute — `data-loading` on the loader or an ancestor; presence hands the loader to the
script, and `"false"` ends it. Every state of
one region occupies one box: a spinner that replaces a control row, or a loader appended below
streaming content, moves everything beneath it on each transition.

---

## §8 · Prose, type and icons

Prose is wired in §3; here it is applied — long-form Markdown gets the `.prose` treatment,
incidental strings keep the page style.

Type comes from the utility classes, assigned by role. Two elements at the same pixel size can
be different roles — a caption and a footnote, a label and a byline — and an assignment made by
matching sizes welds them together under every future skin.

Icons come from the three Phosphor weights `vuetify.css` imports — regular for chrome, bold for
emphasis, fill for an active state — one icon per meaning across the portal. Emoji ignore
`currentColor`, render differently per platform, and sit where no skin reaches. Substitution
splits in two: the mechanical set — warnings, checks, crosses, carets, external-link arrows,
mapped by `icons.STATUS` — converts directly, with every glyph name checked against the
Phosphor release `vuetify.css` imports, since a wrong name renders an empty box; the domain set
assigns meanings and goes to the user as a proposed table first (§ Decisions).

---

## §9 · Proof

Verification is a render on the instance the reviewer watches, at a URL agreed in advance. A
structural probe — HTTP 200, a test count, an empty error log — measures the server; a page
that died before rendering leaves the error log clean. A claim carries its check: "fixed"
carries the screenshot taken after the fix on that instance, "passing" carries the command and
its exit status.

The matrix, per stage and in full before the PR:

```
every view  ×  design-system-only and branded  ×  light and dark
```

The first axis is a temporary switch the migration adds and the stop-line PR removes:
design-system-only withholds the brand file and the app sheet's lifted rules — the intro's
acceptance render; branded loads both.

While §2's window is open, the matrix gains a degraded pass: the app served with the package
genuinely unimportable — not a monkeypatched flag — and clicked through. Unit tests around the
helpers
have missed a widget handed `children=None` and a status glyph degrading to an empty string; a
render catches both.

Screenshot tooling fails in known shapes: readiness keyed on a portal class times out when §4
renames that class away, so readiness keys on a `kb-*` selector; a view list that drifted from
the app screenshots the wrong screens; a headless browser without emoji fonts draws tofu; a
mid-render snapshot shows gaps. The last two are artifacts, and neither is a finding. An empty
box where a Phosphor icon was placed is a wrong glyph name (§8), in every browser.

A stage closes against the full standing list — this file's invariants plus every constraint
the user has added, each item checked — and three audits close the migration, each a fresh pass:

- **A component-purpose review** by a fresh agent that reads the showcase sections and the
  render code and reports wrong-component-for-the-meaning findings, with groups of similar
  elements read together. It has returned a dozen findings on a migration that looked complete.
- **An accessibility probe** wherever a widget's label moved into component anatomy. The
  accessible name is checked programmatically; a page of combobox-with-no-name looks correct.
- **A consumption audit**: what the portal still hand-rolls that the package ships, answered by
  re-running the §1 lookup against the end state.

Each invariant becomes a behavioral test where the portal can express it — sheet order, no
hexes in the app sheet, brand-file coverage, degradation while the window is open. A test that
counts selectors in a packaged file pins the package, not the portal, and does not ship.

The PR's base is the upstream default branch at its current tip — a stale fork base makes the
diff describe changes nobody made. The PR body carries the before/after matrix for every
accessible view, what was explicitly left undone and why, and the open upstream asks.

---

## Appendix · Solara and Vuetify facts

Symptom, mechanism, fix.

1. **A white box from nowhere, or a child stretched tall.** `solara.Row`/`Column` render a
   Vuetify sheet — a painted surface — and set `align-items:stretch` inline. Layout scaffolding
   uses a plain `Div`/`HTML`, or overrides the sheet knowingly.
2. **A control ignores its height.** Vuetify's 36px `v-btn` floor yields only to the classes
   `vuetify.css` names (§6). The fix is the right class in the right place, or an upstream ask
   for the missing pairing.
3. **A component's border never draws on a button.** Vuetify's own `.v-btn` border rules win on
   the button element. The framed class goes on a wrapper, or the override goes in the app
   sheet.
4. **A wrapper class present, nothing changes.** The bridge selector is a descendant
   (`.kb-field .v-input`): on a container it works, on the widget itself it matches nothing,
   silently (§6).
5. **Markdown ignores its classes.** `solara.Markdown` takes no `classes=` and renders into a
   fixed `.solara-markdown` div. §3's prose shapes are the routes.
6. **A segmented control renders one segment short.** `ToggleButtonsSingle` (solara 1.61) emits
   no mount point for an `auto`-style option. The options restructure; CSS does not reach it.
7. **The sheets re-branded, the widgets stayed purple.** Vuetify's theme is RGB triplets no
   stylesheet reaches. `theme.vuetify(BRAND_CSS)`, with the same string the page loads (§3).
8. **Typeface and every icon silently gone.** The sheets were joined into one string, and the
   browser discarded `vuetify.css`'s leading `@import`s. One `solara.Style` per sheet (§3).
9. **Tokens never resolve inside a map or plot.** Sandboxed iframes (`srcdoc` without
   `allow-same-origin`) and SVG/canvas renderers see no CSS variables. The portal's Python
   colour constants are a deliberate third carrier of the brand — one module, synced with the
   brand file — and those surfaces stay out of the class conversion.
10. **A crash in chrome no test caught.** A call site copied from a reference portal whose
    helper takes a different shape, and nothing renders chrome in CI. The local signature is
    read first; the page renders before shipping (§9).
