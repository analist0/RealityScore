import { and, eq, sql } from "drizzle-orm";
import { answerBank } from "./schema";
import type { getDb } from "./index";

// "לא" (not/no) is deliberately NOT a stopword: stripping it would make
// "המקום נקי?" and "המקום לא נקי?" normalize to the same tokens and match
// each other despite opposite meanings.
const STOPWORDS = new Set(["את","של","על","עם","זה","זאת","אני","אתה","את","מה","האם","יש","כן","או","גם","רק","כי","אם","הוא","היא","הם","הן","היה","להיות","אבל"]);

export function normalizeQuestion(raw: string): string {
  const stripped = raw
    .normalize("NFKC")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  const tokens = stripped.split(" ").filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return tokens.join(" ");
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

// Keeping "לא" as a real token isn't enough on its own: for a short
// question, one extra/missing word barely moves Jaccard similarity (e.g.
// "המקום נקי" vs "המקום לא נקי" still scores 0.67 — intersection={2},
// union={3} — well above the 0.6 threshold). Negation needs to flip the
// answer, not just tweak the wording, so treat it as a hard boundary:
// if exactly one side is negated, they can never match, however similar
// the wording otherwise looks.
const NEGATION_MARKERS = new Set(["לא", "אין", "בלי", "אינו", "אינה"]);

function isNegated(tokens: Set<string>): boolean {
  for (const marker of NEGATION_MARKERS) if (tokens.has(marker)) return true;
  return false;
}

export function similarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  if (isNegated(setA) !== isNegated(setB)) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const DEFAULT_MATCH_THRESHOLD = 0.6;
export const DEFAULT_SCOPE = "general";

export type CachedAnswer = {
  id: number;
  answerText: string;
  audioObjectKey: string | null;
  score: number;
};

// Scans candidates within `scope` client-side. Fine at MVP scale (hundreds
// of rows per scope); swap for a Cloudflare Vectorize similarity search if
// the bank grows large enough that a per-scope scan becomes a real cost.
//
// `scope` is a real column (not folded into the question text) — Jaccard
// similarity is unweighted token overlap, so a scope tag mixed into the
// text would just be one more token among many and would NOT reliably
// keep two callers' cached answers apart. Filtering by an actual column
// before scoring is what makes the isolation real.
export async function findCachedAnswer(
  db: ReturnType<typeof getDb>,
  question: string,
  scope: string = DEFAULT_SCOPE,
  threshold = DEFAULT_MATCH_THRESHOLD,
): Promise<CachedAnswer | null> {
  const normalized = normalizeQuestion(question);
  if (!normalized) return null;

  const rows = await db.select().from(answerBank).where(eq(answerBank.scope, scope)).all();
  let best: CachedAnswer | null = null;
  for (const row of rows) {
    const score = similarity(normalized, row.questionNormalized);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: row.id, answerText: row.answerText, audioObjectKey: row.audioObjectKey, score };
    }
  }
  if (best) {
    await db.update(answerBank).set({ hitCount: sql`${answerBank.hitCount} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` }).where(and(eq(answerBank.id, best.id), eq(answerBank.scope, scope)));
  }
  return best;
}

export async function recordAnswer(
  db: ReturnType<typeof getDb>,
  question: string,
  answerText: string,
  opts: { scope?: string; audioObjectKey?: string; sourceProvider?: string } = {},
) {
  const normalized = normalizeQuestion(question);
  const scope = opts.scope ?? DEFAULT_SCOPE;
  // Concurrent requests for the same cache miss (same scope + exact
  // normalized text) would otherwise each insert their own row. The
  // unique index on (scope, question_normalized) plus onConflictDoUpdate
  // makes this an atomic upsert instead: the first writer's row wins,
  // later ones just touch updatedAt and return the same row. This only
  // dedupes exact-text races — near-duplicate fuzzy matches racing each
  // other is a smaller, accepted gap at MVP scale.
  const [row] = await db
    .insert(answerBank)
    .values({
      scope,
      questionNormalized: normalized,
      questionRaw: question.trim().slice(0, 2000),
      answerText: answerText.trim().slice(0, 8000),
      audioObjectKey: opts.audioObjectKey ?? null,
      sourceProvider: opts.sourceProvider ?? null,
    })
    .onConflictDoUpdate({
      target: [answerBank.scope, answerBank.questionNormalized],
      set: { updatedAt: sql`CURRENT_TIMESTAMP` },
    })
    .returning();
  return row;
}
