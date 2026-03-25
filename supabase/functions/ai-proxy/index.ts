// Supabase Edge Function: ai-proxy
// Proxies AI API requests server-side so API keys are never exposed to the client.
//
// Deploy: supabase functions deploy ai-proxy
// Required secret: supabase secrets set GEMINI_API_KEY=<your-key>
//
// Client usage: POST /functions/v1/ai-proxy with JSON body:
//   { model, systemInstruction, contents, generationConfig }
// Response: Gemini generateContent response body (passthrough)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const ALLOWED_MODELS = new Set(["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]);

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

serve(async (req: Request) => {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}

	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	const apiKey = Deno.env.get("GEMINI_API_KEY");
	if (!apiKey) {
		return new Response(JSON.stringify({ error: "AI service not configured" }), {
			status: 503,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
			status: 400,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	const model = typeof body.model === "string" ? body.model : "gemini-2.5-flash";
	if (!ALLOWED_MODELS.has(model)) {
		return new Response(JSON.stringify({ error: "Unsupported model" }), {
			status: 400,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	// Strip the model field — it belongs in the URL, not the body
	const { model: _model, ...geminiBody } = body;

	const upstream = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(geminiBody),
	});

	const responseBody = await upstream.text();
	return new Response(responseBody, {
		status: upstream.status,
		headers: {
			...CORS_HEADERS,
			"Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
		},
	});
});
