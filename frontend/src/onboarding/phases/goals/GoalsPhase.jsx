import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { memberPastel } from '../../theme'
import { MemberBadge } from '../../MemberBadge'
import { BUCKETS } from './goalCatalog'
import { BucketScreen } from './BucketScreen'
import { GoalTimeline } from './GoalTimeline'
import { PrimaryButton } from '../../ui/buttons'

// Phase 2 "Goals": three time buckets, then the timeline payoff.
export function GoalsPhase() {
  const members = useOnboardingStore((s) => s.members)
  const activeMemberId = useOnboardingStore((s) => s.activeMemberId)
  const openPhase = useOnboardingStore((s) => s.openPhase)
  const [stepIdx, setStepIdx] = useState(0) // 0..2 buckets, 3 timeline

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
            Goals belong to people, so let&apos;s meet yours first.
          </p>
          <PrimaryButton className="mt-6" onClick={() => openPhase('who')}>
            Build your family tree
          </PrimaryButton>
        </div>
      </div>
    )
  }

  const memberIdx = members.findIndex((m) => m.id === member.id)

  return (
    <div className="flex h-full flex-col">
      {!member.isSelf && (
        <MemberBadge member={member} pastel={memberPastel(memberIdx)} suffix="goals" />
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
          {stepIdx < BUCKETS.length ? (
            <BucketScreen
              member={member}
              bucket={BUCKETS[stepIdx]}
              onNext={() => setStepIdx(stepIdx + 1)}
            />
          ) : (
            <GoalTimeline member={member} onBack={() => setStepIdx(0)} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
