# Onboarding — Build Plan

Phased, low-friction onboarding for the family finance advisor. Discussed and
locked 2026-06-10. Companion to `docs/MEMORY_DATA_MODEL.md` (§11 onboarding →
file mapping); this doc owns the UX content and build order.

## Principles

1. **A good-enough start, not a census.** Every screen is skippable; the
   conversational extractor backfills anything missed later. We optimise for
   the most meaningful facts, fast.
2. **Taps and sliders over typing.** The only typed fields in the whole flow:
   names, occupation, "type your own" goal, and the final free-text note.
3. **India-everyday words only.** EMI / SIP / FD / PF stay; "liabilities",
   "portfolio", "risk tolerance", "asset allocation" never appear on screen.
4. **Recurring microcopy:** *"Rough numbers are fine — you can correct
   anything later just by mentioning it in chat."* Plus a one-line "why we
   ask" whisper under every question.
5. **Mobile-first, beautiful on both.** Single-column thumb flow on mobile;
   two-pane on desktop (inputs left, live visual right). 44px minimum tap
   targets.
6. **No fixed "who onboards".** A family setup hub with per-member completion
   cards — a solo finance-keeper can fill everyone, or each member does their
   own card. Nothing gated, nothing expires.
7. **Authority is respected.** All form writes go through existing writers at
   `onboarding_form` / `onboarding_quiz` authority; statement upload writes at
   `document_upload` authority **only after** an explicit review-and-confirm
   screen.

## The flow

| Step | Screen(s) | Writes |
|---|---|---|
| **Hub** | Member cards w/ completion chips + "≈3 min" promise + share links | — |
| **1. Family tree** | Animated tree builder: relationship chips, name, age slider, earns toggle; occupation (earners), home city + lives-elsewhere, money-comfort (self only) | `profile.md` (each member), `family/household.md` |
| **2. Goals** | 3 time-bucket screens ("next 1–2 yrs / 3–5 yrs / further out") w/ example chips + own-words input; animated summary timeline | `goals.md` |
| **3. Money** | Per-member income; household spend + who-pays; loans (EMI + remaining); savings/assets incl. emergency fund w/ months-of-spending feedback; insurance status; upload zone | `finances.md`, `portfolio_summary.md`, `household.md` |
| **4. Gut check** | 3 full-screen scenario taps (drop reaction, sure-vs-flip, reach test) | first `risk_profile.md` entry |
| **5. Anything else** | Free textarea → saved verbatim + piped through the extraction pipeline | routed by extractor |

Time: ~6–8 min first member (incl. tree), ~3 min each additional member.

> **Build order note (2026-06-11):** building UI-first. Each phase ships as
> frontend with a localStorage draft; all backend write-through subtasks
> (1.1, 2.1, 3.1, 4.1, 5.1, 5.3, M6 writes) land together in a final data
> milestone. Design system (warm dark + pastels, Outfit, Phosphor, PRODUCT.md
> / DESIGN.md) shipped 2026-06-11 with the em-dash guard (`npm run check:copy`
> + `backend/text_utils.py`).

---

## M1 — Shell & family hub

Foundation everything else mounts on. App is usable after this: hub +
navigation exist, phases are stubs.

- [ ] 1.1 Backend: onboarding **status endpoint** — per-member completion
      state (which phases done) derived from memory files; TDD.
- [x] 1.2 Frontend onboarding state: Zustand slice + step navigation
      (next/back/skip), per-phase save-on-complete, resume mid-flow.
- [x] 1.3 Hub screen: one card per member showing completion chips
      (Goals ✓ · Money ✓ · Gut check —) + time promise. *(Shipped as roster
      rows on one surface, not a card grid, per design system.)*
- [ ] 1.4 Share: deep link into a member's remaining flow
      (`/onboard?member=…`) with copy-link + WhatsApp share button.
      *(UI shipped; deep link currently opens the hub, not the member's
      remaining flow. Finish with the data milestone.)*
- [ ] 1.5 First-run detection: no household roster → land on tree builder
      instead of chat. *(In-onboarding first-run hero shipped; auto-landing on
      app open needs the backend status check. Hub reachable via header button
      or share link meanwhile.)*
- [x] 1.6 Design tokens + motion foundation: phase accent colors, screen
      transition animations, progress indicator (Who → Goals → Money → Check).

## M2 — Family tree builder (Phase 1: Who)

The opening moment — visual, smooth, dynamic.

- [ ] 2.1 Backend: household + member endpoints → `profile.md` per member +
      `household.md` roster via existing writers at onboarding authority; TDD.
- [x] 2.2 Tree canvas: starts with "you", tap + to bloom a new card from the
      parent node, connector draws itself, layout re-balances with spring
      animation. *(Central spine connector for now; per-node drawn connectors
      are an M7 polish candidate.)*
- [x] 2.3 Person card inputs: relationship chips (Father/Mother/Spouse/…),
      name field, age slider, "Earns / Doesn't earn right now" toggle.
- [x] 2.4 Conditional extras: occupation field (earners only), home city
      (household-level, asked once) + "lives elsewhere" override per member,
      money-comfort question (self only: starting out / basics / confident).
- [x] 2.5 Edit + remove a member with re-layout animation; tree state
      round-trips to backend. *(localStorage round-trip until the data
      milestone.)*
- [x] 2.6 Phase completion → hub card updates; tree renders read-only on
      revisit. *(Deviation: tree stays editable on revisit, which is friendlier
      than read-only.)*

## M3 — Goals (Phase 2: time buckets)

- [ ] 3.1 Backend: goals endpoint → `goals.md` (title, target, horizon,
      ACTIVE) allowing "not sure yet" targets; TDD.
- [x] 3.2 Bucket screen ×3: "next 1–2 yrs" (phone, trip, bike, clear credit
      card) / "3–5 yrs" (wedding, car, home down payment) / "further out"
      (kids' education, home, retirement) — example chips, tap to add.
- [x] 3.3 "Type your own — in your words" input on every bucket; typed goals
      become cards like any other.
- [x] 3.4 Per-goal detail: "roughly how much?" slider + "not sure — help me
      figure it out" option; whisper-line framing on first screen ("money for
      soon stays safe, money for later can grow"). *(Log-scale rupee slider
      with category-apt defaults; untouched defaults are never recorded.)*
- [x] 3.5 Closing payoff: all goals assemble onto a read-only animated
      timeline (soon → 10+ yrs).
- [x] 3.6 Write-through + hub completion; goals editable on revisit.
      *(localStorage write-through until the data milestone.)*

## M4 — Money picture (Phase 3)

- [ ] 4.1 Backend: finances endpoints — income/loans/assets per member,
      household spend + who-pays, insurance status → `finances.md`,
      `portfolio_summary.md`, `household.md`; add small "Protection" section
      to finances spec (overrides §13 deferral at status level only); TDD.
- [x] 4.2 "What comes in": income source chips (Salary/Business/Rent/Pension/
      Freelance) + non-linear ₹ slider with tap-to-edit value + monthly/yearly
      toggle. *(Tap-to-edit numeric entry not built; slider + live readout
      only. Revisit in polish if sliding to exact values feels fiddly.)*
- [x] 4.3 "What goes out": one rough household-spend slider + "who takes care
      of these?" member multi-select + loan chips (Home/Car/Personal/Education/
      Credit card) each w/ EMI + roughly-remaining. *(Split into two screens:
      household spend + who-pays, then loans.)*
- [x] 4.4 "What you've saved or own": asset class chips (Bank & FDs / MF &
      SIPs / Stocks / Gold / Property / PF) + dedicated emergency-fund question
      with live "≈ N months of your family's spending" feedback.
- [x] 4.5 Protection: "would an insurance pay if [name] were hospitalised?"
      (per member) + "is there a term plan that pays the family?" (earners
      only) — yes/no + rough cover each.
- [x] 4.6 Live composition visual assembling as items are added (beside the
      form on desktop, above it on mobile) + disabled upload-zone slot
      (enabled in M6). *(Shipped as the asset composition strip on the savings
      screen; the desktop two-pane layout moves to M7 polish.)*

## M5 — Gut check + final note (Phase 4 & close)

- [ ] 5.1 Backend: quiz endpoint → first `risk_profile.md` revealed-stance
      entry (`source: onboarding_quiz`, answers never self-labels); TDD.
- [x] 5.2 Three full-screen scenarios, one big tap each: the ₹1L→₹80k drop,
      guaranteed ₹50k vs 50-50 ₹1.2L, the "touch it tomorrow" reach test —
      with "best answered by [name] themselves" note. *(Tap auto-advances;
      the chosen option key is stored, never a self-label.)*
- [ ] 5.3 Backend: final-note endpoint — save verbatim + run through the
      existing extraction pipeline at onboarding authority; TDD.
- [x] 5.4 "Anything else your advisor should know?" textarea screen with
      example placeholder text. *(Saved per member in the localStorage draft
      until the data milestone.)*
- [x] 5.5 Completion screen (celebratory, summarises what the advisor now
      knows) + hub all-done state → hand-off into first chat. *(Hub "All set"
      state already existed; chat hand-off is the hub close button until the
      data milestone.)*
- [ ] 5.6 Manual end-to-end pass of the entire flow on phone + desktop.

## M6 — Statement upload

- [ ] 6.1 Backend: upload endpoint accepting xlsx/pdf, size/type validation,
      temp storage.
- [ ] 6.2 LLM extraction of holdings from the statement into a structured
      draft (no writes yet).
- [ ] 6.3 Review-and-confirm screen: "here's what we found" as editable rows;
      user can fix/remove before anything is saved.
- [ ] 6.4 Confirm → `portfolio_summary.md` + first `portfolio_snapshots.md`
      entry at `document_upload` authority; TDD on the write path.
- [ ] 6.5 Failure paths: unreadable file, partial parse, nothing found — clear
      user-facing messages, nothing written silently.
- [ ] 6.6 Enable the upload zone inside M4's savings screen.

## M7 — Polish & verification

- [ ] 7.1 Motion/microinteraction pass: tree bloom, chip selection, slider
      feel, phase transitions.
- [ ] 7.2 Both-breakpoint beauty audit (phone + desktop) — spacing, type
      scale, the two-pane desktop layout.
- [ ] 7.3 Accessibility review (a11y-architect agent) on the custom controls:
      sliders, chips, tree canvas, tap cards — keyboard + screen reader.
- [ ] 7.4 Jargon sweep of all copy against principle 3.
- [ ] 7.5 Playwright E2E: full onboarding journey (tree → goals → money →
      quiz → note) + share-link deep entry.
- [ ] 7.6 Docs: update `MEMORY_DATA_MODEL.md` §11 (insurance status, who-pays,
      final note) + README onboarding section.

---

## Parked / explicitly out of scope

- Real invite links + auth (hosted multi-family future; v1 share = deep link
  on a reachable app).
- Premiums, policy numbers, providers (insurance stays status-only; §13
  deferral otherwise intact).
- Itemised household expenses (one rough total; chat refines forever).
- Asking who-depends-on-whom directly (derived from earning status + ages +
  who-pays).
- Supermemory as memory backend (evaluated 2026-06-10 — no provenance/
  authority model; revisit as optional episodic-recall add-on post
  open-source).
