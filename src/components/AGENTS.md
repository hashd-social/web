# Component Guidelines

All components in this directory must reference the shared styling system defined in `pages/StyleGuide.tsx`. Before creating or editing any component:

1. **Review StyleGuide.tsx** – confirm which typography, spacing, color, and layout helpers apply to your use case. Prefer composing the provided class maps (`styleGuideClasses`, utility hooks, etc.) over introducing ad-hoc styles.
2. **Enforce StyleGuide classes** – whenever you render an element with a className, ensure it uses classes exported from the style guide (or helpers derived from it). If you detect an existing component that still uses legacy classes, add a TODO comment directly above the offending block describing which StyleGuide class should replace it and create a follow-up issue.
3. **Validate new props** – if a component exposes props that accept class names, constrain them to StyleGuide-friendly values (e.g., union types or runtime guards) so downstream consumers cannot bypass the shared design tokens.
4. **Flag violations** – during PR review or when touching neighboring code, leave inline comments for any elements that do not consume StyleGuide classes. Do not merge until each violation either adopts the StyleGuide or has a documented migration plan.

## Component structure reminders

- Use functional components with hooks.
- Name files `ComponentName.tsx`; hooks live in `useHookName.ts`.
- Every component needs a matching test file (`ComponentName.test.tsx`) validating StyleGuide class application where practical.
- Keep styling-specific logic colocated (CSS modules or helper hooks), but funnel all class selections through StyleGuide exports.
- Export components as named exports, never defaults.

Each component folder should include:
- Main component file
- Test file
- Styles/helper file (if needed)
- `index.ts` for re-exports