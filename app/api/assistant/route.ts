import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { DEFAULT_SCOPE, findCachedAnswer, recordAnswer } from "../../../db/answer-bank";
import { getConfiguredProviders } from "../../../lib/llm/config";
import { createLLMRouter } from "../../../lib/llm/router";
import { checkRateLimit } from "../../../lib/rate-limit";

const RATE_LIMIT_PER_MINUTE = 12;
// Bounds how much text gets forwarded to a paid provider per request — the
// per-IP rate limit alone doesn't stop one permitted request from carrying
// an arbitrarily large body up to the platform's HTTP limit.
const MAX_MESSAGE_LENGTH = 1000;
// Without this, omitting maxTokens lets each provider fall back to its own
// (potentially large) default — the input-length cap and per-IP rate limit
// don't bound the cost of the generated side of the request at all.
const MAX_OUTPUT_TOKENS = 500;

// System prompts are server-owned per scope, never taken from the request
// body: a public caller could otherwise pass any `system` text alongside
// a `scope` of its choosing and have the resulting answer persisted into
// the shared cache under that scope, poisoning it for every later caller
// of that scope without ever touching the secret-gated /api/answers POST.
const SYSTEM_PROMPTS: Record<string, string> = {
  help: "אתה עוזר שימוש קצר לאתר RealityScore. ענה רק על שאלות ניווט ושימוש באתר עצמו (איך לחפש, איך לכתוב ביקורת, איך להעלות תמונות) בעברית, בקצרה. אל תמציא מידע על עסקים או ציונים.",
};

// Single entry point for anything that needs an LLM reply (in-app help,
// and later the voice assistant / phone webhook): check the answer bank
// first, only call a provider on a miss, then cache the fresh answer.
//
// `scope` (e.g. "help" vs "complaint-line") namespaces the cache via a
// real column on answer_bank, so two different callers asking literally
// the same words don't share an answer meant for a different context.
// Only scopes with a registered system prompt above are accepted; anything
// else falls back to the unscoped default.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string; scope?: string };
    const message = body.message?.trim() ?? "";
    if (!message) return Response.json({ error: "message is required" }, { status: 400 });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ error: `message too long — max ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 });
    }

    const requestedScope = body.scope?.trim() || DEFAULT_SCOPE;
    const scope = requestedScope === DEFAULT_SCOPE || requestedScope in SYSTEM_PROMPTS ? requestedScope : DEFAULT_SCOPE;
    const db = getDb();

    // This route is publicly reachable and cache misses trigger paid LLM
    // calls — bound abuse with a per-IP fixed-window limit before doing
    // anything else.
    const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
    const withinLimit = await checkRateLimit(db, `assistant:${clientIp}`, RATE_LIMIT_PER_MINUTE);
    if (!withinLimit) {
      return Response.json({ error: "too many requests — try again in a moment" }, { status: 429 });
    }

    // Cache read is best-effort: a D1 hiccup here should fall through to
    // the LLM, not take the whole assistant down.
    try {
      const cached = await findCachedAnswer(db, message, scope);
      if (cached) {
        return Response.json({ reply: cached.answerText, source: "cache", score: cached.score });
      }
    } catch (error) {
      console.error("answer-bank lookup failed, falling through to LLM:", error);
    }

    const providers = getConfiguredProviders(env);
    if (providers.length === 0) {
      return Response.json(
        { error: "no LLM provider configured — set XAI_API_KEY, GEMINI_API_KEY, or OLLAMA_CLOUD_API_KEY as Workers secrets" },
        { status: 503 },
      );
    }

    const system = SYSTEM_PROMPTS[scope];
    const messages = system
      ? [{ role: "system" as const, content: system }, { role: "user" as const, content: message }]
      : [{ role: "user" as const, content: message }];

    const router = createLLMRouter(providers);
    const result = await router.chat({ messages, maxTokens: MAX_OUTPUT_TOKENS });

    // Cache write is best-effort too: a successful generation should still
    // reach the user even if persisting it for next time fails.
    try {
      await recordAnswer(db, message, result.text, { scope, sourceProvider: result.provider });
    } catch (error) {
      console.error("answer-bank write failed (reply still returned):", error);
    }

    return Response.json({ reply: result.text, source: result.provider });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
  }
}
