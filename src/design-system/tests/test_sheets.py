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
