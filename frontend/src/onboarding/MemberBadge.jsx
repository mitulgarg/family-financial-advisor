// Shown when filling a phase for someone else, so it is always clear whose
// answers these are.
export function MemberBadge({ member, pastel, suffix }) {
  return (
    <div className="flex shrink-0 justify-center pb-1">
      <span className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1 pl-1 pr-3">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
          style={{ background: pastel.solid, color: pastel.ink }}
        >
          {member.name.charAt(0).toUpperCase()}
        </span>
        <span className="text-[12px] font-medium text-[var(--color-ink-muted)]">
          {member.name}&apos;s {suffix}
        </span>
      </span>
    </div>
  )
}
