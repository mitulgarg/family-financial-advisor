import { AnimatePresence } from 'motion/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { INCOME_SOURCES } from './moneyCatalog'
import { FinRow, AmountControl } from './FinRow'
import { formatINR } from '../../money'
import { Chip } from '../../ui/Chip'
import { Segmented } from '../../ui/Segmented'
import { Whisper } from '../../ui/Whisper'
import { PrimaryButton } from '../../ui/buttons'

const EMPTY_FIN = {}
const NO_ITEMS = []

export function IncomeScreen({ member, onNext }) {
  const fin = useOnboardingStore((s) => s.finances[member.id]) ?? EMPTY_FIN
  const updateFinances = useOnboardingStore((s) => s.updateFinances)
  const incomes = fin.incomes ?? NO_ITEMS

  const setIncomes = (next) => updateFinances(member.id, { incomes: next })
  const selectedKeys = new Set(incomes.map((i) => i.key))

  const toggle = (source) => {
    if (selectedKeys.has(source.key)) {
      setIncomes(incomes.filter((i) => i.key !== source.key))
    } else {
      setIncomes([
        ...incomes,
        { key: source.key, label: source.label, amount: null, cadence: 'monthly' },
      ])
    }
  }

  const update = (key, fields) =>
    setIncomes(incomes.map((i) => (i.key === key ? { ...i, ...fields } : i)))

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-5 py-5">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          What comes in
        </h1>
        <p className="mt-1 text-[14px] text-[var(--color-ink-muted)]">
          {member.isSelf ? 'Your' : `${member.name}'s`} income sources. Tap what applies.
        </p>
        <Whisper>
          Rough numbers are fine, you can correct anything later just by mentioning it
          in chat.
        </Whisper>
      </div>

      <div className="mt-5 flex shrink-0 flex-wrap gap-2">
        {INCOME_SOURCES.map((s) => (
          <Chip
            key={s.key}
            selected={selectedKeys.has(s.key)}
            onClick={() => toggle(s)}
            className="flex items-center gap-1.5"
          >
            <s.Icon size={15} weight={selectedKeys.has(s.key) ? 'fill' : 'regular'} />
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-1">
        <AnimatePresence initial={false}>
          {incomes.map((income) => {
            const source = INCOME_SOURCES.find((s) => s.key === income.key)
            return (
              <FinRow
                key={income.key}
                Icon={source.Icon}
                label={income.label}
                summary={
                  income.amount != null
                    ? `${formatINR(income.amount)}/${income.cadence === 'yearly' ? 'yr' : 'mo'}`
                    : 'roughly?'
                }
                onRemove={() => toggle(source)}
              >
                <AmountControl
                  label="Roughly how much?"
                  value={income.amount}
                  defaultValue={source.defaultAmount}
                  min={5000}
                  max={10000000}
                  onChange={(v) => update(income.key, { amount: v })}
                />
                {income.key === 'salary' && (
                  <p className="mt-1.5 text-[12px] text-[var(--color-ink-muted)]">
                    Your fixed take-home pay, not your CTC.
                  </p>
                )}
                <div className="mt-2">
                  <Segmented
                    options={[
                      { value: 'monthly', label: 'Per month' },
                      { value: 'yearly', label: 'Per year' },
                    ]}
                    value={income.cadence}
                    onChange={(cadence) => update(income.key, { cadence })}
                  />
                </div>
              </FinRow>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="shrink-0 pb-2 pt-3">
        <PrimaryButton onClick={onNext}>
          {incomes.length > 0 ? 'Continue' : 'Nothing to add, next'}
        </PrimaryButton>
      </div>
    </div>
  )
}
