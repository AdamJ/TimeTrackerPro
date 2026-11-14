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

// Known origins the app is served from. Defense in depth only: the real gate
// is the signed-in user check below (accounts are invite-only).
const ALLOWED_ORIGINS = new Set([
	"https://timetrackerpro.adamjolicoeur.me",
	"https://timetrackerpro.pages.dev",
	"http://localhost:8080",
	// Tauri desktop/iOS webview origins (macOS/iOS, Windows)
	"tauri://localhost",
	"http://tauri.localhost",
]);
// Largest body the client legitimately sends (a busy week's prompt is well under this).
const MAX_BODY_BYTES = 256 * 1024;

// Best-effort per-user limit. State lives in this isolate's memory, so it
// resets on cold start and isn't shared across regions.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const recentRequests = new Map<string, number[]>();

function isRateLimited(userId: string, now: number): boolean {
	const windowStart = now - RATE_WINDOW_MS;
	const hits = (recentRequests.get(userId) ?? []).filter((t) => t > windowStart);
	if (hits.length >= RATE_LIMIT) {
		recentRequests.set(userId, hits);
		return true;
	}
	hits.push(now);
	recentRequests.set(userId, hits);
	if (recentRequests.size > 5000) {
		for (const [key, times] of recentRequests) {
			if (times.every((t) => t <= windowStart)) recentRequests.delete(key);
		}
	}
	return false;
}

// Reads the request body, stopping as soon as it passes `limit` bytes so a
// chunked upload with no Content-Length can't make the function buffer it all.
// Returns null when the body is too large.
async function readBodyWithLimit(req: Request, limit: number): Promise<string | null> {
	if (Number(req.headers.get("Content-Length") ?? 0) > limit) return null;
	if (!req.body) return "";
	const reader = req.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > limit) {
			await reader.cancel();
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}

// Accounts are invite-only, so any real user session is authorized. The anon
// key is also a valid JWT (it passes the gateway's verify_jwt), which is why
// the token is checked against Auth here: an anon token has no user.
async function getSignedInUserId(req: Request): Promise<string | null> {
	const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
	if (!token || !supabaseUrl || !anonKey) return null;

	const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
		headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
	});
	if (!res.ok) return null;
	const user = (await res.json().catch(() => null)) as { id?: string } | null;
	return user?.id ?? null;
}

// Cloudflare Pages branch-preview deployments, e.g. https://<branch>.timetrackerpro.pages.dev
const ALLOWED_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.timetrackerpro\.pages\.dev$/;

function isAllowedOrigin(origin: string | null): origin is string {
	if (!origin) return false;
	return ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGIN_PATTERN.test(origin);
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
		"Vary": "Origin",
	};
	if (isAllowedOrigin(origin)) {
		headers["Access-Control-Allow-Origin"] = origin;
	}
	return headers;
}

serve(async (req: Request) => {
	const origin = req.headers.get("Origin");
	const CORS_HEADERS = buildCorsHeaders(origin);

	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: CORS_HEADERS });
	}

	if (!isAllowedOrigin(origin)) {
		return new Response(JSON.stringify({ error: "Origin not allowed" }), {
			status: 403,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	const userId = await getSignedInUserId(req);
	if (!userId) {
		return new Response(JSON.stringify({ error: "Sign in required" }), {
			status: 401,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	if (isRateLimited(userId, Date.now())) {
		return new Response(JSON.stringify({ error: "Too many requests" }), {
			status: 429,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Retry-After": "60" },
		});
	}

	const apiKey = Deno.env.get("GEMINI_API_KEY");
	if (!apiKey) {
		return new Response(JSON.stringify({ error: "AI service not configured" }), {
			status: 503,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	const rawBody = await readBodyWithLimit(req, MAX_BODY_BYTES);
	if (rawBody === null) {
		return new Response(JSON.stringify({ error: "Request too large" }), {
			status: 413,
			headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
		});
	}

	let body: Record<string, unknown>;
	try {
		body = JSON.parse(rawBody);
		if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("not an object");
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

	// Forward only the fields the app sends, so the proxy can't be used to
	// enable tools, grounding or other billable Gemini features.
	const geminiBody = {
		systemInstruction: body.systemInstruction,
		contents: body.contents,
		generationConfig: body.generationConfig,
	};

	const upstream = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
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
