import { useOnboardingStore } from '../store/onboardingStore'
import { Hub } from './Hub'
import { PhaseFlow } from './PhaseFlow'

export function OnboardingRoot() {
  const route = useOnboardingStore((s) => s.route)
  return route === 'phase' ? <PhaseFlow /> : <Hub />
}
