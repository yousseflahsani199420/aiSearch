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

## Canonical URL redirect

Set `CANONICAL_URL=https://www.honestsearch.online` and `ENABLE_CANONICAL_REDIRECT=1` to force all hosts to redirect to the `www` domain.
