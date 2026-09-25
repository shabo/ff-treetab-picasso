# Contract: Tree Style Tab API usage

Target: `treestyletab@piro.sakura.ne.jp`, via `browser.runtime.sendMessage(TST_ID, msg)`.
Wrapped by `src/background/tst-client.js`, which never throws and returns typed results:

```text
{ ok: true, value }
{ ok: false, reason: "tst-missing" | "tst-denied", error }
```

## Outgoing

| Call | Message | Notes |
|------|---------|-------|
| `register(style)` | `{type:"register-self", name, icons, listeningTypes:["ready","permissions-changed"], style}` | no `permissions` requested |
| `getSubtree(tabId)` | `{type:"get-light-tree", tab:tabId}` | non-object reply → `tst-denied`; flattened with `flattenTree` |
| `setColor(tabIds, idx\|null)` | `{type:"remove-tab-state", tabs, state:[all color + legacy states]}` then, if idx ≠ null, `{type:"add-tab-state", tabs, state:"tabs-color-color-NN"}` | skipped when `tabIds` empty |

## Incoming (`runtime.onMessageExternal`)

Accepted only when `sender.id === TST_ID`.

| `type` | Action |
|--------|--------|
| `ready` | `register(style)`, then re-apply color states from the marker cache (grouped by color) |
| `permissions-changed` | same as `ready` |
| anything else | ignored |

## Error mapping

| Condition | Reason |
|-----------|--------|
| rejection message contains "Could not establish connection" or "Receiving end does not exist" | `tst-missing` |
| any other rejection | `tst-denied` |
| `get-light-tree` returns `null`/non-object | `tst-denied` |
