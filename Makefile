.PHONY: help deps env lint build build-unsigned bump-version publish-amo publish run start stop clean distclean

PID_FILE := .web-ext.pid
LOG_FILE := .web-ext.log
ENV_YAML := env.yaml
ENV_TEMPLATE := env.yaml.template
WITH_ENV_YAML := ./scripts/with_env_yaml.sh
VERSION_BUMP ?= patch

help:
	@printf "%s\n" \
	  "Targets:" \
	  "  make deps       Install dev dependencies (web-ext)" \
	  "  make env        Create env.yaml from env.yaml.template (if missing)" \
	  "  make lint       Syntax-check background.js" \
	  "  make build      Build + auto-publish to AMO using values from env.yaml" \
	  "  make build-unsigned  Build unsigned artifact into dist/" \
	  "  make bump-version [VERSION_BUMP=patch|minor|major]  Bump extension version" \
	  "  make publish-amo Publish to AMO (requires AMO_JWT_* in env.yaml)" \
	  "  make publish    Bump version then build+publish (strict mode)" \
	  "  make run        Run in the foreground (Ctrl-C to stop)" \
	  "  make start      Run in the background (writes $(PID_FILE))" \
	  "  make stop       Stop background run (kills PID from $(PID_FILE))" \
	  "  make clean      Remove dist/ and run artifacts" \
	  "  make distclean  Also remove node_modules/"

deps:
	npm install

env:
	@if [ -f "$(ENV_YAML)" ]; then \
	  echo "$(ENV_YAML) already exists"; \
	else \
	  cp "$(ENV_TEMPLATE)" "$(ENV_YAML)"; \
	  echo "Created $(ENV_YAML) from $(ENV_TEMPLATE)"; \
	fi

lint:
	npm run -s lint

build:
	$(WITH_ENV_YAML) $(ENV_YAML) npm run -s build

build-unsigned:
	npm run -s build:unsigned

bump-version:
	npm run -s bump:version -- $(VERSION_BUMP)

publish-amo:
	$(WITH_ENV_YAML) $(ENV_YAML) env AMO_REQUIRE_PUBLISH=1 npm run -s publish:amo

publish: bump-version
	$(WITH_ENV_YAML) $(ENV_YAML) env AMO_REQUIRE_PUBLISH=1 npm run -s build

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
	rm -rf dist "$(PID_FILE)" "$(LOG_FILE)"

distclean: clean
	rm -rf node_modules package-lock.json
