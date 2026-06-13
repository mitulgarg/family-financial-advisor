import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { AboutYou } from './AboutYou'
import { TreeBuilder } from './TreeBuilder'
import { AboutHome } from './AboutHome'

// Phase 1 "Who": start with you -> build the tree -> a little about home.
export function WhoPhase() {
  const hasSelf = useOnboardingStore((s) => s.members.some((m) => m.isSelf))
  const [step, setStep] = useState(hasSelf ? 'tree' : 'you')

  const screens = {
    you: <AboutYou onNext={() => setStep('tree')} />,
    tree: <TreeBuilder onNext={() => setStep('home')} />,
    home: <AboutHome />,
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="h-full"
      >
        {screens[step]}
      </motion.div>
    </AnimatePresence>
  )
}
