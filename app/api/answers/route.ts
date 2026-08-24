import { getDb } from "../../../db";
import { findCachedAnswer, recordAnswer } from "../../../db/answer-bank";

// Cache-first lookup for repeat questions: callers (chat widget, voice
// assistant, phone webhook) check here BEFORE calling an LLM agent. A hit
// means "play/show this answer, skip the agent call"; a miss means the
// caller should generate a fresh answer and POST it back here to cache it.
export async function GET(request: Request) {
  try {
    const question = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!question) return Response.json({ error: "missing q" }, { status: 400 });

    const db = getDb();
    const match = await findCachedAnswer(db, question);
    if (!match) return Response.json({ cached: false });
    return Response.json({ cached: true, answer: match.answerText, audioObjectKey: match.audioObjectKey, score: match.score });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: string; answer?: string; audioObjectKey?: string; sourceProvider?: string };
    const question = body.question?.trim() ?? "";
    const answer = body.answer?.trim() ?? "";
    if (!question || !answer) return Response.json({ error: "question and answer are required" }, { status: 400 });

    const db = getDb();
    const row = await recordAnswer(db, question, answer, { audioObjectKey: body.audioObjectKey, sourceProvider: body.sourceProvider });
    return Response.json({ id: row.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "unexpected error" }, { status: 500 });
  }
}
