import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { findCachedAnswer, recordAnswer } from "../../../db/answer-bank";
import { getConfiguredProviders } from "../../../lib/llm/config";
import { createLLMRouter } from "../../../lib/llm/router";

// Single entry point for anything that needs an LLM reply (in-app help,
// and later the voice assistant / phone webhook): check the answer bank
// first, only call a provider on a miss, then cache the fresh answer.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message?.trim() ?? "";
    if (!message) return Response.json({ error: "message is required" }, { status: 400 });

    const db = getDb();
    const cached = await findCachedAnswer(db, message);
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

    const router = createLLMRouter(providers);
    const result = await router.chat({ messages: [{ role: "user", content: message }] });
    await recordAnswer(db, message, result.text, { sourceProvider: result.provider });

    return Response.json({ reply: result.text, source: result.provider });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
  }
}
