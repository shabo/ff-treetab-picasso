# Quickstart: Validate the Feature

Automated tests run only in CI (constitution II). This guide covers the CI gates and the manual
end-to-end checks that CI cannot do (real Firefox + Tree Style Tab).

## 1. CI gates (every PR)

Workflow `.github/workflows/ci.yml` runs on the PR head commit:

| Step | Command | Pass condition |
|------|---------|----------------|
| Install | `npm ci` | exit 0 |
| Style | `npm run lint` (ESLint + Prettier check) | 0 errors |
| Add-on lint | `npm run lint:ext` (`web-ext lint -s src`) | 0 errors, 0 warnings |
| Unit tests | `npm test` (Vitest + coverage) | all pass, `src/lib` ≥ 90 % lines |
| Generated data | `npm run gen:emoji && git diff --exit-code` | no diff |
| Build | `npm run build` | `dist/tree_tab_picasso-<ver>.zip` uploaded as artifact |

Check: record run ID, URL, and head SHA; the SHA must equal the PR head.

## 2. Manual smoke test (Firefox + TST)

Prereqs: Firefox ≥ 140, Tree Style Tab installed. Download the CI artifact, then load it in
`about:debugging` → "Load Temporary Add-on".

1. Right-click a parent tab in the TST sidebar → Tree Tab Picasso → Colors → Blue.
   Expect: parent and all descendants turn blue.
2. Add Emoji… → type "fire" → Arrow keys → Enter. Expect: 🔥 on the parent only.
3. Enable "Open previous windows and tabs", restart Firefox (install signed build for this
   step; temporary add-ons do not survive restart). Expect: same tabs blue and 🔥; no other tab.
4. Disable TST → pick a color. Expect: notification "Tree Style Tab is required…".
5. In TST settings, revoke this add-on's permission → pick a color. Expect: permission notice.
6. Open picker, press Escape. Expect: closes, nothing changes.

## 3. Release

1. `make publish` (bumps version, opens release PR).
2. Merge the release PR. Workflow `release-publish-amo.yml` calls CI, then signs on the listed
   channel with `amo-metadata-listed.json` and source upload, then creates GitHub Release
   `vX.Y.Z` with the signed `.xpi`.
3. Check the AMO developer hub: the version is listed (public after Mozilla review).
