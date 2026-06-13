import {
  Bank,
  Briefcase,
  Buildings,
  Car,
  ChartLineUp,
  CreditCard,
  Diamond,
  GraduationCap,
  HandCoins,
  House,
  Laptop,
  TrendUp,
  Vault,
  Wallet,
} from '@phosphor-icons/react'

// defaultAmount is only where a slider OPENS; nothing is recorded until the
// member sets a value. Amounts are monthly for incomes, rupees elsewhere.

export const INCOME_SOURCES = [
  { key: 'salary', label: 'Salary', Icon: Briefcase, defaultAmount: 50000 },
  { key: 'business', label: 'Business', Icon: Wallet, defaultAmount: 60000 },
  { key: 'rent', label: 'Rent from a property', Icon: Buildings, defaultAmount: 15000 },
  { key: 'pension', label: 'Pension', Icon: HandCoins, defaultAmount: 25000 },
  { key: 'freelance', label: 'Freelance', Icon: Laptop, defaultAmount: 40000 },
]

export const LOAN_TYPES = [
  { key: 'home', label: 'Home loan', Icon: House, defaultEmi: 30000, defaultRemaining: 3000000, defaultTenureMonths: 240 },
  { key: 'car', label: 'Car loan', Icon: Car, defaultEmi: 12000, defaultRemaining: 500000, defaultTenureMonths: 60 },
  { key: 'personal', label: 'Personal loan', Icon: HandCoins, defaultEmi: 10000, defaultRemaining: 300000, defaultTenureMonths: 36 },
  { key: 'education', label: 'Education loan', Icon: GraduationCap, defaultEmi: 8000, defaultRemaining: 400000, defaultTenureMonths: 84 },
  { key: 'card-dues', label: 'Credit card dues', Icon: CreditCard, defaultEmi: 5000, defaultRemaining: 60000, defaultTenureMonths: 12 },
]

export const ASSET_CLASSES = [
  { key: 'bank-fd', label: 'Bank savings & FDs', Icon: Bank, defaultAmount: 200000 },
  { key: 'mf-sip', label: 'Mutual funds & SIPs', Icon: ChartLineUp, defaultAmount: 300000 },
  { key: 'stocks', label: 'Stocks', Icon: TrendUp, defaultAmount: 100000 },
  { key: 'gold', label: 'Gold', Icon: Diamond, defaultAmount: 200000 },
  { key: 'property', label: 'Property', Icon: Buildings, defaultAmount: 5000000 },
  { key: 'pf', label: 'PF', Icon: Vault, defaultAmount: 300000 },
]
