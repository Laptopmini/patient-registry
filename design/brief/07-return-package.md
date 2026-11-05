# 07 · Return package

When the design is agreed, hand back **one zip** that unzips into `design/handoff/` with exactly this structure:

```
handoff/
├── HANDOFF.md
├── tokens.css
├── motion.md
├── components.md
└── screens/
    ├── <screen>-<breakpoint>-<theme>.png
    └── …
```

## `tokens.css`
- Primitives (the palette and scales) plus **semantic tokens** for `:root` (light) and `@media (prefers-color-scheme: dark)`. Repeat the dark values under `:root[data-theme="dark"]`, and the light ones under `:root[data-theme="light"]`, so a manual toggle can be added later.
- Typography (family stack, size and line-height scale, weights), spacing scale, radii, shadows, z-index layers, focus ring, motion durations and easings, and the breakpoints as documented custom properties.
- Contrast ratios in comments for each text/background and UI/background pair you define.

## `screens/`
PNG references, named `<screen>-<breakpoint>-<theme>.png`:
- screens: `dashboard`, `patient-list`, `patient-detail-profile`, `patient-detail-notes`, `patient-detail-summary`, `patient-form`, `patient-form-errors`, `not-found`
- breakpoints: `360`, `768`, `1280`
- themes: `light`, `dark`

Also include, at 360 and 1280 in light only, the states `patient-list-loading`, `patient-list-empty`, `patient-list-error`, `offline-banner`, and the dialogs `dialog-delete-note`, `dialog-conflict`.

## `components.md`
A component inventory. For each component give:
- the React Aria component it maps to (or "custom")
- its anatomy and the tokens it uses
- every state: default, hover, pressed, focus-visible, selected, disabled, invalid, pending/loading
- size and touch-target notes

## `motion.md`
The motion spec from `06-constraints.md`: each animation's trigger, property, duration token and easing token, and its reduced-motion behaviour ("none, show the end state").

## `HANDOFF.md`
An **implementation prompt addressed to the Claude Code session** that builds this app. It should cover:
1. The order of work (tokens → shell → primitives → screens → states → motion).
2. Per-screen notes: layout grid, spacing and responsive behaviour, with anything a screenshot can't convey.
3. The acceptance checks: matches the references at 360, 768 and 1280 in both themes; axe finds no violations; Lighthouse scores 95 or higher; no motion under reduced motion.
4. A reminder: **these files are visual references; rebuild every screen with React Aria components and CSS Modules, and never copy markup or class names.**
