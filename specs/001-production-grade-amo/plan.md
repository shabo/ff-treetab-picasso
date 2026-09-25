# Implementation Plan: Production-Grade Release on AMO

**Branch**: `001-production-grade-amo` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-production-grade-amo/spec.md`

## Summary

Fix the marker-correctness and silent-failure bugs, restructure the extension into small tested
ES modules, add CI quality gates that also gate the release, and complete everything AMO needs
for a listed, reviewable submission (metadata, license, source build steps, reviewer notes).

Technical approach (details in [research.md](research.md)):

- Markers move from `storage.local` keyed by tab ID to `browser.sessions` tab values (survive
  restart, auto-drop on close), with a one-time migration and a serial write queue.
- `src/lib/` holds pure logic (no `browser` global). `src/background/` holds thin adapters
  that receive `browser` by injection. Loaded as native ES modules (no bundler), so the
  package equals the source.
- TST failures map to typed reasons and throttled `browser.notifications` notices.
- Vitest 5 (Node env + happy-dom for the picker) with coverage thresholds; ESLint 10 flat
  config + Prettier; `web-ext lint`. CI runs on PRs; the release workflow calls CI first.

## Technical Context

**Language/Version**: JavaScript (ES2023 modules) in the extension; Node.js 24 LTS for tooling/CI

**Primary Dependencies**: none at runtime. Dev: web-ext 10, Vitest 5 + @vitest/coverage-v8,
happy-dom 20, ESLint 10 + @eslint/js + globals, Prettier 3, eslint-config-prettier,
emojibase-data 17. Gulp is removed (npm scripts are enough).

**Storage**: `browser.sessions` tab values (markers), `browser.storage.local` (recent emojis,
migration flag, legacy map read-once)

**Testing**: Vitest in CI only; `browser` API mock in `tests/helpers/browser-mock.js`;
matrix in [contracts/test-matrix.md](contracts/test-matrix.md)

**Target Platform**: Firefox desktop ≥ 140 (`strict_min_version: "140.0"`), Manifest V2

**Project Type**: browser extension (background page + popup window page)

**Performance Goals**: menu action → visible TST change < 300 ms for 1 000 tabs; CSS build for
1 000 markers < 50 ms

**Constraints**: no network, no runtime deps, no bundler, no `eval`/inline scripts (CSP),
package reproducible from repo source

**Scale/Scope**: up to ~2 000 open tabs; ~1 500 lines of source after split

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-design | Post-design |
|-----------|------|------------|-------------|
| I. Privacy First | No network; permissions = used APIs; data-collection key = none | ✅ | ✅ `tabs` dropped; `sessions`, `notifications` added with README reasons |
| II. Test-First | Matrix before code; CI-only tests | ✅ | ✅ test-matrix.md; tasks put tests before code |
| III. Small Modules | Pure logic without `browser` | ✅ | ✅ `src/lib/*` pure; adapters injected |
| IV. Fail Visibly | No empty catch; user notices | ✅ | ✅ typed reasons + notifier; ESLint `no-empty` error |
| V. AMO-Ready | web-ext lint clean; reproducible; CI-only release | ✅ | ✅ no bundler; gen-data check in CI; local publish targets removed |
| VI. Accessible UI | Keyboard, ARIA, color scheme | ✅ | ✅ roving-tabindex grid, `prefers-*` media queries |

No violations → Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-production-grade-amo/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── runtime-messages.md
│   ├── tst-api.md
│   └── test-matrix.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── manifest.json               # MV2, background.page, i18n, sessions+notifications
├── _locales/en/messages.json
├── background.html             # <script type="module" src="background/main.js">
├── background/
│   ├── main.js                 # wiring, init-once, event listeners
│   ├── tst-client.js           # TST messages → typed results
│   ├── marker-store.js         # sessions tab values + cache + queue + migration
│   ├── recent-store.js         # storage.local recent emojis
│   ├── menus.js                # menu creation + click routing
│   └── notifier.js             # notifications + throttle
├── lib/                        # pure, browser-free
│   ├── palette.js
│   ├── validate.js
│   ├── css.js
│   ├── tree.js
│   ├── queue.js
│   ├── recent.js
│   ├── throttle.js
│   └── migration.js
├── picker/
│   ├── picker.html
│   ├── picker.css
│   ├── picker.js
│   └── picker-nav.js           # pure grid navigation
├── emoji-data.js               # generated (ES module export)
└── icons/

tests/
├── helpers/browser-mock.js
├── unit/                       # one file per src/lib module + picker-nav
├── background/                 # adapters + main with browser mock
├── picker/                     # happy-dom UI tests
└── static/                     # manifest/i18n/permissions checks

.github/
├── workflows/ci.yml            # PR + push main; also workflow_call
├── workflows/release-publish-amo.yml  # calls ci.yml, then sign + GH Release
└── dependabot.yml

LICENSE, CHANGELOG.md, SECURITY.md, CONTRIBUTING.md, README.md, AMO_REVIEWER_NOTES.md
eslint.config.js, .prettierrc.json, .prettierignore, vitest.config.js
```

**Structure Decision**: single extension project. `src/` is the exact package root given to
`web-ext`; `tests/` and tooling stay outside it so they never ship.

## Delivery Order

1. Tooling + CI (so every later commit is validated).
2. Pure `lib/` modules with tests.
3. Background adapters + main with tests; manifest + i18n.
4. Picker rework with tests.
5. Release workflow, metadata, docs, dependency cleanup.
6. Release PR → listed submission.

## Complexity Tracking

None.
