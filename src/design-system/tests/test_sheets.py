"""What every packaged sheet has to hold, read from the installed wheel."""
import re
from importlib.resources import files

import pytest

SHEETS = ("tokens.css", "utilities.css", "prose.css", "prism.css", "global.css",
          "components.css", "chrome.css", "solara/vuetify.css")


def sheet(name: str) -> str:
    return (files("kbase_design_system") / name).read_text()


@pytest.mark.parametrize("name", SHEETS)
def test_every_weight_is_one_of_the_two_tokens(name):
    """fonts.css and vuetify.css load two faces per family, 400 and 700, and tokens.css names them.
    A literal weight either restates a token or asks for a face nothing serves, which the browser
    renders as the nearest one it has."""
    weights = re.findall(r"font-weight\s*:\s*([^;}]+)", sheet(name))
    assert set(weights) <= {"var(--fw-normal)", "var(--fw-bold)"}, weights


def test_the_loaded_faces_are_the_weights_the_tokens_name():
    faces = re.findall(r"family=([A-Za-z+]+):wght@([\d;]+)", sheet("solara/vuetify.css"))
    assert faces == [("Oxygen", "400;700"), ("Fira+Code", "400;700")]
    tokens = sheet("tokens.css")
    assert re.search(r"--fw-normal:\s*400;", tokens) and re.search(r"--fw-bold:\s*700;", tokens)


LINK_RULES = (("utilities.css", r"\.link\s*\{"), ("prose.css", r"\.prose a\s*\{"),
              ("solara/vuetify.css", r"\.solara-markdown :is\(a, a code\)\s*\{"),
              ("components.css", r"\.kb-button--btn\.kb-button--link\s*\{"),
              ("components.css", r"\.kb-collapsible--trigger\s*\{"))


@pytest.mark.parametrize("name,opener", LINK_RULES)
def test_link_text_paints_from_the_link_tier(name, opener):
    """Everything drawn as link text -- bold, underlined -- takes --ct-link, not --ct-primary, so a
    skin that moves the primary leaves links blue."""
    m = re.search(opener + r"([^}]*)\}", sheet(name))
    assert m, f"{name}: {opener} is gone"
    assert "var(--ct-link)" in m.group(1) and "var(--ct-primary)" not in m.group(1), m.group(1)
