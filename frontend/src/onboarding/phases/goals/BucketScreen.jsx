import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, Trash } from '@phosphor-icons/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { SUGGESTIONS, defaultAmountFor, iconFor } from './goalCatalog'
import { formatINR } from '../../money'
import { Chip } from '../../ui/Chip'
import { RupeeSlider } from '../../ui/RupeeSlider'
import { Whisper } from '../../ui/Whisper'
import { PrimaryButton } from '../../ui/buttons'

// Stable fallback: a fresh [] inside the selector would change the snapshot
// on every read and send React into an infinite update loop.
const NO_GOALS = []

export function BucketScreen({ member, bucket, onNext }) {
  const goals = useOnboardingStore((s) => s.goals[member.id]) ?? NO_GOALS
  const addGoal = useOnboardingStore((s) => s.addGoal)
  const removeGoal = useOnboardingStore((s) => s.removeGoal)
  const [custom, setCustom] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const bucketGoals = goals.filter((g) => g.bucket === bucket.key)
  const selectedKeys = new Set(bucketGoals.map((g) => g.suggestionKey))

  const toggleSuggestion = (s) => {
    const existing = bucketGoals.find((g) => g.suggestionKey === s.key)
    if (existing) {
      removeGoal(member.id, existing.id)
      if (expandedId === existing.id) setExpandedId(null)
    } else {
      const id = addGoal(member.id, {
        title: s.label,
        bucket: bucket.key,
        suggestionKey: s.key,
      })
      setExpandedId(id)
    }
  }

  const addCustom = () => {
    const title = custom.trim()
    if (!title) return
    const id = addGoal(member.id, { title, bucket: bucket.key })
    setCustom('')
    setExpandedId(id)
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-5 py-5">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          {bucket.title}
        </h1>
        <p className="mt-1 text-[14px] text-[var(--color-ink-muted)]">{bucket.sub}</p>
        {bucket.whisper && <Whisper>{bucket.whisper}</Whisper>}
      </div>

      <div className="mt-5 flex shrink-0 flex-wrap gap-2">
        {SUGGESTIONS[bucket.key].map((s) => (
          <Chip
            key={s.key}
            selected={selectedKeys.has(s.key)}
            onClick={() => toggleSuggestion(s)}
            className="flex items-center gap-1.5"
          >
            <s.Icon size={15} weight={selectedKeys.has(s.key) ? 'fill' : 'regular'} />
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex shrink-0 gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          placeholder="Or type your own, in your words"
          className={
            'min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ' +
            'px-4 py-3 text-[14px] text-[var(--color-ink)] outline-none transition-colors ' +
            'placeholder:text-[var(--color-ink-muted)] focus:border-[var(--accent)]'
          }
        />
        <button
          onClick={addCustom}
          disabled={!custom.trim()}
          aria-label="Add this goal"
          className={
            'press-shrink flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl ' +
            'border border-[var(--color-border)] text-[var(--color-ink-muted)] transition-colors ' +
            'hover:text-[var(--color-ink)] disabled:opacity-40'
          }
        >
          <Plus size={18} weight="bold" />
        </button>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-1">
        <AnimatePresence initial={false}>
          {bucketGoals.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              memberId={member.id}
              expanded={expandedId === g.id}
              onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <div className="shrink-0 pb-2 pt-3">
        <PrimaryButton onClick={onNext}>
          {bucketGoals.length > 0 ? 'Continue' : 'Nothing here, next'}
        </PrimaryButton>
      </div>
    </div>
  )
}

function GoalRow({ goal, memberId, expanded, onToggle }) {
  const updateGoal = useOnboardingStore((s) => s.updateGoal)
  const removeGoal = useOnboardingStore((s) => s.removeGoal)
  const Icon = iconFor(goal)

  const summary = goal.notSure
    ? 'will figure out'
    : goal.amount
      ? formatINR(goal.amount)
      : 'how much?'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3.5 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
          <Icon size={18} weight="duotone" className="text-[var(--accent)]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--color-ink)]">
          {goal.title}
        </span>
        <span className="shrink-0 text-[13px] tabular-nums text-[var(--color-ink-muted)]">
          {summary}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-[var(--color-ink-muted)]">
                  Roughly how much?
                </span>
                <span className="text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
                  {goal.notSure ? '?' : formatINR(goal.amount ?? defaultAmountFor(goal))}
                </span>
              </div>
              {!goal.notSure && (
                <RupeeSlider
                  value={goal.amount ?? defaultAmountFor(goal)}
                  onChange={(v) => updateGoal(memberId, goal.id, { amount: v, notSure: false })}
                  label={`Target for ${goal.title}`}
                />
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <Chip
                  selected={goal.notSure}
                  onClick={() => updateGoal(memberId, goal.id, { notSure: !goal.notSure })}
                  className="!min-h-[38px] !px-3 !text-[12px]"
                >
                  Not sure, help me figure it out
                </Chip>
                <button
                  onClick={() => removeGoal(memberId, goal.id)}
                  aria-label={`Remove ${goal.title}`}
                  className="press-shrink flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-rose)]"
                >
                  <Trash size={16} weight="bold" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
