export function Chip({ selected = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={
        'press-shrink min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors ' +
        (selected
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--color-ink)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]') +
        ' ' +
        className
      }
      {...props}
    >
      {children}
    </button>
  )
}
