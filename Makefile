.PHONY: help deps lint lint-ext format test build bump-version publish run start stop clean distclean

PID_FILE := .web-ext.pid
LOG_FILE := .web-ext.log
VERSION_BUMP ?= patch
RELEASE_START := ./scripts/release_start.sh

help:
	@printf "%s\n" \
	  "Targets:" \
	  "  make deps          Install dev dependencies" \
	  "  make lint          ESLint + Prettier check" \
	  "  make lint-ext      web-ext lint (AMO validation)" \
	  "  make format        Format files with Prettier" \
	  "  make test          Tests run in CI only (see CONTRIBUTING.md)" \
	  "  make build         Build unsigned package into dist/" \
	  "  make bump-version [VERSION_BUMP=patch|minor|major]  Bump extension version" \
	  "  make publish       Bump version, create release branch, open PR (CI publishes on merge)" \
	  "  make run           Run in Firefox in the foreground (Ctrl-C to stop)" \
	  "  make start         Run in the background (writes $(PID_FILE))" \
	  "  make stop          Stop background run" \
	  "  make clean         Remove dist/ and run artifacts" \
	  "  make distclean     Also remove node_modules/"

deps:
	npm ci

lint:
	npm run -s lint

lint-ext:
	npm run -s lint:ext

format:
	npm run -s format

test:
	@echo "Tests run in CI only (.github/workflows/ci.yml). Push a branch and open a PR."

build:
	npm run -s build

bump-version:
	npm run -s bump:version -- $(VERSION_BUMP)

publish:
	$(RELEASE_START) $(VERSION_BUMP)

run:
	npm run -s start

start:
	@if [ -f "$(PID_FILE)" ]; then echo "Already running (found $(PID_FILE))"; exit 1; fi
	@nohup npm run -s start >"$(LOG_FILE)" 2>&1 & echo $$! >"$(PID_FILE)"
	@echo "Started (pid $$(cat $(PID_FILE))). Logs: $(LOG_FILE)"

stop:
	@if [ ! -f "$(PID_FILE)" ]; then echo "Not running (missing $(PID_FILE))"; exit 1; fi
	@kill "$$(cat $(PID_FILE))" 2>/dev/null || true
	@rm -f "$(PID_FILE)"
	@echo "Stopped"

clean:
	rm -rf dist coverage "$(PID_FILE)" "$(LOG_FILE)"

distclean: clean
	rm -rf node_modules
