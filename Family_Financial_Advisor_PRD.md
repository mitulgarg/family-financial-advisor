# Family Financial Advisor — Product Requirements Document

> **Version**: 1.2 (MVP)
> **Last updated**: May 19, 2026
> **Status**: Pre-development
> **Author**: Vedant Shah
> **Changelog**:
> - v1.2 — Conversation lifecycle clarified: memory writes happen at session-end only (in-session, the agent reads from working transcript context). Session boundary = 30-min idle OR explicit close (no midnight rule). Full session transcripts stored as JSONL per session. Cross-member write isolation enforced at the writer layer. Knowledge graph and SQLite both evaluated and rejected for v0.1 (see Decisions #23, #24). Added retirement target fields to `profile.md`. Added `priority` to recommendation schema. Extended `calendar.md` to cover dated future state changes (not just cyclical). Queued v0.2 skills (retirement, education, scenario modeling, comprehensive plan review).
> - v1.1 — Memory taxonomy revised. Added 8 new categories (`legal_status`, `assumptions`, `family/inferences`, `agent_notes`, `insurance`, `tax`, `liabilities`, `calendar`). Reorganized into three access tiers (always-loaded / intent-gated / tool-fetched). Added universal dating convention. Dropped `financial_state.md` as a stored file (now computed). Insurance extracted from `portfolio_summary.md`. Recommendation schema gained `source` and `assumptions_at_time`. `active_tasks.md` deferred to v0.2.

---

## Table of Contents

1. [Product Vision & Core Thesis](#1-product-vision--core-thesis)
2. [What This Product Is NOT](#2-what-this-product-is-not)
3. [Target Users](#3-target-users)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Memory System](#5-memory-system)
6. [Agent Pipeline](#6-agent-pipeline)
7. [Advisory Framework (Skills)](#7-advisory-framework-skills)
8. [Data Sources & Integrations](#8-data-sources--integrations)
9. [Onboarding Flow](#9-onboarding-flow)
10. [Chat Interface](#10-chat-interface)
11. [Dashboard](#11-dashboard)
12. [Privacy & Security Model](#12-privacy--security-model)
13. [Guardrails & Validation](#13-guardrails--validation)
14. [Periodic Reviews & Action Ledger](#14-periodic-reviews--action-ledger)
15. [Tech Stack](#15-tech-stack)
16. [Project File Structure](#16-project-file-structure)
17. [MVP Scope & Boundaries](#17-mvp-scope--boundaries)
18. [Future Roadmap](#18-future-roadmap)
19. [Key Design Decisions Log](#19-key-design-decisions-log)
20. [Open Questions](#20-open-questions)

---

## 1. Product Vision & Core Thesis

### Vision

An AI-powered conversational financial advisor that treats the family as a single, interconnected financial entity — not a collection of individuals. It maintains persistent memory of every family member's profile, goals, portfolio, and financial context, and uses that understanding to help the family make better financial decisions over time.

### Core Thesis

**Not all financial decisions are family decisions — but the ones that matter most almost always are.**

Reallocating a SIP from one fund to another, or renewing an FD at a better rate, are individual decisions where family context adds nothing. But the decisions that change a family's financial trajectory — the primary earner considering a career change, whether to prepay the home loan or invest the surplus, overlapping education funding needs, retirement planning with dependents — these require seeing interdependencies that no individual-focused tool can reveal.

In the Indian context, these interdependencies run deeper than most markets:
- Children are financially supported well into their mid-20s
- Parents are financially supported in old age (no meaningful social safety net)
- Marriage expenses are family commitments
- Property is frequently jointly owned or pooled for
- Medical emergencies for one member become financial emergencies for everyone
- A single earner's career risk is the entire family's financial risk

### The Product Operates at the Decision Layer

The litmus test for what's in scope: **if a decision changes the family's net worth trajectory or cash flow structure meaningfully, it belongs in this product.** If it's about categorising where last month's salary went, it doesn't.

The agent is intelligent enough to know *when* to activate the family lens. It uses family context when it's relevant and ignores it when it's not. A question about "which index fund is better" gets a direct answer. A question about "should I increase my SIP by ₹20K" gets an answer that considers the family's liquidity, upcoming commitments, and other members' situations — if those factors are relevant.

---

## 2. What This Product Is NOT

These distinctions are critical and must be reflected in all agent responses, marketing, and system prompt design.

| This product IS | This product IS NOT |
|---|---|
| A financial decision support tool | A stock/fund recommendation engine |
| A family-context-aware advisor | An individual portfolio tracker |
| An analysis and education platform | A transaction execution platform |
| A persistent, memory-rich companion | A one-shot financial plan generator |
| A decision-layer tool | An expense tracker or budgeting app |
| A category recommender (e.g., "short-term debt fund") | A product recommender (e.g., "buy HDFC Short Term Debt Fund") |

### Regulatory Positioning

The agent **never** recommends specific securities, mutual fund schemes, or insurance products by name. It recommends **categories** (equity, debt, hybrid, liquid, term insurance, health insurance) and explains the reasoning. This keeps the product outside SEBI's definition of "investment advice" (which requires RIA registration) and IRDAI's regulations on insurance distribution.

The agent always includes reasoning with recommendations, uses appropriately uncertain language ("historically," "typically," "in most cases"), and explicitly suggests consulting a SEBI-registered advisor or CA for complex tax/estate/NRI situations.

---

## 3. Target Users

### Primary User: The Family Head / Family CFO

- Typically the eldest earning member or the most financially literate person in the family
- Currently manages (or worries about) everyone's finances informally
- Wants visibility into the family's combined financial picture
- Uses both the **chat interface** and the **dashboard**
- Has admin-level access: can see and edit the agent's memory, manage family members, review all profiles

### Secondary Users: Other Family Members

- Parents, siblings, spouse, adult children
- Varying levels of financial literacy (from "what is an SWP?" to active investors)
- Interact primarily through the **chat interface only**
- Ask questions in plain language, expect clear answers
- May not engage daily — but will engage when they have a financial question or during periodic reviews
- Each has their own private conversation history

### First User: Vedant's Family (MVP)

The MVP is built for and validated with Vedant's own family:
- Vedant (24, software engineer, aggressive investor, the family CFO)
- Father (age TBD, approaching retirement, portfolio details TBD)
- Mother (conservative, primarily FDs and savings, asks "where should I put ₹X")
- Sibling (if applicable, TBD)

This is critical context: the MVP does not need to handle onboarding for strangers, account creation flows, or multi-tenancy. It is a single-family, locally-hosted application.

---

## 4. System Architecture Overview

### Deployment Model (MVP)

**Hybrid local-first architecture:**
- All financial data, memory files, profiles, and conversation history stored **locally** on Vedant's machine (or home server)
- LLM API calls (Claude/GPT) for the conversation and classification layers go to external APIs
- Financial data is **anonymised** before being sent to the LLM (see Section 12)
- No cloud database, no cloud storage, no user accounts beyond local auth

**Later (post-MVP):** Optionally deployable to Cloud Run or similar, with encrypted cloud storage and proper multi-tenant auth.

### High-Level Component Map

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                      │
│                                                      │
│   ┌──────────────────┐    ┌──────────────────────┐   │
│   │  Chat Interface  │    │  Dashboard (Family    │   │
│   │  (Web — all      │    │  Head only)           │   │
│   │   members)       │    │                       │   │
│   └────────┬─────────┘    └──────────┬────────────┘   │
└────────────┼─────────────────────────┼────────────────┘
             │                         │
             ▼                         ▼
┌─────────────────────────────────────────────────────┐
│                    AGENT CORE                        │
│                                                      │
│   ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│   │ Intent      │  │ Prompt   │  │ LLM           │  │
│   │ Classifier  │──│ Assembler│──│ Orchestrator  │  │
│   │ (Flash/     │  │          │  │ (Claude API   │  │
│   │  Haiku)     │  │          │  │  + tool use)  │  │
│   └─────────────┘  └──────────┘  └───────┬───────┘  │
│                                          │          │
│   ┌──────────────┐  ┌────────────────┐   │          │
│   │ Code-based   │  │ Financial      │◄──┘          │
│   │ Guardrails   │  │ Functions      │              │
│   │ (Validator)  │  │ (Deterministic)│              │
│   └──────────────┘  └────────────────┘              │
│                                                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                    DATA LAYER                        │
│                                                      │
│   ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────┐ │
│   │ Memory   │  │ Portfolio │  │ Kite   │  │Sched-│ │
│   │ Files    │  │ Cache    │  │ MCP    │  │uler  │ │
│   │ (Local   │  │ (Local)  │  │        │  │(Cron)│ │
│   │  MD)     │  │          │  │        │  │      │ │
│   └──────────┘  └──────────┘  └────────┘  └──────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 5. Memory System

### Design Principles

- Memory is stored as **local markdown files**, organized by family and member
- Markdown is chosen because it's human-readable, editable, version-controllable (git), and trivially loadable into LLM context
- For a single family of 3-4 members, the total memory corpus will be **well under 30K tokens** — small enough that selective loading is feasible without vector search/RAG
- **No RAG for MVP.** File selection is handled by the intent classifier + prompt assembler + agent-invoked memory tools
- Memory is organized into **three access tiers**:
  - **Tier 1 — Always-Loaded**: inlined into every prompt (~1.8K tokens combined budget)
  - **Tier 2 — Intent-Gated**: loaded by the prompt assembler when the classifier flags them
  - **Tier 3 — Tool-Fetched**: the agent invokes a memory tool mid-turn when it realizes more context is needed
- Memory is updated after conversations, not during (async, post-response)
- **All entries are dated** (ISO 8601: YYYY-MM-DD). The agent uses dates to reason about freshness, context, and temporal relevance — memory without dates is half-blind

### Dating Convention

Every meaningful entry in every memory file is dated. This is non-negotiable — temporal context is what lets the agent reason about whether a fact is still load-bearing.

- **Append-only logs** (recommendations, life events, conversations, agent notes): each entry has a date header (e.g., `### 2026-05-18 | Surplus Allocation`)
- **Slowly-changing fields** (profile values like income band, risk profile, EMI amount): updates carry an inline change comment with date and old value, e.g., `income_band: ₹15-25L  <!-- was ₹5-10L until 2026-04-01, raise at MontyCloud -->`. The canonical record of the change lives in `life_events.md`; the inline comment is for in-context recall.
- **State files** (assumptions, calendar, legal status, tax): each fact is timestamped with `last_reviewed:` and `set_on:` fields where applicable
- **Inferences**: retain `date first noted` and `last reinforced` fields
- **Recommendations**: stamp the `assumptions_at_time` used at recommendation time so they can be revisited intelligently if assumptions change

### Memory Categories

The 19 memory categories below are organized by access tier. Each Tier 1 file has a tight token budget — the always-loaded total must stay under ~1.8K tokens.

---

### Tier 1 — Always-Loaded (combined budget ~1.8K tokens)

#### 1. `family/context.md`

Family structure, relationships, and roles.

- Family structure: who is who, relationships (e.g., "Vedant is Mom's son, Dad's son")
- Each member's name, age, role in family (earner/dependent/retired)
- Each member's risk profile (with date set; changes carry inline change comments)
- Income bands for earners (not exact salary — bands like ₹10-20L)
- Who depends on whom financially
- Family-level notes (e.g., "single income family" or "both parents working")

Size target: **300-500 tokens**

#### 2. `family/legal_status.md` *(new)*

Regulatory and legal facts that silently invalidate advice if wrong. Rarely changes, but breaks everything if wrong — ideal always-loaded candidate.

```markdown
- Residency status (per member, last reviewed 2026-05-18):
  - Vedant — Resident; Dad — Resident; Mom — Resident
- HUF existence: No  <!-- considered but not formed; last revisited with CA 2025-12 -->
- Nominees:
  - Vedant's demat (Zerodha): Mom (set 2024-03-01)
  - Dad's PPF: Mom (set 2019)
  - Mom's HDFC FD: Vedant (set 2025-06)
- PAN/Aadhaar linkage confirmed (all members): 2024-08
- KYC status across AMCs: Vedant — complete; Mom — refresh needed at one AMC
- Power of attorney for parents: none in place
- Wills: none in place — flagged 2026-04-15
```

Size target: **150-300 tokens**

#### 3. `family/assumptions.md` *(new)*

Single source of truth for assumptions baked into agent reasoning. Versioned. Recommendations stamp the `assumptions_at_time` used so they can be revisited intelligently if assumptions change.

```markdown
- equity_return: 11% (long-term, 7Y+ horizon) — set 2026-01-15, last reviewed 2026-05-18
- debt_return: 7% — set 2026-01-15
- inflation_general: 6% — set 2026-01-15
- inflation_education: 10% — set 2026-01-15
- inflation_medical: 12% — set 2026-01-15
- salary_growth: 8% — set 2026-01-15
- life_expectancy: 85 — set 2026-01-15
```

Size target: **100-200 tokens**

#### 4. `family/inferences.md` *(new)*

Cross-member behavioral patterns. Same schema as per-member inferences, but at family level. MED/HIGH confidence above the divider (always loaded). LOW confidence below the divider, tool-fetched.

```markdown
## Active (MED/HIGH)
- Major financial decisions need both parents present — verbal "let me think about it" usually means "I want to discuss with spouse" [HIGH, reinforced 4x, first noted 2026-02-10, last reinforced 2026-05-12]
- Family avoids financial discussions during festival weeks (Diwali, weddings) [MED, first noted 2025-11-05]

## Pending (LOW — tool-fetched)
...
```

Size target: **100-200 tokens for active section**

#### 5. `family/life_events.md` — condensed timeline

The condensed timeline (last 5-7 events as one-liners) is always-loaded. The full append-only log is Tier 3 (tool-fetched).

```markdown
## Recent (last 5-7 events)
- 2026-06-XX | Vedant started job at MontyCloud (CTC ~₹20L)
- 2025-11-XX | Mom's FD matured (₹5L, parked in savings pending decision)
- 2025-09-XX | Dad retired from [employer]
- 2024-12-XX | Home loan part-prepayment (₹3L, EMI reduced from ₹45K to ₹38K)
- 2024-03-XX | Sister's wedding

## Full log
[Tool-fetched via recall_life_events()]
```

Size target: **150 tokens for condensed view**

#### 6. `working/agent_notes.md` *(new)*

Negative constraints, retracted advice, do-not-repeat corrections. Always loaded so the agent never reissues a recanted suggestion.

```markdown
- 2026-04-12 | DO NOT recommend ELSS to Mom (age 58, lock-in mismatch). Suggested once, corrected by family.
- 2026-02-08 | Mom prefers concrete examples with her own numbers over abstract percentages. Confirmed 5x.
- 2026-01-20 | Avoid recommending direct stocks to Dad — he's retired, capital preservation > growth.
```

Size target: **100-200 tokens**

#### 7. `members/{active}/profile.md`

Identity + headline facts only. Account inventories and investment platforms go to `portfolio_summary.md` — keep this file tight.

- Full name, age, relationship to family head
- Employment status, employer, income band (with change history inline)
- Risk profile (with date set and change history inline)
- Financial literacy level (low/medium/high) — inferred by the agent, affects response complexity
- **For earners**: `retirement_target_age` (e.g., 55) and `retirement_corpus_target` (e.g., ₹5Cr). These power 30%+ of conversations (retirement projection, SIP sizing, surplus prioritisation) — promote to structured fields rather than burying in goals
- 2-3 standout circumstances (e.g., "supports mother with ₹15K/month since 2024-03")

Size target: **150-250 tokens per member**

#### 8. `members/{active}/inferences.md`

Per-member soft observations. MED/HIGH above divider (always loaded), LOW below (tool-fetched).

```markdown
## Active (MED/HIGH)
- Mom says "moderate" risk but rejects every equity suggestion → actual conservative [HIGH, reinforced 3x, first noted 2025-08-15, last reinforced 2026-04-22]
- Dad anxious about market after watching business news → respond with calm, data-driven framing [MED, reinforced 2x, first noted 2026-01-10]

## Pending (LOW — tool-fetched)
...
```

Each inference carries: the observation, confidence (LOW/MED/HIGH), reinforcement count, date first noted, date last reinforced.

**Pruning policy**: LOW-confidence inferences not reinforced in 3 months are removed during periodic maintenance.

Size target: **100-200 tokens for active section per member**

#### Family aggregate financial state — *computed, not stored*

Previously planned as `family/financial_state.md` (auto-generated). Instead, **computed at prompt-assembly time** by aggregating member data:

- Combined family net worth (sum of portfolios + non-brokerage assets − liabilities)
- Combined asset allocation breakdown
- Emergency fund status (months of family expenses)
- Combined monthly income and outflows
- Total active EMIs across the family
- Overall posture flag

Computing on-demand removes a sync-bug surface (stale aggregate vs. fresh member data). Always inlined as part of Tier 1 context.

Computed size: **200-400 tokens**

---

### Tier 2 — Intent-Gated

These files are loaded by the prompt assembler when the intent classifier flags them as relevant.

#### 9. `members/{name}/goals.md`

List of goals, each dated (first noted, last updated), with:
- Goal description (free text, e.g., "Kitchen renovation")
- Target amount (if known; can be "TBD")
- Timeline (e.g., "8 months", "by 2028", "before retirement")
- Priority (high/medium/low)
- Current progress: amount earmarked, how it's invested, whether on track
- Status: active / achieved / abandoned / paused
- Source: explicitly stated by member vs. inferred from conversation (flagged as such)

Goals are **not** created through a formal UI form. They emerge from conversations and are extracted by the agent. The agent confirms casually ("Roughly how much are you thinking for the renovation? I'll keep that in mind.") and adds the goal to this file.

The family head can view and edit all goals via the dashboard.

When loaded: planning, allocation, review, goal-related intents.

Size target: **200-500 tokens per member** (varies with number of goals)

#### 10. `members/{name}/portfolio_summary.md`

Holdings, SIPs, allocation, non-brokerage assets. **Insurance is extracted to its own file** (see #11) — insurance is risk transfer, not an asset.

- Last refresh timestamp
- Total portfolio value
- Asset allocation breakdown (equity/debt/gold/cash with percentages)
- Top holdings (fund names, amounts, percentage of portfolio)
- Active SIPs (fund, amount, frequency, start date)
- Notable observations: concentration risk, overlap with other family members, drift from target allocation
- Non-brokerage assets: FDs (bank, amount, maturity date), PPF (vintage, current balance), NPS, gold, real estate

This file is **partially auto-generated** from Kite MCP data (holdings, SIPs) and partially conversation-derived (FDs, real estate). The auto-generated portion is refreshed on each Kite sync. The conversation-derived portion persists across refreshes.

When loaded: portfolio review, allocation, surplus intents.

Size target: **300-500 tokens per member**

#### 11. `members/{name}/insurance.md` *(new — extracted from portfolio_summary)*

Insurance has its own lifecycle (renewal dates, sum assured adequacy, nominees, claim history) that doesn't fit the portfolio schema. Separated to avoid mixing into net-worth calculations.

```markdown
### Health insurance
- Family floater: HDFC ERGO Optima Restore, ₹10L cover, premium ₹28K/year, renewal 2026-08-15
- Vedant employer cover: ₹5L (Star Health via MontyCloud, ends with employment)
- Dependents covered: Vedant, Mom, Dad

### Term life
- Vedant: ₹1Cr, HDFC Click2Protect, premium ₹12K/year, started 2024-06, term 30Y
- Dad: NONE — flagged 2026-02-10, still pending
- Mom: N/A (not earning)

### Other
- Personal accident: none
```

For family-floater health policies that cover everyone, the file may live at `family/insurance.md` instead with the same schema.

When loaded: insurance, risk, review intents.

Size target: **200-400 tokens**

#### 12. `members/{name}/tax.md` *(new)*

Per-member tax state. In the Indian context, tax drives most allocation decisions (ELSS vs PPF vs NPS, regime choice, LTCG harvesting windows).

```markdown
- Current FY regime: New (chosen 2025-04-XX, evaluated against old — saves ₹X)
- 80C utilization FY2025-26: ₹1.2L of ₹1.5L (EPF auto: ₹95K, ELSS SIP: ₹25K)
- 80D utilization FY2025-26: ₹25K of ₹25K (health insurance premium)
- 80CCD(1B) utilization: ₹0 of ₹50K — opportunity flagged
- Capital gains FY2025-26: ₹40K STCG (unredeemed booked), ₹0 LTCG
- TDS status: on track, no refund pending
- ITR filing: ITR-2 (capital gains), self-filed via Cleartax
- Last 3 FY filed income: 2024-25 ₹12L, 2023-24 ₹8L, 2022-23 ₹6.5L
- CA involved: No (self-files)
- Last reviewed: 2026-04-01
```

When loaded: tax, allocation, year-end planning, surplus intents.

Size target: **200-400 tokens per member**

#### 13. `family/liabilities.md` *(new)*

Structured loan ledger. Family-level because joint home loans dominate; per-member sections inside if needed. The summary line in the family aggregate computation references this file; the detail lives here.

```markdown
### Home Loan (joint: Dad + Vedant)
- Lender: SBI
- Outstanding principal: ₹28L (as of 2026-05-01)
- Original sanction: ₹45L (2018-07-XX)
- Rate: 8.6% floating (last reset 2026-03)
- Tenure remaining: ~14 years
- EMI: ₹38K  <!-- was ₹45K until 2024-12, after ₹3L part-prepayment -->
- Prepayment penalty: None (floating)
- Tax benefit: Section 24 (₹2L interest), 80C (principal) — split between co-borrowers
- Collateral: Property at [address]

### Personal loans / Credit cards
- None outstanding (as of 2026-05-01)
```

When loaded: debt, prepayment, surplus allocation (priority waterfall), review intents.

Size target: **200-400 tokens**

#### 14. `family/calendar.md` *(new)*

Cyclical, dated, **and known-future-state-change** facts. Drives proactive nudges from the scheduler in v0.2.

Two sections:

**Cyclical** — recurring events with no end date:
```markdown
- Vedant bonus: typically March (FY end)
- Dad EPF year-end statement: April
- Advance tax dates: 15-Jun, 15-Sep, 15-Dec, 15-Mar
- Insurance renewals:
  - Health (family floater): 15-Aug
  - Term (Vedant): 22-June
- SIP step-up anniversary: Vedant — June
```

**Future state changes** — known one-time inflection points that affect projections:
```markdown
- 2026-11-XX | Mom's HDFC FD matures (₹5L) — already in surplus discussion
- 2032-07-XX | Home loan tenure ends (EMI of ₹38K frees up)
- 2030-XX-XX | Sister becomes financially independent (drop of ₹15K/month support)
- 2035-XX-XX | Dad's NPS annuity begins (~₹X/month, depends on corpus)
- 2040-XX-XX | Vedant target retirement age 55 (corpus target ₹5Cr)
```

These differ from `life_events.md` (which is events that *have* happened). Future state changes are **anticipated** events that should already shape long-horizon reasoning. When one materialises, it migrates from `calendar.md` to `life_events.md` with the same date.

When loaded: planning, review, year-end intents, retirement projection.

Size target: **200-400 tokens**

#### 15. `members/{name}/recommendations.md`

Append-only log of agent recommendations **and family-initiated decisions**. Schema:

```markdown
### 2026-05-18 | Surplus Allocation
- **Source**: AGENT_PROPOSED
- **Priority**: P2
- **Context**: Mom asked where to put ₹5L from matured FD
- **Recommendation**: Short-term debt fund (8-month horizon, kitchen renovation goal)
- **Reasoning**: Emergency fund adequate, no high-interest debt, conservative risk profile, 8-month timeline
- **Assumptions at time**: debt_return 7%, inflation_general 6%
- **Status**: PENDING
- **Follow-up date**: 2026-06-18

### 2026-03-10 | FD chosen over debt fund (family decision)
- **Source**: FAMILY_INITIATED
- **Priority**: P2
- **Context**: Dad chose to put ₹10L in FD instead of recommended short-term debt fund
- **Reasoning given**: "I don't trust mutual funds for safety money"
- **Status**: ACTED_ON
- **Implication**: Dad's actual risk appetite for safety money is FD-only — recorded in agent_notes.md
```

Status values: `PENDING` → `ACTED_ON` / `IGNORED` / `SUPERSEDED` / `CANCELLED`
Source values: `AGENT_PROPOSED` / `FAMILY_INITIATED`
Priority values: `P1` (high — emergency fund gap, insurance gap, high-interest debt) / `P2` (medium — surplus allocation, goal-aligned actions) / `P3` (low — optimisation, tax efficiency tweaks)

The agent updates status by comparing against portfolio data on refresh (e.g., if a new SIP appears after recommending one, mark as ACTED_ON) or from conversation (member says "I decided not to do that").

When loaded: reviews, follow-ups, consistency checks.

**Summarization policy**: When the log exceeds 30 entries (or ~3000 tokens), compress entries older than 3 months into a summary block at the top of the file, retaining the last 3 months in full detail.

Size target: **grows over time, 100-200 tokens per entry**

#### 16. Other members' `profile.md`

When the classifier flags `needs_family_context: true`, the other members' profiles are loaded for cross-member reasoning.

---

### Tier 3 — Tool-Fetched

The agent invokes memory tools mid-turn when it realizes deeper context is needed. Tools registered with the LLM:

| Tool | Purpose |
|---|---|
| `recall_conversation(member, date_range, query)` | Fetch older conversation summaries (beyond last 3-5 inlined) |
| `recall_life_events(date_range)` | Fetch full life events log (beyond condensed timeline) |
| `get_inferences(member, confidence_filter)` | Fetch LOW-confidence inferences below the divider |
| `search_recommendations(member, status, query, date_range)` | Filtered search of recommendations log |
| `get_portfolio_details(member, holding)` | Fetch per-holding detail beyond the portfolio summary |

#### 17. `members/{name}/conversations.md` — older entries

Last 3-5 session summaries inlined for continuity (Tier 1). Older summaries tool-fetched. Each summary 3-4 lines, dated and titled by member.

```markdown
### 2026-05-18 (Mom)
Mom asked about parking ₹5L from matured FD. Discussed kitchen renovation timeline (8 months).
Recommended short-term debt fund. She seemed hesitant about anything that isn't a bank product —
may need more education about debt fund safety in future conversations. No action taken yet.
```

**Summarization policy** (deferred to v0.2): When summaries exceed 5000 tokens, compress older summaries into quarterly summary blocks.

Size target: **50-100 tokens per session, grows over time**

#### 18. `family/life_events.md` — full log

Append-only log of permanent facts. Condensed timeline (Tier 1) shows last 5-7 events; full history tool-fetched.

```markdown
- 2026-06-XX | Vedant started new job at MontyCloud (CTC: ~₹20L)
- 2025-09-XX | Dad retired from [employer]
- 2024-12-XX | Home loan part-prepayment (₹3L, EMI reduced)
- 2024-03-XX | Sister's wedding
- 2018-07-XX | Home loan originated (SBI, ₹45L)
```

These are **facts, not goals**. Never auto-pruned. They represent permanent changes to the family's financial landscape.

Size target: **small, grows slowly**

#### 19. Per-member `inferences.md` — LOW-confidence section

LOW-confidence inferences live below a divider in the same file as Tier 1 active inferences. Tool-fetched when needed. Pruned if not reinforced within 3 months.

---

### Deferred to v0.2

These were considered and explicitly deferred from MVP scope:

- **`working/active_tasks.md`** — multi-session task state. No real workflow exists yet; revisit when a quarterly-review-spanning-3-days flow appears.
- **`conversations.md` compression logic** — won't trigger for months at MVP usage rates.
- **`family/changelog.md`** — explicit structured changelog of field changes. Inline markdown comments referencing `life_events.md` suffice for MVP.

### Memory File Structure

```
/memory/
├── family/
│   ├── context.md              # Tier 1: family structure, relationships, roles
│   ├── legal_status.md         # Tier 1: residency, HUF, nominees, KYC, wills
│   ├── assumptions.md          # Tier 1: return/inflation/horizon assumptions
│   ├── inferences.md           # Tier 1 (MED/HIGH) + Tier 3 (LOW): family-level patterns
│   ├── life_events.md          # Tier 1 (condensed) + Tier 3 (full log)
│   ├── liabilities.md          # Tier 2: structured loan ledger
│   └── calendar.md             # Tier 2: cyclical and dated facts
│
├── members/
│   ├── vedant/
│   │   ├── profile.md          # Tier 1: identity + headline facts (capped)
│   │   ├── inferences.md       # Tier 1 (MED/HIGH) + Tier 3 (LOW)
│   │   ├── goals.md            # Tier 2: goals
│   │   ├── portfolio_summary.md # Tier 2: holdings + non-brokerage assets
│   │   ├── insurance.md        # Tier 2: term + health + accident
│   │   ├── tax.md              # Tier 2: regime, deductions, capital gains
│   │   ├── recommendations.md  # Tier 2: agent advice + family decisions
│   │   └── conversations.md    # Tier 1 (last 3-5) + Tier 3 (older)
│   ├── mom/
│   │   └── ... (same structure)
│   ├── dad/
│   │   └── ...
│   └── [other members]/
│       └── ...
│
└── working/
    └── agent_notes.md          # Tier 1: retractions, do-not-repeat
```

**Notes**:
- `family/financial_state.md` is NOT a file — the family aggregate financial state is **computed at prompt-assembly time** from member data
- `working/active_tasks.md` is deferred to v0.2 (no real multi-session workflow exists yet)

### Memory Access Patterns

| Memory File | Tier | When Loaded |
|---|---|---|
| `family/context.md` | 1 | Every call |
| `family/legal_status.md` | 1 | Every call |
| `family/assumptions.md` | 1 | Every call |
| `family/inferences.md` (MED/HIGH) | 1 | Every call |
| `family/life_events.md` (condensed) | 1 | Every call (last 5-7 events) |
| `working/agent_notes.md` | 1 | Every call |
| `members/{active}/profile.md` | 1 | Every call |
| `members/{active}/inferences.md` (MED/HIGH) | 1 | Every call |
| `members/{active}/conversations.md` | 1 | Last 3-5 entries |
| *Family aggregate financial state* | computed | Every call (assembled, not loaded) |
| `members/{active}/goals.md` | 2 | Planning, allocation, review, goal-related intents |
| `members/{active}/portfolio_summary.md` | 2 | Portfolio, allocation, surplus, review intents |
| `members/{active}/insurance.md` | 2 | Insurance, risk, review intents |
| `members/{active}/tax.md` | 2 | Tax, allocation, year-end intents |
| `members/{active}/recommendations.md` | 2 | Reviews, follow-ups, consistency checks |
| `family/liabilities.md` | 2 | Debt, prepayment, surplus, review intents |
| `family/calendar.md` | 2 | Planning, review, year-end intents |
| `members/{other}/profile.md` | 2 | `needs_family_context: true` |
| `members/{name}/conversations.md` (older) | 3 | Agent invokes `recall_conversation` tool |
| `family/life_events.md` (full log) | 3 | Agent invokes `recall_life_events` tool |
| `members/{name}/inferences.md` (LOW) | 3 | Agent invokes `get_inferences` tool |
| Per-holding portfolio detail | 3 | Agent invokes `get_portfolio_details` tool |

The **intent classifier** (see Section 6) determines which Tier 2 files to load. The **prompt assembler** reads the selected files and constructs the prompt. The **agent decides** mid-turn whether to invoke Tier 3 memory tools.

### Memory Update Protocol

**Core principle: memory writes happen at session-end, not per-turn.** During a session, the agent reads memory at the start of each turn (Tier 1/2 inlined, Tier 3 tool-fetchable) and has the full session transcript in its prompt context for everything that's happened so far. So if it recommended X in turn 1, it sees X in the conversation history during turn 3 — it does not need `recommendations.md` to be freshly written to remember its own outputs. Memory writes exist for **cross-session continuity**, not in-session continuity.

#### What happens during a session

1. Each completed turn is appended to a session transcript JSONL file (`sessions/<member>/<session_id>.jsonl`) for crash safety. One JSON object per line, append-only, POSIX-safe.
2. **No memory file writes mid-session.** The session JSONL is the only thing being persisted live.

#### What happens at session-end

A session ends when:
- 30 minutes have passed since the last user message, OR
- The user explicitly closes the chat / logs out

(There is intentionally no midnight or daily-boundary rule — mid-thought session breaks create more confusion than they solve.)

At session-end, a single batch process runs:

1. A **session summarizer** (Haiku call, ~$0.002/session) reads the full transcript JSONL and emits structured JSON:
   - `summary_3_lines` — appended to `conversations.md` (Tier 1, last 3-5 inlined)
   - `new_recommendations[]` — appended to `recommendations.md` with date, `source: AGENT_PROPOSED`, `priority`, and `assumptions_at_time` snapshot from `family/assumptions.md`
   - `family_initiated_decisions[]` — appended to `recommendations.md` with date, `source: FAMILY_INITIATED`
   - `status_transitions[]` — updates to existing recommendation statuses (e.g., `PENDING → ACTED_ON_CLAIMED` with `verified: false` until portfolio diff confirms)
   - `new_goals[]` — appended to `goals.md` with date first noted
   - `life_events_stated[]` — appended to `life_events.md` with date
   - `profile_changes[]` — updates to `profile.md` with inline change comment referencing `life_events.md`. Tier 1 edits that are confidence-LOW or unconfirmed by the user stage to `working/pending_writes.md` for soft-confirmation next session
   - `tax_liability_insurance_updates[]` — updates to relevant Tier 2 files with `last_reviewed:` date
   - `inference_candidates[]` — appended to per-member or `family/inferences.md` LOW section with reinforcement-count handling
   - `retracted_advice[]` — appended to `working/agent_notes.md` with date; corresponding `recommendations.md` entries flipped to `SUPERSEDED`
2. All writes are dated. Every entry carries an ISO 8601 date.
3. The session JSONL stays on disk for transcript history (90-day hot, then archived).

#### What happens if the process crashes mid-stream

The partial assistant message is lost. The client times out, the user re-asks. Prior turns of the session are durable in JSONL. The lost turn isn't in JSONL either, so memory state is consistent — there's no half-written recommendation to clean up.

#### Cost and timing

- Per turn during the session: zero memory-update cost
- Per session-end: ~$0.002 on Haiku (one summarizer call)
- For a family of 4 averaging 1 session/day each: ~$0.008/day, ~$2.50/month

**Memory updates do NOT block the user.** The summarizer runs async after the session boundary is detected; the user has already moved on.

---

## 6. Agent Pipeline

### Overview

The pipeline processes every user message through these stages:

```
User Message
    │
    ▼
┌─────────────────────────┐
│ 1. INTENT CLASSIFIER    │  ◄── Cheap/fast LLM (Gemini Flash or Claude Haiku)
│    (200-400ms)           │      Structured JSON output
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. PROMPT ASSEMBLER     │  ◄── Pure code, reads memory files based on classifier output
│    (50ms)                │      Builds lean, focused prompt
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 3. LLM ORCHESTRATOR     │  ◄── Main LLM (Claude API) with tool-use
│    (2-4s, streamed)      │      Calls financial functions, portfolio tools
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 4. VALIDATOR             │  ◄── Code-based hard guardrails + LLM soft validation
│    (10ms code,           │      (LLM validation only for high-stakes responses)
│     500ms if LLM needed) │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 5. STREAM TO CLIENT      │
└────────────┬────────────┘
             │
             ▼ (async, post-response)
┌─────────────────────────┐
│ 6. MEMORY UPDATE         │  ◄── Background process updates memory files
└─────────────────────────┘
```

### Stage 1: Intent Classifier

**Model**: Gemini Flash or Claude Haiku (cheapest, fastest available)

**Input**: The user's message (raw text) + the active member's name

**System prompt** (~300-400 tokens):

```
You are a financial query router for a family financial advisor app.
Classify the user's message into exactly one intent category and
identify what context is needed. Return JSON only, no explanation.

Categories:
- surplus_allocation: User has money and wants to know where to put it
- goal_feasibility: User wants to know if they can afford something or plan for a goal
- portfolio_review: User wants to know how investments are performing
- financial_literacy: User wants to understand a financial concept or instrument
- family_planning: Question involves multiple family members or family-level decisions
- insurance: Question about health, term, or any insurance coverage
- tax_planning: Question about tax regime, deductions, capital gains, year-end planning
- debt_management: Question about loans, prepayment, EMI restructuring
- review_checkin: Responding to a periodic review or discussing past recommendations
- life_event: User is sharing a major life change (job change, retirement, marriage, etc.)
- general: Casual conversation, greeting, or doesn't fit above categories

Output format:
{
  "intent": "category_name",
  "members_referenced": ["mom", "dad"],
  "needs_portfolio_data": true/false,
  "needs_family_context": true/false,
  "needs_goals": true/false,
  "needs_recommendations_log": true/false,
  "needs_insurance": true/false,
  "needs_tax": true/false,
  "needs_liabilities": true/false,
  "needs_calendar": true/false,
  "confidence": 0.0-1.0
}
```

**Latency**: 200-400ms

**Caching for follow-ups**: If the user's message is clearly a continuation of the previous topic (starts with "and", "what about", "also", short follow-up referencing prior answer), reuse the previous classification. Only re-classify when the conversation topic clearly shifts.

**Fallback**: If classifier confidence is below 0.5, load a broader set of context (profile + goals + portfolio summary + family context) rather than risk missing relevant information.

### Stage 2: Prompt Assembler

**Pure code, no LLM.**

Takes the classifier output and constructs the full prompt by:

1. **Always including** (Tier 1):
   - Core system prompt (agent identity, tone, guardrails — ~300-500 tokens)
   - `family/context.md`
   - `family/legal_status.md`
   - `family/assumptions.md`
   - `family/inferences.md` (MED/HIGH section)
   - `family/life_events.md` (condensed timeline)
   - `working/agent_notes.md`
   - Active member's `profile.md`
   - Active member's `inferences.md` (MED/HIGH section)
   - Active member's `conversations.md` (last 3-5 entries)
   - **Computed family aggregate financial state** (assembled from member data, not loaded from a file)

2. **Conditionally including** (Tier 2, based on classifier flags):
   - Relevant advisory skill file(s) — mapped from intent to skill (see Section 7)
   - Active member's `goals.md` (`needs_goals: true`)
   - Active member's `portfolio_summary.md` (`needs_portfolio_data: true`)
   - Active member's `insurance.md` (`needs_insurance: true`)
   - Active member's `tax.md` (`needs_tax: true`)
   - Active member's `recommendations.md` (`needs_recommendations_log: true`)
   - `family/liabilities.md` (`needs_liabilities: true`)
   - `family/calendar.md` (`needs_calendar: true`)
   - Other members' `profile.md` (`needs_family_context: true`)

3. **Including relevant tool definitions**:
   - Financial calculation tools (always available)
   - Portfolio fetch tool (if `needs_portfolio_data` and data might be stale)
   - **Memory tools** (Tier 3 — always available so the agent can fetch deeper context mid-turn): `recall_conversation`, `recall_life_events`, `get_inferences`, `search_recommendations`, `get_portfolio_details`
   - Memory update tool (always available — agent can flag updates)

4. **Appending the user's message**

**Intent-to-skill mapping** (config):

```yaml
surplus_allocation:
  skills: [surplus_allocation.md]
  tools: [calculate_future_value, check_emergency_fund]
  files: [goals, portfolio_summary, liabilities, recommendations]

goal_feasibility:
  skills: [goal_planning.md]
  tools: [calculate_future_value, calculate_required_sip, calculate_goal_gap]
  files: [goals, portfolio_summary]

portfolio_review:
  skills: [portfolio_analysis.md]
  tools: [get_portfolio_summary, calculate_allocation]
  files: [portfolio_summary, goals, recommendations]

financial_literacy:
  skills: [financial_literacy.md]
  tools: []
  files: [portfolio_summary]  # for "use my own numbers" framing

family_planning:
  skills: [family_planning.md]
  tools: [calculate_future_value, check_emergency_fund]
  files: [all members' profiles, liabilities, goals]

insurance:
  skills: [insurance_analysis.md]
  tools: []
  files: [insurance, calendar]  # calendar for renewal dates

tax_planning:
  skills: [tax_planning.md]
  tools: [calculate_tax_savings]
  files: [tax, portfolio_summary, calendar]

debt_management:
  skills: [surplus_allocation.md]  # priority waterfall handles this
  tools: [calculate_prepayment_impact]
  files: [liabilities, portfolio_summary]

review_checkin:
  skills: [periodic_review.md]
  tools: [get_portfolio_summary]
  files: [recommendations, goals, portfolio_summary, calendar, liabilities, insurance]

life_event:
  skills: []
  tools: []
  files: []

general:
  skills: []
  tools: []
  files: []
```

**Target assembled prompt size**: 1500-3000 tokens for typical queries. Maximum ~5000 tokens for complex family-planning or review queries.

### Stage 3: LLM Orchestrator

**Model**: Claude API (claude-sonnet-4-20250514 or latest) with tool-use / function calling

The assembled prompt is sent to Claude with:
- System prompt (core identity + selected skills)
- Conversation history (current session only)
- Memory context (assembled in Stage 2)
- Tool definitions (selected in Stage 2)
- User message

Claude processes the message, decides which tools to call (if any), receives tool results, and generates the response. This is a standard agentic tool-use loop — Claude may make multiple tool calls before generating the final response.

**Streaming**: The response is streamed to the client as it's generated. Tool calls happen before streaming begins (they're fast — local function calls, not network requests, unless a Kite refresh is needed).

### Stage 4: Validator

Two-tier validation runs on the generated response before it's sent to the client:

**Tier 1: Code-based hard guardrails (every response, ~10ms)**

These are non-negotiable rules implemented as code:

| Rule | Check | Action |
|---|---|---|
| No specific securities | Regex/NLP check for fund names, stock tickers, ISIN codes | Strip and replace with category name |
| Allocation bounds | If recommending equity allocation, check against age-and-horizon bounds | Reject and re-generate if >80% equity for someone 55+ or >90% for anyone |
| Numerical consistency | If response contains financial calculations, verify against deterministic functions | Replace incorrect numbers with correct ones |
| Emergency fund gate | If recommending investing and member's emergency fund is flagged inadequate | Inject note about emergency fund priority |
| Certainty language | Check for "guaranteed", "definitely", "will give X% returns" | Soften to "historically", "typically", "in most cases" |
| Consistency check | Compare recommendation against last 3 entries in recommendations log (if loaded) | Flag contradiction for re-evaluation if circumstances unchanged |

**Tier 2: LLM-based soft validation (high-stakes responses only, ~500ms-1s)**

Triggered only when:
- Recommendation involves amounts > ₹5L
- Recommendation involves redemption or restructuring of existing investments
- During periodic review conversations
- When family-level planning involves conflicting goals

Uses a cheap/fast model (Haiku or Flash) with a focused prompt:

```
You are a financial advice quality checker. Review this response for:
1. Is the reasoning logically sound?
2. Could a financially unsophisticated person misinterpret this?
3. Is the agent appropriately uncertain about future outcomes?
4. Does the response use jargon the recipient wouldn't understand?
   (Member financial literacy: {low/medium/high})

Respond with: PASS or FAIL + one-line reason if FAIL.
```

If FAIL, the response is regenerated with the validator's feedback included in the prompt.

**For MVP**: Start with Tier 1 only. Add Tier 2 once the core conversation loop is stable.

### Stage 5: Stream to Client

Standard SSE (Server-Sent Events) streaming. The chat interface renders tokens as they arrive.

### Stage 6: Transcript Append (Per Turn)

After the response is sent, a background process:

1. Appends the completed turn (user message + agent response + any tool calls + timestamps) to the session transcript JSONL at `sessions/<member>/<session_id>.jsonl`
2. Updates the in-memory `SessionState` for the next turn

**No memory file writes happen here.** This is purely transcript durability. See Section 5 "Memory Update Protocol" for why writes are session-end, not per-turn.

### Stage 7: Session-End Memory Update (Triggered by Idle or Explicit Close)

When a session boundary fires (30-min idle since last user message OR explicit close), a single batch process runs:

1. The **session summarizer** (Haiku call) reads the full session transcript and emits structured JSON: `summary_3_lines`, `new_recommendations[]`, `family_initiated_decisions[]`, `status_transitions[]`, `new_goals[]`, `life_events_stated[]`, `profile_changes[]`, `tax_liability_insurance_updates[]`, `inference_candidates[]`, `retracted_advice[]`
2. A writer applies these updates atomically (write-temp + rename) across the relevant memory files
3. All entries are dated. Confidence-LOW or unconfirmed Tier 1 edits stage to `working/pending_writes.md` for soft-confirmation next session
4. The summarizer cost is ~$0.002/session. For a family of 4 averaging 1 session/day each: ~$2.50/month total memory-update cost
5. The session JSONL stays on disk (90-day hot, then archived to `archived/transcripts/<year>/<month>.tar.gz`)

**This does not block the user** — by the time the summarizer runs, the user has already left the chat.

---

## 7. Advisory Framework (Skills)

### Design Principles

- Skills are **separate markdown files** stored in `/skills/`
- Each skill contains **guidelines, not rigid rules** — they define guardrails and reasoning patterns, not deterministic decision trees
- Skills are loaded **selectively** based on intent classification (not all dumped into every prompt)
- Skills encode the reasoning of real financial advisors — not generic LLM knowledge
- Skills define **ranges, not exact values** — the LLM personalises within the range based on individual context

### Skill Files (MVP)

#### `skills/core_system.md` — Always loaded

The agent's identity, tone, and fundamental rules:

- You are a family financial advisor. You serve the [family name] family.
- You know each member individually and understand their collective financial picture.
- You never recommend specific funds, stocks, or insurance products by name. You recommend categories.
- You always show your reasoning, not just conclusions.
- You use appropriately uncertain language about future outcomes.
- When you don't know something or a question is beyond your expertise (complex tax, estate planning, NRI taxation), say so and suggest consulting a professional.
- You adapt your communication style to each member's financial literacy level.
- You are warm, clear, and non-judgmental. Financial conversations can be stressful.
- When family context is relevant, you factor it in. When it's not, you don't force it.
- You track your own recommendations and follow up on them during reviews.

Size: **300-500 tokens**

#### `skills/surplus_allocation.md`

The two-question framework + priority waterfall:

1. **First question**: What is this money for? (Is there a specific goal or is it genuinely surplus?)
2. **Second question**: When will you need it? (Time horizon determines the category)

Priority waterfall (check in order):
1. Is the family's emergency fund adequate? (Target: 6-9 months of family expenses depending on income stability — government jobs need less, freelancers need more)
   - If NO → recommend liquid/savings fund for the shortfall, then proceed with remainder
2. Are there high-interest loans (>10% interest rate)?
   - If YES → recommend prepayment, especially for credit card debt and personal loans
3. Is insurance coverage adequate? (Term insurance for earners, health cover for family)
   - If NO → flag the gap (don't recommend specific products, but explain the risk)
4. Now allocate based on time horizon:
   - < 6 months → savings account or liquid fund
   - 6 months – 1 year → liquid fund or ultra-short-term debt fund
   - 1-3 years → short-term debt fund or conservative hybrid fund
   - 3-5 years → balanced hybrid fund or aggressive hybrid fund
   - 5-7 years → flexi cap fund or large-cap index fund
   - 7+ years → equity (mix based on risk profile: conservative → large-cap heavy, aggressive → mid/small-cap mix)

Adjustments based on risk profile:
- Conservative → shift one category safer within the time horizon
- Aggressive → can stay at the suggested level or shift one riskier
- But NEVER put money needed within 2 years into equity regardless of risk appetite

Size: **400-600 tokens**

#### `skills/goal_planning.md`

For "can I afford X in Y years" questions:

1. Identify: target amount, time horizon, current earmarked savings (if any)
2. Adjust target amount for inflation (use 6% for India unless member specifies otherwise)
3. Calculate required monthly investment using appropriate expected returns for the time horizon
4. Compare against member's available monthly surplus
5. If feasible: confirm and suggest category of investment for the goal
6. If not feasible: show the gap honestly. Suggest alternatives:
   - Extend the timeline
   - Reduce the target
   - Increase income/savings
   - Pool resources with family (if appropriate)
7. Check for **conflicting goals**: if the family's combined goals exceed combined capacity, surface the conflict. Don't silently ignore it.

Important: for family-level goals (house purchase, wedding, etc.), consider contributions from multiple members.

Size: **300-500 tokens**

#### `skills/portfolio_analysis.md`

For "how am I doing" / "review my portfolio" questions:

1. Pull current portfolio data (from cache or Kite)
2. Present:
   - Total value and overall P&L
   - Asset allocation breakdown
   - Top holdings
   - Active SIPs
3. Analyse:
   - Is allocation appropriate for member's age, risk profile, and goal timelines?
   - Any concentration risk? (single fund/stock > 20% of portfolio, single sector > 30%)
   - Any overlap with other family members' holdings? (surface only if significant, >50% overlap)
   - Are SIPs on track for stated goals?
   - Has allocation drifted significantly from target?
4. If issues found: explain clearly, suggest corrective action (redirect future SIPs, not sell existing — to avoid tax events)
5. Use member's own numbers in explanations, not abstract percentages

Size: **300-500 tokens**

#### `skills/financial_literacy.md`

For "what is X" / "explain Y" questions:

1. Explain the concept in language appropriate to the member's financial literacy level
2. **Always use the member's own numbers** when possible. Don't explain SWP in the abstract — show what a ₹30K/month SWP from their actual corpus would look like.
3. Compare with what they currently know/do. If explaining SWP, compare with their current practice of lump-sum withdrawal.
4. Keep it practical: what should they actually do differently based on this knowledge?
5. Don't over-explain. Answer the question, give one concrete example, stop.

Size: **200-300 tokens**

#### `skills/insurance_analysis.md`

For insurance-related questions and proactive gap flagging:

1. Term life insurance: earners should have 10-15x annual income coverage
   - Adjust for: existing assets, dependents, spouse's earning capacity
   - Priority: primary earner first
   - Note: endowment and ULIP policies are NOT adequate substitutes — they combine poor insurance with poor investment
2. Health insurance: minimum ₹10L family cover for metro families, ₹25L+ recommended
   - Prefer family floater for cost efficiency
   - Super top-up is cost-effective for increasing coverage
   - Flag: employer health insurance is NOT a substitute — it ends when employment ends
   - Flag: parents nearing retirement lose employer cover and need personal policies (pre-existing illness waiting periods mean buying early matters)
3. Personal accident cover: underrated, inexpensive, covers disability risk

Size: **300-400 tokens**

#### `skills/periodic_review.md`

Loaded during quarterly/biannual review conversations:

1. Structure: surface 3-5 specific observations, not a comprehensive audit
2. For each member:
   - Are SIPs on track? Any stopped or modified?
   - Were previous recommendations acted on? (check recommendations log)
   - Any significant portfolio changes since last review? (detect redemptions, new investments)
   - Has allocation drifted? Does it need rebalancing?
   - Any upcoming goal deadlines (within 12 months)?
3. Family-level:
   - Combined allocation: still appropriate?
   - Emergency fund: still adequate?
   - Insurance gaps: still present? (repeat at most once per review, not every conversation)
   - Any new life events that change the financial picture?
4. Tone: conversational, not report-like. Each observation should be a dialogue prompt, not a finding.

Size: **300-500 tokens**

### Skill File Location

```
/skills/
├── core_system.md
├── surplus_allocation.md
├── goal_planning.md
├── portfolio_analysis.md
├── financial_literacy.md
├── insurance_analysis.md
└── periodic_review.md
```

### Skills Deferred to v0.2

These are real gaps a comprehensive financial advisor would cover, but they're not needed to validate the family-context thesis in the 5-day sprint. Informed by review of the Claude financial workflows plugin (US-centric, requires re-localisation for India):

- **`retirement_planning_india.md`** — Indian retirement specifics: EPF withdrawal rules at 58, NPS 40% annuity mandate at 60, EPS for organized sector, no real social safety net, parental support obligations into retirement. Generic goal_planning isn't enough — retirement has its own instruments and rules.
- **`education_funding_india.md`** — child education funding with Indian instruments (Sukanya Samriddhi for daughters, education-specific SIPs, 80E loan interest deduction), foreign-vs-domestic education considerations (rupee depreciation), education inflation at 10% vs general 6%.
- **`tax_planning.md`** — old vs new regime selection, 80C/80D/80CCD optimisation, LTCG harvesting windows, advance tax planning. Skeleton present (tax_planning intent + `tax.md` memory file exist); the skill file itself is v0.2.
- **`scenario_modeling.md`** — stress-test reasoning: market crash year 1 of retirement, one earner stops earning, medical emergency draining ₹X. Probability-of-success framing. Borrowed concept from the financial workflows plugin's "scenario modeling" step.
- **`comprehensive_plan_review.md`** — the once-a-year structured walkthrough (client profile → cash flow → retirement projection → goal-specific analysis → scenario modeling → prioritised recommendations) using the agent's existing memory + skills. Complements `periodic_review.md` (quarterly, incremental) by being annual and exhaustive.

These five all need accompanying calculation tools (e.g., `calculate_tax_savings`, `calculate_retirement_corpus`, `monte_carlo_simulation`) which are also v0.2.

---

## 8. Data Sources & Integrations

### Kite MCP (Zerodha) — Primary Portfolio Data Source

**What it provides**: Holdings (fund name, units, current value, invested value, P&L), active SIPs, transaction history

**How it's used**:
- **Background refresh**: Portfolio data is fetched on a schedule (daily or when user opens the app) and cached locally in the portfolio summary memory file
- **On-demand refresh**: If cached data is stale (>24 hours) and user asks a portfolio-dependent question, refresh from Kite before responding
- **Fallback**: If Kite MCP is unavailable, use cached data and inform the user: "I'm working with data from [date], your actual numbers may differ slightly."

**Data freshness indicator**: The dashboard shows "Portfolio last synced: X hours ago" so the family head has confidence in data recency.

**Abstraction**: Portfolio data access is abstracted behind a clean interface (`get_holdings(member_id)`, `get_sips(member_id)`) so that adding Groww or other sources later doesn't require rearchitecting.

### Fallback: Manual Statement Upload

For family members not on Zerodha, or when Kite MCP is down:
- Accept CSV/PDF account statements from brokerages (CAS from CAMS/KFintech)
- Parse and extract holdings data
- Store in the same portfolio summary format

This is a **secondary** mechanism. It won't support periodic refresh — it's a one-time snapshot that goes stale. The agent should note when working with uploaded data vs. live data.

### Future: Other Data Sources (Post-MVP)

| Source | What it provides | Priority |
|---|---|---|
| Groww MCP | Portfolio data for Groww users | High (when available) |
| Account Aggregator (Setu/Onemoney/Finvu) | Consolidated bank, investment, insurance data | High (as AA matures) |
| CAS from CAMS/KFintech (via email) | Mutual fund holdings across all AMCs | Medium |
| yfinance | Historical NAV data, benchmark indices | Medium (for analysis features) |

---

## 9. Onboarding Flow

### Key Principle

**One person (the family head) sets up the family. Other members verify and refine later.**

Asking 4 family members to independently complete onboarding before the product does anything useful is a guaranteed drop-off. The family head knows everyone's rough financials. They do the initial setup in under 10 minutes.

### Step 1: Family Roster (~60 seconds)

A clean web form with repeatable cards. For each family member:
- Name
- Age
- Relationship to family head (self, spouse, father, mother, son, daughter, sibling)

No income, no goals, no risk profile. Just who's in the family. This is the lightest possible first interaction.

**On completion**: The agent already knows the family structure — who's earning age, who's dependent, who's approaching retirement.

### Step 2: Connect Brokerage (~30 seconds)

Immediately after the roster, prompt to connect Kite (Zerodha).

One API connection provides:
- Every holding and its current value
- All active SIPs and their amounts
- Transaction history

From this, the agent infers:
- Risk appetite (heavy small-cap portfolio = aggressive)
- Approximate investable surplus (total SIP amount is a proxy)
- Investment sophistication (15 direct stocks vs. 3 index funds)

**This is the single highest-value onboarding step.** Don't ask people their risk appetite when their portfolio already tells you.

Even if only the family head connects initially, the product already has one complete financial picture to work with.

**Skip option**: If the family head doesn't use Zerodha, offer a statement upload (CSV/PDF) or allow manual entry of approximate portfolio composition.

### Step 3: Quick-Fill Cards (~2 minutes for a family of 4)

For each member, a compact card with **three fields**:
- **Income band** (dropdown: < ₹5L, ₹5-10L, ₹10-20L, ₹20-40L, ₹40L+, Retired, Not earning)
- **Approximate monthly commitments** (single number: EMIs + rent + insurance premiums + support payments combined)
- **Other investment platforms** (multi-select: Groww, Bank FDs, PPF, NPS, Gold, Real estate, None/other)

Pre-fill from Kite data where possible. For connected members, most of this card should already be populated.

### Step 4: One Goal Per Member (~1 minute)

A single open text field per person: "What's one financial goal you're thinking about?"

Free text. The agent parses it. Examples:
- "Retire by 55"
- "Priya's masters abroad in 2028"
- "Buy a flat in 3 years"
- "Build emergency fund"
- (left blank — that's fine)

**No goal-creation wizard. No target amount. No date picker.** Just seed the memory with something so the first conversation isn't starting from zero.

### Step 5: Drop Into Chat

Immediately after step 4, the user is dropped into a conversation with the agent. The agent's first message should be something useful based on what it already knows — not a generic greeting.

Example: "Hi Vedant! I've looked at your Zerodha portfolio — you're at ₹6.2L across 8 funds with a pretty aggressive allocation (79% equity). Your small-cap concentration is worth discussing when you have time. What would you like to talk about?"

### Other Members Joining

When the family head invites other members (via a share link or family code):
- They see their pre-filled profile (what the head entered)
- They can correct/update their information
- They can connect their own brokerage account
- They get their own chat login and private conversation history
- 3-minute process because the scaffolding is already there

---

## 10. Chat Interface

### Design

A standard web-based chat interface. Think WhatsApp Web aesthetics, not a complex dashboard.

**Key elements:**
- Clean message bubbles (user and agent)
- Typing indicator while agent is processing
- Markdown rendering in agent responses (for tables, bold, lists when appropriate)
- Member switcher (family head can view conversations as any member — but this is read-only; they can't send messages as another member)

### Member Authentication (MVP)

Simple and local. Since this is a single-family local deployment:
- Each family member has a name-based profile (no email/password for MVP)
- PIN or simple password per member to keep conversations private
- The family head has a master PIN that can access the dashboard and view all profiles

Post-MVP (cloud deployment): proper email/password auth, magic links, or OAuth.

### Conversation Features

- **Streaming responses**: tokens appear as they're generated
- **Session-based history**: conversations within a session are maintained in working memory + appended per-turn to a session transcript JSONL (`sessions/<member>/<session_id>.jsonl`) for crash safety. Previous sessions are summarised into `conversations.md` at session-end; the JSONL transcript stays on disk for 90 days, then archives to `archived/transcripts/<year>/<month>.tar.gz`.
- **Session boundary**: a session ends on 30-min idle since the last user message OR explicit "end chat". No midnight or daily-boundary rule — mid-thought breaks create more confusion than they solve.
- **Rich responses**: the agent can include simple tables and formatted numbers in responses (using markdown rendering)
- **Quick actions**: after certain responses, show contextual quick-reply buttons:
  - After a recommendation: "Tell me more" / "Sounds good" / "Why not an FD?"
  - After a review finding: "Let's discuss" / "Move to next"

### WhatsApp Integration (Post-MVP)

Not in MVP. When added:
- Use WhatsApp Business API
- Each family member messages from their own WhatsApp number
- The agent identifies the member by phone number
- Same memory system, same pipeline, different transport layer

---

## 11. Dashboard

### Access

**Family head only.** Other members interact via chat only.

### Key Views

#### 1. Family Overview

- Combined net worth (sum of all members' portfolios + known assets)
- Combined asset allocation pie chart (equity/debt/gold/cash/real estate)
- Monthly family cash flow summary (total income - total commitments - total SIPs = surplus)
- Emergency fund status (adequate/inadequate, coverage in months)
- Data freshness: "Portfolio last synced: 2 hours ago"

#### 2. Individual Member Cards

For each family member, a collapsible card showing:
- Profile summary (age, income band, risk profile)
- Portfolio value and allocation
- Active SIPs
- Active goals with progress
- Insurance status (term, health, adequacy flags)
- Last conversation date

#### 3. Goals Tracker

A unified view of all family goals:
- Each goal with owner, target amount, timeline, current progress, status
- Visual progress indicator (on track / behind / at risk)
- Conflicting goals flagged (if combined goals exceed family capacity)

#### 4. Agent Memory (Transparency Layer)

**This is a critical differentiating feature.**

The family head can see everything the agent knows:
- Each member's profile (editable)
- Each member's goals (editable)
- Each member's inferences (viewable, deletable)
- Family context (editable)
- Recommendations log (viewable)

The edit capability means: if the agent inferred "Mom is very conservative" but the family head knows she's actually moderate, they can correct it. The agent will use the corrected information going forward.

This builds trust by making the AI transparent. No black box.

#### 5. Recommendations & Follow-Through

A log view of all recommendations the agent has made, grouped by member:
- What was recommended, when, and why
- Status: pending / acted on / ignored / superseded
- Due date for follow-up

This gives the family head a sense of whether the family is actually acting on advice.

### Dashboard Tech

Standard React web app. For MVP, can be a separate route in the same app as the chat interface (e.g., `/chat` and `/dashboard`). Reads directly from the same memory files and portfolio cache.

---

## 12. Privacy & Security Model

### Three-Layer Privacy Model

#### Layer 1: Family Financial Fabric (Shared)

Shared by design when a member joins. Includes:
- Portfolio holdings and allocations
- Active SIPs and their amounts
- Stated goals with timelines
- Outstanding loans and EMIs
- Insurance coverage details
- Income bands

This is the non-negotiable shared data that makes family-context advising possible. If a member doesn't want to share this, they shouldn't join the family group.

#### Layer 2: Conversations (Private)

Private by default. What you ask the agent, the scenarios you explore, the questions you're curious about — these belong to the individual member. The agent uses the full family context to *answer* the question, but the conversation itself is private.

The family head can *view* (read-only) other members' conversations from the dashboard — but this should be a deliberate action, not a passive feed. Consider whether to include this in MVP or defer.

**Decision for MVP**: The family head can see conversation summaries (brief, in the memory layer) but NOT full transcripts of other members' conversations. Full privacy.

#### Layer 3: Derived Insights (Surfaced to Family)

When the agent identifies something that affects the family:
- Dangerous portfolio overlap between members
- Combined equity exposure crossing a risky threshold
- Conflicting goals that collectively exceed family capacity
- Insurance gap for a member

These insights surface to the dashboard and/or are raised proactively by the agent with the family head. The insight is shared; the conversation that triggered it isn't.

### Cross-Member Write Isolation

Privacy isn't just about reads — it's about writes too. A session run by Mom should never silently modify Dad's private memory, even via the agent's memory-update step.

**Rule (enforced at the writer layer)**: A session by member X can only write to:
- (a) Files under `members/X/` — that member's own private memory
- (b) Family-level files under `family/*.md` — shared by design

It **cannot** write to `members/Y/` for any other member Y.

If Mom's session produces information about Dad (e.g., "Dad just opened a new FD" or "Dad is worried about market"):
- Family-ledger facts (the FD existence) land in `family/life_events.md` and `family/liabilities.md` if relevant — these are shared facts
- An inference about Dad's state derived from Mom's report stages to `working/cross_member_observations.md` (a new file, *pending Dad's confirmation*) rather than directly updating `members/dad/inferences.md`
- Mom's own inference ("Mom is aware of Dad's FD activity" — about Mom's information state) can land in Mom's own inferences

Each writer function takes a `writer_member_id` argument and rejects writes targeting paths outside that member's allowed set. This is defence-in-depth: even if the session summarizer hallucinates a write to another member's file, the writer layer blocks it.

The cross-member observations soft-confirm flow (Dad sees a prompt in his next session) is **deferred to v0.2**. In v0.1, observations stage to the file and the family head can review them via the dashboard.

### Data Anonymisation for LLM Calls

All financial data is stored locally. When the agent calls the Claude API, the prompt is **anonymised**:

| Local data | Sent to LLM |
|---|---|
| "Vedant's mom Sunita has ₹12L in HDFC Bank FD" | "Member A (age 55, conservative, retired) has ₹12L in bank fixed deposits" |
| "Account number: XXXX1234" | (stripped entirely) |
| "PAN: ABCDE1234F" | (stripped entirely) |

What IS sent: amounts, asset types, timelines, risk profiles, ages, relationships, goals.
What is NOT sent: names, account numbers, bank names, PAN, Aadhaar, phone numbers, addresses.

**Implementation**: An anonymisation layer sits between the prompt assembler and the API call. It:
1. Replaces member names with "Member A", "Member B", etc.
2. Strips all account numbers, PAN, Aadhaar, phone numbers
3. Replaces specific bank/broker names with generic terms ("bank", "brokerage")
4. Maintains a mapping table (in memory, not sent) to re-attach real names when displaying responses

### "Show What Was Sent" Feature

The dashboard includes a toggle: "Show me what was sent to the AI" for any conversation message. It displays the actual anonymised prompt that was sent to the API. Full transparency.

### Local Storage Security (MVP)

For MVP (single machine):
- Memory files stored in a designated local directory
- Directory should be outside of any cloud-synced folders (not in Dropbox/OneDrive/Google Drive)
- Optional: encrypt the memory directory at rest using OS-level encryption (FileVault on Mac, LUKS on Linux)
- Access to the app requires the member's PIN

Post-MVP (cloud): encrypted at rest and in transit, proper auth, RBAC.

---

## 13. Guardrails & Validation

See Stage 4 of the Agent Pipeline (Section 6) for the detailed implementation.

### Summary of Hard Guardrails (Code-Based)

| # | Rule | Implementation |
|---|---|---|
| 1 | No specific securities | Regex check for known fund names, stock tickers, ISINs; replace with category |
| 2 | Allocation bounds | Age-and-horizon-based min/max equity percentages; reject if breached |
| 3 | Numerical accuracy | Recalculate any financial math in the response; replace if incorrect |
| 4 | Emergency fund gate | If recommending investing and EF is inadequate, inject priority note |
| 5 | Certainty language | Replace absolutist language with probabilistic language |
| 6 | Recommendation consistency | Compare against recommendations log; flag contradictions |
| 7 | Never recommend breaking long-term investments for short-term needs without flagging tax implications | Check if response suggests redemption; inject STCG/LTCG note |

### Soft Validation (LLM-Based, High-Stakes Only)

Triggered when: amount > ₹5L, involves redemption/restructuring, during periodic reviews, conflicting family goals.

Checks: logical soundness, potential for misinterpretation, appropriate uncertainty, jargon level vs. member literacy.

### The Agent's "I Don't Know" Mode

The agent must have explicit instructions to say "I'm not sure" or "this is beyond what I can help with" for:
- Complex tax situations (HUF, NRI taxation, capital gains across multiple years)
- Estate planning and will drafting
- Legal questions about property ownership
- Specific product comparisons ("Is HDFC Term Plan better than ICICI Term Plan?")
- Market timing questions ("Will the market go up?")
- Any question where the agent isn't confident in its reasoning

The recommended response pattern: "This is something I'd suggest discussing with a [CA/SEBI-registered advisor/lawyer]. What I can tell you is [general principle or what the agent does know]."

---

## 14. Periodic Reviews & Action Ledger

### Periodic Review Schedule

**Quarterly** is the default cadence. The scheduler (cron job) triggers a review conversation.

### Review Process

1. **Background preparation** (automated, before the conversation):
   - Refresh all portfolio data from Kite MCP
   - For each member: compare current portfolio against last review's snapshot
   - Detect: stopped SIPs, new SIPs, unexpected redemptions, new investments, allocation drift
   - Check recommendations log: which recommendations are still PENDING?
   - Check goals: any approaching deadlines (within 12 months)?

2. **Review conversation** (initiated by agent with each member):
   - Agent sends a message (or notification): "It's been 3 months since our last check-in. I've looked at a few things — want to walk through them?"
   - Surfaces 3-5 specific observations (not a comprehensive audit)
   - Each observation is a conversation prompt, not a report finding
   - Asks about any new goals or life changes

3. **Family-level review** (with the family head):
   - After individual reviews, the agent synthesises family-level findings
   - Combined allocation, emergency fund status, insurance gaps, conflicting goals
   - Presented as a dashboard summary + optional conversation

### Action Ledger

The recommendations log (Section 5.6) IS the action ledger. It tracks:
- Every recommendation the agent makes
- Date made
- Context (what question triggered it)
- Status (pending → acted_on / ignored / superseded / cancelled)
- Expected follow-up date

**Detection of acted-on recommendations**: On each portfolio refresh, compare new holdings/SIPs against pending recommendations. If a new SIP matches a recommended category, or a new holding appears in a recommended asset class, mark as ACTED_ON.

**Detection of ignored recommendations**: If a recommendation has been PENDING for longer than its follow-up date, and the portfolio refresh shows no relevant change, mark as IGNORED and queue for follow-up in the next conversation.

**Handling non-action**: The agent reopens gently: "In January we talked about [X]. I notice that hasn't happened yet — totally fine, priorities change. Is this still something you want to do, or has the plan changed?" The response updates the agent's understanding.

**Behavioural learning from non-action**: If a member consistently ignores equity recommendations but acts on FD suggestions, the agent notes this as an inference: "actual risk appetite is more conservative than stated." Future recommendations are calibrated accordingly.

---

## 15. Tech Stack

### Backend

| Component | Technology | Rationale |
|---|---|---|
| Language | Python | Financial ecosystem (calculations, Kite API), LLM SDK, fast prototyping |
| Framework | FastAPI | Async support, SSE streaming, lightweight, type-safe |
| LLM (main) | Claude API (Anthropic SDK) | Tool-use, streaming, high quality reasoning |
| LLM (classifier) | Gemini Flash or Claude Haiku | Cheapest/fastest for structured classification |
| Storage | Local files only — markdown for memory, JSONL for session transcripts, JSON for portfolio cache | Human-readable, editable, version-controllable, no setup. No SQLite or RDBMS in v0.1. Dashboard queries do markdown file scans + parse — fine at single-family scale. Revisit only if query latency on the dashboard becomes a real pain (see Decision #24). |
| Scheduler | APScheduler or system cron | Portfolio refresh, periodic review triggers |
| Portfolio API | Kite MCP (Zerodha) | Primary brokerage data source |

### Frontend

| Component | Technology | Rationale |
|---|---|---|
| Framework | React (Vite) | Vedant's existing skill set, fast iteration |
| Styling | Tailwind CSS | Rapid prototyping, consistent styling |
| State management | React Context or Zustand | Lightweight, sufficient for MVP |
| Chat rendering | Markdown renderer (react-markdown) | Agent responses may include tables, bold, lists |
| Streaming | EventSource (SSE) | Standard streaming from FastAPI backend |

### Infrastructure (MVP)

- Runs locally on Vedant's machine (or a home server)
- Backend: `uvicorn` running the FastAPI app
- Frontend: Vite dev server or static build served by FastAPI
- No Docker required for MVP (optional: Docker Compose for easy setup)
- No cloud deployment, no CI/CD, no monitoring (MVP)

### Key Dependencies

```
# Backend
anthropic          # Claude API SDK
fastapi            # Web framework
uvicorn            # ASGI server
apscheduler        # Scheduled tasks (portfolio refresh, reviews)
pydantic           # Data validation
google-generativeai # Gemini Flash (if used for classifier)

# Financial
# No heavy quant libraries for MVP. Basic math functions only.
# Future: quantstats, pyportfolioopt if needed for advanced analysis

# Frontend
react              # UI framework
react-markdown     # Markdown rendering in chat
tailwindcss        # Styling
```

### What's Explicitly NOT in the Stack

- **No SQLite, Postgres, or any RDBMS**: Markdown is canonical and queries do file scans. At single-family scale (a few hundred memory entries, ~1500 sessions/year) this is fast enough. Adding SQLite was considered and explicitly deferred (see Decision #24) — revisit only if dashboard query latency becomes a real pain point.
- **No knowledge graph (Neo4j, Apache AGE) or hosted memory SaaS (supermemory.ai)**: Domain is not graph-shaped at this scale (~200 edges total at year one, fan-out 30-50 nodes, traversal depth bounded at 2-3 hops). Hosted SaaS violates local-first. See Decision #23.
- **No LangChain/LangGraph**: Direct SDK orchestration. The agent loop is simple enough (classify → assemble → call → validate → respond) that a framework adds overhead without value. Revisit if complex multi-step workflows emerge.
- **No vector database / RAG**: Memory corpus is small enough for direct file loading. No embeddings needed.
- **No heavy quant libraries**: Basic compound interest, future value, and allocation percentage calculations are implemented as simple Python functions. No QuantStats, PyPortfolioOpt, etc. for MVP.
- **No Redis/message queue**: Single-user, single-machine. No need for caching layers or async job queues beyond APScheduler.

---

## 16. Project File Structure

```
family-financial-advisor/
├── README.md
├── PRD.md                          # This document
│
├── backend/
│   ├── main.py                     # FastAPI app entry point, routes
│   ├── config.py                   # Configuration (API keys, paths, settings)
│   │
│   ├── agent/
│   │   ├── pipeline.py             # Main agent pipeline orchestrator
│   │   ├── classifier.py           # Intent classification (Flash/Haiku call)
│   │   ├── assembler.py            # Prompt assembler (reads files, builds prompt)
│   │   ├── orchestrator.py         # LLM orchestrator (Claude API + tool use)
│   │   ├── validator.py            # Code-based guardrails + optional LLM validation
│   │   └── memory_updater.py       # Async post-response memory update logic
│   │
│   ├── tools/                      # Tool definitions for LLM function calling
│   │   ├── financial_math.py       # calculate_future_value, calculate_sip, etc.
│   │   ├── portfolio.py            # get_holdings, get_sips, refresh_portfolio
│   │   ├── memory_tools.py         # load_memory, update_memory (for agent use)
│   │   └── tool_registry.py        # Tool definitions and registry for the assembler
│   │
│   ├── integrations/
│   │   ├── kite_mcp.py             # Kite MCP integration, portfolio fetch
│   │   └── anonymiser.py           # PII anonymisation before LLM calls
│   │
│   ├── scheduler/
│   │   └── jobs.py                 # Scheduled jobs: portfolio refresh, review triggers
│   │
│   └── utils/
│       ├── markdown_io.py          # Read/write/append markdown memory files
│       └── formatters.py           # Number formatting, currency display
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Chat.jsx            # Chat interface
│   │   │   └── Dashboard.jsx       # Dashboard (family head view)
│   │   ├── components/
│   │   │   ├── ChatMessage.jsx     # Individual message bubble
│   │   │   ├── ChatInput.jsx       # Message input with send button
│   │   │   ├── MemberSwitcher.jsx  # Switch between family members
│   │   │   ├── FamilyOverview.jsx  # Dashboard: combined financial view
│   │   │   ├── MemberCard.jsx      # Dashboard: individual member summary
│   │   │   ├── GoalsTracker.jsx    # Dashboard: goals view
│   │   │   ├── MemoryViewer.jsx    # Dashboard: agent memory transparency
│   │   │   └── RecommendationLog.jsx # Dashboard: recommendations & follow-through
│   │   └── hooks/
│   │       ├── useChat.js          # Chat state, SSE streaming, message handling
│   │       └── useMemory.js        # Memory file reading for dashboard
│   ├── package.json
│   └── vite.config.js
│
├── memory/                         # Local memory storage (see Section 5)
│   ├── family/
│   │   ├── context.md              # Tier 1
│   │   ├── legal_status.md         # Tier 1
│   │   ├── assumptions.md          # Tier 1
│   │   ├── inferences.md           # Tier 1 (MED/HIGH) + Tier 3 (LOW)
│   │   ├── life_events.md          # Tier 1 (condensed) + Tier 3 (full)
│   │   ├── liabilities.md          # Tier 2
│   │   └── calendar.md             # Tier 2
│   ├── members/
│   │   ├── vedant/
│   │   │   ├── profile.md          # Tier 1
│   │   │   ├── inferences.md       # Tier 1 (MED/HIGH) + Tier 3 (LOW)
│   │   │   ├── goals.md            # Tier 2
│   │   │   ├── portfolio_summary.md # Tier 2
│   │   │   ├── insurance.md        # Tier 2
│   │   │   ├── tax.md              # Tier 2
│   │   │   ├── recommendations.md  # Tier 2
│   │   │   └── conversations.md    # Tier 1 (recent) + Tier 3 (older)
│   │   └── [other members]/
│   └── working/
│       ├── agent_notes.md          # Tier 1: retractions, do-not-repeat
│       ├── pending_writes.md       # Tier 1 edits awaiting soft-confirmation
│       └── cross_member_observations.md # Cross-member facts pending owning member's confirmation
# Note: family/financial_state.md is computed at prompt-assembly, not stored
# Note: working/active_tasks.md deferred to v0.2
│
├── sessions/                       # Session transcripts (JSONL, append-only)
│   ├── vedant/
│   │   └── <session_id>.jsonl      # One file per session, one JSON per line
│   ├── mom/
│   ├── dad/
│   └── archived/                   # Transcripts >90 days old, tar.gz by year/month
│
├── skills/                         # Advisory framework files (see Section 7)
│   ├── core_system.md
│   ├── surplus_allocation.md
│   ├── goal_planning.md
│   ├── portfolio_analysis.md
│   ├── financial_literacy.md
│   ├── insurance_analysis.md
│   └── periodic_review.md
│
├── cache/                          # Portfolio data cache
│   └── portfolio/
│       ├── vedant_holdings.json
│       └── [member]_holdings.json
│
└── tests/
    ├── test_classifier.py
    ├── test_assembler.py
    ├── test_financial_math.py
    ├── test_validator.py
    └── test_anonymiser.py
```

---

## 17. MVP Scope & Boundaries

### In Scope (Must Have for MVP)

| Feature | Details |
|---|---|
| Family onboarding | 4-step flow: roster → brokerage → quick-fill → one goal |
| Kite MCP integration | Connect Zerodha, pull holdings and SIPs |
| Chat interface | Web-based, per-member conversations, streaming responses |
| Session transcripts | JSONL append-only per session; powers Tier 3 `recall_conversation` and crash recovery |
| Intent classification | LLM-based classifier (Flash/Haiku) with prompt assembly |
| Advisory skills | 6 skill files: surplus allocation, goal planning, portfolio analysis, financial literacy, insurance analysis, periodic review |
| Memory system | Three-tier markdown-based memory: Tier 1 always-loaded, Tier 2 intent-gated, Tier 3 agent-invoked tools. All entries dated. |
| Session-end memory summarizer | One Haiku call per session-end produces structured updates across memory files. ~$2.50/month total. |
| Cross-member write isolation | Writer layer rejects writes outside the active session's allowed paths. Cross-member observations stage to a pending file. |
| Retirement target fields | `retirement_target_age` and `retirement_corpus_target` in `profile.md` for earners |
| Recommendation priority field | P1/P2/P3 on every recommendation |
| Future state changes | `calendar.md` covers anticipated inflection points (mortgage payoff, dependent independence, planned retirement) in addition to cyclical dates |
| Financial functions | Basic: compound interest, future value, required SIP, goal gap analysis, allocation percentage |
| Code-based guardrails | All 7 hard guardrails implemented |
| Dashboard | Family overview, member cards, goals tracker, memory viewer (read-only for MVP) |
| Anonymisation | PII stripping before LLM calls |
| Portfolio refresh | Scheduled daily refresh from Kite + on-demand |

### Out of Scope (Post-MVP)

| Feature | Notes |
|---|---|
| Multi-brokerage support | Groww, MF Central, etc. |
| Account Aggregator integration | Setu, Onemoney APIs |
| WhatsApp interface | WhatsApp Business API integration |
| LLM-based soft validation | Tier 2 validator (add once core loop is stable) |
| Skill: `retirement_planning_india.md` | Indian retirement specifics (EPF/NPS/EPS, parental support, no safety net) |
| Skill: `education_funding_india.md` | Sukanya Samriddhi, 80E, foreign-vs-domestic education |
| Skill: `tax_planning.md` | 80C/80D/80CCD optimisation, regime selection, LTCG harvesting (intent + memory file already in scope; skill file v0.2) |
| Skill: `scenario_modeling.md` | Stress-test reasoning, probability-of-success framing |
| Skill: `comprehensive_plan_review.md` | Once-a-year structured walkthrough (complements quarterly periodic_review) |
| Conflicting goal resolution | Auto-detection and prioritization of competing goals |
| Cross-member soft-confirmation flow | Auto-prompt Dad in his next session about facts Mom stated in hers |
| Pending writes auto-confirm flow | Agent surfaces `[PENDING CONFIRMATION]` Tier 1 edits in next session |
| Conversations.md compression logic | Monthly rollups when transcripts grow large |
| Memory editing in dashboard | Read-only viewer for MVP; edit flow in v0.2 |
| SQLite indexes / query layer | Markdown file scans sufficient at MVP scale; revisit if dashboard latency hurts |
| Statement upload parsing | CSV/PDF import for non-Zerodha data |
| Cloud deployment | Cloud Run or equivalent |
| Multi-family / multi-tenant | Separate family instances |
| Mobile app | React Native or equivalent |
| Notifications | Push notifications for reviews, alerts |
| Export / reports | PDF export of quarterly reviews |
| Advanced analytics | QuantStats, Monte Carlo, efficient frontier |

---

## 18. Future Roadmap

### Phase 2: Expand Data & Channels

- Multi-brokerage support (Groww MCP)
- Statement upload (CAS parsing)
- WhatsApp integration
- Account Aggregator (as it matures)

### Phase 3: Deeper Financial Intelligence

- New skill files: `retirement_planning_india.md`, `education_funding_india.md`, `tax_planning.md`, `scenario_modeling.md`, `comprehensive_plan_review.md`
- Calculation tools: `calculate_tax_savings`, `calculate_retirement_corpus`, `monte_carlo_simulation`, `calculate_prepayment_impact`
- Conflicting goal detection and prioritization
- Insurance product category comparison (term plans, health plans — categories, not specific products)
- Memory editing UI in dashboard (currently read-only)
- Cross-member soft-confirmation flow (auto-prompt the other member next session)

### Phase 4: Scale

- Cloud deployment (multi-family)
- User authentication (proper auth, not local PINs)
- Subscription billing
- Mobile app
- PDF report export for quarterly reviews

### Phase 5: Platform (Only If Validated)

The underlying architecture (family context graph, multi-persona memory, conversational agent with domain skills) could theoretically apply to other family-level domains (health, education, legal). **But do not design for this now.** Build the finance product so well that the architecture naturally generalizes. Don't abstract prematurely.

---

## 19. Key Design Decisions Log

This section documents decisions made during product design discussions, with rationale. This is critical context for any developer or coding agent working on the project.

| # | Decision | Rationale | Alternatives Considered |
|---|---|---|---|
| 1 | **Local-first, not cloud** (MVP) | Privacy is a core value proposition. Building for own family first. No need for multi-tenant infrastructure. | Cloud-first (rejected: premature, trust barrier) |
| 2 | **Markdown files, not database** for memory | Human-readable, editable, git-trackable, trivially loadable into LLM context. No database setup needed for single-family MVP. | SQLite (rejected: unnecessary complexity), Postgres (rejected: overkill) |
| 3 | **No RAG** for memory retrieval | Total memory corpus for one family is <20K tokens. File selection by intent classifier is sufficient. Vector search adds complexity without value at this scale. | Vector DB + embeddings (rejected: overkill for MVP) |
| 4 | **LLM-based intent classification**, not keyword matching | Natural language is messy — "my mom has some money lying around from dad's bonus" must be correctly classified as surplus allocation. Keywords miss nuance. Cheap LLM call (200-400ms) is worth the accuracy gain. | Regex/keyword matching (rejected: too brittle), Embedding similarity (rejected: unnecessary complexity) |
| 5 | **Recommend categories, not products** | Keeps the product outside SEBI's "investment advice" definition (no RIA license needed). Also a better product — the agent shouldn't have the liability of recommending specific schemes. | Specific fund recommendations (rejected: regulatory risk, liability) |
| 6 | **No LangChain/LangGraph** | The agent pipeline is simple enough (classify → assemble → call → validate → respond) that direct SDK use is cleaner and more debuggable. Frameworks add abstraction overhead without commensurate value. | LangGraph (deferred: revisit if complex multi-step workflows emerge), LangChain (rejected: heavy abstraction, not needed) |
| 7 | **Conversations private, financial data shared** | Full privacy defeats the family-context advantage. Full transparency kills adoption by younger members. The three-layer model (shared financial fabric, private conversations, surfaced insights) balances both. | Everything shared (rejected: kills adoption), Everything private (rejected: defeats purpose) |
| 8 | **Goals emerge from conversation, not forms** | Formal goal-creation is friction. People don't think in "goal name, target amount, date" — they think in vague intentions. The agent extracts goals from natural conversation and confirms casually. | Goal-creation wizard (rejected: high friction, low completion) |
| 9 | **Family head does initial setup** for everyone | Matches how families actually work. One person knows everyone's rough financials. Having 4 people independently complete onboarding before the product works is a drop-off guarantee. | Each member onboards independently (rejected: too much friction) |
| 10 | **Deterministic math, LLM judgment** | Financial calculations (FV, SIP, allocation %) must be exact and reproducible. The LLM personalises within guardrails but never does the math itself. | Pure LLM (rejected: non-deterministic, can hallucinate numbers), Pure rules engine (rejected: too rigid, no personalisation) |
| 11 | **Guardrails as code, not LLM** for hard rules | Rules like "no specific securities" and "allocation bounds" are binary pass/fail checks. Code is 100% reliable and runs in milliseconds. LLM might miss a violation. | All LLM validation (rejected: slower, less reliable for hard rules) |
| 12 | **Agent tracks its own recommendations** | The biggest gap in financial advice isn't the quality of recommendations — it's follow-through. Tracking and following up on past advice is a core differentiator. | No follow-up tracking (rejected: makes the agent a one-shot tool, not an advisor) |
| 13 | **No heavy quant libraries for MVP** | Basic financial math (compound interest, FV, SIP calculations) is 10-20 lines of Python. QuantStats, PyPortfolioOpt, etc. are for analysis that the target user (Mom asking about FDs) doesn't need. | QuantStats/PyPortfolioOpt (deferred: add later for advanced analysis features) |
| 14 | **Prompt assembly is dynamic, not static** | Longer prompts = slower responses + higher cost + diluted attention. The assembler loads only the memory and skills relevant to the current intent. A surplus allocation question doesn't need the insurance skill file. | Static prompt with everything (rejected: wasteful, slower) |
| 15 | **This is a finance product, not a platform** | The AI lead's advice to "build domain-agnostic" is a trap. Platform thinking before product-market fit leads to premature abstraction. Build an exceptional family financial advisor. If the architecture generalizes, that's a bonus. | Domain-agnostic platform (deferred: Phase 5 at earliest) |
| 16 | **Three-tier memory architecture** (always-loaded / intent-gated / tool-fetched) | Stuffing all memory into every prompt wastes tokens, dilutes attention, and slows responses. A small always-loaded core (~1.8K tokens) gives identity context; intent-gated files load when the classifier flags them; the agent invokes memory tools mid-turn for deep recall. Mirrors how Claude Code itself does harness engineering. | Single static prompt (rejected: wasteful), RAG (rejected: corpus too small, breaks transparency) |
| 17 | **All memory entries are dated** | Without dates, the agent can't tell what's fresh, what's drifted, or what was true under different assumptions. Dates power follow-up tracking, assumption-revisit, and "is this fact still load-bearing?" reasoning. Non-negotiable across every file type. | Dateless current-state-only memory (rejected: blind to temporal drift) |
| 18 | **Insurance separated from portfolio** | Insurance is risk transfer, not an asset. Mixing causes wrong net-worth math and forces an unrelated lifecycle (renewals, sum-assured adequacy) into a holdings schema. Its own file (`insurance.md`) keeps both clean. | Insurance as a section of `portfolio_summary.md` (rejected: schema mismatch, net-worth bug class) |
| 19 | **Family aggregate financial state is computed, not stored** | An auto-generated file is a cache, not memory. Caches go stale. Computing the aggregate on-demand at prompt-assembly time removes a sync-bug surface and ensures the agent always sees fresh numbers. | `family/financial_state.md` as a stored file (rejected: stale-cache risk) |
| 20 | **Tax, liabilities, legal status, assumptions as first-class memory** | In the Indian context these drive most allocation decisions (regime choice, 80C/80D, LTCG harvesting, prepayment vs invest, HUF, NRI status, nominee status). Treating them as footnotes inside other files causes silent advice errors. | One-line summaries inside `profile.md` / `financial_state.md` (rejected: too cramped for real reasoning) |
| 21 | **Inline change comments instead of structured changelog** | Slowly-changing fields (income band, risk profile, EMI) need history visible in-context when the file is loaded. Inline markdown comments referencing `life_events.md` for the story are read every load; a separate `changelog.md` rarely gets read. | `family/changelog.md` structured field-change log (deferred to v0.2; revisit if inline drifts) |
| 22 | **Agent meta-state (`agent_notes.md`) as always-loaded** | Retracted advice and do-not-repeat corrections must be visible every turn, not searched for. A `SUPERSEDED` recommendation buried in the log is too easy to repeat. Cheap, ~100-200 tokens, high value. | Rely on `recommendations.md` status flags alone (rejected: not visible enough) |
| 23 | **Memory writes happen at session-end, not per-turn** | In-session, the agent has the full session transcript in its prompt context — it doesn't need to read freshly-written memory to remember its own outputs from earlier turns. Memory writes exist for cross-session continuity. Per-turn extraction was over-engineering: doubled cost (~$25/mo vs ~$2.50/mo) and added per-turn latency for zero functional gain within a session. | Per-turn extractor (rejected: solved a non-problem), Hybrid (deferred: only if session-end summarizer proves lossy) |
| 24 | **Session boundary = 30-min idle or explicit close. No midnight rule.** | A midnight cutoff that fires mid-conversation creates exactly the failure mode it tries to prevent: user mid-thought at 11:55, suddenly in a new session at 12:05 with prior context flushed. The "ambient long session" case is rare; if a session lasts 4 hours, the summarizer just produces a longer summary. | Midnight boundary (rejected: edge-case failure mode), Rolling 2-hour cap (rejected: arbitrary, same problem) |
| 25 | **Pure markdown + JSONL, no SQLite or RDBMS in v0.1** | At single-family scale (~200 memory entries, ~1500 sessions/year), file scans are fast enough. SQLite was considered as a hybrid (markdown canonical + SQLite derived index for queries and queues) — genuinely cleaner long-term, but adds engineering surface in a 5-day sprint for queries that aren't slow yet. Revisit when dashboard query latency becomes painful. The principle "markdown canonical, SQLite derived" is the right asymmetry if/when we add it. | SQLite hybrid (deferred to v0.2; correct long-term but not v0.1), Full SQLite (rejected: breaks transparency), Postgres (rejected: overkill) |
| 26 | **No knowledge graph (Neo4j, Apache AGE, supermemory.ai)** | Domain isn't graph-shaped at this scale (~200 edges at year one, fan-out 30-50 nodes, traversal depth bounded at 2-3 hops). "Stale recommendations when assumptions change" is a foreign-key query, not a graph traversal. Hosted SaaS (supermemory.ai) violates local-first. Self-hosted graph adds JVM/admin surface in a 5-day sprint. LLM-loadability requires markdown projection anyway. The "everything is a graph if you squint" trap fails the test: cannot write down 5 queries the system actually needs that take >20 lines of SQL+Python and would be <5 lines of Cypher. | Supermemory.ai (rejected: violates local-first), Neo4j (rejected: domain doesn't justify scale), Apache AGE (rejected: requires Postgres in stack) |
| 27 | **Cross-member write isolation enforced at writer layer** | Mom's session must never silently modify Dad's private memory. Each writer takes a `writer_member_id` and rejects writes outside that member's allowed paths (own files + family-level files). Cross-member observations (Mom mentions Dad's FD) stage to `working/cross_member_observations.md` pending the owning member's confirmation. Defence-in-depth: even if the summarizer hallucinates a write, the writer blocks it. | Trust the summarizer (rejected: hallucinations leak privacy), Disallow any cross-member info (rejected: defeats family-context value) |
| 28 | **Retirement target as first-class profile field** | `retirement_target_age` and `retirement_corpus_target` power 30%+ of conversations (retirement projection, SIP sizing, surplus prioritisation). Burying them in `goals.md` as one of many goals causes the agent to miss them when relevant. Structured fields in `profile.md` (Tier 1, always-loaded) ensure they're always available for reasoning. | Goals-only (rejected: gets lost), New file `retirement_plan.md` (rejected: over-engineering for 2 fields) |
| 29 | **Recommendation priority field (P1/P2/P3)** | Borrowed from financial-plan workflow patterns. P1 = critical gaps (no emergency fund, no term insurance, high-interest debt), P2 = aligned actions (surplus allocation, goal-funded SIPs), P3 = optimisation (tax efficiency, allocation tweaks). The agent uses priority to surface what matters most during reviews; the dashboard sorts by it. | Unpriotised log (rejected: dashboard can't surface what matters), Status alone (rejected: status is orthogonal to priority) |
| 30 | **`calendar.md` covers both cyclical events AND known future state changes** | Mortgage payoff in 2032, sister becoming financially independent in 2030, planned retirement dates — these aren't life events (they haven't happened) and they aren't goals (they're inflection points, not targets). They need to be visible to the agent during planning. Calendar is the natural home with two sections: cyclical (recurring) and future state changes (one-time anticipated). When a future state change materialises, it migrates to `life_events.md`. | New file `future_states.md` (rejected: too granular), Bury in `goals.md` (rejected: confuses targets with inflection points) |

---

## 20. Open Questions

These are unresolved decisions that should be addressed during or shortly after MVP development:

1. **Exact anonymisation strategy**: How do we handle fund names? "Parag Parikh Flexi Cap" is both a fund name (shouldn't be in the prompt for privacy) and useful context (the agent needs to know it's a flexi cap fund). Likely solution: send "Flexi Cap Fund A" not the actual name.

2. **Conversation transcript storage**: *Resolved* — full transcripts are stored locally as JSONL (one file per session per member) for 90 days hot, then archived to tar.gz by year/month. JSONL chosen for append-only crash safety. They power the Tier 3 `recall_conversation` tool and the debug flow when the session summarizer mis-extracts.

3. **Family head permissions granularity**: Can the family head see other members' full conversation transcripts, only summaries, or nothing? This is a product values decision with no objectively correct answer. Leaning toward: summaries visible, full transcripts not visible.

4. **Portfolio refresh frequency**: Daily is the default assumption, but Kite API rate limits may constrain this. Test actual limits during development and adjust accordingly.

5. **How to handle the agent making a bad recommendation**: *Partially resolved* — bad recommendations now flow into `working/agent_notes.md` (always-loaded, dated, do-not-repeat) and the original entry is marked `SUPERSEDED` in `recommendations.md`. Still open: whether the agent should also explicitly apologise to the family in the next conversation, or treat the correction as silent memory.

6. **Multi-session conversation context**: *Resolved* — last 3-5 conversation summaries are inlined (Tier 1), full JSONL transcripts persist for 90 days, and the agent can call `recall_conversation(member, date_range, query)` mid-turn to retrieve older summaries or transcript excerpts (Tier 3).

7. **Classifier model choice**: Gemini Flash vs. Claude Haiku — need to benchmark both on classification accuracy, latency, and cost for financial query routing. Test during development with a set of ~50 sample queries.

8. **Per-member vs family-level recommendations**: For 3-4 members where the same advisor is making recommendations, a single `family/recommendations.md` with a `member:` field per entry may surface cross-member patterns better ("I told Dad X, then told Vedant the opposite — why?"). Current plan: per-member. Defer the merge decision until ~20 recommendations exist and we can see if cross-member queries are common.

9. **Floater health insurance location**: Health insurance for a family floater logically lives at `family/insurance.md` (covers everyone), but term life is per-member (`members/{name}/insurance.md`). Mixing both schemas in one file vs. splitting — defer until concrete usage patterns emerge.

10. **`agent_notes.md` token budget**: This file is always-loaded and grows over time as more retractions/corrections accumulate. At what point does it need its own summarization policy? Likely when it crosses ~300 tokens — but this won't be a problem for months.

11. **When (if ever) to add SQLite**: Decision #25 defers SQLite to v0.2 with the reasoning that file scans are fast enough at MVP scale. The concrete trigger to revisit: if the dashboard's most expensive query (rendering recommendations across all members) takes >500ms to render at month 6 of real usage. Until then, markdown scans are the right tool.

12. **Session summarizer reliability**: How often does the session-end summarizer miss things the agent would have flagged confidently in-the-moment via a per-turn tool call? Need to instrument this in v0.1 — sample 20 sessions, manually re-extract, compare against summarizer output. If miss rate >10%, reconsider per-turn `record_memory_updates` tool emission.

---

*This document is the single source of truth for the Family Financial Advisor MVP. Any coding agent or developer working on this project should read this document in full before writing any code.*
