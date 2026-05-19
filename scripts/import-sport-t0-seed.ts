/**
 * Import T0 Sport Knowledge Base seed data into Supabase.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npx tsx scripts/import-sport-t0-seed.ts golf
 *
 * What it does:
 *   1. Upserts flo_sport_contexts row (slug, display_name, context_text, is_active=false)
 *   2. Inserts flo_brain_documents from kb_sport_knowledge, kb_sport_legends,
 *      kb_sport_quotes, and kb_sport_governance arrays (deduped by title+category)
 *
 * Idempotent: re-running updates the sport context and skips existing brain docs
 * by title+category match.
 *
 * NOTE: After import, the in-memory brainDocsCache (5-min TTL) will serve stale data
 * until it expires. For immediate effect in dev, restart the server or call
 * clearBrainDocsCache() / clearSportContextCache() from the routes that expose them.
 * In production, Railway redeploy clears the cache automatically.
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  floSportContexts,
  floBrainDocuments,
} from "../shared/schema";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: DATABASE_URL=... npx tsx scripts/import-sport-t0-seed.ts <sport_slug>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL env var is required.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// DB connection (standalone — not the server pool)
// ---------------------------------------------------------------------------

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// ---------------------------------------------------------------------------
// Load seed file
// ---------------------------------------------------------------------------

const seedPath = resolve(__dirname, `../docs/kb/sports/${slug}/${slug}_seed_data.json`);
let seed: any;
try {
  seed = JSON.parse(readFileSync(seedPath, "utf8"));
} catch (e: any) {
  console.error(`Failed to read seed file: ${seedPath}\n${e.message}`);
  process.exit(1);
}

if (seed.sport_slug !== slug) {
  console.error(`Seed sport_slug "${seed.sport_slug}" does not match CLI arg "${slug}".`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

const MAX_CONTENT_CHARS = 8000;

interface BrainDocCandidate {
  title: string;
  category: string;
  contentText: string;
  sourceType: string;
  sourceFilename: string | null;
}

function buildBrainDocs(): BrainDocCandidate[] {
  const docs: BrainDocCandidate[] = [];

  // Knowledge entries
  for (const k of seed.kb_sport_knowledge ?? []) {
    docs.push({
      title: k.title,
      category: `sport:${slug}:knowledge`,
      contentText: truncate(k.content, MAX_CONTENT_CHARS),
      sourceType: "t0_kb_seed",
      sourceFilename: `docs/kb/sports/${slug}/knowledge/`,
    });
  }

  // Legends
  for (const l of seed.kb_sport_legends ?? []) {
    const body = [l.bio_summary, l.mindset_legacy].filter(Boolean).join("\n\n");
    docs.push({
      title: l.name,
      category: `sport:${slug}:legends`,
      contentText: truncate(body, MAX_CONTENT_CHARS),
      sourceType: "t0_kb_seed",
      sourceFilename: `docs/kb/sports/${slug}/legends/${l.name.toLowerCase().replace(/\s+/g, "-")}.md`,
    });
  }

  // Quotes — batch by theme (max ~8k per doc)
  const byTheme: Record<string, any[]> = {};
  for (const q of seed.kb_sport_quotes ?? []) {
    const theme = q.theme || "general";
    (byTheme[theme] ??= []).push(q);
  }
  for (const [theme, quotes] of Object.entries(byTheme)) {
    const body = quotes
      .map((q: any) => `"${q.quote_text}" — ${q.attribution}${q.context ? ` (${q.context})` : ""}`)
      .join("\n\n");
    docs.push({
      title: `${slug} quotes: ${theme}`,
      category: `sport:${slug}:quotes`,
      contentText: truncate(body, MAX_CONTENT_CHARS),
      sourceType: "t0_kb_seed",
      sourceFilename: `docs/kb/sports/${slug}/quotes/`,
    });
  }

  // Governance
  for (const g of seed.kb_sport_governance ?? []) {
    docs.push({
      title: g.title,
      category: `sport:${slug}:governance`,
      contentText: truncate(g.content, MAX_CONTENT_CHARS),
      sourceType: "t0_kb_seed",
      sourceFilename: `docs/kb/sports/${slug}/governance/`,
    });
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== T0 Import: ${seed.sport_name} (${slug}) ===\n`);

  // 1. Upsert flo_sport_contexts
  const existing = await db
    .select()
    .from(floSportContexts)
    .where(eq(floSportContexts.slug, slug));

  let sportContextAction: string;
  if (existing.length > 0) {
    await db
      .update(floSportContexts)
      .set({
        displayName: seed.sport_name,
        contextText: seed.flo_sport_context_summary,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(floSportContexts.slug, slug));
    sportContextAction = "UPDATED";
  } else {
    await db.insert(floSportContexts).values({
      slug,
      displayName: seed.sport_name,
      contextText: seed.flo_sport_context_summary,
      isActive: false,
    });
    sportContextAction = "CREATED";
  }
  console.log(`flo_sport_contexts: ${sportContextAction} slug="${slug}" (is_active=false)`);

  // 2. Insert flo_brain_documents (dedupe by title+category)
  const candidates = buildBrainDocs();
  let inserted = 0;
  let skipped = 0;

  for (const doc of candidates) {
    const dup = await db
      .select({ id: floBrainDocuments.id })
      .from(floBrainDocuments)
      .where(
        and(
          eq(floBrainDocuments.title, doc.title),
          eq(floBrainDocuments.category, doc.category)
        )
      );

    if (dup.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(floBrainDocuments).values({
      title: doc.title,
      category: doc.category,
      contentText: doc.contentText,
      isActive: true,
      version: 1,
      uploadedBy: "t0-import-script",
      sourceType: doc.sourceType,
      sourceFilename: doc.sourceFilename,
      contentCharCount: doc.contentText.length,
    });
    inserted++;
  }

  const quoteThemes = Object.keys(groupByTheme(seed.kb_sport_quotes ?? []));
  console.log(`flo_brain_documents: ${inserted} inserted, ${skipped} skipped (already exist)`);
  console.log(`  breakdown: ${(seed.kb_sport_knowledge ?? []).length} knowledge, ${(seed.kb_sport_legends ?? []).length} legends, ${quoteThemes.length} quote batches, ${(seed.kb_sport_governance ?? []).length} governance`);
  console.log(`\nTotal brain docs for ${slug}: ${inserted + skipped} (${inserted} new)`);
  console.log(`\nNOTE: Brain docs cache (5-min TTL) will serve stale data until expiry.`);
  console.log(`      Restart server or redeploy to clear immediately.\n`);

  await pool.end();
}

function groupByTheme(quotes: any[]): Record<string, any[]> {
  const r: Record<string, any[]> = {};
  for (const q of quotes) (r[q.theme || "general"] ??= []).push(q);
  return r;
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
