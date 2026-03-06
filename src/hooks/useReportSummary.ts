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

const GEMINI_MODEL = "gemini-3-flash-preview";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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
              maxOutputTokens: 512,
              temperature: 0.7,
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const message =
            errBody?.error?.message ?? `Gemini API error ${response.status}`;
          throw new Error(message);
        }

        const data = await response.json();

        // Gemini response shape:
        // { candidates: [{ content: { parts: [{ text: "..." }] } }] }
        const text: string =
          data.candidates?.[0]?.content?.parts
            ?.filter((p: { text?: string }) => typeof p.text === "string")
            .map((p: { text: string }) => p.text)
            .join("") ?? "";

        if (!text) {
          throw new Error(
            "No text returned from Gemini. The prompt may have been blocked by safety filters."
          );
        }

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
