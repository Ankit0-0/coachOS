## Styling conventions

This app uses plain React Native `StyleSheet` with a typed design-token
system — not Tailwind/NativeWind. Follow these rules for every component:

- **Never hardcode a color.** Always pull colors from `Colors` in
  `@/constants/theme.ts` via the `useTheme()` hook, e.g.
  `const theme = useTheme(); theme.text` / `theme.background` /
  `theme.backgroundElement` / `theme.backgroundSelected` /
  `theme.textSecondary`. If a component needs a new semantic color that
  isn't in `Colors` yet, add it to both `light` and `dark` in
  `theme.ts` first — don't inline a hex value anywhere.
- **Never hardcode a spacing/margin/padding number.** Use the `Spacing`
  scale from `@/constants/theme.ts` (`Spacing.one` through `Spacing.six`).
  If none of the existing steps fit, add a new named step to `Spacing`
  rather than writing a raw number inline.
- **Reuse `ThemedView` and `ThemedText`** for backgrounds and text instead
  of raw `View`/`Text` wherever a themed color applies — they already
  handle light/dark switching.
- **Fonts** come from the `Fonts` export in `theme.ts` (`Fonts.sans`,
  `.serif`, `.rounded`, `.mono`) — don't reference a font family string
  directly in a component.
- Keep component-specific styles in a local `StyleSheet.create({...})`
  block at the bottom of the file, as in `themed-text.tsx` — don't use
  inline style objects except to merge in the caller's `style` prop.

Do not introduce NativeWind, Tailwind, styled-components, or any other
styling library — this is a deliberate choice, not an oversight.