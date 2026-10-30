/* Talks to the Modexa proxy Worker. Provider keys stay in the Worker. */
const PROXY_URL = (import.meta.env.VITE_PROXY_URL || "").replace(/\/+$/, "");
const PROXY_TOKEN = import.meta.env.VITE_PROXY_TOKEN || "";

const IDLE_MS = 90000;

export const chatReady = Boolean(PROXY_URL && PROXY_TOKEN);

/* Turn provider failures into something readable in the chat. */
function describeFailure(data, status) {
  if (data.status === 402) return "the provider account has no credits";
  if (data.status === 429) return "the model is rate limited right now, try again shortly";
  if (data.status === 401 || data.status === 403) return "the provider rejected the API key";
  if (status === 401) return "the proxy token is wrong";
  if (status === 503) return "no API key is configured for this model";
  if (status === 504 || status === 524) return "the provider took too long to answer";
  if (status === 502) return data.detail ? `provider error – ${String(data.detail).slice(0, 120)}` : "provider error";
  return data.error || `request failed (${status})`;
}

/**
 * Ask a model and stream the reply.
 * onDelta(fullText) fires whenever more text arrives, with everything so far.
 * Resolves with the complete text.
 */
export async function askModel({ modelId, messages, onDelta, signal }) {
  if (!chatReady) throw new Error("Proxy is not configured in .env");
  if (!modelId) throw new Error("No model selected");

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort);
  }

  /* Reset on every chunk: a long answer may take minutes, a dead pipe may not. */
  let idle = null;
  const bumpIdle = () => {
    window.clearTimeout(idle);
    idle = window.setTimeout(() => controller.abort(), IDLE_MS);
  };
  bumpIdle();

  const abortMessage = () =>
    controller.signal.aborted ? "the model took too long to answer" : "the reply was interrupted";

  try {
    let response;
    try {
      response = await fetch(`${PROXY_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PROXY_TOKEN}`,
        },
        body: JSON.stringify({ modelId, messages, stream: true }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new Error(error.name === "AbortError" ? abortMessage() : "the proxy could not be reached");
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(describeFailure(data, response.status));
    }

    if (!response.body) throw new Error("the proxy sent no reply");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bumpIdle();
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;

          let event;
          try {
            event = JSON.parse(data);
          } catch {
            continue;
          }

          if (event.error) throw new Error(String(event.error));
          if (typeof event.delta === "string" && event.delta) {
            full += event.delta;
            if (onDelta) onDelta(full);
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") throw new Error(abortMessage());
      throw error;
    } finally {
      reader.releaseLock();
    }

    return full;
  } finally {
    window.clearTimeout(idle);
    if (signal) signal.removeEventListener("abort", forwardAbort);
  }
}
