# Tree Tab Picasso Constitution

## Core Principles

### I. Privacy First

- The extension MUST NOT collect, transmit, or share user data. It MUST make no network requests.
- The manifest MUST request only permissions the code uses. Each permission MUST have a
  documented reason in the README.
- The manifest MUST declare `data_collection_permissions: { required: ["none"] }`.

Rationale: users give a tab extension access to every tab. That trust is only kept by doing
nothing more than the feature needs.

### II. Test-First (NON-NEGOTIABLE)

- Every feature and bug fix MUST start with a test matrix built with equivalence partitioning
  and boundary value analysis: happy paths, sad paths, and edge cases.
- Tests MUST be written before the implementation and MUST fail first.
- Tests MUST run in the CI pipeline only. A change is validated only by a green CI run on its
  exact commit SHA.

Rationale: the extension talks to another add-on (Tree Style Tab) through a message API that
can fail in many ways. Only an explicit matrix catches those paths.

### III. Small Focused Modules

- Logic MUST live in small ES modules with one purpose each (palette/CSS, TST client, emoji
  store, menus, picker).
- Pure logic (CSS generation, validation, tree flattening, ID parsing, migrations) MUST have no
  dependency on the `browser` global, so it is testable in Node without a browser.
- Browser API access MUST go through thin adapters that tests can replace with mocks.

Rationale: a 500-line background script cannot be tested or reviewed with confidence.

### IV. Fail Visibly

- Code MUST NOT swallow errors with empty `catch` blocks. Each caught error MUST be logged with
  context and, when it affects the user, shown to the user.
- When Tree Style Tab is missing, not ready, or denies permission, the user MUST get a clear
  message that says how to fix it.

Rationale: silent failure looks like a broken extension and causes bad reviews.

### V. AMO-Ready Releases

- Every build MUST pass `web-ext lint` with zero errors.
- Every release MUST be reproducible from source with documented commands (`npm ci`, build).
  Generated files MUST be regenerable from a script in the repo.
- Releases MUST be published through the CI release workflow, never from a laptop.

Rationale: Mozilla review requires reviewable, reproducible source and a clean lint.

### VI. Accessible UI

- All UI (menus, emoji picker, notices) MUST be fully usable with the keyboard alone.
- Interactive elements MUST have correct ARIA roles, labels, and visible focus.
- UI MUST respect `prefers-color-scheme` and `prefers-reduced-motion`.

Rationale: an extension that changes how tabs look must not exclude users who rely on
assistive technology.

## Platform Constraints

- Target: Firefox desktop. `strict_min_version` MUST be set and MUST match the lowest version
  that supports every manifest key in use.
- Runtime dependency: Tree Style Tab external add-on API. The extension MUST degrade gracefully
  without it.
- No runtime third-party code. Dev dependencies only (build, lint, test).
- User-facing strings MUST come from `_locales` via `browser.i18n`.

## Development Workflow & Quality Gates

- Work happens on feature branches and merges to `main` through pull requests.
- Each PR MUST pass CI: install (`npm ci`), ESLint, `web-ext lint`, unit tests, and build.
- Releases use the existing release-branch flow (`make publish`); merging a release PR signs and
  publishes through the `release` GitHub environment.
- Dependencies MUST be kept current through Dependabot with grouped updates.

## Governance

- This constitution overrides other practice documents in this repository.
- Amendments require a PR that updates this file, states the version bump, and explains why.
- Versioning: MAJOR for removed or redefined principles, MINOR for new principles or sections,
  PATCH for wording fixes.
- Every PR review MUST check compliance with these principles. Exceptions MUST be written in
  the plan's Complexity Tracking table with a reason.

**Version**: 1.0.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-25
