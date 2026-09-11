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
- **Inter is the only typeface.** Every text style names one of
  `Fonts.sans` / `.sansMedium` / `.sansSemibold` / `.sansBold` from
  `theme.ts` — never a font family string, and never a system font. The
  one exception is `Fonts.mono`, which exists solely for the dev build
  badge. There is no `serif` or `rounded`; don't add them back.
- **Weight comes from the family, not `fontWeight`.** Use
  `Fonts.sansBold` rather than `fontWeight: 700`. With a family loaded at
  runtime, a numeric weight makes some platforms synthesise a bold on top
  of an already-bold face. `fontWeight` should not appear anywhere in
  either app.
- **Prefer a `ThemedText` type over a bespoke text style.** The scale
  (`display`, `title`, `subtitle`, `heading`, `default`, `small`,
  `smallBold`, `label`, `meta`, `numeric`, `link`, `linkPrimary`) already
  pairs each size with the right family. Reach for a local style only for
  layout properties like `marginTop` or `textAlign`.
- Keep component-specific styles in a local `StyleSheet.create({...})`
  block at the bottom of the file, as in `themed-text.tsx` — don't use
  inline style objects except to merge in the caller's `style` prop.

Do not introduce NativeWind, Tailwind, styled-components, or any other
styling library — this is a deliberate choice, not an oversight.

## Visual language

The look is deliberately restrained — closer to Notion than to a
consumer fitness app. The rules, in priority order:

- **Flat, not elevated.** Separate a surface from the page with a
  hairline border (`StyleSheet.hairlineWidth` on `theme.border`) or a
  near-invisible fill tint (`theme.surface` / `theme.surfaceSunken`).
  No shadows, no `elevation`, no glows. A screen should read as one
  surface with divisions in it, not a stack of floating tiles.
- **Accent discipline.** `theme.accent` is for primary actions and for
  genuinely active or selected states — nothing else. A status badge, an
  avatar, an eyebrow label, a section heading: all neutral. The accent
  only reads as emphasis while it stays rare, so spending it on
  decoration is what makes it stop working.
- **Modest radii.** `Radii.sm` (6) for controls, inputs and badges,
  `Radii.md` (10) for cards, `Radii.lg` (14) for the rare large panel,
  `Radii.pill` only for actual circles like avatars. Don't inline a
  radius number.
- **Hierarchy through weight and size, not colour.** A heading is
  `theme.text` at a heavier family; body copy is `theme.textSecondary` at
  a regular one; hints are `theme.textMuted`. Don't reach for the accent
  or a tone colour to make something look important.
- **Give it room.** Prefer the next `Spacing` step up over the tighter
  one for card padding and the gap between a section heading and its
  content. Density is not the goal here.
