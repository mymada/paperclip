import { asString } from "../adapters/utils.js";
import { logger } from "../middleware/logger.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Optional correlation fields for debug logs (no message bodies or secrets). */
export interface LlmLogMeta {
  op?: string;
  companyId?: string;
  issueId?: string;
  runId?: string;
  requestId?: string;
}

export interface LlmCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  logMeta?: LlmLogMeta;
}

function totalPromptChars(messages: LlmMessage[]): number {
  let n = 0;
  for (const m of messages) {
    n += m.content.length;
  }
  return n;
}

export async function callLlm(messages: LlmMessage[], options: LlmCompletionOptions = {}) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("LLM API key not configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)");
  }

  const logMeta = options.logMeta;
  const promptChars = totalPromptChars(messages);
  const messageCount = messages.length;
  const started = Date.now();

  const logBase = {
    ...logMeta,
    messageCount,
    promptChars,
  };

  try {
    let text: string;
    let provider: "openai" | "anthropic";
    let model: string;
    if (process.env.OPENAI_API_KEY) {
      provider = "openai";
      model = options.model || "gpt-4o";
      text = await callOpenAi(messages, options);
    } else {
      provider = "anthropic";
      model = options.model || "claude-sonnet-4-6";
      text = await callAnthropic(messages, options);
    }
    const durationMs = Date.now() - started;
    const responseChars = text.length;
    logger.debug(
      { ...logBase, provider, model, durationMs, responseChars, ok: true },
      "LLM completion",
    );
    return text;
  } catch (err) {
    const durationMs = Date.now() - started;
    const provider = process.env.OPENAI_API_KEY ? "openai" : "anthropic";
    const model =
      options.model || (provider === "openai" ? "gpt-4o" : "claude-sonnet-4-6");
    logger.warn(
      { ...logBase, provider, model, durationMs, ok: false, err },
      "LLM completion failed",
    );
    throw err;
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
  const model = options.model || "claude-sonnet-4-6";
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
