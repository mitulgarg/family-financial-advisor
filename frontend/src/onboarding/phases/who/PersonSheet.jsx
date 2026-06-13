import { useState } from 'react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { Sheet } from '../../ui/Sheet'
import { Chip } from '../../ui/Chip'
import { TextField } from '../../ui/TextField'
import { LabeledSlider } from '../../ui/LabeledSlider'
import { Segmented } from '../../ui/Segmented'
import { Whisper } from '../../ui/Whisper'
import { PrimaryButton, GhostButton } from '../../ui/buttons'

const RELATIONSHIPS = [
  'Father',
  'Mother',
  'Spouse',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandparent',
  'Other',
]

export function PersonSheet({ open, editId, onClose }) {
  const member = useOnboardingStore((s) => s.members.find((m) => m.id === editId))
  return (
    <Sheet open={open} onClose={onClose} title={member ? `Edit ${member.name}` : 'Add someone'}>
      {open && <PersonForm key={editId ?? 'new'} member={member} onClose={onClose} />}
    </Sheet>
  )
}

function PersonForm({ member, onClose }) {
  const addMember = useOnboardingStore((s) => s.addMember)
  const updateMember = useOnboardingStore((s) => s.updateMember)
  const removeMember = useOnboardingStore((s) => s.removeMember)

  const [relationship, setRelationship] = useState(member?.relationship ?? null)
  const [name, setName] = useState(member?.name ?? '')
  const [age, setAge] = useState(member?.age ?? 45)
  const [earns, setEarns] = useState(member?.earns ?? false)
  const [occupation, setOccupation] = useState(member?.occupation ?? '')
  const [livesElsewhere, setLivesElsewhere] = useState(member?.livesElsewhere ?? false)

  const isSelf = !!member?.isSelf

  const save = () => {
    const fields = {
      relationship: isSelf ? 'You' : relationship,
      name: name.trim(),
      age,
      earns,
      occupation: earns ? occupation.trim() : '',
      livesElsewhere,
    }
    if (member) updateMember(member.id, fields)
    else addMember(fields)
    onClose()
  }

  const remove = () => {
    removeMember(member.id)
    onClose()
  }

  return (
    <div className="flex flex-col gap-5">
      {!isSelf && (
        <div>
          <label className="text-sm font-medium text-[var(--color-ink)]">
            Who are they to you?
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => (
              <Chip key={r} selected={relationship === r} onClick={() => setRelationship(r)}>
                {r}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Their name"
      />

      <LabeledSlider label="Age" value={age} min={0} max={100} onChange={setAge} />

      <div>
        <label className="text-sm font-medium text-[var(--color-ink)]">
          {isSelf ? 'Do you earn?' : 'Do they earn?'}
        </label>
        <div className="mt-1.5">
          <Segmented
            options={[
              { value: true, label: 'Earns' },
              { value: false, label: 'Not right now' },
            ]}
            value={earns}
            onChange={setEarns}
          />
        </div>
        <Whisper>So the advisor knows whose income the family leans on.</Whisper>
      </div>

      {earns && (
        <TextField
          label="What do they do?"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          placeholder="e.g. Teacher, runs a shop…"
        />
      )}

      <div>
        <Chip selected={livesElsewhere} onClick={() => setLivesElsewhere(!livesElsewhere)}>
          Lives in another city
        </Chip>
        <Whisper>Common and money-relevant: rent in one city, family in another.</Whisper>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <PrimaryButton disabled={!name.trim() || (!isSelf && !relationship)} onClick={save}>
          {member ? 'Save' : 'Add to family'}
        </PrimaryButton>
        {member && !isSelf && (
          <GhostButton className="text-[var(--color-rose)] hover:text-[var(--color-rose)]" onClick={remove}>
            Remove from family
          </GhostButton>
        )}
      </div>
    </div>
  )
}
