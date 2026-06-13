import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { memberPastel } from '../../theme'
import { MemberBadge } from '../../MemberBadge'
import { PrimaryButton } from '../../ui/buttons'
import { IncomeScreen } from './IncomeScreen'
import { SpendScreen } from './SpendScreen'
import { LoansScreen } from './LoansScreen'
import { SavingsScreen } from './SavingsScreen'
import { ProtectionScreen } from './ProtectionScreen'

const STEPS = ['income', 'spend', 'loans', 'savings', 'protection']

// Phase 3 "Money": income, household spend, loans, savings, protection.
export function MoneyPhase() {
  const members = useOnboardingStore((s) => s.members)
  const activeMemberId = useOnboardingStore((s) => s.activeMemberId)
  const openPhase = useOnboardingStore((s) => s.openPhase)
  const [stepIdx, setStepIdx] = useState(0)

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
            The money picture belongs to people, so let&apos;s meet yours first.
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
  const step = STEPS[stepIdx]

  const screens = {
    income: <IncomeScreen member={member} onNext={next} />,
    spend: <SpendScreen member={member} onNext={next} />,
    loans: <LoansScreen member={member} onNext={next} />,
    savings: <SavingsScreen member={member} onNext={next} />,
    protection: <ProtectionScreen member={member} />,
  }

  return (
    <div className="flex h-full flex-col">
      {!member.isSelf && (
        <MemberBadge member={member} pastel={memberPastel(memberIdx)} suffix="money picture" />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="min-h-0 flex-1"
        >
          {screens[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
