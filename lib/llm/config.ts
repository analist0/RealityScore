import type { LLMProvider } from "./types";
import { createGeminiProvider, createOllamaCloudProvider, createXaiProvider } from "./providers";

type ProviderEnv = {
  XAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OLLAMA_CLOUD_API_KEY?: string;
  LLM_PROVIDER_ORDER?: string;
};

const BUILDERS: Record<string, (apiKey: string) => LLMProvider> = {
  xai: (key) => createXaiProvider(key),
  gemini: (key) => createGeminiProvider(key),
  "ollama-cloud": (key) => createOllamaCloudProvider(key),
};

const KEY_FOR: Record<string, keyof ProviderEnv> = {
  xai: "XAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  "ollama-cloud": "OLLAMA_CLOUD_API_KEY",
};

const DEFAULT_ORDER = ["xai", "gemini", "ollama-cloud"];

// Reads Cloudflare Workers secrets (set via `wrangler secret put`) and
// builds an ordered provider list containing only the ones with a key
// configured. Set LLM_PROVIDER_ORDER (comma-separated, e.g.
// "gemini,xai,ollama-cloud") as a var to change priority without a
// code change. Empty list means no provider is configured yet.
export function getConfiguredProviders(env: ProviderEnv): LLMProvider[] {
  const order = env.LLM_PROVIDER_ORDER?.split(",").map((s) => s.trim()).filter(Boolean) ?? DEFAULT_ORDER;

  const providers: LLMProvider[] = [];
  for (const id of order) {
    const key = KEY_FOR[id];
    const build = BUILDERS[id];
    const apiKey = key && env[key];
    if (key && build && apiKey) providers.push(build(apiKey));
  }
  return providers;
}
