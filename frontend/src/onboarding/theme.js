// Pastel assignment rules. One pastel per phase (wayfinding) and one per
// family member (identity), cycled deterministically by roster order.

export const PHASE_PASTEL = {
  who: 'peach',
  goals: 'lavender',
  money: 'mint',
  check: 'butter',
}

const MEMBER_PASTELS = ['peach', 'mint', 'lavender', 'rose', 'sky', 'butter']

export const pastelVars = (name) => ({
  solid: `var(--color-${name})`,
  soft: `var(--color-${name}-soft)`,
  ink: `var(--color-${name}-ink)`,
})

export const memberPastel = (index) =>
  pastelVars(MEMBER_PASTELS[((index % MEMBER_PASTELS.length) + MEMBER_PASTELS.length) % MEMBER_PASTELS.length])

// CSS custom properties that re-point the context accent for a phase subtree.
export const accentStyle = (pastelName) => ({
  '--accent': `var(--color-${pastelName})`,
  '--accent-soft': `var(--color-${pastelName}-soft)`,
  '--accent-ink': `var(--color-${pastelName}-ink)`,
})
