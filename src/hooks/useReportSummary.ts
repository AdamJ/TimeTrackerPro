// src/hooks/useReportSummary.ts
// Manages the AI summary generation lifecycle for the /report route.
// Uses the Google Gemini API (free tier via AI Studio).
//
// Setup:
// 1. Get a free API key at https://aistudio.google.com
// 2. Add to .env: VITE_GEMINI_API_KEY=your_key_here
// 3. Add to .env.example: VITE_GEMINI_API_KEY=

import { useState, useCallback } from "react";
import {
  WeekGroup,
  ReportTone,
  buildSummaryPrompt,
} from "@/utils/reportUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GenerationState =
  | "idle"
  | "loading"
  | "success"
  | "error";

export interface UseReportSummaryReturn {
  summary: string;
  state: GenerationState;
  error: string | null;
  generate: (week: WeekGroup, tone: ReportTone) => Promise<void>;
  updateSummary: (value: string) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.5-flash"; // Free-tier Gemini model as of June 2024. Check ai.google.dev for updates.
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

interface GeminiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Maps a Gemini API HTTP status + error body to a human-readable message.
 * Distinguishes between quota exhaustion, rate limiting, overload, and
 * configuration problems so the user knows what action to take.
 */
function classifyGeminiError(status: number, body: GeminiErrorBody, retryAfter: string | null): string {
  const apiStatus = body?.error?.status ?? "";
  const apiMessage = body?.error?.message ?? "";
  const lower = apiMessage.toLowerCase();

  switch (status) {
    case 429: {
      // RESOURCE_EXHAUSTED covers both per-minute rate limits and daily quota.
      // Distinguish by the message text Gemini includes.
      const waitHint = retryAfter ? ` Retry-After: ${retryAfter}s.` : " Wait 30–60 seconds and try again.";
      if (lower.includes("quota") || lower.includes("exceeded") || lower.includes("billing")) {
        return "Daily free-tier quota exhausted for this API key. Usage resets at midnight Pacific Time. Check your quota at aistudio.google.com, or try again tomorrow.";
      }
      return `Rate limit reached — too many requests in a short period.${waitHint}`;
    }

    case 503:
      // This is the actual "high demand / overloaded" error — distinct from quota.
      return "The Gemini service is temporarily overloaded (HTTP 503). This is a server-side capacity issue, not a quota or key problem. Wait a few seconds and try again.";

    case 500:
      // Often caused by an oversized input context on Gemini's end.
      return "Gemini encountered an internal server error (HTTP 500). This may be caused by an unusually large date range. Try a shorter range, or wait a moment and retry.";

    case 504:
      return "The request timed out before Gemini could respond (HTTP 504). Try a shorter date range or retry in a moment.";

    case 403:
      if (apiStatus === "PERMISSION_DENIED") {
        return "API key invalid or lacks permission for this model. Verify VITE_GEMINI_API_KEY at aistudio.google.com.";
      }
      return `Access denied (HTTP 403). Check your API key permissions.`;

    case 400:
      if (apiStatus === "FAILED_PRECONDITION") {
        return "This Gemini model is not available on the free tier in your region. Enable billing at console.cloud.google.com or use a different region.";
      }
      return `Invalid request (HTTP 400): ${apiMessage || "the prompt was malformed"}. Try a different date range.`;

    case 404:
      return "Gemini model not found (HTTP 404). The model name in useReportSummary.ts may be outdated — check ai.google.dev for current model IDs.";

    default:
      return apiMessage
        ? `Gemini error (HTTP ${status}): ${apiMessage}`
        : `Unexpected Gemini API error (HTTP ${status}). Try again in a moment.`;
  }
}

/**
 * Maps a non-STOP finishReason to a human-readable message.
 * Returns null if the reason is STOP or absent (normal completion).
 */
function classifyFinishReason(reason: string): string | null {
  switch (reason) {
    case "SAFETY":
      return "The summary was blocked by Gemini safety filters. Try adjusting your task descriptions or selecting a different date range.";
    case "RECITATION":
      return "Gemini declined to generate the summary due to a potential content policy concern (recitation). Try rephrasing task descriptions.";
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
      return "The summary was blocked by Gemini content policy. Check task descriptions for flagged content and try again.";
    case "MAX_TOKENS":
      // Handled before this function is called (when partial text exists).
      // Falls through to the default for the edge case of MAX_TOKENS + no text.
      return "The summary was cut off by the API token limit. Try selecting a shorter date range.";
    case "OTHER":
      return "Gemini stopped generating for an unspecified reason. Try again.";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReportSummary(): UseReportSummaryReturn {
  const [summary, setSummary] = useState<string>("");
  const [state, setState] = useState<GenerationState>("idle");
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (week: WeekGroup, tone: ReportTone) => {
      setState("loading");
      setError(null);
      setSummary("");

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

      if (!apiKey) {
        setState("error");
        setError(
          "Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env file. Get a free key at https://aistudio.google.com"
        );
        return;
      }

      try {
        const { system, userMessage } = buildSummaryPrompt(week, tone);

        // Gemini combines system prompt and user message into a single
        // "contents" array. The system instruction goes in systemInstruction,
        // the user message goes in contents.
        const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: system }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: userMessage }],
              },
            ],
            generationConfig: {
              // No maxOutputTokens cap — let the model produce a complete response.
              // gemini-2.5-flash is a thinking model: thinking tokens share the same
              // output budget, so a low cap (e.g. 512) leaves almost nothing for
              // visible text. Disabling thinking via thinkingBudget:0 avoids this
              // entirely for a simple summarization task.
              temperature: 0.7,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        });

        if (!response.ok) {
          const errBody: GeminiErrorBody = await response.json().catch(() => ({}));
          const retryAfter = response.headers.get("Retry-After");
          throw new Error(classifyGeminiError(response.status, errBody, retryAfter));
        }

        const data = await response.json();

        // Gemini response shape:
        // { candidates: [{ finishReason: string, content: { parts: [{ text: "..." }] } }] }
        const candidate = data.candidates?.[0];
        const finishReason: string = candidate?.finishReason ?? "STOP";

        const text: string =
          candidate?.content?.parts
            ?.filter((p: { text?: string }) => typeof p.text === "string")
            .map((p: { text: string }) => p.text)
            .join("") ?? "";

        // Check MAX_TOKENS before the empty-text guard: a truncated response
        // has partial text so !text is false, but it is not a complete summary.
        if (finishReason === "MAX_TOKENS") {
          throw new Error(
            "The summary was cut off by the API token limit. Try selecting a shorter date range and regenerate."
          );
        }

        if (!text) {
          const finishMessage = classifyFinishReason(finishReason);
          throw new Error(
            finishMessage ?? `No text returned from Gemini (finishReason: ${finishReason || "unknown"}).`
          );
        }

        setSummary(text.trim());
        setState("success");
      } catch (err) {
        setState("error");
        // Distinguish network/connectivity failures from API errors
        if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
          setError("Network error — could not reach Gemini. Check your internet connection and try again.");
        } else {
          setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        }
      }
    },
    []
  );

  const updateSummary = useCallback((value: string) => {
    setSummary(value);
  }, []);

  const reset = useCallback(() => {
    setSummary("");
    setState("idle");
    setError(null);
  }, []);

  return { summary, state, error, generate, updateSummary, reset };
}
