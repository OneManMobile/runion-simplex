# Runion Simplex — build, proof and test
PY = .venv/bin/python

help:
	@echo "make build      glyphs.txt -> UFOs -> fonts/variable + fonts/webfonts + website data"
	@echo "make gftools    build fonts/ from the committed designspace with gftools builder (the Google Fonts path)"
	@echo "make proof      contact sheet and documentation images"
	@echo "make test       fontbakery, Google Fonts profile"
	@echo "make serve      open the website on http://localhost:8418"

venv:
	python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

build:
	$(PY) sources/build.py

gftools:
	cd sources && PATH="$(CURDIR)/.venv/bin:$$PATH" ../.venv/bin/gftools builder config.yaml

proof: build
	$(PY) sources/sheet.py
	$(PY) sources/proof.py

test: build
	mkdir -p out
	.venv/bin/fontbakery check-googlefonts "fonts/variable/RunionSimplex[wght].ttf" -l WARN --succinct --ghmarkdown out/fontbakery-variable.md

serve:
	python3 -m http.server 8418 --bind 127.0.0.1

.PHONY: help venv build gftools proof test serve
