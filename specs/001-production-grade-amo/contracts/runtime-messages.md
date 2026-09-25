# Contract: Internal Runtime Messages (picker → background)

Sent with `browser.runtime.sendMessage`. The background only accepts messages whose
`sender.id === browser.runtime.id` and whose `sender.url` starts with the extension origin.

## `picasso:set-emoji`

Request:

```json
{ "type": "picasso:set-emoji", "tabId": 12, "emoji": "🔥" }
```

| Field | Rule |
|-------|------|
| `tabId` | integer ≥ 0 |
| `emoji` | valid emoji string (see data-model) or `null` to clear |

Response (always sent, the promise never rejects for validation errors):

```json
{ "ok": true }
{ "ok": false, "error": "invalid" | "tab-gone" | "storage" }
```

Side effects on success: marker saved, TST style re-sent, emoji added to RecentEmojis
(when not `null`).

Unknown `type` values: no response (`undefined`), so other listeners may answer.

# Contract: Context Menu

All items use `contexts: ["tab"]`. IDs are stable (kept from v0.1.3 so TST's mirrored menu
continues to work).

| ID | Parent | Title message key |
|----|--------|-------------------|
| `tabs-color-root` | — | `menuRoot` |
| `tabs-color-colors` | root | `menuColors` |
| `tabs-color-color-00` … `-19` | colors | `menuColorItem` with palette name + hex |
| `tabs-color-emoji-picker` | root | `menuAddEmoji` |
| separator | root | — |
| `tabs-color-clear-emoji` | root | `menuClearEmoji` |
| `tabs-color-clear-color` | root | `menuClearColor` |
| `tabs-color-clear-both` | root | `menuClearBoth` |
| `tabs-color-clear-everything` | root | `menuClearEverything` |

# Contract: TST State Classes and Injected CSS

- Color state class per tab: `tabs-color-color-NN` (NN = 00–19). Legacy classes
  `tabs-color-shade-NN` are still removed on every color change (one more release).
- Emoji marker selector: `tab-item[data-tab-id="<id>"] tab-item-substance::before`.
- Emoji value is written as a CSS string made by `cssString()`: it escapes `\`, `"`, newlines,
  and every non-printable code point as `\HH `, so user data cannot end the string or rule.
