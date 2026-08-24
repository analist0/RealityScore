export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatRequest = {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
};

export type ChatResult = {
  text: string;
  provider: string;
  model: string;
};

export interface LLMProvider {
  name: string;
  chat(request: ChatRequest): Promise<ChatResult>;
}

export class LLMProviderError extends Error {
  constructor(public readonly provider: string, message: string, options?: { cause?: unknown }) {
    super(`[${provider}] ${message}`, options);
    this.name = "LLMProviderError";
  }
}
