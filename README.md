# Life Insurance AI Assistant (first cut)

Guided chatbot: client goal → age (typed) → recommended product type → structure → payment pattern → top plans → plan explanation. Also answers questions about any named plan.

- `index.html` – the complete single-file app (open in a browser)
- `src/` – CSS, app logic (`app1.js`), UI/flow (`app2.js`), `build.py` to regenerate `index.html`
- `data/` – plan data (`lps.json`) and insurer logos

Rebuild: `python3 src/build.py`. A RAG-based version is planned next.

## Deploy (Cloudflare Workers)
```
npm i -g wrangler && wrangler login      # or set CLOUDFLARE_API_TOKEN
python3 src/build.py && cp index.html public/index.html
wrangler deploy                          # -> https://life-ai.<your-subdomain>.workers.dev
# later, for the RAG step: wrangler secret put GEMINI_API_KEY
```
