import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { findCachedAnswer, recordAnswer } from "../../../db/answer-bank";
import { getConfiguredProviders } from "../../../lib/llm/config";
import { createLLMRouter } from "../../../lib/llm/router";

// Single entry point for anything that needs an LLM reply (in-app help,
// and later the voice assistant / phone webhook): check the answer bank
// first, only call a provider on a miss, then cache the fresh answer.
//
// `scope` namespaces the cache (e.g. "help" vs "complaint-line") so two
// different callers asking literally the same words don't share an
// answer meant for a different context — it's folded into the text
// handed to the answer bank rather than a schema change, since the
// matcher only sees normalized token sets.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string; system?: string; scope?: string };
    const message = body.message?.trim() ?? "";
    if (!message) return Response.json({ error: "message is required" }, { status: 400 });

    const scope = body.scope?.trim() || "general";
    const scopedQuestion = `[${scope}] ${message}`;

    const db = getDb();
    const cached = await findCachedAnswer(db, scopedQuestion);
    if (cached) {
      return Response.json({ reply: cached.answerText, source: "cache", score: cached.score });
    }

    const providers = getConfiguredProviders(env);
    if (providers.length === 0) {
      return Response.json(
        { error: "no LLM provider configured — set XAI_API_KEY, GEMINI_API_KEY, or OLLAMA_CLOUD_API_KEY as Workers secrets" },
        { status: 503 },
      );
    }

    const messages = body.system
      ? [{ role: "system" as const, content: body.system }, { role: "user" as const, content: message }]
      : [{ role: "user" as const, content: message }];

    const router = createLLMRouter(providers);
    const result = await router.chat({ messages });
    await recordAnswer(db, scopedQuestion, result.text, { sourceProvider: result.provider });

    return Response.json({ reply: result.text, source: result.provider });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
  }
}
