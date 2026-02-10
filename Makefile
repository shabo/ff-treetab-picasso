.PHONY: help deps lint build sign-unlisted sign-listed run start stop clean distclean

PID_FILE := .web-ext.pid
LOG_FILE := .web-ext.log

help:
	@printf "%s\n" \
	  "Targets:" \
	  "  make deps       Install dev dependencies (web-ext)" \
	  "  make lint       Syntax-check background.js" \
	  "  make build      Build unsigned artifact into dist/" \
	  "  make sign-unlisted  Sign via AMO API (creates dist/*-fx.xpi, for self-distribution)" \
	  "  make sign-listed    Sign via AMO API (for AMO-listed publishing flows)" \
	  "  make run        Run in the foreground (Ctrl-C to stop)" \
	  "  make start      Run in the background (writes $(PID_FILE))" \
	  "  make stop       Stop background run (kills PID from $(PID_FILE))" \
	  "  make clean      Remove dist/ and run artifacts" \
	  "  make distclean  Also remove node_modules/"

deps:
	npm install

lint:
	npm run -s lint

build:
	npm run -s build

sign-unlisted:
	@test -n "$$AMO_JWT_ISSUER" || (echo "Missing AMO_JWT_ISSUER"; exit 1)
	@test -n "$$AMO_JWT_SECRET" || (echo "Missing AMO_JWT_SECRET"; exit 1)
	NO_UPDATE_NOTIFIER=1 ./node_modules/.bin/web-ext sign -s src -a dist --channel=unlisted --api-key="$$AMO_JWT_ISSUER" --api-secret="$$AMO_JWT_SECRET"

sign-listed:
	@test -n "$$AMO_JWT_ISSUER" || (echo "Missing AMO_JWT_ISSUER"; exit 1)
	@test -n "$$AMO_JWT_SECRET" || (echo "Missing AMO_JWT_SECRET"; exit 1)
	NO_UPDATE_NOTIFIER=1 ./node_modules/.bin/web-ext sign -s src -a dist --channel=listed --api-key="$$AMO_JWT_ISSUER" --api-secret="$$AMO_JWT_SECRET"

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
