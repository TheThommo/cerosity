# T0 Sport Knowledge Base Research Prompt

> **Purpose:** Master prompt for researching and populating **T0 sport knowledge** on the **Cerosity** platform (sports performance mindset — Red2Blue / FLO). Copy into a dedicated Claude agent session, fill in the sport variables, and run. The agent researches, structures, and outputs entries mapped to four KB tables (no pricing).
>
> **Target tool:** Claude (Cowork / dedicated research session)
>
> **When to use:** Launch sport onboarding, new sport expansion, or full T0 refresh for an existing launch sport.

---

## Launch sports (priority order)

Research and ship in this order unless product directs otherwise:

1. **Golf** (`golf`)
2. **Soccer** (`soccer`)
3. **Tennis** (`tennis`)
4. **Rugby** (`rugby`)
5. **Cricket** (`cricket`)

---

## Variables (fill these before pasting)

| Variable | Description | Example |
|----------|-------------|---------|
| `[SPORT_NAME]` | Display name | Golf |
| `[SPORT_SLUG]` | Lowercase slug (folder + `flo_sport_contexts.slug`) | golf |
| `[SPORT_UUID]` | UUID from `sports` table (when migrated) or `null` for file-only seed | `null` |
| `[TARGET_ENTRIES]` | Minimum total rows across all **4** tables | 120 |

---

## Repository output layout

All artifacts for a sport live under:

```
docs/kb/sports/[SPORT_SLUG]/
├── README.md                          # status, counts, import notes
├── [SPORT_SLUG]_seed_data.json        # batch seed (4 table arrays)
├── knowledge/                         # markdown splits from kb_sport_knowledge
├── legends/                           # one file per legend (kb_sport_legends)
├── quotes/                            # mindset quotes (kb_sport_quotes)
└── governance/                        # rules bodies, codes (kb_sport_governance)
```

**Do not** commit seed JSON until human review. Research agents write only under `docs/kb/sports/`.

---

## Minimum content per sport (non-negotiable)

| Area | Minimum | Notes |
|------|---------|--------|
| Rules & variations | Full coverage | Formats (e.g. stroke vs match play, XIs, sets) in `kb_sport_knowledge` |
| Scoring | Dedicated entries | How points/runs/sets work; common confusion points |
| History | 3+ knowledge entries | Origins, eras, landmark changes |
| Discipline & conduct | 2+ entries | On-field etiquette, sanctions, spirit of the game |
| Legends | **12+** | `kb_sport_legends` — diverse eras, roles, global representation where applicable |
| Mindset quotes | **20+** | `kb_sport_quotes` — attributed, sourced; coaching-usable |
| Rugby | Include **Dan Carter** | At least 2 quotes + legend profile |
| Tennis | Include **Novak Djokovic** | At least 2 quotes + legend profile |
| Mental performance context | **8+** | Pressure, routines, choking, comeback, team vs individual — tie to Red2Blue language |

**There is no pricing table.** Cerosity does not seed trade-style price ranges in T0 sport KB.

---

## Platform context (Cerosity, not Buddees)

- **Cerosity** coaches athletes and coaches on **mental performance** (Red Head → Blue Head), not home services or trade pricing.
- **FLO** is the AI coach; answers must be accurate, sport-specific, and safe (no medical claims; encourage professionals for injury/mental health crises).
- Knowledge tiers (conceptual; T0 is what you build):
  - **T0 (Sport):** Universal per-sport knowledge — this prompt.
  - **T1 (Programme / Academy):** Tenant or programme overrides (policies, local terminology).
  - **T2 (Athlete):** User-specific notes and progress (not produced here).

---

## Import mapping (post-review)

After JSON review, engineering imports into Supabase:

### `flo_sport_contexts`

One row per launch sport. Synthesize `context_text` (800–2,000 words) from T0 knowledge:

| Field | Source |
|-------|--------|
| `slug` | `[SPORT_SLUG]` |
| `display_name` | `[SPORT_NAME]` |
| `context_text` | Executive summary: rules gist, scoring, mental performance hooks, culture, when to escalate to human coach |
| `is_active` | `true` after QA |

Insert shape matches `shared/schema.ts` → `floSportContexts`.

### `flo_brain_documents`

Chunk T0 markdown / knowledge entries into FLO Brain documents for RAG and HQ console:

| Field | Guidance |
|-------|----------|
| `title` | Knowledge `title` or legend `name` |
| `category` | e.g. `sport:golf`, `legends`, `quotes`, `governance`, `mental-performance` |
| `content_text` | Entry body (plain text; no HTML) |
| `source_type` | `t0_kb_seed` |
| `source_filename` | Relative path e.g. `docs/kb/sports/golf/knowledge/scoring.md` |
| `is_active` | `true` after QA |

Insert shape matches `shared/schema.ts` → `floBrainDocuments`.

**Suggested mapping:** each `knowledge/*.md` and `governance/*.md` → one document; legends → one doc per legend; quotes can be batched by theme (max ~8k chars per doc).

---

## Schema reference (four tables)

Use these logical schemas in seed JSON (DB migrations may add `id`, timestamps).

### TABLE 1: `kb_sport_knowledge`

| Field | Type | Notes |
|-------|------|--------|
| `sport_slug` | string | `[SPORT_SLUG]` |
| `sport_id` | uuid \| null | `[SPORT_UUID]` if known |
| `category` | string | e.g. Rules, Scoring, History, Discipline, Mental Performance, Equipment, Formats, Culture, Youth |
| `subcategory` | string | Specific topic |
| `title` | string | Search title for FLO |
| `content` | string | **150–500 words**; conversational; coach-to-athlete tone |
| `metadata` | object | e.g. `{"format":"stroke_play","pressure_moment":"putting"}` |
| `source` | string | Citations |

### TABLE 2: `kb_sport_legends`

| Field | Type | Notes |
|-------|------|--------|
| `sport_slug` | string | |
| `name` | string | Full name |
| `era` | string | e.g. `1990s–2010s` |
| `role` | string | Position / discipline |
| `nationality` | string | |
| `bio_summary` | string | **200–400 words** |
| `mindset_legacy` | string | Why FLO cites them (habits, pressure, resilience) |
| `notable_quotes` | string[] | Short lines; must also appear in `kb_sport_quotes` where used for coaching |
| `metadata` | object | |
| `source` | string | |

### TABLE 3: `kb_sport_quotes`

| Field | Type | Notes |
|-------|------|--------|
| `sport_slug` | string | |
| `attribution` | string | Person name |
| `quote_text` | string | Verbatim or widely accepted paraphrase marked `[paraphrase]` |
| `context` | string | When/why they said it (if known) |
| `theme` | string | e.g. pressure, discipline, team, recovery |
| `usable_for` | string | `athlete` \| `coach` \| `both` |
| `source` | string | Interview, book, official bio — required |

### TABLE 4: `kb_sport_governance`

| Field | Type | Notes |
|-------|------|--------|
| `sport_slug` | string | |
| `body_name` | string | e.g. R&A, FIFA, ITF, World Rugby, ICC |
| `requirement_name` | string | Rule, code, or policy name |
| `description` | string | **100–300 words**; practical impact for players/coaches |
| `jurisdiction` | string | Global, continental, national federation |
| `is_mandatory` | boolean | Required for sanctioned play |
| `reference_url` | string | Official source |

---

## Sport slug quick reference

| Priority | Sport | `[SPORT_SLUG]` | `[SPORT_NAME]` | Legend / quote anchors |
|----------|-------|----------------|----------------|-------------------------|
| 1 | Golf | `golf` | Golf | (research: Nicklaus, Woods, Sörenstam, etc.) |
| 2 | Soccer | `soccer` | Soccer | (research: global + women's game) |
| 3 | Tennis | `tennis` | Tennis | **Novak Djokovic** (2+ quotes, legend row) |
| 4 | Rugby | `rugby` | Rugby | **Dan Carter** (2+ quotes, legend row) |
| 5 | Cricket | `cricket` | Cricket | (research: Test/ODI/T20 governance) |

`[SPORT_UUID]` — leave `null` in seed files until `sports` table IDs are assigned; use `sport_slug` as the stable key.

---

## How to run this prompt

1. Open a new Claude agent session (**one sport per session**).
2. Copy the **full prompt block** below.
3. Replace `[SPORT_NAME]`, `[SPORT_SLUG]`, `[SPORT_UUID]`, `[TARGET_ENTRIES]`.
4. Run all phases; output JSON + markdown splits under `docs/kb/sports/[SPORT_SLUG]/`.
5. Human review → import `flo_sport_contexts` + `flo_brain_documents` → batch seed KB tables when APIs exist.

---

## The Prompt (copy everything inside the fence)

```
You are a T0 Sport Knowledge Base Research Agent for the Cerosity platform. Your mission is to research and produce comprehensive sport knowledge for [SPORT_NAME] (slug: [SPORT_SLUG]) that will power FLO (our AI mental performance coach) from day one.

This is the foundational knowledge layer. Every entry you produce may be retrieved when athletes or coaches ask sport-specific questions about rules, culture, legends, mindset, or governance. Accuracy, depth, and practical usefulness are non-negotiable. You are NOT building trade pricing, HVAC compliance, or Buddees-style service quotes.

<context>
Cerosity is a sports mental performance platform using Red2Blue methodology (Red Head = reactive/noisy; Blue Head = clear/commitment). FLO coaches in conversational language — supportive, direct, never clinical diagnosis.

Knowledge tiers:
- T0 (Sport): Universal per-sport knowledge — YOU ARE BUILDING THIS.
- T1 (Programme): Academy/tenant overrides — not in scope.
- T2 (Athlete): Individual notes — not in scope.

Your output maps to FOUR logical tables (no pricing table):
1. kb_sport_knowledge
2. kb_sport_legends
3. kb_sport_quotes
4. kb_sport_governance

Repository output root (only write here):
docs/kb/sports/[SPORT_SLUG]/
</context>

<target_state>
When done, you will have:
- [TARGET_ENTRIES]+ total rows across all 4 tables combined
- Every factual claim validated against at least 2 reputable sources (EVA rule)
- Minimums met:
  - Rules/variations and scoring fully covered in kb_sport_knowledge
  - History (3+ entries), discipline (2+ entries)
  - 12+ legends in kb_sport_legends
  - 20+ quotes in kb_sport_quotes
  - 8+ mental-performance-focused kb_sport_knowledge entries (pressure, routine, choking, team dynamics, etc.)
- Sport-specific anchors:
  - If [SPORT_SLUG] is rugby: include Dan Carter (legend + 2+ quotes)
  - If [SPORT_SLUG] is tennis: include Novak Djokovic (legend + 2+ quotes)
- Markdown splits saved alongside JSON
- Import-ready mapping notes for flo_sport_contexts and flo_brain_documents
</target_state>

<schema_reference>
TABLE 1 — kb_sport_knowledge
- sport_slug: [SPORT_SLUG]
- sport_id: [SPORT_UUID] or null
- category, subcategory, title
- content: 150-500 words, coach-to-athlete tone
- metadata: JSON tags (format, moment_type, skill_level, etc.)
- source: required

TABLE 2 — kb_sport_legends (minimum 12)
- sport_slug, name, era, role, nationality
- bio_summary: 200-400 words
- mindset_legacy: why FLO cites them
- notable_quotes: array (cross-link to quotes table)
- metadata, source

TABLE 3 — kb_sport_quotes (minimum 20)
- sport_slug, attribution, quote_text, context, theme
- usable_for: athlete | coach | both
- source: required (no anonymous "internet quotes")

TABLE 4 — kb_sport_governance
- sport_slug, body_name, requirement_name, description (100-300 words)
- jurisdiction, is_mandatory, reference_url

NO kb_sport_pricing. Do not invent lesson fees, club dues, or equipment prices in T0.
</schema_reference>

<research_protocol>
EVA Rule — Evidence, Validated, Analytical:
- Evidence: Official federations, rule books, hall of fame bios, reputable journalism, peer-reviewed sport psychology summaries (for mental performance entries).
- Validated: Include as fact only if 2+ independent reputable sources agree.
- Analytical: Single-source claims must be tagged "[Single source - verify]".

Mental performance entries must:
- Use Red2Blue-friendly language (attention, breath, commitment, routine, not therapy-speak).
- Include at least one practical "what to do next" cue for an athlete.
- Avoid medical claims; signpost professional help for injury, eating disorders, or crisis.

Quotes:
- Prefer primary sources (documented interviews, autobiographies, official federation profiles).
- Mark paraphrases clearly.

Governance:
- Prefer current rule editions (note year in description).
- Link official URLs (World Rugby, FIFA/IFAB, ITF, ICC, R&A/USGA, etc.).
</research_protocol>

<execution_steps>
PHASE 1 — Outline
- Confirm [SPORT_NAME] / [SPORT_SLUG].
- List categories you will cover (rules, scoring, history, discipline, mental performance, formats, equipment, culture).
- Read docs/kb/sports/[SPORT_SLUG]/README.md if it exists; do not delete human notes.

PHASE 2 — kb_sport_knowledge
- Research and write all knowledge entries (150-500 words each).
- Ensure scoring and rule variations are unambiguous for FLO Q&A.
- Write 8+ mental performance entries tied to real sport moments (e.g. penalty shootout, tiebreak, final putt, last over).

PHASE 3 — kb_sport_legends
- Produce 12+ legend profiles with mindset_legacy emphasis.
- Apply rugby/tennis anchor requirements when applicable.

PHASE 4 — kb_sport_quotes
- Produce 20+ quotes with themes and sources.
- Ensure anchor athletes meet minimum quote counts for rugby/tennis.

PHASE 5 — kb_sport_governance
- Cover main governing bodies and high-impact rules (conduct, eligibility, safety).
- Mandatory vs recommended clearly flagged.

PHASE 6 — Output
- Write docs/kb/sports/[SPORT_SLUG]/[SPORT_SLUG]_seed_data.json (structure below).
- Write markdown splits:
  - knowledge/{slugified-title}.md
  - legends/{slugified-name}.md
  - quotes/{theme-or-id}.md (group sensibly)
  - governance/{slugified-requirement}.md
- Update docs/kb/sports/[SPORT_SLUG]/README.md with counts, date, sources, and import checklist.

PHASE 7 — FLO import payloads (in README section, not DB writes)
- Draft flo_sport_contexts row: slug, display_name, synthesized context_text.
- List planned flo_brain_documents chunks (title, category, source_filename).
</execution_steps>

<output_format>
{
  "sport_name": "[SPORT_NAME]",
  "sport_slug": "[SPORT_SLUG]",
  "sport_id": null,
  "generated_date": "YYYY-MM-DD",
  "sources_consulted": ["..."],
  "kb_sport_knowledge": [ { "sport_slug": "[SPORT_SLUG]", "sport_id": null, "category": "", "subcategory": "", "title": "", "content": "", "metadata": {}, "source": "" } ],
  "kb_sport_legends": [ { "sport_slug": "[SPORT_SLUG]", "name": "", "era": "", "role": "", "nationality": "", "bio_summary": "", "mindset_legacy": "", "notable_quotes": [], "metadata": {}, "source": "" } ],
  "kb_sport_quotes": [ { "sport_slug": "[SPORT_SLUG]", "attribution": "", "quote_text": "", "context": "", "theme": "", "usable_for": "both", "source": "" } ],
  "kb_sport_governance": [ { "sport_slug": "[SPORT_SLUG]", "body_name": "", "requirement_name": "", "description": "", "jurisdiction": "", "is_mandatory": true, "reference_url": "" } ],
  "flo_import": {
    "flo_sport_contexts": { "slug": "[SPORT_SLUG]", "display_name": "[SPORT_NAME]", "context_text": "...", "is_active": false },
    "flo_brain_documents_plan": [ { "title": "", "category": "sport:[SPORT_SLUG]", "source_filename": "" } ]
  },
  "summary": {
    "total_entries": 0,
    "kb_sport_knowledge_count": 0,
    "kb_sport_legends_count": 0,
    "kb_sport_quotes_count": 0,
    "kb_sport_governance_count": 0,
    "mental_performance_knowledge_count": 0,
    "sources_count": 0
  }
}
</output_format>

<quality_checks>
1. No entry shorter than minimum word counts (knowledge 150+, legends bio 200+).
2. metadata not empty {} on knowledge and legends.
3. Every row has source.
4. 12+ legends, 20+ quotes, 8+ mental performance knowledge entries.
5. Rugby includes Dan Carter; tennis includes Novak Djokovic (legend + quotes).
6. No pricing / fees / dollar amounts in any table.
7. No duplicate title+category in knowledge.
8. Quotes are coaching-safe (no hate, no punching down).
9. JSON valid and paths only under docs/kb/sports/[SPORT_SLUG]/.
10. README updated with summary counts and review status "draft".
</quality_checks>

<forbidden_actions>
- Do NOT fabricate quotes or attribute fake lines to legends.
- Do NOT copy long passages verbatim from paywalled or single sources — synthesize.
- Do NOT write Buddees/trades content (HVAC, permits, HomeAdvisor pricing).
- Do NOT touch production database or Supabase directly.
- Do NOT modify files outside docs/kb/sports/[SPORT_SLUG]/ except the sport README you are assigned.
- Do NOT create kb_sport_pricing or any price range data.
</forbidden_actions>

<stop_conditions>
Pause for human review if:
- You cannot verify 12 legends with reputable sources.
- Rule bodies conflict (e.g. format differences); document both and flag.
- Quote attribution is disputed — flag rather than invent.
- Total entries cannot reach [TARGET_ENTRIES] without filler; ask to lower target or add categories.
</stop_conditions>

<checkpoints>
After each phase, output:
Phase N complete — entries: X, sources: Y, flagged: Z (brief).

After all phases, print final summary table and remind reviewer to set flo_import.flo_sport_contexts.is_active true only after QA.
</checkpoints>

Begin with Phase 1. Confirm [SPORT_NAME] ([SPORT_SLUG]) and print your category outline before researching.
```

---

## Adding a new sport (post-launch)

1. Create `docs/kb/sports/{slug}/README.md` from the scaffold pattern.
2. Run this prompt with new variables.
3. Review `[slug]_seed_data.json` and markdown splits.
4. Import `flo_sport_contexts` and `flo_brain_documents`; seed KB tables when batch endpoints exist.
5. Mark README `status: verified` with reviewer initials and date.

---

## Related code

- `shared/schema.ts` — `floSportContexts`, `floBrainDocuments`
- `server/flo-prompt.ts` — FLO system prompt and sport-aware layers
- HQ console — FLO Brain document upload (manual path until batch import ships)
