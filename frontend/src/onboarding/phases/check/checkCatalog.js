import { ChartLineDown, CoinVertical, LockKey } from '@phosphor-icons/react'

// Three quick scenarios, no right answers. We record the tap itself, never a
// self-label like "aggressive": the advisor reads the stance from behavior.

export const SCENARIOS = [
  {
    key: 'drop',
    Icon: ChartLineDown,
    title: 'The dip',
    story:
      'Say ₹1 lakh you invested shows ₹80,000 this month. Nothing changed in your life, the market is just having a mood.',
    question: 'What do you do?',
    options: [
      { key: 'buy-more', title: 'Put in a little more', subtitle: 'Down feels like a discount' },
      { key: 'sit-tight', title: 'Leave it alone and wait', subtitle: 'These things usually come back' },
      { key: 'move-some', title: 'Move some of it somewhere safer', subtitle: 'I would sleep easier' },
      { key: 'take-out', title: 'Take it all out', subtitle: 'I would rather hold the cash' },
    ],
  },
  {
    key: 'sure-or-flip',
    Icon: CoinVertical,
    title: 'Two envelopes',
    story:
      'One envelope has ₹50,000, guaranteed. The other is a coin flip: ₹1.2 lakh or nothing at all.',
    question: 'Which one do you pick?',
    options: [
      { key: 'sure', title: 'The sure ₹50,000', subtitle: 'Money in hand beats maybe' },
      { key: 'flip', title: 'The coin flip', subtitle: 'Worth the shot at more than double' },
    ],
  },
  {
    key: 'reach',
    Icon: LockKey,
    title: 'Out of reach',
    story:
      'Money grows best when left alone for years. Imagine ₹1 lakh of yours locked away where you cannot touch it for 5 years.',
    question: 'How does that sit with you?',
    options: [
      { key: 'fine', title: 'Completely fine', subtitle: 'I would honestly forget about it' },
      { key: 'uneasy', title: 'A little uneasy, but okay', subtitle: 'As long as I know why it is locked' },
      { key: 'no-way', title: 'Not okay', subtitle: 'I need to be able to reach my money' },
    ],
  },
]
