# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-09-25

### Fixed

- Emoji markers no longer appear on the wrong tabs after a browser restart. Markers are now
  saved with each tab and restored with it.
- Colors now come back after a restart and when Tree Style Tab restarts.
- Setting emoji or colors quickly no longer loses changes.
- The release workflow now uses the correct AMO metadata file.

### Added

- A notification when Tree Style Tab is missing or refuses a request, with steps to fix it.
- Emoji picker: full keyboard navigation (arrows, Home/End, Enter, Escape), screen reader
  labels, a "Recent" group, and dark mode.
- All text can be translated (`_locales`).
- CI for every pull request: lint, add-on validation, unit tests, build.
- Releases run CI first, upload the source for review, and attach the package to a GitHub
  Release.
- LICENSE (MPL-2.0), SECURITY.md, CONTRIBUTING.md, AMO reviewer notes.

### Changed

- Requires Firefox 140 or later.
- Permissions: removed `tabs`; added `sessions` (store markers per tab) and `notifications`.
- Code split into small modules with unit tests.

### Removed

- Local publishing to AMO from a developer machine (`make publish-amo`, `make publish-local`).

## [0.1.3] - 2026-02-10

### Fixed

- Listed publish metadata; README update.

## [0.1.2] - 2026-02-10

### Added

- PNG icon set generated from the Picasso artwork.

## [0.1.1] - 2026-02-10

### Changed

- Renamed the extension to Tree Tab Picasso.

## [0.1.0] - 2026-02-10

### Added

- Color a tab and its descendants in the Tree Style Tab sidebar (20 colors).
- Emoji markers with an emoji picker.
