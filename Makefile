# Colis Impossible -- Bend 2
BEND ?= bend
PORT ?= 8000
DIST ?= dist

.PHONY: all check proof test build serve run clean help

# Everything: type-check, prove, self-test, bundle.
all: test build

# Type-check the game and its imports. No main is run.
check:
	$(BEND) main.bend --check-only

# The machine-checked law on the starting board.
proof:
	$(BEND) PROOF.bend

# All 21 ideas: first patch refused, fix accepted; plus a few moves.
test: check proof
	$(BEND) selftest.bend

# Bundle index.html and its .bend import into a static site.
build:
	rm -rf $(DIST)
	$(BEND) index.html -o $(DIST)

# Build, then serve the bundled page.
serve: build
	cd $(DIST) && python3 -m http.server $(PORT)

# Run the small CLI in main.bend (grid + base/gate checks).
run:
	$(BEND) main.bend

clean:
	rm -rf $(DIST) *.mjs a.out

help:
	@printf '%s\n' \
	  'make          check + proof + selftest + build' \
	  'make check    type-check main.bend and its imports' \
	  'make proof    bend PROOF.bend (ALL PROOFS CHECK)' \
	  'make test     run selftest.bend (all 21 ideas)' \
	  'make build    bundle the page into dist/' \
	  'make serve    build and serve dist/ on PORT (default 8000)' \
	  'make run      run the CLI in main.bend' \
	  'make clean    remove dist/, generated .mjs, a.out'
