"""A portal's skin: which sheet is in effect, and the palette it produces, as numbers.

skin() reads the portal's selector out of the environment and returns the sheet in effect.
vuetify() turns that sheet into the thirteen colours ipyvuetify syncs, so the widgets follow the
skin. tokens() turns it into every opaque colour token as hex, for a figure a browser never paints.

A skin is a stylesheet of token overrides carrying whatever brand it expresses, loaded after the
packaged sheets. A portal ships each of its own as `resources/<name>.css` and selects one by name;
`none` is the one name with no file, and mounts nothing.

Vuetify holds its theme as comma-separated RGB triplets and consumes them as
`rgba(var(--v-theme-surface), <alpha>)`. CSS cannot decompose a colour into three numbers, so the
theme is set from Python: ipyvuetify's ThemeColors traits sync to the front end, and Vuetify
generates every `--v-theme-*` variable itself, including the on-colours it derives by contrast.
That is what makes the alpha blends inside components no stylesheet mentions resolve to this
palette rather than Material's.

    from importlib.resources import files
    from kbase_design_system.solara import theme

    active = theme.skin(files("portal") / "resources", "kbase", "PORTAL_SKIN", "KBASE_SKIN")
    solara.Style(active.css)
    for scheme, colours in theme.vuetify(active.css).items():
        target = getattr(solara.lab.theme.themes, scheme)
        for trait, value in colours.items():
            setattr(target, trait, value)

tokens.css states most of the palette as `oklch(from var(--c-base) L C H)`, which is arithmetic with
one answer (see oklch.py), so this reads the stylesheets and computes. Nothing is generated and no
browser is involved.
"""

from __future__ import annotations

import functools
import os
import re
from dataclasses import dataclass
from importlib.resources import files
from pathlib import Path
from typing import TYPE_CHECKING, Mapping

import tinycss2

from . import oklch

if TYPE_CHECKING:
    from importlib.resources.abc import Traversable

# The selector value that mounts nothing: the design system as it ships.
NONE = "none"
# The selector value that asks for the portal's default, the same as leaving the selector unset.
DEFAULT = "default"

# The traits ipyvuetify syncs, and the token each takes. accent and anchor are ColorNotAvailable in
# Vuetify 3. warning is orange rather than yellow, because yellow is the one fill that cannot carry
# white text and Vuetify picks the on-colour by contrast.
VUETIFY = {
    "background": "c-bg",
    "surface": "c-surface",
    "surface_bright": "c-raised",
    "surface_variant": "c-ink4",
    "on_surface_variant": "c-ink3",
    "primary": "c-primary",
    "primary_darken_1": "c-primary-dim",
    "secondary": "c-teal-btn",
    "secondary_darken_1": "c-teal-dim",
    "success": "c-green",
    "error": "c-red",
    "info": "c-primary",
    "warning": "c-orange",
}

# The families tokens() resolves: the literal and derived colours, text on tint, and the three
# tint families. Every other family is a length, a number, a face or a shadow list.
_COLOUR_FAMILIES = ("c-", "ct-", "bg-", "bo-", "bgw-")

_LIGHT_DARK = re.compile(r"light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)", re.S)
# A channel is `calc(...)` or `var(...)`, which carry spaces and parentheses, or one bare token.
_CHANNEL = r"(?:calc\([^)]*\)|var\([^)]*\)|[^\s)]+)"
_HUE = r"(?:h|calc\(\s*h\s*[+-]\s*[\d.]+\s*\))"
_OKLCH = re.compile(
    rf"oklch\(\s*from\s+var\(\s*--([a-z0-9-]+)\s*\)\s+({_CHANNEL})\s+({_CHANNEL})\s+({_HUE})\s*\)",
    re.S)
# A colour at an alpha: the borders, the focus ring and the scrim.
_RGB_ALPHA = re.compile(r"rgb\(\s*from\s+var\([^)]*\)\s+r\s+g\s+b\s*/.*\)", re.S)


@dataclass(frozen=True)
class Skin:
    """What the selector resolved to.

    `note` says why `name` is not what was asked for, in words a doctor command prints as they
    are; it is None when the request was honoured.
    """
    name: str  # NONE, a sheet's name, or the path that was read
    css: str  # the sheet's text; "" for NONE
    variable: str | None  # the selector that was set, or None when none was
    requested: str | None  # that selector's value
    note: str | None


def skin(resources: Path | Traversable, default: str, *variables: str,
         environ: Mapping[str, str] | None = None) -> Skin:
    """The skin the environment selects, read at the moment of the call.

    `variables` are the selector names in precedence order -- the portal's own, then the
    fleet-wide `KBASE_SKIN` -- and the first one set to anything wins. Its value is a name,
    `none`, `default` or a path. A name selects `<name>.css` under `resources`, the portal's
    package directory; a value containing a separator or ending in `.css` is a path, read from
    the filesystem. A name with no sheet or a path that cannot be read falls to `default`, and
    the Skin says so. `default` has to resolve: a missing default sheet raises.

    Nothing here remembers a previous answer, so a process can serve a different skin to a later
    request. Call it where the page is rendered, not where the module is imported.
    """
    env = os.environ if environ is None else environ
    variable = requested = None
    for candidate in variables:
        value = (env.get(candidate) or "").strip()
        if value:
            variable, requested = candidate, value
            break
    if requested is None or requested.lower() == DEFAULT:
        return Skin(*_sheet(resources, default), variable, requested, None)
    try:
        return Skin(*_sheet(resources, requested), variable, requested, None)
    except OSError as exc:
        note = f"{variable}={requested}: {exc.strerror or exc}"
        return Skin(*_sheet(resources, default), variable, requested, note)


def _sheet(resources: Path | Traversable, value: str) -> tuple[str, str]:
    """A selector value as (name, sheet text). Raises OSError when there is nothing to read."""
    if value.lower() == NONE:
        return NONE, ""
    if "/" in value or os.sep in value or value.lower().endswith(".css"):
        return value, Path(value).expanduser().read_text(encoding="utf-8")
    name = value.lower()
    sheet = resources / f"{name}.css"
    if not sheet.is_file():
        raise FileNotFoundError(f"{sheet} does not exist")
    return name, sheet.read_text(encoding="utf-8")


def _custom_properties(css: str) -> dict[str, str]:
    """Every custom property a stylesheet sets on the root element, keyed without its `--`.

    A later declaration wins, as it does between two rules of equal specificity. Only rules whose
    selector names `:root` are read, and the attribute in `:root[data-skin='x']` is not matched:
    a file holding two skins would collapse them into each other.
    """
    out: dict[str, str] = {}
    for rule in tinycss2.parse_stylesheet(css, skip_comments=True, skip_whitespace=True):
        if rule.type != "qualified-rule" or ":root" not in tinycss2.serialize(rule.prelude):
            continue
        for decl in tinycss2.parse_blocks_contents(
                rule.content, skip_comments=True, skip_whitespace=True):
            if decl.type == "declaration" and decl.name.startswith("--"):
                out[decl.name[2:]] = tinycss2.serialize(decl.value).strip()
    return out


@functools.lru_cache(maxsize=1)
def _packaged() -> dict[str, str]:
    """tokens.css as it ships. Read once: the file is in the wheel and does not change under a
    running process."""
    return _custom_properties((files("kbase_design_system") / "tokens.css").read_text())


def _tokens(skin_css: str) -> dict[str, str]:
    """The packaged tokens with the skin's declarations laid over them, as the cascade would."""
    tokens = dict(_packaged())
    if skin_css:
        tokens.update(_custom_properties(skin_css))
    return tokens


def _branch(value: str, scheme: str) -> str:
    """The side of a `light-dark()` pair the scheme takes; a value that is no pair, unchanged."""
    pair = _LIGHT_DARK.fullmatch(value)
    return pair.group(1 if scheme == "light" else 2) if pair else value


def _channel(spec: str, chroma: float, tokens: dict[str, str]) -> float:
    """A lightness or chroma slot: a number, `c`, `calc(c * n)`, or `var(--x)` naming a number."""
    if spec == "c":
        return chroma
    calc = re.fullmatch(r"calc\(\s*c\s*\*\s*([\d.]+)\s*\)", spec)
    if calc:
        return chroma * float(calc.group(1))
    ref = re.fullmatch(r"var\(\s*--([a-z0-9-]+)\s*\)", spec)
    if ref:
        if ref.group(1) not in tokens:
            raise ValueError(f"no --{ref.group(1)} in the tokens or the skin")
        return _channel(tokens[ref.group(1)], chroma, tokens)
    try:
        return float(spec)
    except ValueError:
        raise ValueError(f"unsupported oklch channel {spec!r}")


def _hue(spec: str, hue: float) -> float:
    """The hue slot: `h`, or `calc(h + n)` and `calc(h - n)`."""
    if spec == "h":
        return hue
    offset = re.fullmatch(r"calc\(\s*h\s*([+-])\s*([\d.]+)\s*\)", spec)
    return hue + float(offset.group(1) + offset.group(2))


def _oklch_of(name: str, scheme: str, tokens: dict[str, str]) -> tuple[float, float, float]:
    """One token, in one scheme, as (L, C, H).

    A derivation can name a token that is itself derived -- --c-teal-dim reads --c-teal-btn, which
    reads --c-teal -- so the chain stays in OKLCh and quantises once, at the end. Rounding to eight
    bits per hop moves the last colours in a chain by a unit.
    """
    value = tokens.get(name)
    if value is None:
        raise ValueError(f"no --{name} in the tokens or the skin")
    value = _branch(value, scheme)
    if value.startswith("#"):
        return oklch.to_oklch(value)
    m = _OKLCH.fullmatch(value)
    if not m:
        raise ValueError(f"unsupported value for --{name}: {value!r}")
    base, lightness, chroma, hue = m.groups()
    _, base_c, base_h = _oklch_of(base, scheme, tokens)
    return _channel(lightness, base_c, tokens), _channel(chroma, base_c, tokens), _hue(hue, base_h)


def vuetify(skin_css: str = "") -> dict[str, dict[str, str]]:
    """The thirteen traits ipyvuetify syncs, keyed by scheme.

    `skin_css` is a skin stylesheet's text, whose declarations override the packaged tokens. Omit
    it for the design system's own palette.
    """
    tokens = _tokens(skin_css)
    return {
        scheme: {trait: oklch.to_hex(*_oklch_of(token, scheme, tokens))
                 for trait, token in VUETIFY.items()}
        for scheme in ("light", "dark")
    }


def tokens(skin_css: str = "", scheme: str = "light") -> dict[str, str]:
    """Every opaque colour token as hex, keyed without its `--`, under a skin, in one scheme.

    For a colour no browser resolves: a figure drawn server-side reads its accent, ink and ground
    here and follows the skin as the page does. A palette that carries data -- a categorical set,
    a ramp, a hue with a meaning -- is the figure's own and is not a token.

    The borders, the focus ring and the scrim are left out: each is a colour at an alpha, and has
    no hex until it is composited on something.
    """
    resolved = _tokens(skin_css)
    return {
        name: oklch.to_hex(*_oklch_of(name, scheme, resolved))
        for name, value in resolved.items()
        if name.startswith(_COLOUR_FAMILIES) and not _RGB_ALPHA.fullmatch(_branch(value, scheme))
    }
