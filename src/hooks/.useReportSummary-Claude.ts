// src/hooks/useReportSummary.ts
// Manages the AI summary generation lifecycle for the /report route.
// Calls the Anthropic API directly from the browser using the fetch API.
//
// ASSUMPTION: VITE_ANTHROPIC_API_KEY is set in your .env file.
// Add to .env.example: VITE_ANTHROPIC_API_KEY=your_key_here
// Never commit the actual key.
//
// TODO: Move API calls to a Cloudflare Worker proxy so the key is never
// exposed in the browser bundle. The Worker holds ANTHROPIC_API_KEY as a
// secret and this hook calls the Worker URL instead of api.anthropic.com.
// Remove VITE_ANTHROPIC_API_KEY and the anthropic-dangerous-direct-browser-access
// header once the proxy is in place.

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

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

      if (!apiKey) {
        setState("error");
        setError(
          "Anthropic API key not found. Add VITE_ANTHROPIC_API_KEY to your .env file."
        );
        return;
      }

      try {
        const { system, userMessage } = buildSummaryPrompt(week, tone);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            // Required for browser-based calls
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 512,
            system,
            messages: [{ role: "user", content: userMessage }],
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(
            errBody?.error?.message ?? `API error ${response.status}`
          );
        }

        const data = await response.json();
        const text: string =
          data.content
            ?.filter((b: { type: string }) => b.type === "text")
            .map((b: { text: string }) => b.text)
            .join("") ?? "";

        setSummary(text.trim());
        setState("success");
      } catch (err) {
        setState("error");
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
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
