# Motion spec

Patient Registry · Direction B · approved 5 Nov 2026

Motion here is subtle and functional. It confirms where something came from or went, and nothing else.

## Rules

1. **Only `opacity` and `transform` animate.** Colour, border, size and layout changes (hover, pressed, selected, invalid, expanding a long note) are **instant**. Don't put a transition on them.
2. Use **CSS transitions or keyframes** and the **View Transitions API** only. Don't use a motion library.
3. **Under `prefers-reduced-motion: reduce`, every animation is off.** Show the end state immediately. There is no "reduced" variant: no shorter fades and no opacity-only fallback. `tokens.css` adds a global safety net, but each component must still guard its own motion:
   ```css
   @media (prefers-reduced-motion: no-preference) { .dialog[data-entering] { animation: dialog-in var(--motion-duration-base) var(--motion-ease-enter); } }
   ```
   In JS, check `matchMedia('(prefers-reduced-motion: reduce)').matches` before calling `document.startViewTransition`, and update the DOM directly when it's true.
4. React Aria exposes `[data-entering]` and `[data-exiting]` on `ModalOverlay`, `Modal`, `Popover`, `Tooltip` and Toast. Animate on those so RAC waits for the exit animation before unmounting.

## Tokens (from `tokens.css`)

| Token | Value |
|---|---|
| `--motion-duration-fast` | 120ms |
| `--motion-duration-base` | 200ms |
| `--motion-duration-slow` | 320ms |
| `--motion-ease-standard` | cubic-bezier(0.2, 0, 0, 1) |
| `--motion-ease-enter` | cubic-bezier(0, 0, 0, 1) |
| `--motion-ease-exit` | cubic-bezier(0.3, 0, 1, 1) |
| `--motion-shift-sm` / `-md` / `-lg` | 4px / 8px / 16px |
| `--motion-scale-in` | 0.98 |
| `--motion-loop-progress` / `-shimmer` / `-spinner` | 1200ms / 1400ms / 800ms (linear, infinite) |

## Animations

| # | Element | Trigger | Property (from → to) | Duration | Easing | Reduced motion |
|---|---|---|---|---|---|---|
| 1 | Main content (route change) | Navigation between routes, via `document.startViewTransition()` | Old view: `opacity 1→0`. New view: `opacity 0→1`, `transform: translateY(var(--motion-shift-sm))→none`. Header, sidebar and the allergy strip get their own `view-transition-name` (`app-header`, `app-nav`, `allergy-strip`) so they don't cross-fade. | old: `fast`, new: `base` | old: `exit`, new: `enter` | None, show the end state (skip `startViewTransition`) |
| 2 | Tab panel (Profile / Notes / Summary) | Tab selected | Incoming panel `opacity 0→1` | `fast` | `enter` | None, show the end state |
| 3 | Dialog scrim (`ModalOverlay`) | Open / close | `opacity 0→1` / `1→0` | open `base` / close `fast` | `enter` / `exit` | None, show the end state |
| 4 | Dialog (`Modal`) | Open | `opacity 0→1`; `transform: translateY(var(--motion-shift-md)) scale(var(--motion-scale-in))→none` | `base` | `enter` | None, show the end state |
| 5 | Dialog (`Modal`) | Close | `opacity 1→0` | `fast` | `exit` | None, show the end state |
| 6 | Navigation drawer (compact) | Menu button / Escape / scrim press | Drawer `transform: translateX(-100%)→none`, scrim `opacity 0→1`; reverse on close | open `base` / close `fast` | `enter` / `exit` | None, show the end state |
| 7 | Popover (Select, ComboBox, Menu) | Open / close | `opacity 0→1`, `transform: translateY(calc(-1 * var(--motion-shift-sm)))→none`; close `opacity →0` | `fast` | `enter` / `exit` | None, show the end state |
| 8 | Tooltip (icon rail) | Hover or focus after RAC's default delay | `opacity 0→1` | `fast` | `enter` | None, show the end state |
| 9 | Toast | Queued | Enter: `opacity 0→1`, `transform: translateY(var(--motion-shift-lg))→none`. Exit: `opacity →0`, `translateY(var(--motion-shift-md))` | enter `base` / exit `fast` | `enter` / `exit` | None, show the end state. Auto-dismiss timing still applies. |
| 10 | New note (optimistic) | Note submitted | New `<li>`: `opacity 0→1`, `transform: translateY(calc(-1 * var(--motion-shift-md)))→none`. Existing notes move down via a View Transition (each note gets `view-transition-name: note-<id>`). | new `base`, list `slow` | `enter` / `standard` | None, show the end state |
| 11 | Deleted note | Delete confirmed | Item `opacity 1→0`, then the list closes the gap via a View Transition | `fast`, then `base` | `exit`, then `standard` | None, show the end state |
| 12 | Patient results (list) | Search, filter, sort or page change resolves | Results region cross-fade via a View Transition (`view-transition-name: patient-results`) | `fast` | `standard` | None, show the end state |
| 13 | Refetching bar | A request starts while results stay visible | 2px bar, an inner segment at 40% width: `transform: translateX(-100%)→translateX(250%)`, looping | `--motion-loop-progress` | linear, infinite | Static full-width bar at 40% opacity plus the live-region text "Updating results" |
| 14 | Skeleton shimmer | Initial load | Highlight pseudo-element: `transform: translateX(-100%)→translateX(100%)`, looping | `--motion-loop-shimmer` | linear, infinite | Static skeleton, no shimmer |
| 15 | Pending button spinner | `[data-pending]` | Icon `transform: rotate(0)→rotate(360deg)`, looping. Label becomes "Saving…". | `--motion-loop-spinner` | linear, infinite | Spinner hidden. "Saving…" label only. |
| 16 | Offline banner | Connection lost / restored | Enter: `opacity 0→1`, `transform: translateY(calc(-1 * var(--motion-shift-md)))→none`. "Back online" shows for 4s, then exits with `opacity →0`. | enter `base` / exit `fast` | `enter` / `exit` | None, show the end state (the banner still disappears after 4s) |
| 17 | Compact pinned patient bar | Header block scrolls out of view (IntersectionObserver) | `opacity 0→1`, `transform: translateY(-100%)→none` | `fast` | `enter` | None, show the end state |
| 18 | Summary regenerate | `[data-pending]` on Regenerate | Narrative `opacity 1→0.6` while pending, back to 1 when done | `base` | `standard` | Static, no fade (narrative stays at full opacity) |

## Instant (not animated)

These changes happen immediately:
- Hover, pressed, selected, invalid, disabled and focus-ring changes.
- Expanding a long note ("Show more"). Height must not animate.
- Opening and closing the tips `Disclosure`. Height must not animate.
- Tab underline movement: the bar jumps to the new tab.
- Stepper progress and the `ProgressBar` fill. The fill would need `width`, which isn't allowed.
- Sort-direction icons.

## Implementation sketch

```css
/* dialog.module.css */
@media (prefers-reduced-motion: no-preference) {
  .overlay[data-entering] { animation: fade-in var(--motion-duration-base) var(--motion-ease-enter); }
  .overlay[data-exiting]  { animation: fade-out var(--motion-duration-fast) var(--motion-ease-exit); }
  .modal[data-entering]   { animation: dialog-in var(--motion-duration-base) var(--motion-ease-enter); }
  .modal[data-exiting]    { animation: fade-out var(--motion-duration-fast) var(--motion-ease-exit); }
}
@keyframes fade-in  { from { opacity: 0; } }
@keyframes fade-out { to   { opacity: 0; } }
@keyframes dialog-in {
  from { opacity: 0; transform: translateY(var(--motion-shift-md)) scale(var(--motion-scale-in)); }
}

/* route.css: View Transitions */
@media (prefers-reduced-motion: no-preference) {
  ::view-transition-old(root) { animation: fade-out var(--motion-duration-fast) var(--motion-ease-exit); }
  ::view-transition-new(root) { animation: route-in var(--motion-duration-base) var(--motion-ease-enter); }
}
@keyframes route-in { from { opacity: 0; transform: translateY(var(--motion-shift-sm)); } }
```
