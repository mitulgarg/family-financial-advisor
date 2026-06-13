import { CheckCircle } from '@phosphor-icons/react'

// Big tappable option card, the main answer control for one-of-N questions.
export function TapCard({ title, subtitle, selected = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        'press-shrink relative w-full rounded-2xl border p-4 pr-11 text-left transition-colors ' +
        (selected
          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]')
      }
    >
      <div className="text-[15px] font-semibold text-[var(--color-ink)]">{title}</div>
      {subtitle && (
        <div className="mt-0.5 text-[13px] text-[var(--color-ink-muted)]">{subtitle}</div>
      )}
      {selected && (
        <CheckCircle
          size={22}
          weight="fill"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--accent)]"
        />
      )}
    </button>
  )
}
