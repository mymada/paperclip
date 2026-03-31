import { asString } from "../adapters/utils.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function callLlm(messages: LlmMessage[], options: LlmCompletionOptions = {}) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("LLM API key not configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)");
  }

  if (process.env.OPENAI_API_KEY) {
    return callOpenAi(messages, options);
  } else {
    return callAnthropic(messages, options);
  }
}

async function callOpenAi(messages: LlmMessage[], options: LlmCompletionOptions) {
  const model = options.model || "gpt-4o";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${error}`);
  }

  const data = await res.json();
  return asString(data.choices?.[0]?.message?.content, "");
}

async function callAnthropic(messages: LlmMessage[], options: LlmCompletionOptions) {
  const model = options.model || "claude-3-5-sonnet-latest";
  const system = messages.find(m => m.role === "system")?.content;
  const userMessages = messages.filter(m => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system,
      messages: userMessages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${error}`);
  }

  const data = await res.json();
  return asString(data.content?.[0]?.text, "");
}
