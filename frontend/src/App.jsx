import { useEffect } from 'react'
import { UsersThree } from '@phosphor-icons/react'
import { ENDPOINTS } from './lib/api'
import { useChatStore } from './store/chatStore'
import { useOnboardingStore } from './store/onboardingStore'
import { MemberSwitcher } from './components/MemberSwitcher'
import { Chat } from './components/Chat'
import { OnboardingNudge } from './components/OnboardingNudge'
import { OnboardingRoot } from './onboarding/OnboardingRoot'

function App() {
  const setMembers = useChatStore((s) => s.setMembers)
  const setActiveMember = useChatStore((s) => s.setActiveMember)
  const activeMember = useChatStore((s) => s.activeMember)
  const onboardingRoute = useOnboardingStore((s) => s.route)
  const openHub = useOnboardingStore((s) => s.openHub)

  useEffect(() => {
    fetch(ENDPOINTS.members)
      .then((r) => r.json())
      .then(({ members }) => {
        setMembers(members)
        if (!activeMember && members.length > 0) {
          setActiveMember(members[0])
        }
      })
      .catch(() => {})
  }, [])

  // Shared invite links (?onboard=<member>) land straight in the family hub.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('onboard')) openHub()
  }, [])

  if (onboardingRoute) {
    return <OnboardingRoot />
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg)]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5 border-b border-[var(--color-border)] shrink-0">
        <div className="justify-self-start">
          <MemberSwitcher />
        </div>
        <div className="text-center leading-tight">
          <div className="text-[15px] font-semibold text-[var(--color-ink)]">
            Family Financial Advisor
          </div>
          {activeMember && (
            <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
              chatting as {activeMember}
            </div>
          )}
        </div>
        <div className="justify-self-end">
          <button
            onClick={openHub}
            className="press-shrink flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            <UsersThree size={15} weight="bold" />
            Family setup
          </button>
        </div>
      </header>
      <OnboardingNudge key={activeMember} />
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  )
}

export default App
