/* Modexa model proxy.
 *
 * The provider keys live here as Worker secrets; the app only holds a proxy
 * token and the model id. Edit the catalogue in ../models.js and keep this map
 * in sync.
 */

const MODELS = {
  "nvidia-deepseek-v4-1-flash": {
    provider: "nvidia",
    model: "deepseek-ai/deepseek-v4.1-flash",
    key: "NVIDIA_API_KEY_DEEPSEEK",
  },
  "nvidia-nemotron-3-5-super-vl": {
    provider: "nvidia",
    model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
    key: "NVIDIA_API_KEY_NEMOTRON_SUPER",
  },
  "nvidia-nemotron-3-5-lightning": {
    provider: "nvidia",
    model: "nvidia/nemotron-3.5-lightning-30b-a3b",
    key: "NVIDIA_API_KEY_NEMOTRON_LIGHTNING",
  },
  "openrouter-gpt-6-1-terra-pro": {
    provider: "openrouter",
    model: "OpenAI/GPT-6.1-Terra-Pro",
    key: "OPENROUTER_API_KEY_TERRA",
  },
  "openrouter-gemma-4-26b": {
    provider: "openrouter",
    model: "google/gemma-4-26b-a4b-it:free",
    key: "OPENROUTER_API_KEY_GEMMA",
  },
};

const ENDPOINTS = {
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

const ALLOWED_ORIGINS = [
  "http://localhost:4317",
  "http://127.0.0.1:4317",
  "http://tauri.localhost",
  "tauri://localhost",
  "https://modexa-site.hoby123456-123.workers.dev",
];

const MAX_TOKENS = 2048;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((message) => message && typeof message.text === "string")
    .slice(-20)
    .map((message) => ({
      role: message.role === "agent" ? "assistant" : "user",
      content: String(message.text).slice(0, 8000),
    }));
}

function providerHeaders(target, key) {
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (target.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://modexa.dev";
    headers["X-Title"] = "Modexa";
  }
  return headers;
}

/* Pull the streamed text out of one provider event (OpenAI-compatible). */
function deltaOf(parsed) {
  const choice = parsed?.choices?.[0];
  const piece = choice?.delta?.content ?? choice?.message?.content ?? parsed?.delta ?? "";
  return typeof piece === "string" ? piece : "";
}

/* Forward the provider stream as normalized `data: {"delta": "..."}` events. */
async function streamReply({ target, key, messages, cors }) {
  const payload = {
    model: target.model,
    messages,
    max_tokens: MAX_TOKENS,
    temperature: 0.7,
    stream: true,
  };

  const controller = new AbortController();
  const headerTimeout = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch(ENDPOINTS[target.provider], {
      method: "POST",
      headers: providerHeaders(target, key),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error && error.name === "AbortError";
    return json(
      { error: aborted ? "Provider timeout" : "Provider unreachable", detail: String(error).slice(0, 200) },
      aborted ? 504 : 502,
      cors,
    );
  } finally {
    clearTimeout(headerTimeout);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    return json({ error: "Provider error", status: response.status, detail }, 502, cors);
  }

  const body = response.body;
  if (!body) return json({ error: "Provider sent no body" }, 502, cors);

  const isEventStream = (response.headers.get("Content-Type") || "").includes("text/event-stream");
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(streamController) {
      const reader = body.getReader();
      const emit = (event) => streamController.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      let buffer = "";
      let sent = 0;

      const handleLine = (raw) => {
        const line = raw.trim();
        if (!line || line.startsWith(":") || !line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") return;
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          return;
        }
        if (parsed?.error) {
          emit({ error: String(parsed.error.message || parsed.error).slice(0, 200) });
          return;
        }
        const piece = deltaOf(parsed);
        if (!piece) return;
        sent += piece.length;
        emit({ delta: piece });
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          if (!isEventStream) continue;
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          for (const line of lines) handleLine(line);
        }
        buffer += decoder.decode();

        if (!isEventStream) {
          /* Provider ignored stream:true and answered with one JSON body. */
          try {
            const parsed = JSON.parse(buffer);
            const text = parsed?.choices?.[0]?.message?.content ?? "";
            if (text) {
              sent += text.length;
              emit({ delta: text });
            }
          } catch {
            /* fall through to the empty-reply event */
          }
        } else if (buffer.trim()) {
          handleLine(buffer);
        }

        if (!sent) emit({ error: "The model returned an empty reply" });
        emit({ done: true, model: target.model });
      } catch (error) {
        emit({ error: "The reply was interrupted", detail: String(error).slice(0, 200) });
      } finally {
        try {
          await reader.cancel();
        } catch {}
        streamController.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/" || url.pathname === "/health") {
      const models = Object.entries(MODELS).map(([id, entry]) => ({
        id,
        model: entry.model,
        ready: Boolean(env[entry.key]),
      }));
      return json({ ok: true, service: "modexa-proxy", streaming: true, models }, 200, cors);
    }

    if (url.pathname !== "/chat") return json({ error: "Not found" }, 404, cors);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!env.PROXY_TOKEN || token !== env.PROXY_TOKEN) {
      return json({ error: "Unauthorized" }, 401, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    const target = MODELS[body?.modelId];
    if (!target) return json({ error: "Unknown model" }, 400, cors);

    const key = env[target.key];
    if (!key) return json({ error: `No key configured for ${target.model}` }, 503, cors);

    const messages = cleanMessages(body?.messages);
    if (!messages.length) return json({ error: "No messages" }, 400, cors);

    if (body?.stream !== false) return streamReply({ target, key, messages, cors });

    /* Non-streaming path, kept for scripted callers. */
    const payload = {
      model: target.model,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
      stream: false,
    };

    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      response = await fetch(ENDPOINTS[target.provider], {
        method: "POST",
        headers: providerHeaders(target, key),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = error && error.name === "AbortError";
      return json(
        { error: aborted ? "Provider timeout" : "Provider unreachable", detail: String(error).slice(0, 200) },
        aborted ? 504 : 502,
        cors,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 400);
      return json({ error: "Provider error", status: response.status, detail }, 502, cors);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) return json({ error: "Empty reply from provider" }, 502, cors);

    return json({ text, model: data.model || target.model, usage: data.usage ?? null }, 200, cors);
  },
};
