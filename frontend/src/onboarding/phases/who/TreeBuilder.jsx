import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from '@phosphor-icons/react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { memberPastel } from '../../theme'
import { PersonSheet } from './PersonSheet'
import { Whisper } from '../../ui/Whisper'
import { PrimaryButton } from '../../ui/buttons'

// Generation rows, top to bottom. Cards bloom in and the layout re-balances.
const ROWS = [
  { key: 'grandparents', rels: ['Grandparent'] },
  { key: 'parents', rels: ['Father', 'Mother'] },
  { key: 'middle', rels: ['You', 'Spouse', 'Brother', 'Sister'] },
  { key: 'children', rels: ['Son', 'Daughter'] },
  { key: 'others', rels: ['Other'] },
]

export function TreeBuilder({ onNext }) {
  const members = useOnboardingStore((s) => s.members)
  const [sheet, setSheet] = useState(null) // null | { editId: string|null }

  const indexById = new Map(members.map((m, i) => [m.id, i]))

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-5 py-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">
          Your family
        </h1>
        <Whisper>
          Tap the plus to add people, tap anyone to edit. Rough is fine, change it anytime.
        </Whisper>
      </div>

      <div className="relative mt-4 min-h-0 flex-1 overflow-y-auto">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[var(--color-border)] to-transparent" />
        <div className="relative flex flex-col items-center gap-7 py-3">
          {ROWS.map(({ key, rels }) => {
            const row = members.filter((m) => rels.includes(m.relationship))
            if (row.length === 0) return null
            return (
              <div key={key} className="z-10 flex flex-wrap justify-center gap-3">
                <AnimatePresence>
                  {row.map((m) => (
                    <TreeNode
                      key={m.id}
                      member={m}
                      pastel={memberPastel(indexById.get(m.id) ?? 0)}
                      onClick={() => setSheet({ editId: m.id })}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 pb-2 pt-3">
        <button
          onClick={() => setSheet({ editId: null })}
          className={
            'press-shrink flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl ' +
            'border border-dashed border-[var(--color-border)] text-[15px] font-medium ' +
            'text-[var(--color-ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--color-ink)]'
          }
        >
          <Plus size={16} weight="bold" />
          Add someone
        </button>
        <PrimaryButton onClick={onNext}>Looks right, continue</PrimaryButton>
      </div>

      <PersonSheet
        open={sheet !== null}
        editId={sheet?.editId ?? null}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}

function TreeNode({ member, pastel, onClick }) {
  return (
    <motion.button
      layout
      type="button"
      onClick={onClick}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={
        'press-shrink w-[120px] rounded-2xl border bg-[var(--color-surface)] p-3 text-center ' +
        (member.isSelf ? 'border-[var(--accent)]' : 'border-[var(--color-border)]')
      }
    >
      <span
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold"
        style={{ background: pastel.solid, color: pastel.ink }}
      >
        {member.name.charAt(0).toUpperCase()}
      </span>
      <div className="mt-2 truncate text-[13px] font-semibold text-[var(--color-ink)]">
        {member.name}
      </div>
      <div className="text-[11px] text-[var(--color-ink-muted)]">
        {member.isSelf ? 'You' : member.relationship}
        {member.age ? ` · ${member.age}` : ''}
      </div>
      {member.earns && (
        <div className="mt-1 inline-block rounded-full bg-[var(--color-mint-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-mint)]">
          earns
        </div>
      )}
    </motion.button>
  )
}
