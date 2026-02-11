.PHONY: help deps lint build run start stop clean distclean

PID_FILE := .web-ext.pid
LOG_FILE := .web-ext.log

help:
	@printf "%s\n" \
	  "Targets:" \
	  "  make deps       Install dev dependencies (web-ext)" \
	  "  make lint       Syntax-check background.js" \
	  "  make build      Build + auto-publish to AMO when AMO_JWT_* are set" \
	  "  make build-unsigned  Build unsigned artifact into dist/" \
	  "  make publish-amo Publish to AMO (requires AMO_JWT_* env vars)" \
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

build-unsigned:
	npm run -s build:unsigned

publish-amo:
	npm run -s publish:amo

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
