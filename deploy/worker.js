export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Allt som inte är en fil serveras av index.html (t.ex. /download).
    const response = await env.ASSETS.fetch(request);
    if (response.status === 404 && url.pathname !== "/") {
      return env.ASSETS.fetch(new Request(new URL("/", url), request));
    }
    return response;
  },
};
