import type { LLMProvider } from "../types";
import { createOpenAICompatibleProvider } from "./openai-compatible";

// Default models are placeholders — confirm current model names against
// each provider's docs before relying on them; pass an override once you
// know which one you want.
export function createXaiProvider(apiKey: string, model = "grok-4", fetchImpl?: typeof fetch): LLMProvider {
  return createOpenAICompatibleProvider({ name: "xai", baseUrl: "https://api.x.ai/v1", apiKey, model, fetchImpl });
}

export function createGeminiProvider(apiKey: string, model = "gemini-2.5-flash", fetchImpl?: typeof fetch): LLMProvider {
  return createOpenAICompatibleProvider({ name: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", apiKey, model, fetchImpl });
}

export function createOllamaCloudProvider(apiKey: string, model = "llama3.3", fetchImpl?: typeof fetch): LLMProvider {
  return createOpenAICompatibleProvider({ name: "ollama-cloud", baseUrl: "https://ollama.com/v1", apiKey, model, fetchImpl });
}
