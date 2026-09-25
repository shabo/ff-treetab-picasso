# Test Matrix (Equivalence Partitioning + Boundary Value Analysis)

Constitution II: these tests are written first, must fail first, and run only in CI.
IDs map to test names (`it('[TM-xxx] …')`) so CI output traces back here.

## validate.js — `isValidTabId(x)`, `isValidEmoji(s)`, `isValidColor(i)`

| ID | Input | Class | Expected |
|----|-------|-------|----------|
| TM-001 | `0` | boundary min | tabId valid |
| TM-002 | `42` | happy | valid |
| TM-003 | `-1` | boundary below | invalid |
| TM-004 | `1.5`, `NaN`, `Infinity` | non-integer | invalid |
| TM-005 | `"42"`, `null`, `undefined`, `{}` | type mismatch | invalid |
| TM-006 | `"😀"` | happy | emoji valid |
| TM-007 | 1-char `"a"` | boundary min | valid |
| TM-008 | 64 code units | boundary max | valid |
| TM-009 | 65 code units | boundary above | invalid |
| TM-010 | `""` | empty | invalid |
| TM-011 | `"a\nb"`, `"\u0000"`, `"\u007f"` | control chars | invalid |
| TM-012 | `123`, `null`, `[]` | type mismatch | invalid |
| TM-013 | color `0`, `19` | boundaries | valid |
| TM-014 | color `-1`, `20`, `1.2`, `"3"` | out of range / type | invalid |

## palette.js — `colorState(i)`, `parseColorMenuId(id)`

| ID | Input | Expected |
|----|-------|----------|
| TM-020 | `colorState(0)` / `(19)` | `tabs-color-color-00` / `-19` |
| TM-021 | `parseColorMenuId("tabs-color-color-07")` | `7` |
| TM-022 | `"tabs-color-color-20"`, `"-01"`, `"xx"`, `""` | `null` |
| TM-023 | non-string (`5`, `undefined`) | `null` |
| TM-024 | `PALETTE.length === 20`, all hex `#RRGGBB`, unique | stable palette |

## css.js — `buildTstStyle(markers)`

| ID | Input | Expected |
|----|-------|----------|
| TM-030 | empty map | 20 color rules, no emoji rules |
| TM-031 | `{5: {emoji:"🔥"}}` | one rule with `tab-item[data-tab-id="5"]` and `content: "🔥"` |
| TM-032 | emoji `"\""`, `"\\"`, `"*/ body{}"`, `"</style>"` | escaped; output has no unescaped `"` or `*/` outside strings; parser-safe |
| TM-033 | markers with only `color` | no emoji rule for that tab |
| TM-034 | 1 000 markers | output built < 50 ms, one rule each |
| TM-035 | invalid tab id key / invalid emoji in map | skipped |

## tree.js — `flattenTree(item)`

| ID | Input | Expected |
|----|-------|----------|
| TM-040 | single node | `[id]` |
| TM-041 | nested (A→[A1→[A1a,A1b],A2]) | pre-order `[A,A1,A1a,A1b,A2]` |
| TM-042 | `null` / `{}` / `{id:"x"}` | `[]` |
| TM-043 | children not array | only root |
| TM-044 | depth 100 | 100 ids, no stack overflow |
| TM-045 | 1 000 siblings | 1 001 ids |

## queue.js — `createSerialQueue()`

| ID | Scenario | Expected |
|----|----------|----------|
| TM-050 | two tasks enqueued | run in order, second starts after first resolves |
| TM-051 | first task rejects | its promise rejects; second still runs |
| TM-052 | 100 concurrent read-modify-write increments | final value 100 (no lost update) |

## recent.js — `pushRecent(list, emoji)`, `sanitizeRecent(raw)`

| ID | Input | Expected |
|----|-------|----------|
| TM-060 | `[]` + `"a"` | `["a"]` |
| TM-061 | `["a","b"]` + `"b"` | `["b","a"]` (dedupe, move to front) |
| TM-062 | 24 entries + new | 24 entries, oldest dropped |
| TM-063 | 23 entries + new | 24 entries |
| TM-064 | invalid emoji | list unchanged |
| TM-065 | `sanitizeRecent("x"|null|[1,"a","a"])` | `[]` / `[]` / `["a"]` |

## throttle.js — `createThrottle(windowMs, now)`

| ID | Scenario | Expected |
|----|----------|----------|
| TM-070 | first call for a kind | allowed |
| TM-071 | same kind at +29 999 ms | blocked |
| TM-072 | same kind at +30 000 ms | allowed (boundary) |
| TM-073 | different kinds at same time | both allowed |

## migration.js — `planLegacyMigration(raw, openTabIds)`

| ID | Input | Expected |
|----|-------|----------|
| TM-080 | `{ "3": "🔥" }`, open `[3]` | `[{tabId:3, emoji:"🔥"}]` |
| TM-081 | `{ "3": "🔥" }`, open `[4]` | `[]` (stale dropped) |
| TM-082 | `null`, `"str"`, `[]` | `[]` |
| TM-083 | keys `"-1"`, `"abc"`, `"1.5"`; values `""`, 65 chars, `5` | skipped |

## marker-store.js (with browser mock)

| ID | Scenario | Expected |
|----|----------|----------|
| TM-090 | `setEmoji(1,"🔥")` | `sessions.setTabValue(1, key, {emoji})`, cache updated |
| TM-091 | `setColor(1,3)` then `clearColor(1)` with no emoji | `removeTabValue` called, cache entry gone |
| TM-092 | `init()` with tabs having values | cache equals stored values; invalid fields dropped |
| TM-093 | migration flag already set | legacy data not read |
| TM-094 | migration runs | legacy key removed, flag set, markers written; second `init()` no-op |
| TM-095 | `setTabValue` rejects (tab closed) | error returned to caller, cache unchanged, logged |
| TM-096 | two `setEmoji` calls without await | both persisted |
| TM-097 | `onRemoved(tabId)` | cache entry deleted |
| TM-098 | `onCreated(tab)` (restored/duplicated) | after 600 ms reads `getTabValue`; valid value added to cache and re-applied |
| TM-099 | `onCreated` for tab closed before 600 ms | read rejects; logged; no cache entry |

## tst-client.js (with browser mock)

| ID | Scenario | Expected |
|----|----------|----------|
| TM-100 | `register(style)` success | sends `register-self` with `style`, `listeningTypes` = `ready`, `permissions-changed`; no `permissions` key |
| TM-101 | TST absent (sendMessage rejects "Could not establish connection") | result `{ok:false, reason:"tst-missing"}` |
| TM-102 | `get-light-tree` replies `null`/non-object, or other rejection | `{ok:false, reason:"tst-denied"}` |
| TM-103 | `applyColor(ids, 3)` | `remove-tab-state` (all 20 + legacy states) then `add-tab-state` for state 3 |
| TM-104 | `applyColor(ids, null)` | only `remove-tab-state` |
| TM-105 | `applyColor([], 3)` | no messages sent |

## background main / menus (with browser mock)

| ID | Scenario | Expected |
|----|----------|----------|
| TM-110 | module loaded, then `onStartup` + `onInstalled` fire | `menus.removeAll`/create and `register-self` run once each |
| TM-111 | click color menu, TST ok | subtree colored, markers saved for each subtree tab |
| TM-112 | click color menu, TST missing | notification `tst-missing` shown once; second click within 30 s no new notice |
| TM-113 | click "Clear everything" | all markers removed, TST states removed for all tabs |
| TM-114 | TST sends `ready` or `permissions-changed` | re-register and re-apply color states from cache, one `add-tab-state` per color |
| TM-115 | external message from non-TST sender | ignored |
| TM-116 | runtime message `picasso:set-emoji` invalid payloads (tabId -1, emoji 65 chars, wrong type) | response `{ok:false, error:"invalid"}`; no write |
| TM-117 | runtime message valid | `{ok:true}`; marker saved; recent list updated |
| TM-118 | menu titles | all come from `i18n.getMessage`, none empty |
| TM-119 | `windows.create` rejects for picker | notification `popup-blocked` |

## picker-nav.js — `nextIndex(index, key, count, columns)`

| ID | Input | Expected |
|----|-------|----------|
| TM-120 | idx 0, ArrowRight, count 10, cols 8 | 1 |
| TM-121 | idx 9 (last), ArrowRight | 9 (clamp) |
| TM-122 | idx 0, ArrowLeft / ArrowUp | 0 |
| TM-123 | idx 3, ArrowDown, count 10, cols 8 | 9 (clamp to last) |
| TM-124 | idx 9, ArrowUp, cols 8 | 1 |
| TM-125 | Home / End | 0 / count-1 |
| TM-126 | count 0 | -1 for all keys |
| TM-127 | unknown key | index unchanged |

## picker UI (happy-dom)

| ID | Scenario | Expected |
|----|----------|----------|
| TM-130 | render | grid has `role=grid`, cells `role=gridcell` with `aria-label` = emoji name |
| TM-131 | ArrowRight on focused cell | focus moves, roving `tabindex` updated |
| TM-132 | Enter on cell | sends `picasso:set-emoji`, closes window |
| TM-133 | Escape anywhere | closes window, no message |
| TM-134 | search "fire" | only matching cells; meta count updated; 0 results shows empty message |
| TM-135 | recent list present | "Recent" group first, selected by default |
| TM-136 | missing/invalid `tabId` param | error message shown, grid disabled |
| TM-137 | background replies `{ok:false}` | error message shown, window stays open |

## Static / pipeline checks (CI)

| ID | Check | Expected |
|----|-------|----------|
| TM-140 | `web-ext lint` | 0 errors, 0 warnings |
| TM-141 | ESLint + Prettier check | 0 errors |
| TM-142 | regenerate `emoji-data.js` | no git diff |
| TM-143 | every `__MSG_*__` and `getMessage` key exists in `en/messages.json` | pass |
| TM-144 | manifest permissions ⊆ used APIs; no `tabs` permission | pass |
| TM-145 | coverage of `src/lib/**` | ≥ 90 % lines |
