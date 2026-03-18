# Honest Search 😈

A parody search website that returns brutally honest, funny AI answers using OpenRouter.

## Multilingual support

Questions are supported in 14+ popular languages, including:
English, Spanish, French, Arabic, Portuguese, Hindi, Chinese, Japanese, Korean, German, Indonesian, Turkish, Russian, and Italian.
The backend auto-detects language and forces replies in the same language.

## Files

- `index.html` - search page
- `result.html` - result page
- `style.css` - UI styling
- `script.js` - frontend logic
- `server.js` - Express backend and OpenRouter proxy

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set your real key:
   ```env
   OPENROUTER_API_KEY=your_key_here
   OPENROUTER_MODEL=arcee-ai/trinity-large-preview:free
   PORT=3000
   ```
3. Run server:
   ```bash
   npm start
   ```
4. Open:
   `http://localhost:3000`

## Deploy notes

- Keep `OPENROUTER_API_KEY` in server environment variables.
- Do not expose the key in frontend files.
- Update `APP_URL` env var if you want a custom `HTTP-Referer` header.

## Deploy on Render (Web Service)

Use Web Service (not Static Site), because `/api/ask` needs a secure backend key.

1. Push this project to GitHub.
2. In Render: `New +` -> `Web Service`.
3. Connect your repo and select branch.
4. Use these settings:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
5. Add environment variables:
   - `OPENROUTER_API_KEY` = your real key
   - `OPENROUTER_MODEL` = `arcee-ai/trinity-large-preview:free` (or another model)
   - `APP_URL` = your Render URL (example: `https://honest-search.onrender.com`)
6. Deploy and open your service URL.

Optional: this repo includes `render.yaml` for one-click Render setup.
