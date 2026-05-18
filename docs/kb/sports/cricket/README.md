# Cricket — T0 Sport KB

| Field | Value |
|-------|--------|
| **Slug** | `cricket` |
| **Launch priority** | 5 of 5 |
| **Status** | `not_started` · `draft` · `in_review` · `verified` |
| **Last research run** | — |
| **Reviewer** | — |

## Purpose

T0 knowledge for **Cricket** powers FLO sport context and FLO Brain RAG. Research using [`docs/T0_KB_RESEARCH_PROMPT.md`](../../T0_KB_RESEARCH_PROMPT.md).

## Required minimums

- [ ] Rules & variations documented (`kb_sport_knowledge`)
- [ ] Scoring explained clearly
- [ ] History (3+ entries), discipline (2+ entries)
- [ ] **12+** legends (`kb_sport_legends`)
- [ ] **20+** mindset quotes (`kb_sport_quotes`) with sources
- [ ] **8+** mental-performance knowledge entries (Red2Blue / pressure / routines)
- [ ] Governance aligned with **ICC / MCC Laws**


## Artifacts (expected)

```
cricket/
├── README.md                 # this file
├── cricket_seed_data.json     # after research
├── knowledge/
├── legends/
├── quotes/
└── governance/
```

## Import checklist (post-review)

- [ ] `cricket_seed_data.json` reviewed — no fabricated quotes
- [ ] `flo_sport_contexts`: slug `cricket`, `context_text` synthesized, `is_active` only after QA
- [ ] `flo_brain_documents`: chunks listed in seed `flo_import.flo_brain_documents_plan`
- [ ] Batch seed `kb_sport_*` tables when API available

## Notes

_Add sport-specific research notes, disputed rules, or regional formats here._
