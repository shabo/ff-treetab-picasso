#!/usr/bin/env bash
set -euo pipefail

bump_type="${1:-patch}"

if [[ ! "$bump_type" =~ ^(patch|minor|major)$ ]]; then
  echo "Invalid VERSION_BUMP: ${bump_type}. Use patch|minor|major." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

git checkout main
git pull --ff-only origin main

npm run -s bump:version -- "${bump_type}"
new_version="$(node -p "require('./src/manifest.json').version")"
gh_user="$(gh api user --jq .login)"
release_branch="${gh_user}/release-v${new_version}"

if git show-ref --verify --quiet "refs/heads/${release_branch}"; then
  echo "Local branch already exists: ${release_branch}" >&2
  exit 1
fi

if git ls-remote --exit-code --heads origin "${release_branch}" >/dev/null 2>&1; then
  echo "Remote branch already exists: ${release_branch}" >&2
  exit 1
fi

git checkout -b "${release_branch}"
git add src/manifest.json package.json
git commit -m "Release v${new_version}"
git push -u origin "${release_branch}"

pr_url="$(
  gh pr create \
    --base main \
    --head "${release_branch}" \
    --title "Release v${new_version}" \
    --body "Automated release PR for version \`${new_version}\`.

Merge this PR to trigger AMO publish in GitHub Actions."
)"

printf "Release PR created: %s\n" "${pr_url}"
