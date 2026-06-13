import { AnimatePresence } from 'motion/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { LOAN_TYPES } from './moneyCatalog'
import { FinRow, AmountControl, TenureControl } from './FinRow'
import { formatINR } from '../../money'
import { Chip } from '../../ui/Chip'
import { Whisper } from '../../ui/Whisper'
import { PrimaryButton } from '../../ui/buttons'

const EMPTY_FIN = {}
const NO_ITEMS = []

export function LoansScreen({ member, onNext }) {
  const fin = useOnboardingStore((s) => s.finances[member.id]) ?? EMPTY_FIN
  const updateFinances = useOnboardingStore((s) => s.updateFinances)
  const loans = fin.loans ?? NO_ITEMS

  const setLoans = (next) => updateFinances(member.id, { loans: next })
  const selectedKeys = new Set(loans.map((l) => l.key))

  const toggle = (type) => {
    if (selectedKeys.has(type.key)) {
      setLoans(loans.filter((l) => l.key !== type.key))
    } else {
      setLoans([...loans, { key: type.key, label: type.label, emi: null, remaining: null }])
    }
  }

  const update = (key, fields) =>
    setLoans(loans.map((l) => (l.key === key ? { ...l, ...fields } : l)))

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-5 py-5">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          Any loans running?
        </h1>
        <p className="mt-1 text-[14px] text-[var(--color-ink-muted)]">
          {member.isSelf ? 'Yours' : `${member.name}'s`}. Tap what applies, skip if none.
        </p>
        <Whisper>Knowing the EMIs helps the advisor see what is truly free each month.</Whisper>
      </div>

      <div className="mt-5 flex shrink-0 flex-wrap gap-2">
        {LOAN_TYPES.map((t) => (
          <Chip
            key={t.key}
            selected={selectedKeys.has(t.key)}
            onClick={() => toggle(t)}
            className="flex items-center gap-1.5"
          >
            <t.Icon size={15} weight={selectedKeys.has(t.key) ? 'fill' : 'regular'} />
            {t.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-1">
        <AnimatePresence initial={false}>
          {loans.map((loan) => {
            const type = LOAN_TYPES.find((t) => t.key === loan.key)
            return (
              <FinRow
                key={loan.key}
                Icon={type.Icon}
                label={loan.label}
                summary={loan.emi != null ? `${formatINR(loan.emi)}/mo EMI` : 'EMI?'}
                onRemove={() => toggle(type)}
              >
                <AmountControl
                  label="Monthly EMI"
                  value={loan.emi}
                  defaultValue={type.defaultEmi}
                  min={1000}
                  max={500000}
                  onChange={(v) => update(loan.key, { emi: v })}
                />
                <AmountControl
                  label="Roughly how much is left to pay?"
                  value={loan.remaining}
                  defaultValue={type.defaultRemaining}
                  min={10000}
                  max={50000000}
                  onChange={(v) => update(loan.key, { remaining: v })}
                />
                <TenureControl
                  label="And how long until it is done?"
                  value={loan.tenureMonths ?? null}
                  defaultValue={type.defaultTenureMonths}
                  onChange={(v) => update(loan.key, { tenureMonths: v })}
                />
              </FinRow>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="shrink-0 pb-2 pt-3">
        <PrimaryButton onClick={onNext}>
          {loans.length > 0 ? 'Continue' : 'No loans, next'}
        </PrimaryButton>
      </div>
    </div>
  )
}
