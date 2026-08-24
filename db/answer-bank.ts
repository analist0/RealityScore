import { sql } from "drizzle-orm";
import { answerBank } from "./schema";
import type { getDb } from "./index";

const STOPWORDS = new Set(["את","של","על","עם","זה","זאת","אני","אתה","את","מה","האם","יש","לא","כן","או","גם","רק","כי","אם","הוא","היא","הם","הן","היה","להיות","אבל"]);

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

export function similarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export const DEFAULT_MATCH_THRESHOLD = 0.6;

export type CachedAnswer = {
  id: number;
  answerText: string;
  audioObjectKey: string | null;
  score: number;
};

// Scans the full bank client-side. Fine at MVP scale (hundreds of rows);
// swap for a Cloudflare Vectorize similarity search if the bank grows large
// enough that a full-table scan per lookup becomes a real cost.
export async function findCachedAnswer(
  db: ReturnType<typeof getDb>,
  question: string,
  threshold = DEFAULT_MATCH_THRESHOLD,
): Promise<CachedAnswer | null> {
  const normalized = normalizeQuestion(question);
  if (!normalized) return null;

  const rows = await db.select().from(answerBank).all();
  let best: CachedAnswer | null = null;
  for (const row of rows) {
    const score = similarity(normalized, row.questionNormalized);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: row.id, answerText: row.answerText, audioObjectKey: row.audioObjectKey, score };
    }
  }
  if (best) {
    await db.update(answerBank).set({ hitCount: sql`${answerBank.hitCount} + 1`, updatedAt: sql`CURRENT_TIMESTAMP` }).where(sql`${answerBank.id} = ${best.id}`);
  }
  return best;
}

export async function recordAnswer(
  db: ReturnType<typeof getDb>,
  question: string,
  answerText: string,
  opts: { audioObjectKey?: string; sourceProvider?: string } = {},
) {
  const normalized = normalizeQuestion(question);
  const [row] = await db
    .insert(answerBank)
    .values({
      questionNormalized: normalized,
      questionRaw: question.trim().slice(0, 2000),
      answerText: answerText.trim().slice(0, 8000),
      audioObjectKey: opts.audioObjectKey ?? null,
      sourceProvider: opts.sourceProvider ?? null,
    })
    .returning();
  return row;
}
