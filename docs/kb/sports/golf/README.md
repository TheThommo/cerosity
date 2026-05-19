# Golf — T0 Sport KB

| Field | Value |
|-------|--------|
| **Slug** | `golf` |
| **Launch priority** | 1 of 5 |
| **Status** | ~~not_started~~ · ~~draft~~ · **`in_review`** · `verified` |
| **Last research run** | 2026-05-19 |
| **Reviewer** | Pending (Mark) |

## Purpose

T0 knowledge for **Golf** powers FLO sport context and FLO Brain RAG. Research using [`docs/T0_KB_RESEARCH_PROMPT.md`](../../T0_KB_RESEARCH_PROMPT.md).

## Entry Counts

| Table | Count | Status |
|-------|-------|--------|
| `kb_sport_knowledge` | 22 | Done |
| `kb_sport_legends` | 14 | Done |
| `kb_sport_quotes` | 25 | Done (7 unverified) |
| `kb_sport_governance` | 10 | Done |
| **Total** | **71** | PASS (min 50) |

Merged seed: `golf_seed_data.json` (86 KB)
FLO context summary: 856 words
Unverified quotes: 7 (flagged `verified: false` in metadata)

## Required minimums

- [x] Rules & variations documented (`kb_sport_knowledge`) — 6 entries
- [x] Scoring explained clearly — 3 entries (par, handicap, Stableford)
- [x] History (3+ entries), discipline (2+ entries) — 3 history, 2 discipline
- [x] **12+** legends (`kb_sport_legends`) — 14 legends (4 women, 6 nationalities, 1920s-present)
- [x] **20+** mindset quotes (`kb_sport_quotes`) with sources — 25 quotes (7 unverified)
- [x] **8+** mental-performance knowledge entries — 7 entries (6 pressure moments + pre-shot routine)
- [x] Governance aligned with **R&A / USGA** — 10 entries


## Artifacts (expected)

```
golf/
├── README.md                 # this file
├── golf_seed_data.json     # after research
├── knowledge/
├── legends/
├── quotes/
└── governance/
```

## Import checklist (post-review)

- [ ] `golf_seed_data.json` reviewed — no fabricated quotes
- [ ] `flo_sport_contexts`: slug `golf`, `context_text` synthesized, `is_active` only after QA
- [ ] `flo_brain_documents`: chunks listed in seed `flo_import.flo_brain_documents_plan`
- [ ] Batch seed `kb_sport_*` tables when API available

## Notes

_Add sport-specific research notes, disputed rules, or regional formats here._
