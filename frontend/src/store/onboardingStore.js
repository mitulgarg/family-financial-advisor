import { create } from 'zustand'

// UI-only onboarding draft. Nothing here calls the backend, the draft lives
// in localStorage until the data milestone wires real endpoints.

const STORAGE_KEY = 'onboardingDraft'

export const PHASES = ['who', 'goals', 'money', 'check']

const EMPTY_DRAFT = {
  household: { city: '', spend: null, whoPays: [] },
  members: [], // { id, name, relationship, age, earns, occupation, livesElsewhere, isSelf, moneyComfort }
  progress: {}, // memberId -> { goals: bool, money: bool, check: bool }
  goals: {}, // memberId -> [ { id, title, bucket, suggestionKey, amount, notSure } ]
  // memberId -> { incomes: [{key,label,amount,cadence}], loans: [{key,label,emi,remaining}],
  //               assets: [{key,label,amount}], emergencyFund, health: {covered,cover},
  //               term: {covered,cover} }
  finances: {},
  checks: {}, // memberId -> { answers: {scenarioKey: optionKey}, note: '' }
  whoDone: false,
}

const newGoalId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const readDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT
  } catch {
    return EMPTY_DRAFT
  }
}

const writeDraft = (draft) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    /* ignore, localStorage unavailable (private mode, SSR, etc.) */
  }
}

const slugify = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'member'

const uniqueId = (name, members) => {
  const base = slugify(name)
  let id = base
  let n = 2
  while (members.some((m) => m.id === id)) {
    id = `${base}-${n}`
    n += 1
  }
  return id
}

// Apply a patch, then mirror the persisted slice of state to localStorage.
const persist = (set, get, patch) => {
  set(patch)
  const { household, members, progress, goals, finances, checks, whoDone } = get()
  writeDraft({ household, members, progress, goals, finances, checks, whoDone })
}

export const useOnboardingStore = create((set, get) => ({
  ...readDraft(),

  // Navigation (session-only, not persisted).
  route: null, // null | 'hub' | 'phase'
  activePhase: null, // one of PHASES while route === 'phase'
  activeMemberId: null,

  openHub: () => set({ route: 'hub', activePhase: null, activeMemberId: null }),

  openPhase: (phase, memberId = null) =>
    set({ route: 'phase', activePhase: phase, activeMemberId: memberId }),

  exitOnboarding: () =>
    set({ route: null, activePhase: null, activeMemberId: null }),

  addMember: (fields) => {
    const members = get().members
    const member = {
      earns: false,
      occupation: '',
      livesElsewhere: false,
      isSelf: false,
      moneyComfort: null,
      ...fields,
      id: uniqueId(fields.name, members),
    }
    persist(set, get, { members: [...members, member] })
    return member.id
  },

  updateMember: (id, fields) => {
    const members = get().members.map((m) =>
      m.id === id ? { ...m, ...fields } : m,
    )
    persist(set, get, { members })
  },

  removeMember: (id) => {
    const members = get().members.filter((m) => m.id !== id)
    const progress = { ...get().progress }
    delete progress[id]
    const goals = { ...get().goals }
    delete goals[id]
    const finances = { ...get().finances }
    delete finances[id]
    const checks = { ...get().checks }
    delete checks[id]
    const whoPays = get().household.whoPays.filter((m) => m !== id)
    persist(set, get, {
      members,
      progress,
      goals,
      finances,
      checks,
      household: { ...get().household, whoPays },
    })
  },

  setHousehold: (fields) => {
    persist(set, get, { household: { ...get().household, ...fields } })
  },

  markWhoDone: () => persist(set, get, { whoDone: true }),

  markPhaseDone: (memberId, phase) => {
    const prev = get().progress[memberId] || {}
    persist(set, get, {
      progress: { ...get().progress, [memberId]: { ...prev, [phase]: true } },
    })
  },

  addGoal: (memberId, fields) => {
    const goal = {
      id: newGoalId(),
      suggestionKey: null,
      amount: null,
      notSure: false,
      ...fields,
    }
    const list = get().goals[memberId] ?? []
    persist(set, get, { goals: { ...get().goals, [memberId]: [...list, goal] } })
    return goal.id
  },

  updateGoal: (memberId, goalId, fields) => {
    const list = (get().goals[memberId] ?? []).map((g) =>
      g.id === goalId ? { ...g, ...fields } : g,
    )
    persist(set, get, { goals: { ...get().goals, [memberId]: list } })
  },

  removeGoal: (memberId, goalId) => {
    const list = (get().goals[memberId] ?? []).filter((g) => g.id !== goalId)
    persist(set, get, { goals: { ...get().goals, [memberId]: list } })
  },

  // Shallow-merge a patch into one member's finances object.
  updateFinances: (memberId, patch) => {
    const current = get().finances[memberId] ?? {}
    persist(set, get, {
      finances: { ...get().finances, [memberId]: { ...current, ...patch } },
    })
  },

  // Shallow-merge a patch into one member's gut-check record.
  updateCheck: (memberId, patch) => {
    const current = get().checks[memberId] ?? {}
    persist(set, get, {
      checks: { ...get().checks, [memberId]: { ...current, ...patch } },
    })
  },
}))
