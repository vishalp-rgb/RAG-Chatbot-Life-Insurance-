// Serves the static chatbot. /api/chat is reserved for the Gemini-powered RAG step
// (set the key with: npx wrangler secret put GEMINI_API_KEY).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/chat') {
      if (!env.GEMINI_API_KEY) return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 501 });
      return Response.json({ error: 'RAG endpoint not implemented yet' }, { status: 501 });
    }
    return env.ASSETS.fetch(request);
  },
};
