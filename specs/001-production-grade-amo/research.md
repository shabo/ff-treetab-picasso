# Research: Production-Grade Release on AMO

Sources: TST wiki "API for other addons" and `tst-api.js` (trunk v4.4.7), MDN `sessions` and
`notifications`, addons-server API docs, web-ext `submit-addon.js`, addons-linter messages,
Mozilla add-ons blog (MV2 update). Versions checked with `npm view` on 2026-09-25.

## R1. Where to persist markers

- **Decision**: `browser.sessions.setTabValue(tabId, "picasso-marker-v1", {color?, emoji?})`
  for both color and emoji. In-memory cache rebuilt at start-up.
- **Rationale**: session values follow the tab through restart, session restore, and undo-close
  (new tab ID, same value), and are dropped when the tab is gone. TST does **not** persist
  custom states from `add-tab-state`, so color must be stored by us and re-applied on start-up
  and on TST `ready`.
- **Gotchas handled**: duplicated tabs copy the value (accepted: duplicate keeps the marker);
  on restored/duplicated tabs `tabs.onCreated` fires before restore completes, so the store
  re-reads the value 600 ms after `onCreated` (Firefox bug 1701900).
- **Alternatives**: `storage.local` keyed by tab ID (current, wrong after restart); keyed by URL
  (breaks for duplicate URLs and navigation).

## R2. Detecting TST problems

- **Decision**: map outcomes to reasons:
  - `sendMessage` rejects with "Could not establish connection" / "Receiving end does not
    exist" → `tst-missing`.
  - Other rejection, or `get-light-tree` returns a non-object (e.g. tab in a private window
    TST is not allowed to see) → `tst-denied`.
- **Rationale**: TST does not throw on missing permission; our calls (`get-light-tree`,
  `add/remove-tab-state`, style) need no TST permission, so we stop requesting `tabs` from TST.
  The only denial path left is private windows / API refusal.
- **Re-register**: on `ready` and `permissions-changed` from TST (sender check), call
  `register-self` again (replaces our style) and re-apply color states from the cache.
  `ready` is sent regardless of `listeningTypes`.

## R3. Style injection

- **Decision**: one `register-self` with full `style` text; re-sent after marker changes,
  debounced 50 ms. State classes on `tab-item`, visuals on
  `tab-item.<state> tab-item-substance`. Emoji rule uses `tab-item[data-tab-id="N"]`.
- **Rationale**: re-registering replaces the style element; no size limit. Debounce avoids a
  re-register per tab when coloring a large subtree.

## R4. Module loading without a bundler

- **Decision**: MV2 `background.page` → `background.html` with `<script type="module">`;
  picker page also uses `type="module"`. `emoji-data.js` becomes `export default {...}`.
- **Rationale**: Firefox supports module scripts in extension pages; no build step means the
  shipped package is the source (AMO reproducibility, constitution V).
- **Alternatives**: bundler (adds a step reviewers must reproduce), `background.scripts` with
  globals (not testable as modules).

## R5. Manifest version

- **Decision**: stay on MV2.
- **Rationale**: Mozilla has no plan to deprecate MV2 and promises ≥ 12 months' notice. MV3 in
  Firefox brings event pages that unload, which would force re-building the cache and
  re-registering with TST on every wake-up, for no user benefit. Revisit if Mozilla announces a
  timeline. Recorded in README "Design decisions".

## R6. Minimum Firefox version

- **Decision**: `strict_min_version: "140.0"`.
- **Rationale**: `data_collection_permissions` is supported from 140; a lower minimum gives the
  lint warning `KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION`. 140 is an ESR.

## R7. Permissions

- **Decision**: `menus`, `sessions`, `storage`, `notifications`. Remove `tabs`.
- **Rationale**: `tabs.query`, `tabs.onRemoved/onCreated`, and the tab object in
  `menus.onClicked` work without `tabs` (we never read URL or title). `sessions` for markers,
  `notifications` for fail-visibly notices.

## R8. User notices

- **Decision**: `browser.notifications.create(kind, {type:"basic", iconUrl, title, message})`
  using the kind as the ID (a new notice replaces the old one of the same kind) + a 30 s
  throttle per kind. Clicking a `tst-missing` notice opens the TST AMO page.
- **Rationale**: Firefox supports only `basic`; reusing IDs avoids piles of notices.

## R9. AMO listing and submission

- **Decision**: `web-ext sign --channel listed --amo-metadata amo-metadata-listed.json
  --upload-source-code source.zip --approval-timeout 900000` (wait up to 15 min so the
  signed XPI can be attached to the GitHub Release). If signing takes longer, the submission
  still stands; the Release is created with the unsigned build and a note, and the signed file
  can be added later from the AMO developer hub.
- Metadata fields (AMO v5 request): `summary`, `description`, `categories: ["tabs"]`,
  `homepage`, `developer_comments`, `version.license: "MPL-2.0"`, `version.release_notes`,
  `version.approval_notes` (reviewer notes). `support_url` is not accepted in requests; the
  support link lives in `description` and `homepage`.
- `source.zip` = `git archive HEAD` so reviewers can rebuild `emoji-data.js`.

## R10. Tooling versions

| Tool | Version | Note |
|------|---------|------|
| Node (CI) | 24 LTS | Vitest 5 needs ≥ 22.12 |
| web-ext | 10.7 | Node ≥ 20 |
| Vitest + coverage-v8 | 5.0 | `environment` per file via `// @vitest-environment happy-dom` |
| happy-dom | 20.x | lighter than jsdom 30 |
| ESLint | 10.x flat config | + `@eslint/js`, `globals`, `eslint-config-prettier` |
| Prettier | 3.x | |
| emojibase-data | 17 | unchanged |
| GitHub Actions | checkout v7.0.1, setup-node v7.0.0, upload-artifact v7.0.1, download-artifact v8.0.1 | pinned by SHA |

Gulp removed: npm scripts call `web-ext` directly.

## R11. Dependabot backlog

- **Decision**: add `.github/dependabot.yml` (npm + github-actions, weekly, grouped). Close
  #13–#19 with a comment once this work lands, because the upgraded lockfile supersedes them.
