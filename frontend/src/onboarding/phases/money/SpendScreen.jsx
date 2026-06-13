import { useState } from 'react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { AmountControl } from './FinRow'
import { Chip } from '../../ui/Chip'
import { Whisper } from '../../ui/Whisper'
import { PrimaryButton, GhostButton } from '../../ui/buttons'

const EMPTY_FIN = {}

const namesList = (names) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

// One spending question, shaped by who this member is: a household payer gets
// a single unified outflow number (home + personal together, the way people
// who run the house actually think); everyone else gets own-spending only.
// "Who pays" is asked once, then collapses to a summary line.
export function SpendScreen({ member, onNext }) {
  const fin = useOnboardingStore((s) => s.finances[member.id]) ?? EMPTY_FIN
  const household = useOnboardingStore((s) => s.household)
  const members = useOnboardingStore((s) => s.members)
  const setHousehold = useOnboardingStore((s) => s.setHousehold)
  const updateFinances = useOnboardingStore((s) => s.updateFinances)

  const whoPays = household.whoPays ?? []
  const [editingPayers, setEditingPayers] = useState(whoPays.length === 0)

  const isPayer = members.length === 1 || whoPays.includes(member.id)
  const spendValue = fin.spend ?? fin.personalSpend ?? null
  const who = member.isSelf ? 'you' : member.name

  const togglePayer = (id) => {
    const next = whoPays.includes(id)
      ? whoPays.filter((m) => m !== id)
      : [...whoPays, id]
    setHousehold({ whoPays: next })
  }

  const payerNames = members.filter((m) => whoPays.includes(m.id)).map((m) => m.name)

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-6 overflow-y-auto px-5 py-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          What goes out
        </h1>
        <p className="mt-1 text-[14px] text-[var(--color-ink-muted)]">
          One rough number, shaped around how your home actually runs.
        </p>
      </div>

      {members.length > 1 && (
        <div>
          {editingPayers ? (
            <>
              <label className="text-sm font-medium text-[var(--color-ink)]">
                Who takes care of the household expenses?
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {members.map((m) => (
                  <Chip
                    key={m.id}
                    selected={whoPays.includes(m.id)}
                    onClick={() => togglePayer(m.id)}
                  >
                    {m.isSelf ? `${m.name} (you)` : m.name}
                  </Chip>
                ))}
              </div>
              <Whisper>
                Tap everyone who chips in. Shared is common, and perfectly fine. Asked
                once for the whole family.
              </Whisper>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-4 pr-1">
              <span className="min-w-0 truncate text-[13px] text-[var(--color-ink-muted)]">
                Household expenses: handled by{' '}
                <span className="font-medium text-[var(--color-ink)]">
                  {namesList(payerNames)}
                </span>
              </span>
              <GhostButton className="!min-h-[36px] shrink-0 !px-3 text-[12px]" onClick={() => setEditingPayers(true)}>
                Change
              </GhostButton>
            </div>
          )}
        </div>
      )}

      <div>
        {isPayer ? (
          <>
            <AmountControl
              label={`Roughly how much goes out through ${who} in a month?`}
              value={spendValue}
              defaultValue={60000}
              min={5000}
              max={1000000}
              onChange={(spend) =>
                updateFinances(member.id, { spend, spendScope: 'all' })
              }
            />
            <Whisper>
              Home and personal together, one number. Most people who run the house do
              not split it, and that is fine.
            </Whisper>
          </>
        ) : (
          <>
            <AmountControl
              label={
                member.isSelf
                  ? 'What do you spend on yourself in a month?'
                  : `What does ${member.name} spend on themselves in a month?`
              }
              value={spendValue}
              defaultValue={15000}
              min={1000}
              max={500000}
              onChange={(spend) =>
                updateFinances(member.id, { spend, spendScope: 'own' })
              }
            />
            <Whisper>
              {member.isSelf ? 'Your' : 'Their'} own things: eating out, travel,
              shopping, phone. The household bills are covered on the payers&apos;
              screens.
            </Whisper>
          </>
        )}
      </div>

      <div className="mt-auto pb-2">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  )
}
