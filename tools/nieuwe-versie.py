"""Zet een nieuw versienummer achter alle eigen scripts en stylesheets in de HTML-pagina's.

Browsers bewaren bestanden een tijdje. Door na elke wijziging dit script te draaien
(python tools/nieuwe-versie.py) halen bezoekers meteen de nieuwe versie op.
"""
import re
import time
from pathlib import Path

MAP = Path(__file__).resolve().parent.parent
VERSIE = time.strftime("%Y%m%d%H%M")

# Alleen eigen bestanden (geen https://-links), met of zonder bestaand ?v=...
PATROON = re.compile(r'((?:src|href)="(?!https?:)[^"]+\.(?:js|css))(?:\?v=[^"]*)?"')

for pagina in [MAP / "index.html", MAP / "highscores.html", *MAP.glob("games/*/index.html")]:
    tekst = pagina.read_text(encoding="utf-8")
    nieuw = PATROON.sub(rf'\1?v={VERSIE}"', tekst)
    if nieuw != tekst:
        pagina.write_text(nieuw, encoding="utf-8")
        print(f"{pagina.relative_to(MAP)}: versie {VERSIE}")
