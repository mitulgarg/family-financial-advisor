import { useState } from 'react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { TextField } from '../../ui/TextField'
import { TapCard } from '../../ui/TapCard'
import { Whisper } from '../../ui/Whisper'
import { PrimaryButton } from '../../ui/buttons'

const COMFORT_OPTIONS = [
  { value: 'starting', title: 'Just starting out', subtitle: 'Most of this is new to me' },
  { value: 'basics', title: 'I know the basics', subtitle: 'SIPs and FDs, I get the gist' },
  { value: 'confident', title: 'Pretty confident', subtitle: 'I track my investments myself' },
]

export function AboutHome() {
  const household = useOnboardingStore((s) => s.household)
  const self = useOnboardingStore((s) => s.members.find((m) => m.isSelf))
  const setHousehold = useOnboardingStore((s) => s.setHousehold)
  const updateMember = useOnboardingStore((s) => s.updateMember)
  const markWhoDone = useOnboardingStore((s) => s.markWhoDone)
  const openHub = useOnboardingStore((s) => s.openHub)

  const [city, setCity] = useState(household.city ?? '')
  const [comfort, setComfort] = useState(self?.moneyComfort ?? null)

  const finish = () => {
    setHousehold({ city: city.trim() })
    if (self && comfort) updateMember(self.id, { moneyComfort: comfort })
    markWhoDone()
    openHub()
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-6 overflow-y-auto px-5 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          A little about home
        </h1>
        <Whisper>Two quick things, both optional.</Whisper>
      </div>

      <TextField
        label="Which city is home?"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="e.g. Mumbai"
        whisper="Costs and house prices differ a lot city to city. It keeps the advice realistic."
      />

      <div>
        <label className="text-sm font-medium text-[var(--color-ink)]">
          How comfortable are you with money matters?
        </label>
        <div className="mt-2 flex flex-col gap-2">
          {COMFORT_OPTIONS.map((o) => (
            <TapCard
              key={o.value}
              title={o.title}
              subtitle={o.subtitle}
              selected={comfort === o.value}
              onClick={() => setComfort(o.value)}
            />
          ))}
        </div>
        <Whisper>So the advisor explains things at your pace, never over your head.</Whisper>
      </div>

      <div className="mt-auto pb-2">
        <PrimaryButton onClick={finish}>Finish family setup</PrimaryButton>
      </div>
    </div>
  )
}
