import { useEffect } from 'react'
import { ENDPOINTS } from './lib/api'
import { useChatStore } from './store/chatStore'
import { MemberSwitcher } from './components/MemberSwitcher'
import { Chat } from './components/Chat'

function App() {
  const setMembers = useChatStore((s) => s.setMembers)
  const setActiveMember = useChatStore((s) => s.setActiveMember)
  const activeMember = useChatStore((s) => s.activeMember)

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
        <div />
      </header>
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  )
}

export default App
