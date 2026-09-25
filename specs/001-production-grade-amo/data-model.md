# Data Model: Production-Grade Release on AMO

## TabMarker (per tab, session-scoped)

Stored with `browser.sessions.setTabValue(tabId, "picasso-marker-v1", value)`.
Firefox saves it with the tab in the session store, restores it with the tab, and drops it when
the tab closes for good.

| Field   | Type              | Rule                                              |
|---------|-------------------|---------------------------------------------------|
| `color` | integer or absent | `0 ≤ color < PALETTE.length` (20)                 |
| `emoji` | string or absent  | 1–64 UTF-16 code units, no control chars (U+0000–U+001F, U+007F) |

- A marker with neither field is deleted (`removeTabValue`), never stored empty.
- Invalid stored values are ignored field by field on read (logged, not thrown).

**State transitions**

```text
(none) --setColor(c)--> {color:c}
(none) --setEmoji(e)--> {emoji:e}
{color,emoji} --clearColor--> {emoji}      --clearEmoji--> (none)
any --clearAll--> (none)
any --tab closed--> (none)  [Firefox drops the value; cache entry removed on tabs.onRemoved]
```

## MarkerCache (in memory, background only)

`Map<tabId, TabMarker>`. Built once at start-up: `tabs.query({})`, then
`sessions.getTabValue` for each tab. On `tabs.onCreated` the value is read again after 600 ms
(restored and duplicated tabs get their value late). Updated on every write. Source for the injected TST style
and for re-applying TST color states after TST sends `ready`.

## RecentEmojis (profile-scoped)

`storage.local["picasso-recent-emojis-v1"]`: `string[]`.

- Max 24 entries, newest first, unique.
- Adding an existing emoji moves it to the front.
- Adding to a full list drops the oldest.
- Invalid entries are removed on read.

## LegacyEmojiMap (v0.1.3, read-once)

`storage.local["tabs-color-tab-emoji-v1"]`: `{ [tabId: string]: string }`.

**Migration** (runs at start-up, before the cache is built):

1. If `storage.local["picasso-migrated-v1"] === true` → stop.
2. Read legacy map. Drop entries whose key is not a non-negative integer or whose value fails
   the emoji rule.
3. For each remaining entry whose tab ID is an open tab **in this session**, write
   `{emoji}` into its marker (merging with any existing color).
4. Remove the legacy key and set `picasso-migrated-v1 = true`, in one `storage.local` call
   sequence after step 3 succeeds.

Note: v0.1.3 keys are tab IDs of the session in which they were set. Entries for tabs that are
open now match only when the browser was not restarted since. Stale entries are dropped; this
removes the wrong-tab bug.

## Palette (static)

20 entries `{ nameKey, hex, text }`. Order is fixed: the index is the stored `color` and the
TST state class `tabs-color-color-NN`. `nameKey` is an i18n message name.

## NoticeThrottle (in memory)

`Map<noticeKind, lastShownMs>`; a notice of the same kind is suppressed for 30 000 ms.
Kinds: `tst-missing`, `tst-denied`, `popup-blocked`, `unknown-error`.
