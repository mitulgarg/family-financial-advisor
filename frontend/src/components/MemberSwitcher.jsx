import { useChatStore } from '../store/chatStore'

function Chevron() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="text-[var(--color-ink-muted)]"
    >
      <path
        d="M2 4l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MemberSwitcher() {
  const members = useChatStore((s) => s.members)
  const activeMember = useChatStore((s) => s.activeMember)
  const setActiveMember = useChatStore((s) => s.setActiveMember)
  const resetForMemberSwitch = useChatStore((s) => s.resetForMemberSwitch)

  function handleChange(e) {
    const id = e.target.value
    if (id === activeMember) return
    resetForMemberSwitch()
    setActiveMember(id)
  }

  if (members.length === 0) return null

  return (
    <label className="relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] text-[var(--color-imessage-blue)] hover:bg-white/[0.06] transition-colors cursor-pointer">
      <span className="capitalize">{activeMember ?? 'select'}</span>
      <Chevron />
      <select
        value={activeMember ?? ''}
        onChange={handleChange}
        aria-label="Switch family member"
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {members.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  )
}
