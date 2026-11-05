# 06 · Constraints

These constraints aren't negotiable. A design that breaks one can't be built.

## UI library and styling
- Components are built with **React Aria Components** (Adobe): Button, Link, TextField, SearchField, Select, ComboBox, DatePicker/DateField, TimeField, TagGroup, Table, GridList, Tabs, Dialog/Modal, Popover, Tooltip, Toast, Disclosure, Meter, ProgressBar. Design within what these components can do. Where a pattern doesn't map onto one of them, name it in the inventory.
- Styling uses **CSS Modules**. All values come from **design tokens defined as CSS custom properties** in `tokens.css` (colour, typography, spacing, radius, shadow, z-index, motion, breakpoints as documented values).
- Component states map onto React Aria data attributes: `[data-hovered]`, `[data-pressed]`, `[data-focus-visible]`, `[data-selected]`, `[data-disabled]`, `[data-invalid]`, `[data-pending]`. Specify each one.
- No Tailwind, no CSS-in-JS, no icon fonts. Icons are inline SVG from one open-source set (state which one, such as Lucide) and always come with text or an accessible label.

## Themes
- **Light and dark**, both complete, with switching driven by `prefers-color-scheme`. Tokens use semantic names (`--color-surface`, `--color-text-muted`, `--color-danger-bg`, …) defined once per theme. Leave room for a later manual toggle (`:root[data-theme="dark"]`).
- Colour pairs for status (Active, Follow-up, Inactive), danger and allergy need text and icon versions in both themes.

## Accessibility: WCAG 2.2 AA
- Contrast: text at least 4.5:1 (3:1 for large text), and UI components, focus indicators and meaningful graphics at least 3:1, **in both themes**.
- **Touch targets at least 44×44px** (this goes beyond AA's 24px, deliberately).
- A **visible focus ring** on every interactive element, at least 2px, never covered by sticky headers (WCAG 2.4.11).
- Never use colour as the only signal (status, errors, allergies, the active nav item).
- Text can grow to 200% and spacing overrides (WCAG 1.4.12) without loss. Line length stays at or under about 80 characters for note text.
- Headings are logical (one h1 per page), and landmarks are labelled.
- The motion spec has every animation **turned off** under `prefers-reduced-motion: reduce`. Show the end state instantly; no "reduced" motion.

## Performance: Lighthouse 95 or higher in every category
- Typography: the **system font stack**, or at most **one self-hosted variable font** (WOFF2, subset, `font-display: swap`). No third-party font CDNs.
- No heavy motion libraries. Use CSS transitions and the **View Transitions API** for route and list changes.
- No large images. Illustrations for empty or 404 states, if any, are small inline SVGs.
- Avoid layout shift: skeletons match final dimensions, and images and avatars have fixed sizes.

## Motion spec (required)
For each animated element give its duration, easing and the property animated. Keep to a small scale (for example `--motion-duration-fast: 120ms`, `--motion-duration-base: 200ms`, `--motion-duration-slow: 320ms`, with standard, enter and exit easings). Only animate `opacity` and `transform`.
