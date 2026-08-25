import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { DEFAULT_SCOPE, findCachedAnswer, recordAnswer } from "../../../db/answer-bank";
import { checkRateLimit } from "../../../lib/rate-limit";

// Cheaper than /api/assistant (no paid provider call), but still a full
// per-scope table scan plus a hit-count write per match — an unbounded
// unauthenticated caller could otherwise exhaust D1 read/write capacity
// and skew hit-count analytics. Generous relative to the assistant route's
// abuse-prevention limit since this path never reaches a paid provider.
const GET_RATE_LIMIT_PER_MINUTE = 60;

// Cache-first lookup for repeat questions: callers (chat widget, voice
// assistant, phone webhook) check here BEFORE calling an LLM agent. A hit
// means "play/show this answer, skip the agent call"; a miss means the
// caller should generate a fresh answer and POST it back here to cache it.
//
// `scope` (query param on GET, body field on POST) namespaces the cache so
// two different callers asking the same words don't share an answer meant
// for a different context. Defaults to "general" if omitted.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const question = url.searchParams.get("q")?.trim() ?? "";
    if (!question) return Response.json({ error: "missing q" }, { status: 400 });
    const scope = url.searchParams.get("scope")?.trim() || DEFAULT_SCOPE;

    const db = getDb();
    const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
    const withinLimit = await checkRateLimit(db, `answers-get:${clientIp}`, GET_RATE_LIMIT_PER_MINUTE);
    if (!withinLimit) {
      return Response.json({ error: "too many requests — try again in a moment" }, { status: 429 });
    }

    const match = await findCachedAnswer(db, question, scope);
    if (!match) return Response.json({ cached: false });
    return Response.json({ cached: true, answer: match.answerText, audioObjectKey: match.audioObjectKey, score: match.score });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
  }
}

// Writes are restricted to trusted server-side callers: this is a raw
// cache-seed endpoint with no LLM/moderation in the loop, so an open POST
// would let anyone plant an arbitrary "cached answer" for any question
// (cache poisoning). Requires an INTERNAL_API_SECRET Workers secret and a
// matching `x-internal-secret` header — fails closed if the secret isn't
// configured. GET stays open: reading a cached answer isn't sensitive the
// way writing one is.
export async function POST(request: Request) {
  try {
    const secret = env.INTERNAL_API_SECRET;
    if (!secret || request.headers.get("x-internal-secret") !== secret) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { question?: string; answer?: string; scope?: string; audioObjectKey?: string; sourceProvider?: string };
    const question = body.question?.trim() ?? "";
    const answer = body.answer?.trim() ?? "";
    if (!question || !answer) return Response.json({ error: "question and answer are required" }, { status: 400 });

    const db = getDb();
    const row = await recordAnswer(db, question, answer, { scope: body.scope?.trim() || DEFAULT_SCOPE, audioObjectKey: body.audioObjectKey, sourceProvider: body.sourceProvider });
    return Response.json({ id: row.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
  }
}
