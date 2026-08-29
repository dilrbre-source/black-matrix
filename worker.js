// Optional Cloudflare Worker adapter.
// The Zero-Cost Edition does not require this worker; the browser talks to local Ollama.
// Keep this file as a future deployment adapter without putting secrets in the frontend.
export default {
  async fetch() {
    return new Response(JSON.stringify({
      status: 'OK',
      mode: 'ZERO_COST',
      message: 'Black Matrix local edition is running. Use the Vite app + Ollama locally.'
    }), { headers: { 'Content-Type': 'application/json' } });
  }
};
