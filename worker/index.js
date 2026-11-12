// Serves the static chatbot and a Gemini-backed /api/chat.
// Secret: npx wrangler secret put GEMINI_API_KEY   (model overridable via GEMINI_MODEL var)
const SYSTEM = `You are the Life Insurance AI Assistant for Bajaj Capital advisors.
Answer questions about life-insurance plans for advisors, in plain, concise English (max ~150 words unless asked).
Ground plan-specific facts (premiums, pay terms, returns/IRR, maturity, income) ONLY in the PLAYBOOK DATA provided. If the data does not contain the answer, say it is not in the playbook; never invent numbers.
For general concepts (riders, tax, surrender, free-look, claims etc.) give a short generic explanation and say to confirm exact terms in the insurer brochure.
Do not give personalised investment advice. Never mention estimation or rounding of ages.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/chat') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (!env.GEMINI_API_KEY) return Response.json({ error: 'AI not configured' }, { status: 501 });
    let body; try { body = await request.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
    const q = String(body.question || '').slice(0, 1000);
    if (!q) return Response.json({ error: 'empty' }, { status: 400 });
    const hist = (Array.isArray(body.history) ? body.history : []).slice(-6).flatMap(h => [
      { role: 'user', parts: [{ text: String(h.q || '').slice(0, 500) }] },
      { role: 'model', parts: [{ text: String(h.a || '').slice(0, 1500) }] },
    ]);
    const ctx = JSON.stringify(body.context || {}).slice(0, 24000);
    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [...hist, { role: 'user', parts: [{ text: `PLAYBOOK DATA:\n${ctx}\n\nQUESTION: ${q}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
      }),
    });
    if (!r.ok) return Response.json({ error: 'upstream' }, { status: 502 });
    const j = await r.json();
    const answer = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
    return Response.json({ answer });
  },
};
