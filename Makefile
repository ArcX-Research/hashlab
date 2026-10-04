.DEFAULT_GOAL := help
PORT ?= 5173
NPM = sh scripts/with-node.sh npm
EMCC ?= emcc

.PHONY: help install dev build preview test browser-install test-browser format format-check wasm

help:
	@printf '%s\n' 'Hashprobe Lab' '' \
	  '  make install          Install project dependencies' \
	  '  make dev              Start the lab at http://localhost:5173' \
	  '  make test             Check reports and the C/Wasm engine' \
	  '  make browser-install  Install Chromium for browser checks' \
	  '  make test-browser     Run browser checks' \
	  '  make format           Format source and docs' \
	  '  make format-check     Check formatting' \
	  '  make build            Build the static site in dist/' \
	  '  make preview          Preview the production build' \
	  '  make wasm             Rebuild the C/Wasm engine (needs emcc)' \
	  '' 'Use PORT=5180 to choose a different port.'

install:
	$(NPM) ci

node_modules/.package-lock.json: package.json package-lock.json
	$(NPM) ci

dev: node_modules/.package-lock.json
	$(NPM) run dev -- --port $(PORT) --strictPort

build: node_modules/.package-lock.json
	$(NPM) run build

preview: build
	$(NPM) run preview -- --port $(PORT) --strictPort

test: node_modules/.package-lock.json
	$(NPM) test

test-browser: node_modules/.package-lock.json
	$(NPM) run test:browser

browser-install: node_modules/.package-lock.json
	$(NPM) exec -- playwright install chromium

format: node_modules/.package-lock.json
	$(NPM) run format

format-check: node_modules/.package-lock.json
	$(NPM) run format:check

wasm:
	EMCC="$(EMCC)" $(NPM) run build:wasm
