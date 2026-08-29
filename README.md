# BLACK MATRIX OS — Zero Cost Edition

Local-first AI control interface. No paid API is required for the core app.

## Run

1. Install Node.js 20+.
2. Install Ollama and pull a local model, for example `ollama pull llama3.2`.
3. Run `npm install`.
4. Run `npm run dev`.

The browser UI talks to the local Ollama API. The audit log is kept locally in the browser and chained with SHA-256 hashes.

## Environment

Optional `.env` values:

- `VITE_OLLAMA_URL=http://localhost:11434`
- `VITE_OLLAMA_MODEL=llama3.2`

No secret keys belong in the frontend.

## Architecture

React + Vite + Three.js UI, local Ollama inference, local audit chain, and local-first knowledge storage. Cloud services can be added later without changing the core interface.
