# Tutorial: UI Adapt & Theme Customization

Implements `prompts/17_ui_adapt.txt` — restyles the sidebar navigation to
match the [mockups](../artifacts/mockups/) built for the app so far
(Notes, Graph View), and adds real theme-switching: Light/Dark/System mode
plus a fully custom accent color via a native color picker and a hex text
field, replacing the fixed preset swatches the mockups used as a
placeholder.

## Scope: style what's built, not what's only mocked

The mockups also cover a Tasks/Calendar feature that doesn't exist in the
app yet — those stay mockups. This step only touches the sidebar, and adds
a new Appearance page, for the two real routes: notes (`/`, `/notes/:id`)
and Graph View (`/graph`).

## Sidebar nav vs. actions vs. tree

The mockups group the sidebar into three tiers: a **nav** section (switch
between top-level views), an **actions** section (create things), and the
content **tree**. The app's `Sidebar.jsx` previously had "Graph View" mixed
into the actions list alongside "New Folder"/"New Note" — functionally fine,
but not the mockup's grouping. It's now a separate `<nav className="sidebar-nav">`
with `NavLink`s for "Notes" (`/`) and "Graph View" (`/graph`), using
`NavLink`'s `isActive` render prop the same way the note tree already
highlights the current note. A `.sidebar-footer` at the bottom holds a third
`NavLink` to the new "Theme" page (`/appearance`), matching the mockup's
gear-icon footer entry.

## Making the theme actually switch: `data-theme` alongside `prefers-color-scheme`

`index.css` previously had exactly one dark-mode rule, gated only on
`@media (prefers-color-scheme: dark)` — there was no way for the app itself
to force a mode independent of the OS setting. The fix duplicates the dark
token block under two selectors:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* dark tokens */ }
}
:root[data-theme='dark'] { /* dark tokens, same values */ }
```

`ThemeContext` (`app/src/context/ThemeContext.jsx`) sets
`document.documentElement.dataset.theme` to `'light'` or `'dark'` when the
user picks one explicitly, or removes the attribute entirely for
`'system'` — at which point the `prefers-color-scheme` media query alone
decides, exactly like before this change. The two selectors have to carry
duplicate values rather than share one rule body, since a plain rule can't
live both inside and outside an `@media` block — a small duplication
trade-off for keeping "system" behavior exactly as it was.

## Custom accent color: CSS custom properties beat a duplicated theme

Rather than add a third color scheme per accent choice, the accent is
applied as an **inline style override** on `:root`:

```js
root.style.setProperty('--accent', accent)
root.style.setProperty('--accent-bg', hexToRgba(accent, 0.12))
root.style.setProperty('--accent-border', hexToRgba(accent, 0.5))
```

Inline styles always win over stylesheet rules regardless of selector
specificity, so this cleanly overrides whichever of the light/dark
`--accent` defaults is currently active — the same three variables already
used everywhere in the app (`var(--accent)`, `var(--accent-bg)`,
`var(--accent-border))`), so no component needed to change to pick up a
custom color. `app/src/utils/color.js` adds `hexToRgba`/`isValidHex`/
`normalizeHex` (expanding 3-digit hex to 6-digit) to derive the translucent
background/border tints from a single hex value, matching the alpha values
the app's existing light/dark palettes already used. Clearing the override
(`setAccent(null)`) removes the inline properties entirely, falling back to
the theme's built-in default.

## The Appearance page

`app/src/pages/Appearance.jsx` (route `/appearance`) has three sections:
Light/Dark/System mode cards (functional, unlike the mockup's click-to-preview
demo), an accent color row (a native `<input type="color">` — a real
RGB picker — synced with a hex `<input type="text">` for exact entry), and a
live preview card using the app's actual internal-link chip styling. The hex
field is deliberately *not* a fully controlled input kept in sync via
`useEffect` — that pattern trips oxlint's `set-state-in-effect` rule (setting
state synchronously inside an effect just to mirror a prop/derived value).
Instead it's `key={effectiveAccent}` + `defaultValue`, so React remounts a
fresh uncontrolled input whenever the accent changes elsewhere (color picker
or reset), letting the user's own edits flow through only on blur/Enter via
`commitHex`.

## Commands reference

No new commands were introduced in this step. See
[`02_fixing_npm_run_dev_and_start_scripts.md`](./02_fixing_npm_run_dev_and_start_scripts.md)
for how to run the app.
