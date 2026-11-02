# Word on the web — task pane width

## Who controls width

Microsoft Word owns the task pane chrome. The add-in runs inside an **Office host iframe** whose width is set by:

- The user **dragging the divider** between the document and the task pane
- Word’s default pane size for that session and platform
- Browser window size (on Word on the web)

There is **no supported Office JavaScript API** to programmatically set, maximize, or persist task pane width. Add-ins cannot resize the host column or break out of the iframe.

## What ProzaEdit does

- Layout uses **100% width** of the host (`box-sizing`, `min-width: 0` on flex children) so content uses whatever column Word gives you.
- **Narrow-pane CSS** (`taskpane.css`, optional `body.pe-narrow-pane` when `window.innerWidth < 360`) improves tabs, toolbar tap targets, and scrolling for ~280–400px hosts.
- Tooltips cap at `min(280px, calc(100vw - 16px))` so bubbles stay readable in a thin column.
- **Target** tab holds daily profile, scope, and style; toolbar **Settings** (gear) opens advanced toggles and dictionary.

## Safe mitigations (in add-in only)

| Approach | Used by PE |
|----------|------------|
| Horizontal scroll / wrapped tab bar | Yes — narrow breakpoints |
| Collapsible `<details>` on heavy Target sections | Yes — Manuscript profile (default open); Safety moved to Settings modal |
| Chapter checklist with vertical scroll | Yes — Chosen chapters scope |
| iframe breakout / hiding Word chrome | **No** — unsupported and brittle |

## Practical tips for authors

1. On **Word on the web**, drag the pane divider until ProzaEdit is comfortable (~350px+ if your monitor allows).
2. Use **Simple mode** (**Settings → Safety**) to hide the Thesaurus and extra tuning in a thin pane (the optional AI help block stays, collapsed, and is off until you add a key).
3. Use **Chosen chapters** scope instead of full manuscript when fiction/plot checks need a smaller read.
4. Re-upload `manifest.hosted.xml` only when the manifest **version** bumps — UI/CSS updates load from GitHub Pages without a manifest change.

## Related docs

- [QUICK-START.md](QUICK-START.md) — install and daily workflow  
- [prozaedit-features.md](prozaedit-features.md) — scope modes and limits  
