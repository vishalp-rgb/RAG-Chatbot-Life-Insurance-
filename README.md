# Life Insurance AI Assistant 

Guided chatbot: client goal → age (typed) → recommended product type → structure → payment pattern → top plans → plan explanation. Also answers questions about any named plan.

- `index.html` – the complete single-file app (open in a browser)
- `src/` – CSS, app logic (`app1.js`), UI/flow (`app2.js`), `build.py` to regenerate `index.html`
- `data/` – plan data (`lps.json`) and insurer logos

Rebuild: `python3 src/build.py`. A RAG-based version is planned next.
