# Contributing

## Setup

- Node.js 24 (see `engines` in `package.json`), Firefox ≥ 140, and Tree Style Tab.
- `npm ci`, then `make run` to start Firefox with the add-on loaded.

## Workflow

1. Create a branch from `main`. For a larger feature, use SpecKit (`specs/NNN-name/`:
   spec → plan → tasks) and follow `.specify/memory/constitution.md`.
2. Write the test matrix first (happy paths, sad paths, edge cases), then the tests, then the
   code. Test names start with their matrix ID, e.g. `it('[TM-008] …')`.
3. Open a pull request. **Tests run only in CI** (`.github/workflows/ci.yml`): ESLint + Prettier,
   `web-ext lint`, Vitest with coverage, a check that `src/emoji-data.js` is up to date, and a
   build. The PR can merge only when CI is green on its latest commit.
4. `make lint`, `make lint-ext`, and `make format` are fine to run locally for fast feedback.

## Code rules

- `src/lib/`: pure functions only, no `browser` global.
- `src/background/`: adapters get `browser` passed in, so tests can use
  `tests/helpers/browser-mock.js`.
- No empty `catch`. Log errors with context; show the user a notice when it affects them.
- All user-visible text lives in `src/_locales/en/messages.json`.
- New permissions need a reason in `README.md` and `AMO_REVIEWER_NOTES.md`.

## Releases

Maintainers only: `make publish VERSION_BUMP=patch|minor|major` opens a release PR. Add a
`CHANGELOG.md` entry for the new version to that PR. Merging it runs CI, submits the version to
AMO (listed channel, with source), and creates a GitHub Release. Nobody publishes from a laptop.
