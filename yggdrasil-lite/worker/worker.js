/**
 * Yggdrasil Lite – Cloudflare Worker API Proxy
 *
 * Environment variables (set via: wrangler secret put KEY_NAME):
 *   TAVILY_API_KEY  – your Tavily API key
 *   GEMINI_API_KEY  – your Google Gemini API key
 *   ALLOWED_ORIGIN  – e.g. "https://adarshsadanand.in"  (optional, defaults to *)
 */

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const TAVILY_API_URL = "https://api.tavily.com/search";

// ─── CORS helper ────────────────────────────────────────────────────────────
function corsHeaders(env, request) {
  const origin = request.headers.get("Origin") || "*";
  const allowed = env.ALLOWED_ORIGIN || "*";
  const allowOrigin = allowed === "*" || origin === allowed ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Research-Token",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

// ─── Tavily Search ───────────────────────────────────────────────────────────
async function tavilySearch(query, numResults, apiKey) {
  const res = await fetch(TAVILY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: numResults,
      include_answer: true,
      include_raw_content: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavily error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── Gemini Synthesis ────────────────────────────────────────────────────────
async function geminiSynthesize(topic, sources, depth, apiKey) {
  const depthConfig = {
    quick: { wordCount: "800-1200", sections: 4 },
    standard: { wordCount: "1500-2000", sections: 6 },
    deep: { wordCount: "2500-3000", sections: 8 },
  };
  const cfg = depthConfig[depth] || depthConfig.standard;

  // Build source context
  const sourceContext = sources
    .slice(0, 15)
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title || "Untitled"}\nURL: ${s.url || ""}\n${(s.content || s.snippet || "").substring(0, 600)}`
    )
    .join("\n\n---\n\n");

  const prompt = `You are a world-class research analyst. Synthesize a comprehensive, academic-quality research report on the topic below.

TOPIC: ${topic}

SOURCES:
${sourceContext}

INSTRUCTIONS:
- Write ${cfg.wordCount} words in a scholarly, IEEE-paper style
- Use markdown headers (##) for sections
- Include: Abstract, Introduction, Background/Context, Key Findings (${cfg.sections - 3} sub-sections), Discussion, Conclusion
- Cite sources inline using [1], [2], etc. notation matching the source list above
- Be factual, analytical, and cite evidence from the sources
- Do NOT fabricate information; only use what is present in the sources
- Write in third person, academic prose

OUTPUT FORMAT (Markdown):
## Abstract
[150-word summary]

## 1. Introduction
[...]

## 2. Background
[...]

## 3. Key Findings
### 3.1 [First finding]
[...]
...

## 4. Discussion
[...]

## 5. Conclusion
[...]

## References
[Numbered list of sources used]`;

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 4096,
        topP: 0.9,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

// ─── Generate search queries with Gemini ─────────────────────────────────────
async function generateQueries(topic, numQueries, apiKey) {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Generate ${numQueries} diverse, specific search queries for researching: "${topic}". 
Return ONLY the queries, one per line, no numbering, no extra text.`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
    }),
  });

  if (!res.ok) return [topic];
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || topic;
  return text
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, numQueries);
}

// ─── Main handler ────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const cors = corsHeaders(env, request);

    // Pre-flight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // ── Health check ──────────────────────────────────────────────────────
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json(
        { status: "ok", timestamp: new Date().toISOString() },
        200,
        cors
      );
    }

    // ── Research endpoint ─────────────────────────────────────────────────
    if (url.pathname === "/api/research" && request.method === "POST") {
      // Validate presence of secrets
      if (!env.TAVILY_API_KEY || !env.GEMINI_API_KEY) {
        return json(
          { error: "Server misconfiguration: API keys not set." },
          500,
          cors
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400, cors);
      }

      const topic = (body.topic || "").trim();
      const depth = ["quick", "standard", "deep"].includes(body.depth)
        ? body.depth
        : "standard";

      if (!topic) {
        return json({ error: "topic is required" }, 400, cors);
      }

      const numQueries = { quick: 3, standard: 5, deep: 8 }[depth];
      const numResults = { quick: 4, standard: 6, deep: 10 }[depth];

      try {
        // Step 1: Generate search queries
        const queries = await generateQueries(
          topic,
          numQueries,
          env.GEMINI_API_KEY
        );

        // Step 2: Search Tavily for each query (parallelised, cap at 3 concurrent)
        const searchPromises = queries
          .slice(0, numQueries)
          .map((q) =>
            tavilySearch(q, numResults, env.TAVILY_API_KEY).catch(() => ({
              results: [],
            }))
          );
        const searchResponses = await Promise.all(searchPromises);

        // Flatten + deduplicate by URL
        const seen = new Set();
        const allSources = [];
        for (const resp of searchResponses) {
          for (const r of resp.results || []) {
            if (r.url && !seen.has(r.url)) {
              seen.add(r.url);
              allSources.push(r);
            }
          }
        }

        // Step 3: Synthesize with Gemini
        const synthesis = await geminiSynthesize(
          topic,
          allSources,
          depth,
          env.GEMINI_API_KEY
        );

        // Build bibliography
        const bibliography = allSources.slice(0, 20).map((s, i) => ({
          index: i + 1,
          title: s.title || "Untitled",
          url: s.url || "",
          published_date: s.published_date || "",
          source: s.source || new URL(s.url || "https://unknown").hostname,
        }));

        return json(
          {
            topic,
            depth,
            synthesis,
            sources: bibliography,
            bibliography,
            metadata: {
              queries_used: queries,
              total_sources: allSources.length,
              timestamp: new Date().toISOString(),
            },
          },
          200,
          cors
        );
      } catch (err) {
        console.error("Research error:", err);
        return json({ error: err.message || "Research failed" }, 500, cors);
      }
    }

    return json({ error: "Not found" }, 404, cors);
  },
};
