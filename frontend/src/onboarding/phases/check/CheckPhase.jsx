import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { memberPastel } from '../../theme'
import { MemberBadge } from '../../MemberBadge'
import { PrimaryButton } from '../../ui/buttons'
import { SCENARIOS } from './checkCatalog'
import { ScenarioScreen } from './ScenarioScreen'
import { FinalNoteScreen } from './FinalNoteScreen'
import { CompletionScreen } from './CompletionScreen'

// Phase 4 "Gut check": three scenario taps, the open note, then the payoff.
export function CheckPhase() {
  const members = useOnboardingStore((s) => s.members)
  const activeMemberId = useOnboardingStore((s) => s.activeMemberId)
  const openPhase = useOnboardingStore((s) => s.openPhase)
  const [stepIdx, setStepIdx] = useState(0) // 0..2 scenarios, 3 note, 4 done

  const member =
    members.find((m) => m.id === activeMemberId) ??
    members.find((m) => m.isSelf) ??
    members[0]

  if (!member) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
            First, the family
          </h1>
          <p className="mt-2 text-[14px] text-[var(--color-ink-muted)]">
            The gut check belongs to people, so let&apos;s meet yours first.
          </p>
          <PrimaryButton className="mt-6" onClick={() => openPhase('who')}>
            Build your family tree
          </PrimaryButton>
        </div>
      </div>
    )
  }

  const memberIdx = members.findIndex((m) => m.id === member.id)
  const next = () => setStepIdx((i) => i + 1)

  return (
    <div className="flex h-full flex-col">
      {!member.isSelf && stepIdx <= SCENARIOS.length && (
        <MemberBadge member={member} pastel={memberPastel(memberIdx)} suffix="gut check" />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="min-h-0 flex-1"
        >
          {stepIdx < SCENARIOS.length ? (
            <ScenarioScreen
              member={member}
              scenario={SCENARIOS[stepIdx]}
              index={stepIdx}
              total={SCENARIOS.length}
              onNext={next}
            />
          ) : stepIdx === SCENARIOS.length ? (
            <FinalNoteScreen member={member} onFinish={next} />
          ) : (
            <CompletionScreen member={member} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
