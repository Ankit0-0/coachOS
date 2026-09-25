## Styling conventions

This app uses plain React Native `StyleSheet` with a typed design-token
system shared with the other app in `packages/theme` (`@coachos/theme`) —
not Tailwind/NativeWind. Follow these rules for every component:

- **Never hardcode a color.** Read colours from `useTheme()`
  (`@/hooks/use-theme`), e.g. `theme.textPrimary` / `theme.bg` /
  `theme.surface` / `theme.surfaceInset` / `theme.border`. Every role is
  in the `Theme` type in `packages/theme/src/themes.ts`; if a component
  needs a new one, add it to that type and to both `light` and `dark` —
  a missing value is then a compile error. Don't inline a hex value
  anywhere under `mobile/`.
- **Check contrast when you add or change a colour.** Every text/background
  pair must meet WCAG AA (4.5:1 body, 3:1 large text and UI glyphs) in
  both themes.
- **Never hardcode a spacing/margin/padding number.** Use the `Spacing`
  scale (`Spacing.one` 4 through `Spacing.six` 64, with `twoHalf` 12 and
  `threeHalf` 20). Screen gutters are `ScreenPadding` (20). If none fit,
  add a named step to `Spacing` in `packages/theme/src/tokens.ts`.
- **Reach for the shared components first**: `Card`, `InsetPanel`, `Row`,
  `Chip`, `Button`, `Checkbox`, `Avatar`, `NumberBadge`, `CountBadge`,
  `Callout`, `ProgressBar`, `Section`, `TextField`, `SegmentedControl`,
  `IconTile`, `ThemedText`, `ThemedView`. The files in
  `components/ui/` re-export them. Don't build a local card or button.
- **Typefaces are the landing page's**: DM Sans for text, Manrope for
  headings, loaded by name in `Fonts`. Never a font family string, and
  never a system font. `Fonts.mono` exists solely for the dev build badge.
- **Weight comes from the family, not `fontWeight`.** Use
  `Fonts.sansSemibold` rather than `fontWeight: 600`; a numeric weight on a
  runtime-loaded family gets a synthesised bold on some platforms.
  `fontWeight` should not appear anywhere in either app.
- **Prefer a `ThemedText` type over a bespoke text style.** The scale
  (`display` 28 screen titles, `subtitle` 20 section titles, `heading` 17
  card titles, `default` 15, `small`, `smallBold`, `label`, `meta`, `chip`,
  `numeric`, `link`, `linkPrimary`) pairs each size with its family and a
  default colour. Use a local style only for layout (`marginTop`,
  `textAlign`).
- Keep component-specific styles in a local `StyleSheet.create({...})`
  block at the bottom of the file — no inline style objects except to merge
  in a theme colour or the caller's `style` prop.
- Use `aria-checked` / `aria-disabled` rather than `accessibilityState`:
  React Native Web drops the latter, so the web build loses the state.

Do not introduce NativeWind, Tailwind, styled-components, or any other
styling library — this is a deliberate choice, not an oversight.

## Visual language

The apps look like the landing page (`landing-page/`): warm off-white page,
white cards, deep forest green, sage and terracotta accents. Light is the
primary look; dark is a warm version of the same palette. Users pick
System / Light / Dark in Profile.

- **Cards on a warm page.** An outer `Card` is white, radius 24, 1px border,
  and a very soft shadow in light mode only; dark mode uses the border
  alone. Rows inside a card sit in an `InsetPanel` (the cream tray, radius
  20) as white `Row`s, radius 14, 8 apart.
- **Primary is for actions and selection.** Forest (sage in dark) fills
  primary buttons, checked boxes, the selected segment and the active tab
  label. Don't use it for decoration.
- **Hues carry meaning.** Sage/green for workout and coaches, terracotta
  for diet and clients — chips, avatars, icon tiles and chart series
  follow this. Status uses the `success` / `warning` / `partial` / `danger`
  chip tones.
- **Radii by role**: `Radii.sm` (10) small controls, `Radii.md` (14)
  buttons, inputs and rows, `Radii.lg` (20) inset panels and icon tiles,
  `Radii.xl` (24) cards, `Radii.pill` chips and avatars. Don't inline a
  radius number.
- **Hierarchy through type, not colour.** Headings are Manrope in
  `textHeading`; body copy is `textSecondary`; hints and units are
  `textMuted`. No all-caps eyebrows — use a `Chip` or a muted label.
- **Touch targets are at least 44×44**, via size or `hitSlop`.
- **Give it room.** Prefer the next `Spacing` step up for card padding and
  the gap between a section heading and its content.
