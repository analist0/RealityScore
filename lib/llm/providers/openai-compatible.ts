import type { ChatRequest, ChatResult, LLMProvider } from "../types";
import { LLMProviderError } from "../types";

// Shared client for any provider that speaks the OpenAI chat-completions
// wire format. Ollama Cloud and x.ai expose this natively; Gemini exposes
// it via Google's OpenAI-compatibility endpoint. Verify the exact path
// against each provider's current docs before going live — this targets
// the documented `/chat/completions` shape as of this writing.
export function createOpenAICompatibleProvider(options: {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}): LLMProvider {
  const { name, baseUrl, apiKey, model, fetchImpl = fetch } = options;
  const REQUEST_TIMEOUT_MS = 15000;

  return {
    name,
    async chat(request: ChatRequest): Promise<ChatResult> {
      let response: Response;
      try {
        // Without a bound, a stalled provider would hang forever and the
        // router would never reach the next provider in the fallback chain.
        response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: request.messages,
            max_tokens: request.maxTokens,
            temperature: request.temperature,
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        throw new LLMProviderError(name, "network request failed", { cause: error });
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new LLMProviderError(name, `HTTP ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new LLMProviderError(name, "response had no message content");

      return { text, provider: name, model };
    },
  };
}
