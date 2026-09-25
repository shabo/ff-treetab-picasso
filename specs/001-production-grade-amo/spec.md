# Feature Specification: Production-Grade Release on AMO

**Feature Branch**: `001-production-grade-amo`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Implement GitHub issue #20: make Tree Tab Picasso production grade
and publicly listed on AMO." (full scope list in issue #20)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Markers stay on the right tabs (Priority: P1)

A user colors a branch of tabs and adds an emoji marker to a tab. They close Firefox and open it
again with session restore. The same tabs show the same colors and the same emoji. No other tab
gets a marker by mistake.

**Why this priority**: today emoji markers are saved by a tab number that changes on every
restart. After a restart, markers can appear on the wrong tabs. This is a data-correctness bug.

**Independent Test**: mark tabs, restart the browser with session restore, check that each
marker is on its original tab and on no other tab.

**Acceptance Scenarios**:

1. **Given** tab A has emoji 🔥 and color Blue, **When** Firefox restarts and restores the
   session, **Then** tab A shows 🔥 and Blue, and no other tab shows 🔥.
2. **Given** a user of v0.1.3 has saved emoji markers, **When** they update, **Then** markers of
   still-open tabs move to the new storage once, and the old data is removed.
3. **Given** the user sets emojis on two tabs very quickly, **When** both actions finish,
   **Then** both emojis are saved.
4. **Given** a marked tab is closed, **When** the close finishes, **Then** its marker data is
   removed.

---

### User Story 2 - Clear feedback when Tree Style Tab is not available (Priority: P1)

A user installs the extension but Tree Style Tab (TST) is missing, disabled, or has not allowed
this extension. When they use a menu action, they see a short message that says what is wrong
and how to fix it.

**Why this priority**: today the extension fails silently, which looks broken and causes bad
reviews and support requests.

**Independent Test**: disable TST, use "Colors → Blue", and check that a message appears.

**Acceptance Scenarios**:

1. **Given** TST is not installed, **When** the user picks a color, **Then** a notification says
   TST is required and gives the install link.
2. **Given** TST denies permission, **When** the user picks a color, **Then** a notification
   says to grant permission in TST's settings.
3. **Given** TST becomes ready later, **When** it sends its ready signal, **Then** the extension
   registers again and re-applies the saved markers with no user action.
4. **Given** repeated failures, **When** the user clicks many times, **Then** they see at most
   one notification per failure type per 30 seconds.

---

### User Story 3 - Install from the public add-on store (Priority: P2)

A Firefox user searches addons.mozilla.org for "Tree Tab Picasso", reads a complete listing
(description, screenshots, privacy statement, support link) and installs it.

**Why this priority**: public listing is the goal of issue #20, but it depends on a correct and
reviewable build.

**Independent Test**: merge a release PR; check that the store reports a new listed version and
that a GitHub Release holds the signed package.

**Acceptance Scenarios**:

1. **Given** a release PR is merged, **When** the release pipeline runs, **Then** it submits to
   the listed channel with complete listing metadata and reviewer notes.
2. **Given** a reviewer downloads the source, **When** they follow the build steps, **Then** they
   get a package identical in content to the submitted one.
3. **Given** the release pipeline ran, **When** it finishes, **Then** a tagged GitHub Release
   has the signed package attached.

---

### User Story 4 - Maintainers get automatic quality gates (Priority: P2)

A contributor opens a pull request. Automated checks run style checks, add-on validation, unit
tests, and a build. A release cannot be published unless those checks pass.

**Why this priority**: it protects every future change and is required by the constitution.

**Independent Test**: open a PR with a failing test and check that the PR is marked failed.

**Acceptance Scenarios**:

1. **Given** a PR, **When** it is opened or updated, **Then** checks run and report pass/fail.
2. **Given** checks fail on the release commit, **When** the release PR is merged, **Then**
   nothing is published.
3. **Given** a dependency update is available, **When** the weekly schedule runs, **Then** one
   grouped update PR is opened.

---

### User Story 5 - Accessible emoji picker (Priority: P3)

A keyboard-only or screen reader user opens "Add Emoji…", searches, moves through the grid with
arrow keys, selects with Enter, and closes with Escape. Recently used emojis appear first. The
picker follows the system dark or light theme.

**Why this priority**: improves quality and accessibility, but the core feature works without it.

**Independent Test**: open the picker, never touch the mouse, and set an emoji.

**Acceptance Scenarios**:

1. **Given** the picker is open, **When** the user presses arrow keys, **Then** focus moves one
   cell in that direction and a screen reader announces the emoji name.
2. **Given** focus is on an emoji, **When** the user presses Enter, **Then** the emoji is set and
   the picker closes.
3. **Given** the picker is open, **When** the user presses Escape, **Then** it closes with no
   change.
4. **Given** the user picked emojis before, **When** they open the picker, **Then** a "Recent"
   group shows up to 24 recent emojis, newest first, with no duplicates.
5. **Given** the OS uses dark mode, **When** the picker opens, **Then** it uses dark colors.

---

### User Story 6 - Localized interface (Priority: P3)

All menu titles, messages, and picker labels come from a translation catalog, so translators can
add languages without code changes. English ships first.

**Independent Test**: check that no user-visible string is hard-coded outside the catalog.

**Acceptance Scenarios**:

1. **Given** English locale, **When** the menu opens, **Then** all labels show English text from
   the catalog.

### Edge Cases

- Emoji text at the length limit (64 characters) is accepted; 65 is rejected.
- Emoji text with quotes, backslashes, or `*/` cannot break or inject style rules.
- Tab tree of one tab, deep tree (100 levels), wide tree (1,000 tabs).
- Tab closed between menu click and action.
- Old saved data that is malformed (not an object, wrong types, negative tab numbers).
- Invalid message sent to the background (wrong type, missing tab number, non-string emoji).
- Palette index out of range (-1, 20) from a menu identifier.
- Browser starts before TST is ready.
- Popup window blocked by user settings.
- "Recent" list at 24 entries when a new emoji is added (oldest drops).

## Requirements *(mandatory)*

### Functional Requirements

**Correctness**

- **FR-001**: Color and emoji markers MUST be stored per tab in a way that survives browser
  restart with session restore and is removed when the tab closes.
- **FR-002**: On first run after update, the extension MUST move v0.1.3 emoji data for tabs that
  are still open, then delete the old data. Migration MUST run at most once.
- **FR-003**: Writes to marker data MUST be serialized so that no update is lost.
- **FR-004**: After start-up and when TST signals ready, the extension MUST register once and
  re-apply all saved markers.
- **FR-005**: Start-up work MUST run once per background start, not once per event.
- **FR-006**: All input from messages, menu identifiers, and stored data MUST be validated
  (types, ranges, emoji length 1–64).

**Feedback**

- **FR-007**: The extension MUST show a user notification when TST is missing, not ready, or
  denies permission, with the fix. Repeats of the same notice MUST be limited to one per 30 s.
- **FR-008**: Errors MUST be logged with context. No empty error handlers.

**Picker**

- **FR-009**: The picker MUST support arrow keys, Home/End, Enter, Escape, and Tab between
  search, groups, and grid.
- **FR-010**: The picker MUST expose grid semantics and accessible names for each emoji.
- **FR-011**: The picker MUST follow the system color scheme and reduced-motion setting.
- **FR-012**: The picker MUST show a "Recent" group (max 24, newest first, unique).

**Localization**

- **FR-013**: All user-visible text MUST come from the English message catalog.

**Quality gates**

- **FR-014**: Every PR and push to `main` MUST run: dependency install, style checks, add-on
  validation, unit tests, and build, and MUST upload the unsigned package.
- **FR-015**: The release pipeline MUST publish only when the quality gates pass on the release
  commit, MUST use the correct listing metadata file, and MUST create a tagged GitHub Release
  with the signed package.
- **FR-016**: Third-party pipeline steps MUST be pinned to exact versions.
- **FR-017**: Dependency updates MUST arrive as grouped weekly PRs. Open stale update PRs MUST
  be merged or closed.

**Store readiness**

- **FR-018**: The manifest MUST declare the lowest supported Firefox version and only the
  permissions that are used.
- **FR-019**: The repo MUST include the MPL-2.0 license text.
- **FR-020**: Listing metadata MUST include summary, full description, homepage, support URL,
  "Tabs" category, and a "no data collected" privacy statement, plus reviewer notes that explain
  the TST dependency and how to test.
- **FR-021**: The repo MUST document how to rebuild every generated file from source.
- **FR-022**: The repo MUST include a changelog, security policy, contributing guide, and a
  README with install, setup, troubleshooting, and privacy sections.

### Key Entities

- **Tab marker**: per-tab data: optional palette color index (0–19) and optional emoji (1–64
  chars). Lives as long as the tab.
- **Recent emoji list**: ordered unique list of up to 24 emojis, local to the profile.
- **Legacy emoji map**: v0.1.3 data (tab number → emoji). Read once for migration, then deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a browser restart, 100% of markers appear on their original tabs and 0 on
  other tabs.
- **SC-002**: With TST unavailable, 100% of menu actions produce visible feedback within 1 s.
- **SC-003**: The add-on is publicly listed and installable from the store.
- **SC-004**: Every PR gets an automated pass/fail result in under 10 minutes.
- **SC-005**: Add-on validation reports 0 errors; unit tests cover at least 90% of lines in
  pure logic modules.
- **SC-006**: A keyboard-only user can set an emoji in under 10 key presses after search.
- **SC-007**: 0 open dependency update PRs older than 14 days after merge of this work.

## Assumptions

- Firefox desktop only. Lowest supported version is the first version that accepts the
  data-collection manifest key (140).
- The extension stays on the current manifest version; the reason is recorded in the plan.
- Store review time is outside the team's control. "Done" for SC-003 is a successful listed
  submission; public availability follows Mozilla's approval.
- Store credentials already exist as repository secrets in the `release` environment.
- Colors are applied to every tab of the subtree at the time of the action; tabs added later to
  the subtree are not colored automatically (same as today).
- Only English ships in this release.
