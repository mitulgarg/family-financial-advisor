// Two/three-option segmented control, replaces dropdowns and checkboxes.
export function Segmented({ options, value, onChange }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            'press-shrink min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
            (value === o.value
              ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]')
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
