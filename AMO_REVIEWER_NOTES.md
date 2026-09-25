# Notes for AMO Reviewers

## What the add-on does

Tree Tab Picasso adds a "Tree Tab Picasso" item to the tab context menu. It colors a tab and all
of its descendants, or puts an emoji marker on one tab, **inside the Tree Style Tab (TST)
sidebar**. It uses TST's public add-on API
(<https://github.com/piroor/treestyletab/wiki/API-for-other-addons>) to inject CSS and to set
custom tab states.

## Dependency

Requires Tree Style Tab: <https://addons.mozilla.org/firefox/addon/tree-style-tab/>.
Without TST, menu actions show a notification that explains how to fix it.

## How to test

1. Install Tree Style Tab, then this add-on.
2. Open a few tabs from one parent tab so TST shows a tree.
3. Right-click the parent tab → Tree Tab Picasso → Colors → Blue. The parent and all children
   turn blue in the TST sidebar.
4. Tree Tab Picasso → Add Emoji… → pick 🔥 (mouse or arrow keys + Enter). The parent shows 🔥.
5. Restart Firefox with session restore on. Colors and emoji come back on the same tabs.
6. Disable TST and pick a color: a notification says TST is required.

## Permissions

| Permission      | Why                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `menus`         | Adds the tab context menu.                                                                                                   |
| `sessions`      | Stores each tab's color/emoji with the tab (`sessions.setTabValue`) so markers survive restart and are removed with the tab. |
| `storage`       | Stores the list of recently used emoji and a one-time migration flag.                                                        |
| `notifications` | Tells the user when Tree Style Tab is missing or refuses a request.                                                          |

No host permissions, no network requests, no data collection
(`data_collection_permissions: none`).

## Source code and build

- The package is the `src/` folder as-is. There is **no bundler, transpiler, or minifier**.
- One file is generated: `src/emoji-data.js`, built from the `emojibase-data` npm package.
  To reproduce: Node.js 24, then

  ```bash
  npm ci
  npm run gen:emoji   # rewrites src/emoji-data.js; `git diff` shows no change
  npm run build       # writes dist/tree_tab_picasso-<version>.zip
  ```

- Full source: <https://github.com/shabo/ff-treetab-picasso> (the source archive is also
  uploaded with each version).
