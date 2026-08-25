import type { ChatRequest, ChatResult, LLMProvider } from "./types";
import { LLMProviderError } from "./types";

export type RouterAttempt = { provider: string; error: string };
export type RouterResult = ChatResult & { attempts: RouterAttempt[] };

// Tries providers in order, falling back to the next on any failure
// (network error, non-2xx, empty response). Throws only if every
// provider in the list fails.
export function createLLMRouter(providers: LLMProvider[]) {
  if (providers.length === 0) {
    throw new Error("createLLMRouter requires at least one provider");
  }

  return {
    providers,
    async chat(request: ChatRequest): Promise<RouterResult> {
      const attempts: RouterAttempt[] = [];

      for (const provider of providers) {
        try {
          const result = await provider.chat(request);
          return { ...result, attempts };
        } catch (error) {
          const message = error instanceof LLMProviderError ? error.message : String(error);
          attempts.push({ provider: provider.name, error: message });
        }
      }

      throw new Error(`all providers failed: ${attempts.map((a) => `${a.provider} (${a.error})`).join("; ")}`);
    },
  };
}
