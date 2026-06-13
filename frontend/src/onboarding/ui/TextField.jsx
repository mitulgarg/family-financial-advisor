import { Whisper } from './Whisper'

export function TextField({ label, whisper, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-[var(--color-ink)]">{label}</label>
      )}
      <input
        className={
          'mt-1.5 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ' +
          'px-4 py-3 text-[15px] text-[var(--color-ink)] outline-none transition-colors ' +
          'placeholder:text-[var(--color-ink-muted)] focus:border-[var(--accent)] ' +
          className
        }
        {...props}
      />
      {whisper && <Whisper>{whisper}</Whisper>}
    </div>
  )
}
