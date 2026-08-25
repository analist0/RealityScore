import { sql } from "drizzle-orm";
import { rateLimitHits } from "../db/schema";
import type { getDb } from "../db";

const WINDOW_SECONDS = 60;

// Fixed-window counter backed by D1 — atomic via onConflictDoUpdate, so
// concurrent requests in the same window still count correctly. Coarse
// (a burst right at a window boundary can slip through), but enough to
// stop unbounded abuse of a route that triggers paid LLM calls.
export async function checkRateLimit(
  db: ReturnType<typeof getDb>,
  identifier: string,
  limit: number,
): Promise<boolean> {
  const windowBucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const bucketKey = `${identifier}:${windowBucket}`;

  const [row] = await db
    .insert(rateLimitHits)
    .values({ bucketKey, count: 1 })
    .onConflictDoUpdate({ target: rateLimitHits.bucketKey, set: { count: sql`${rateLimitHits.count} + 1` } })
    .returning();

  return row.count <= limit;
}
