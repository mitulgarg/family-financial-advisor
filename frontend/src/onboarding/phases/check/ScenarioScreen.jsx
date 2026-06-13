import { useRef } from 'react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { TapCard } from '../../ui/TapCard'
import { Whisper } from '../../ui/Whisper'

const EMPTY_CHECK = {}

// One full-screen scenario: a short story, one tap, auto-advance.
export function ScenarioScreen({ member, scenario, index, total, onNext }) {
  const check = useOnboardingStore((s) => s.checks[member.id]) ?? EMPTY_CHECK
  const updateCheck = useOnboardingStore((s) => s.updateCheck)
  const answers = check.answers ?? EMPTY_CHECK
  const picked = answers[scenario.key]
  const advancing = useRef(false)

  const pick = (optionKey) => {
    if (advancing.current) return
    advancing.current = true
    updateCheck(member.id, { answers: { ...answers, [scenario.key]: optionKey } })
    // Let the selected state show for a beat before sliding on.
    setTimeout(onNext, 350)
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-5 overflow-y-auto px-5 py-5">
      <div>
        <span className="text-[12px] font-medium text-[var(--color-ink-muted)]">
          {index + 1} of {total}, no right answers
        </span>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
            <scenario.Icon size={22} weight="duotone" className="text-[var(--accent)]" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            {scenario.title}
          </h1>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-ink-muted)]">
          {scenario.story}
        </p>
        <p className="mt-2 text-[15px] font-semibold text-[var(--color-ink)]">
          {scenario.question}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {scenario.options.map((opt) => (
          <TapCard
            key={opt.key}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={picked === opt.key}
            onClick={() => pick(opt.key)}
          />
        ))}
      </div>

      <Whisper>
        {member.isSelf
          ? 'Go with your gut, the first answer is usually the honest one.'
          : `Best answered by ${member.name} themselves, but your sense of them helps too.`}
      </Whisper>
    </div>
  )
}
