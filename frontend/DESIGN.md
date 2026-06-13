# Design

## Theme

Unified warm dark. The base is warm charcoal (hue ~55, never pure black), shared by chat and onboarding. Scene: a family member filling in their details on a phone in the evening living room, or chatting with the advisor at night; one continuous warm, lamplit surface.

## Color

Strategy: full pastel palette on a warm dark base. Neutrals are tinted toward the warm brand hue; pastels carry identity and are used deliberately, never decoratively.

### Base (OKLCH)

- `--color-bg`: oklch(13% 0.012 55)
- `--color-surface`: oklch(17.5% 0.014 55)
- `--color-surface-raised`: oklch(21% 0.016 55)
- `--color-ink`: oklch(95% 0.012 75)
- `--color-ink-muted`: oklch(63% 0.02 70)
- `--color-border`: oklch(26.5% 0.016 60)

### Pastels (Pantone-pastel family, calibrated for dark)

- `--pastel-peach`: oklch(84% 0.075 55) | phase: Family | soft: 14% alpha
- `--pastel-lavender`: oklch(83% 0.07 295) | phase: Goals
- `--pastel-mint`: oklch(85% 0.08 160) | phase: Money + primary actions
- `--pastel-butter`: oklch(88% 0.08 95) | phase: Gut check
- `--pastel-rose`: oklch(84% 0.065 15) | people accents
- `--pastel-sky`: oklch(84% 0.065 230) | people accents

Rules: pastel fills always carry dark ink text (oklch 20% of same hue), never white. Member avatars cycle the pastel family deterministically by roster index. Phase pastel appears in progress indicator, key icons, and selected states of that phase only. Chat keeps its iMessage blue bubbles.

## Typography

- Family: "Outfit Variable" (self-hosted via @fontsource-variable), system stack fallback.
- Display: 600-700 weight, tracking-tight. Body: 400-500 at 15px+.
- Numbers: tabular-nums always.
- Scale contrast at least 1.25 between hierarchy steps.

## Motion

- Easing tokens: ease-out-quart `cubic-bezier(0.23,1,0.32,1)`, ease-out-expo `cubic-bezier(0.19,1,0.22,1)`.
- Springs (motion lib): stiffness 300-380, damping 24-30 for layout; entries never from scale(0), start at 0.9+ with opacity.
- Press feedback on every tappable: scale(0.97), 120-160ms.
- UI transitions under 300ms. prefers-reduced-motion removes movement, keeps opacity.

## Components

- Icons: @phosphor-icons/react only, no emojis anywhere. Duotone weight for feature icons, bold for small glyphs.
- Sliders: Radix slider primitive styled to tokens (track border color, range in context pastel, large thumb).
- Sheets: bottom sheet mobile, centered dialog desktop, spring entry.
- Lists over identical card grids: member rosters are divided rows on one surface, not card clones.
- Inputs: label above, whisper microcopy below, 44px+ targets.

## Copy

- Everyday Indian English. EMI, SIP, FD allowed; liabilities, portfolio, risk tolerance banned.
- No em dashes anywhere user-facing (`npm run check:copy` enforces).
- Recurring reassurance: rough numbers are fine, everything editable later in chat.
