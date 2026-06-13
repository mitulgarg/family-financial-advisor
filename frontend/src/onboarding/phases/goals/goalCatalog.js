import {
  Airplane,
  Car,
  CreditCard,
  DeviceMobile,
  GraduationCap,
  HeartStraight,
  House,
  Motorcycle,
  Star,
  Storefront,
  SunHorizon,
  TrendUp,
  Umbrella,
} from '@phosphor-icons/react'

// The three time buckets. Bucket placement quietly does the short/long-term
// classification; the words never appear on screen.
export const BUCKETS = [
  {
    key: 'soon',
    title: 'In the next year or two',
    sub: 'Anything you are saving up for or want to do?',
    whisper: 'Money for soon stays safe, money for later gets room to grow.',
    label: 'Next 1-2 yrs',
  },
  {
    key: 'mid',
    title: 'In the next 3 to 5 years',
    sub: 'The bigger things on the horizon.',
    whisper: null,
    label: '3-5 yrs',
  },
  {
    key: 'far',
    title: 'Further out',
    sub: 'Five years, ten, someday.',
    whisper: null,
    label: 'Someday',
  },
]

// Suggestions are starters, not a menu; typed goals are first-class.
// defaultAmount is only where the slider OPENS, in the right ballpark for the
// category; nothing is recorded until the member actually sets a value.
export const SUGGESTIONS = {
  soon: [
    { key: 'phone', label: 'A new phone', Icon: DeviceMobile, defaultAmount: 80000 },
    { key: 'trip', label: 'A trip', Icon: Airplane, defaultAmount: 150000 },
    { key: 'bike', label: 'A bike', Icon: Motorcycle, defaultAmount: 120000 },
    { key: 'clear-card', label: 'Clear credit card', Icon: CreditCard, defaultAmount: 60000 },
    { key: 'cushion', label: 'A safety cushion', Icon: Umbrella, defaultAmount: 200000 },
  ],
  mid: [
    { key: 'wedding', label: 'A wedding', Icon: HeartStraight, defaultAmount: 2000000 },
    { key: 'car', label: 'A car', Icon: Car, defaultAmount: 800000 },
    { key: 'downpayment', label: 'Home down payment', Icon: House, defaultAmount: 1000000 },
    { key: 'business', label: 'Start something of my own', Icon: Storefront, defaultAmount: 500000 },
  ],
  far: [
    { key: 'education', label: "Kids' education", Icon: GraduationCap, defaultAmount: 2500000 },
    { key: 'home', label: 'A home', Icon: House, defaultAmount: 6000000 },
    { key: 'retire', label: 'Retire comfortably', Icon: SunHorizon, defaultAmount: 20000000 },
    { key: 'wealth', label: 'Grow long-term wealth', Icon: TrendUp, defaultAmount: 5000000 },
  ],
}

const GENERIC_DEFAULT_AMOUNT = 100000

const suggestionFor = (goal) =>
  SUGGESTIONS[goal.bucket]?.find((s) => s.key === goal.suggestionKey)

export const iconFor = (goal) => suggestionFor(goal)?.Icon ?? Star

export const defaultAmountFor = (goal) =>
  suggestionFor(goal)?.defaultAmount ?? GENERIC_DEFAULT_AMOUNT
