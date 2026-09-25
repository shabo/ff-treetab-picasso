---

description: "Task list for 001-production-grade-amo"
---

# Tasks: Production-Grade Release on AMO

**Input**: Design documents from `/specs/001-production-grade-amo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED (constitution II). Test tasks come first in each phase, cite matrix IDs from
[contracts/test-matrix.md](contracts/test-matrix.md), and must fail before the implementation
task. Tests run in CI only — never locally.

**Organization**: grouped by user story (spec.md). Test names start with the matrix ID, e.g.
`it('[TM-008] accepts 64 code units', …)`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: user story from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: tooling and CI so every later commit is validated.

- [X] T001 Update `package.json`: `"type": "module"`, `"engines": {"node": ">=22.12"}`; remove `gulp`; add devDependencies `web-ext@^10.7.0`, `vitest@^5.0.2`, `@vitest/coverage-v8@^5.0.2`, `happy-dom@^20`, `eslint@^10`, `@eslint/js@^10`, `globals@^17`, `prettier@^3.9`, `eslint-config-prettier@^10`, keep `emojibase-data@^17`; scripts: `lint` (`eslint . && prettier --check .`), `format`, `lint:ext` (`web-ext lint -s src --self-hosted=false`), `test` (`vitest run --coverage`), `build` (`web-ext build -s src -a dist --overwrite-dest`), `gen:emoji`, `bump:version`, `start`; regenerate `package-lock.json`
- [X] T002 Delete `gulpfile.js`; update `Makefile`: `build` → `npm run -s build` (unsigned), remove `publish-amo` and `publish-local` targets (constitution V: CI-only publish), keep `publish` (release branch flow), add `test` target that prints "tests run in CI only"
- [X] T003 [P] Create `eslint.config.js` (flat config): `@eslint/js` recommended, `globals.browser` + `browser` readonly for `src/**`, `globals.node` for `scripts/**`, `tests/**`, config files; rules `no-empty: ["error", {allowEmptyCatch: false}]`, `no-unused-vars` error (args `^_` ignored), `eqeqeq`, `prefer-const`; ignore `dist/`, `node_modules/`, `src/emoji-data.js`, `.specify/`; append `eslint-config-prettier`
- [X] T004 [P] Create `.prettierrc.json` (`singleQuote: true`, `printWidth: 100`, `trailingComma: "none"`) and `.prettierignore` (`dist`, `node_modules`, `src/emoji-data.js`, `package-lock.json`, `.specify`, `specs`, `docs/*.html`)
- [X] T005 [P] Create `vitest.config.js`: `environment: 'node'`, `include: ['tests/**/*.test.js']`, coverage provider `v8`, `include: ['src/**/*.js']`, exclude `src/emoji-data.js`, thresholds `{'src/lib/**': {lines: 90, perFile: true}}`, reporters `text` + `json-summary`
- [X] T006 [P] Create `.github/workflows/ci.yml`: triggers `pull_request`, `push` to `main`, `workflow_call`; `permissions: contents: read`; job `check` on `ubuntu-latest`, Node 24: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`, `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0` (cache npm), `npm ci`, `npm run lint`, `npm run lint:ext`, `npm test`, `npm run gen:emoji && git diff --exit-code src/emoji-data.js`, `npm run build`, `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1` with `dist/*.zip` named `tree-tab-picasso-unsigned`
- [X] T007 [P] Update `.gitignore`: add `coverage/`; run `npm run format` once so existing files match Prettier (formatting only, no test run)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: shared pure modules, browser mock, manifest, i18n catalog. No story work before this.

### Tests first

- [X] T008 [P] Create `tests/helpers/browser-mock.js`: `createBrowserMock()` returns a `browser`-shaped object with `vi.fn()` stubs and in-memory state for `runtime` (`sendMessage`, `getManifest`, `getURL`, `id`, `onMessage`, `onMessageExternal`, `onInstalled`, `onStartup` with `.addListener` + `.fire(...)` helper), `menus` (`create`, `removeAll`, `onClicked`), `tabs` (`query`, `onRemoved`, `onCreated`), `sessions` (`getTabValue`, `setTabValue`, `removeTabValue` backed by `Map`; reject for unknown tab IDs), `storage.local` (`get`, `set`, `remove` backed by object), `notifications` (`create`, `clear`, `onClicked`), `windows.create`, `i18n.getMessage` (reads `src/_locales/en/messages.json`, substitutes `$1`), `tabsList` setter for open tabs
- [X] T009 [P] Write `tests/unit/validate.test.js` covering TM-001…TM-014
- [X] T010 [P] Write `tests/unit/palette.test.js` covering TM-020…TM-024
- [X] T011 [P] Write `tests/unit/queue.test.js` covering TM-050…TM-052
- [X] T012 [P] Write `tests/unit/tree.test.js` covering TM-040…TM-045

### Implementation

- [X] T013 [P] Implement `src/lib/validate.js`: `isValidTabId` (integer ≥ 0), `isValidEmoji` ("1–64 UTF-16 code units, no control chars (U+0000–U+001F, U+007F)"), `isValidColor` ("`0 ≤ color < PALETTE.length` (20)", integers only), `sanitizeMarker(raw)` → `{color?, emoji?}` or `null` (drops invalid fields)
- [X] T014 [P] Implement `src/lib/palette.js`: frozen `PALETTE` (same 20 hex/text values and order as v0.1.3, `nameKey` e.g. `colorRed`), `COLOR_STATE_PREFIX = 'tabs-color-color-'`, `colorState(i)`, `allColorStates()`, `legacyShadeStates()`, `parseColorMenuId(id)`, `swatchDataUrl(hex)`
- [X] T015 [P] Implement `src/lib/queue.js`: `createSerialQueue()` → `run(fn)` returns fn's promise, chains after previous, failure does not block later tasks
- [X] T016 [P] Implement `src/lib/tree.js`: `flattenTree(item)` iterative pre-order, ignores items without numeric `id`
- [X] T017 Create `src/_locales/en/messages.json` with keys: `extName`, `extDescription`, `menuRoot`, `menuColors`, `menuColorItem` (placeholders name, hex), `menuAddEmoji`, `menuClearEmoji`, `menuClearColor`, `menuClearBoth`, `menuClearEverything`, 20 `color<Name>` keys, `noticeTitle`, `noticeTstMissing`, `noticeTstDenied`, `noticePopupBlocked`, `noticeUnknownError`, picker keys `pickerTitle`, `pickerSearchPlaceholder`, `pickerSearchLabel`, `pickerClear`, `pickerGroups`, `pickerGridLabel`, `pickerAll`, `pickerRecent`, `pickerCount` (placeholder count), `pickerEmpty`, `pickerMissingTab`, `pickerSaveError`
- [X] T018 Rewrite `src/manifest.json`: MV2, `name: "__MSG_extName__"`, `description: "__MSG_extDescription__"`, `default_locale: "en"`, `background: {page: "background.html"}`, `permissions: ["menus","sessions","storage","notifications"]` (no `tabs`), `browser_specific_settings.gecko`: keep `id`, add `strict_min_version: "140.0"`, keep `data_collection_permissions.required: ["none"]`; `homepage_url` = GitHub repo; icons unchanged
- [X] T019 Create `src/background.html` loading `<script type="module" src="background/main.js"></script>`; delete `src/background.js` at the end of Phase 4 (T041)

**Checkpoint**: CI green on lint + foundational tests.

---

## Phase 3: User Story 1 - Markers stay on the right tabs (P1) 🎯 MVP

**Goal**: color + emoji markers persist per tab across restart; migration; no lost writes.

**Independent Test**: quickstart §2 steps 1–3; TM-030…TM-035, TM-060…TM-065 (recent is used by
store), TM-080…TM-099.

### Tests first

- [X] T020 [P] [US1] Write `tests/unit/css.test.js` covering TM-030…TM-035 (include a check that parsing the output with a simple tokenizer finds balanced braces and no rule break-out for TM-032)
- [X] T021 [P] [US1] Write `tests/unit/migration.test.js` covering TM-080…TM-083
- [X] T022 [P] [US1] Write `tests/unit/recent.test.js` covering TM-060…TM-065
- [X] T023 [P] [US1] Write `tests/background/marker-store.test.js` covering TM-090…TM-099 (fake timers for the 600 ms re-read)

### Implementation

- [X] T024 [P] [US1] Implement `src/lib/css.js`: `cssString(s)` (escape `\`, `"`, and every code point < 0x20, 0x7F, and U+2028/2029 as `\HH `), `buildTstStyle(markers: Map|Object)` → color rules for all 20 states (state class on `tab-item`, visuals on `tab-item.<state> tab-item-substance`, `--tab-surface`, `--tab-text`, active/bundled-active override) + one emoji rule per valid marker `tab-item[data-tab-id="N"] tab-item-substance::before { content: <cssString> … }`; `prefers-reduced-motion` disables transition
- [X] T025 [P] [US1] Implement `src/lib/migration.js`: `LEGACY_EMOJI_KEY = 'tabs-color-tab-emoji-v1'`, `MIGRATION_FLAG_KEY = 'picasso-migrated-v1'`, `planLegacyMigration(raw, openTabIds)` → `[{tabId, emoji}]`
- [X] T026 [P] [US1] Implement `src/lib/recent.js`: `RECENT_MAX = 24`, `pushRecent(list, emoji)` ("Max 24 entries, newest first, unique"), `sanitizeRecent(raw)`
- [X] T027 [US1] Implement `src/background/marker-store.js`: `createMarkerStore({browser, queue, log})` with `MARKER_KEY = 'picasso-marker-v1'`; `init()` (migration once per data-model steps 1–4, then build cache from `tabs.query({})` + `getTabValue`), `get(tabId)`, `all()` (Map copy), `setColor(tabIds, idx|null)`, `setEmoji(tabId, emoji|null)`, `clearAll()`, `onTabRemoved(tabId)`, `onTabCreated(tab, delayMs=600)`; every write through the serial queue; empty marker → `removeTabValue`; returns `{ok:false,error}` on failure and logs with context; emits `onChange` callback
- [X] T028 [US1] Implement `src/background/recent-store.js`: `createRecentStore({browser})` with key `picasso-recent-emojis-v1`; `list()`, `push(emoji)` (serialized)

**Checkpoint**: markers module fully tested; wiring comes in US2 main.

---

## Phase 4: User Story 2 - Clear feedback when TST is not available (P1)

**Goal**: typed TST results, throttled notices, single init, re-apply on `ready`.

**Independent Test**: quickstart §2 steps 4–5; TM-070…TM-073, TM-100…TM-119.

### Tests first

- [X] T029 [P] [US2] Write `tests/unit/throttle.test.js` covering TM-070…TM-073
- [X] T030 [P] [US2] Write `tests/background/tst-client.test.js` covering TM-100…TM-105
- [X] T031 [P] [US2] Write `tests/background/notifier.test.js`: notice uses kind as ID, i18n title/message, `iconUrl: 'icons/icon-48.png'`, throttled per TM-071; click on `tst-missing` opens `https://addons.mozilla.org/firefox/addon/tree-style-tab/`
- [X] T032 [P] [US2] Write `tests/background/main.test.js` covering TM-110…TM-119 (import `src/background/main.js` with `globalThis.browser = createBrowserMock()`; `vi.resetModules()` per test)

### Implementation

- [X] T033 [P] [US2] Implement `src/lib/throttle.js`: `createThrottle(windowMs, now = Date.now)` → `allow(kind)`; boundary: allowed again at exactly `windowMs`
- [X] T034 [P] [US2] Implement `src/background/tst-client.js` per [contracts/tst-api.md](contracts/tst-api.md): `TST_ID`, `createTstClient({browser, log})` → `register(style)`, `getSubtree(tabId)`, `setColor(tabIds, idx|null)`, `classifyError(e)`; never throws
- [X] T035 [P] [US2] Implement `src/background/notifier.js`: `createNotifier({browser, throttle, log})` → `notify(kind)` for kinds `tst-missing`, `tst-denied`, `popup-blocked`, `unknown-error`; registers `notifications.onClicked`
- [X] T036 [US2] Implement `src/background/menus.js`: `createMenus(browser)` per menu contract (i18n titles, swatch icons) and `routeMenuClick(info)` → action object (`{kind:'color', idx}`, `{kind:'clear-color'}`, … or `null`)
- [X] T037 [US2] Implement `src/background/main.js`: build dependencies; `initOnce()` memoized promise (menus, `store.init()`, register style, re-apply colors) called from module load, `onInstalled`, `onStartup`; debounce style re-register 50 ms on store change; handlers: menu clicks (color → `getSubtree` → `store.setColor` → `tst.setColor`; failures → `notifier.notify(reason)`), `picasso:set-emoji` message per [contracts/runtime-messages.md](contracts/runtime-messages.md) with sender check, `onMessageExternal` (`ready`/`permissions-changed` from TST only), `tabs.onRemoved`, `tabs.onCreated`; open picker via `windows.create` (`picker/picker.html?tabId=N`), rejection → `popup-blocked`; no empty catch
- [X] T038 [US2] Remove the unused openerTabId fallback (not ported) and legacy globals; confirm no reference remains in `src/`
- [X] T039 [P] [US2] Write `tests/static/manifest.test.js` covering TM-143, TM-144 (every `__MSG_x__` and `getMessage('x')` / `data-i18n="x"` in `src/` exists in `messages.json`; permissions set equals `["menus","notifications","sessions","storage"]`; `strict_min_version` = `140.0`)
- [X] T040 [US2] Update `scripts/bump_version.mjs` and `scripts/release_start.sh` if they reference removed files (gulp, `src/background.js`)
- [X] T041 [US2] Delete `src/background.js`

**Checkpoint**: US1 + US2 together = shippable MVP (CI green, manual smoke §2 1–5).

---

## Phase 5: User Story 3 - Install from the public add-on store (P2)

**Goal**: listed submission with full metadata, source upload, GitHub Release.

**Independent Test**: quickstart §3.

- [X] T042 [P] [US3] Add `LICENSE` with the full MPL-2.0 text (from https://www.mozilla.org/media/MPL/2.0/index.txt)
- [X] T043 [P] [US3] Rewrite `amo-metadata-listed.json`: `summary`, `description` (en-US; features, TST requirement, support link to GitHub issues, privacy: "collects no data, makes no network requests"), `categories: ["tabs"]`, `homepage: {"en-US": "https://github.com/shabo/ff-treetab-picasso"}`, `developer_comments`, `version: {license: "MPL-2.0", release_notes, approval_notes}`; `approval_notes` = contents summary of `AMO_REVIEWER_NOTES.md`
- [X] T044 [P] [US3] Create `AMO_REVIEWER_NOTES.md`: TST dependency + install link, test steps (quickstart §2), no bundler/minifier, `emoji-data.js` generated by `npm ci && npm run gen:emoji` from `emojibase-data`, build `npm run build`, Node 24
- [X] T045 [US3] Rewrite `.github/workflows/release-publish-amo.yml`: keep trigger/conditions; job `ci` `uses: ./.github/workflows/ci.yml`; job `publish` `needs: ci`, `environment: release`, `permissions: contents: write`; pinned actions; Node 24; steps: `npm ci`, `npm run build`, `git archive --format=zip -o dist/source.zip HEAD`, `npx web-ext sign -s src -a dist --channel=listed --amo-metadata=amo-metadata-listed.json --upload-source-code=dist/source.zip --approval-timeout=900000` (secrets via env `WEB_EXT_API_KEY`/`WEB_EXT_API_SECRET`, not CLI args); read version from `src/manifest.json`; `gh release create v$VERSION` with signed `*.xpi` if present else unsigned zip + note; tag must not already exist
- [X] T046 [US3] Update `README.md`: AMO install link, TST setup, permissions table with reasons (constitution I), privacy section, troubleshooting (notices), design decisions (MV2, sessions storage), build-from-source, remove local publish instructions

---

## Phase 6: User Story 4 - Maintainers get automatic quality gates (P2)

**Goal**: dependency hygiene; CI already added in Phase 1, release gating in T045.

**Independent Test**: PR shows `check` job result; release job lists `ci` as a needed job.

- [X] T047 [P] [US4] Create `.github/dependabot.yml`: `npm` and `github-actions`, weekly, groups `dev-dependencies` (all npm) and `actions` (all actions), `open-pull-requests-limit: 5`
- [X] T048 [P] [US4] Create `CONTRIBUTING.md` (branch → PR flow, tests CI-only with matrix IDs, SpecKit for features, commit style) and `SECURITY.md` (report via GitHub private advisory; supported: latest version)
- [ ] T049 [US4] After merge: close Dependabot PRs #13–#19 with comment "Superseded by #21 (dependencies upgraded and lockfile regenerated)."

---

## Phase 7: User Story 5 - Accessible emoji picker (P3)

**Goal**: keyboard, ARIA grid, recent group, dark mode, error states.

**Independent Test**: TM-120…TM-137; quickstart §2 steps 2 and 6.

### Tests first

- [X] T050 [P] [US5] Write `tests/unit/picker-nav.test.js` covering TM-120…TM-127
- [X] T051 [P] [US5] Write `tests/picker/picker.test.js` (`// @vitest-environment happy-dom`) covering TM-130…TM-137: load `src/picker/picker.html` body into document, set `location.search`, mock `browser` + `window.close`, import `src/picker/picker.js`

### Implementation

- [X] T052 [US5] Change `scripts/gen_emoji_data.mjs` to emit `src/emoji-data.js` as `export default {...};` (no `generatedAt` timestamp so output is deterministic), regenerate the file
- [X] T053 [P] [US5] Implement `src/picker/picker-nav.js`: `nextIndex(index, key, count, columns)` per TM-120…TM-127
- [X] T054 [US5] Implement `src/picker/picker.html` (i18n via `data-i18n` attributes filled at start; search `<input type="search">` with `<label>`; groups `role="tablist"`/`tab`; grid `role="grid"` with rows `role="row"` and cells `role="gridcell"` buttons; `aria-live="polite"` meta; `<script type="module" src="picker.js">`) and `src/picker/picker.js` (roving tabindex, arrow/Home/End/Enter/Escape, column count from computed grid, Recent group first when non-empty, `sendMessage` response handling, `window.close()` only on `{ok:true}`)
- [X] T055 [US5] Implement `src/picker/picker.css`: CSS custom properties for light theme, `@media (prefers-color-scheme: dark)` overrides, `:focus-visible` outline ≥ 2 px, `@media (prefers-reduced-motion: reduce)` no transitions; delete old `src/emoji_picker.html`, `src/emoji_picker.js`, `src/emoji_picker.css`

---

## Phase 8: User Story 6 - Localized interface (P3)

**Goal**: all strings from catalog (implemented in T017/T018/T036/T054; this phase verifies).

- [X] T056 [US6] Ensure `tests/static/manifest.test.js` (T039) also fails on hard-coded user-visible strings: scan `src/picker/picker.html` text nodes (must be empty or `data-i18n`) and `menus.create` calls (titles only via `getMessage`)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T057 [P] Create `CHANGELOG.md` (Keep a Changelog; `0.2.0` entry listing fixes and features; older versions from git log)
- [X] T058 [P] Update `docs/tst_sidebar_demo.html` and screenshots only if paths changed (picker renamed) — otherwise leave
- [X] T059 Push, get CI green on PR #21 head SHA; record run ID/URL/SHA in PR description
- [ ] T060 Mark PR #21 ready; after merge run `make publish VERSION_BUMP=minor` (0.2.0) → release PR → merge → release workflow run green → record AMO submission + GitHub Release URL in issue #20
- [ ] T061 Close Dependabot PRs (T049) and update issue #20 checklist

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → (US1 ∥ US2 tests) → US2 main (T037) needs US1 store (T027, T028) → US3/US4/US5 in parallel → US6 → Polish.
- US5 depends only on Phase 2 + T052; can run in parallel with US1/US2.
- US3 T045 depends on T006 (ci.yml `workflow_call`).

## Parallel Example (Kimi agents, disjoint files)

```text
Agent A: T009–T016 (tests/unit/{validate,palette,queue,tree}, src/lib/{validate,palette,queue,tree})
Agent B: T020–T028 (css, migration, recent, marker-store, recent-store + tests)
Agent C: T029–T035 (throttle, tst-client, notifier + tests)
Agent D: T050–T055 (picker + gen script + tests)
Primary: T001–T008, T017–T019, T036–T041 (wiring), T042–T049, reviews, CI
```

## Implementation Strategy

1. MVP = Phases 1–4 (US1 + US2): correct markers + visible failures, CI green.
2. Then US3 + US4 (release path), US5 (picker), US6 check, polish.
3. One PR (#21) carries spec, plan, tasks, and implementation; release PR follows via
   `make publish`.
