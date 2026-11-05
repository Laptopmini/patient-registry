# Prompt for Claude Design

> Paste everything below the line into a new Claude Design session, and attach the 7 files from `design/brief/`.

---

You're designing the UI for **Patient Registry**, a web dashboard a medical practice uses to find patients, review their profile and clinical notes, add notes, and read a generated summary. I've attached the full brief:

1. `01-product.md`: users, goals, scope and tone
2. `02-user-flows.md`: the eight flows to support
3. `03-data-model.md`: fields, enums and validation rules
4. `04-sample-data.json`: 20 synthetic patients with notes. Use only this data in mock-ups
5. `05-screens-and-states.md`: screens, breakpoints (360, 768, 1280px and up) and the required loading, empty, error and offline states
6. `06-constraints.md`: hard constraints. React Aria Components with CSS Modules, CSS custom-property tokens, light and dark themes, WCAG 2.2 AA with 44px touch targets, Lighthouse 95 or higher, and the motion rules
7. `07-return-package.md`: exactly what to hand back at the end

**How I'd like to work: iterate with me before you produce anything final.**

1. Start by playing back your understanding in a few bullets, and ask me any questions. The open ones I know of are brand colour, density, and tabs versus two columns for patient detail.
2. Then propose **2 visual directions** (palette, type, density and component feel), shown on the patient list at 1280px in light and dark. I'll pick one or ask for a blend.
3. Next, design the patient list and patient detail at all three breakpoints, and check them with me.
4. Then complete the remaining screens, states, dialogs and the motion spec, and check them with me again.
5. **Only after I say "approved", produce the return package** exactly as described in `07-return-package.md`, as one zip.

Throughout:
- Check contrast in both themes, and state the ratios for the key pairs.
- Allergies must stand out on patient detail without relying on colour.
- Every component must be buildable with React Aria Components. If a pattern isn't, say so and propose an alternative.
- Keep motion subtle and functional, using only opacity and transform, with all of it off under reduced motion.
- All people and data shown must come from the synthetic sample file.
