# 0005. React Aria Components with CSS Modules and token variables

- Status: accepted
- Date: 2026-11-05

## Context
The UI must reach WCAG 2.2 AA and Lighthouse 95 or higher, and match a custom design handoff closely. The priority is control over the exact UX and long-term maintainability.

## Options
- **shadcn/ui (Radix) + Tailwind v4**: a fast start with source we own, but styling goes through utility classes.
- **React Aria Components + CSS Modules**: behaviour and accessibility only, with every style ours.
- **Mantine 9**: the most features built in, but a heavier runtime and its own theming system.

## Decision
React Aria Components for behaviour, CSS Modules for styles, and design tokens as CSS custom properties (`tokens.css`, both themes).

## Consequences
- Focus management, keyboard interaction, press and touch handling, and screen-reader semantics come from a mature library. That includes DatePicker, TagGroup, Table, ComboBox and Dialog.
- State selectors (`[data-focus-visible]`, `[data-invalid]`, `[data-pressed]`) map directly onto CSS Modules, so the design handoff's tokens apply without translation.
- We style every component ourselves, so design implementation (Stage 5) takes more effort.
- There's no runtime CSS-in-JS: styles are static CSS, which helps Lighthouse.
