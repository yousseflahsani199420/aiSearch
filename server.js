// Honest Search backend
// - Serves static files
// - Securely calls OpenRouter from server side
// - Returns only the generated AI answer to frontend

const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { franc } = require("franc-min");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "arcee-ai/trinity-large-preview:free";
const SUPPORTED_LANGUAGE_LIST =
  "English, Spanish, French, Arabic, Portuguese, Hindi, Chinese, Japanese, Korean, German, Indonesian, Turkish, Russian, Italian";

const SYSTEM_PROMPT =
  "You are a brutally honest comedic assistant. Detect the user's language and reply in the same language. " +
  `Support at least these languages: ${SUPPORTED_LANGUAGE_LIST}. ` +
  "Answer in a short, dramatic, theatrical, witty, sarcastic, realistic, and funny way. One punchy line only. " +
  "Maximum 20 words. No explanations. Avoid self-harm, violence, hate, or illegal advice.";

function limitToTwentyWords(text) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 20).join(" ");
}

const FRANC_LANGUAGE_MAP = {
  eng: "English",
  spa: "Spanish",
  fra: "French",
  ara: "Arabic",
  por: "Portuguese",
  hin: "Hindi",
  cmn: "Chinese",
  zho: "Chinese",
  jpn: "Japanese",
  kor: "Korean",
  deu: "German",
  ind: "Indonesian",
  tur: "Turkish",
  rus: "Russian",
  ita: "Italian"
};

function detectSupportedLanguage(question) {
  const text = String(question || "").trim();
  if (!text) return "English";

  // Script-based detection first (high confidence)
  if (/[\u0600-\u06FF]/u.test(text)) return "Arabic";
  if (/[\u0900-\u097F]/u.test(text)) return "Hindi";
  if (/[\u3040-\u30FF]/u.test(text)) return "Japanese";
  if (/[\uAC00-\uD7AF]/u.test(text)) return "Korean";
  if (/[\u0400-\u04FF]/u.test(text)) return "Russian";
  if (/[\u4E00-\u9FFF]/u.test(text)) return "Chinese";

  // High-confidence character cues
  if (/[ğüşöçıİ]/u.test(text)) return "Turkish";
  if (/[äöüß]/u.test(text)) return "German";
  if (/[ñ¿¡]/u.test(text)) return "Spanish";
  if (/[ãõ]/u.test(text)) return "Portuguese";

  const lower = text.toLowerCase();

  // Fast keyword overrides for close Latin languages
  if (/\b(dejo|quiero|tiempo|por que|por qué)\b/i.test(lower)) return "Spanish";
  if (/\b(paro|você|voce|nao|não|desculpas)\b/i.test(lower)) return "Portuguese";

  // Statistical detection for Latin-script languages
  const detectedCode = franc(text, { minLength: 3 });
  if (detectedCode && detectedCode !== "und" && FRANC_LANGUAGE_MAP[detectedCode]) {
    return FRANC_LANGUAGE_MAP[detectedCode];
  }

  // Keyword fallback if detection is uncertain
  if (/\b(bagaimana|menunda|pekerjaan|kenapa|cara)\b/i.test(lower)) return "Indonesian";
  if (/\b(comment|pourquoi|arreter|arrêter|demain)\b/i.test(lower)) return "French";
  if (/\b(come|smetto|rimandare|perche|perché)\b/i.test(lower)) return "Italian";
  if (/\b(como|dejo|por que|por qué|tiempo)\b/i.test(lower)) return "Spanish";
  if (/\b(como|paro|procrastinar|desculpas|voce|você|nao|não)\b/i.test(lower)) return "Portuguese";
  if (/\b(wie|warum|nicht|prokrastinieren)\b/i.test(lower)) return "German";
  if (/\b(nasil|nasıl|birak|bırak|ertelemeyi)\b/i.test(lower)) return "Turkish";

  return "English";
}

const LANGUAGE_SCRIPT_RULES = {
  Arabic: { regex: /[\u0600-\u06FF]/u, scriptName: "Arabic script" },
  Hindi: { regex: /[\u0900-\u097F]/u, scriptName: "Devanagari script" },
  Chinese: { regex: /[\u4E00-\u9FFF]/u, scriptName: "Chinese Han characters" },
  Japanese: { regex: /[\u3040-\u30FF\u4E00-\u9FFF]/u, scriptName: "Japanese characters" },
  Korean: { regex: /[\uAC00-\uD7AF]/u, scriptName: "Hangul script" },
  Russian: { regex: /[\u0400-\u04FF]/u, scriptName: "Cyrillic script" }
};

const LANGUAGE_LATIN_HINTS = {
  Spanish: /\b(el|la|los|las|que|por|para|como|deja|empieza)\b/i,
  French: /\b(le|la|les|de|et|pas|pour|comment|commence)\b/i,
  Portuguese: /\b(o|a|os|as|que|para|como|nao|não|comece)\b/i,
  German: /\b(der|die|das|und|nicht|wie|jetzt|ausreden)\b/i,
  Indonesian: /\b(dan|yang|tidak|cara|mulai|sekarang|alasan)\b/i,
  Turkish: /\b(ve|bir|degil|değil|nasil|nasıl|bahane|simdi)\b/i,
  Italian: /\b(il|lo|la|gli|che|come|non|scuse|inizia)\b/i
};

const LANGUAGE_FALLBACK_ANSWERS = {
  English: "Act now, or your excuses will become your full-time career.",
  Spanish: "Actua ya, o tus excusas te contrataran de por vida.",
  French: "Agis maintenant, ou tes excuses prendront le controle du spectacle.",
  Arabic: "تحرك الآن، وإلا ستدير أعذارك حياتك كمسرحية هزلية.",
  Portuguese: "Comece agora, ou suas desculpas viram seu emprego oficial.",
  Hindi: "अभी शुरू करो, नहीं तो बहाने ही तुम्हारी स्थायी नौकरी बन जाएंगे।",
  Chinese: "现在就动手，不然你的借口会接管你的人生舞台。",
  Japanese: "今すぐ動け。さもないと言い訳が君の人生を主演する。",
  Korean: "지금 시작해. 안 그러면 핑계가 네 인생 주인공 된다.",
  German: "Fang jetzt an, sonst werden Ausreden dein Vollzeitjob.",
  Indonesian: "Mulai sekarang, atau alasanmu resmi jadi karier utamamu.",
  Turkish: "Simdi basla, yoksa bahaneler kariyerin olur.",
  Russian: "Начни сейчас, иначе отговорки станут твоей постоянной работой.",
  Italian: "Inizia ora, o le scuse diventeranno il tuo lavoro fisso."
};

function answerMatchesLanguage(answer, language) {
  const text = String(answer || "").trim();
  if (!text) return false;

  const rule = LANGUAGE_SCRIPT_RULES[language];
  if (rule) return rule.regex.test(text);

  if (language === "English") return true;

  const latinHint = LANGUAGE_LATIN_HINTS[language];
  if (!latinHint) return true;
  return latinHint.test(text);
}

function fallbackForLanguage(language) {
  return LANGUAGE_FALLBACK_ANSWERS[language] || LANGUAGE_FALLBACK_ANSWERS.English;
}

async function callOpenRouter(messages) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || `http://localhost:${PORT}`,
      "X-Title": "Honest Search"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: messages,
      max_tokens: 60,
      temperature: 1.0
    })
  });

  const data = await response.json().catch(function () {
    return {};
  });

  if (!response.ok) {
    const providerError = (data && data.error && data.error.message) || data.message || "OpenRouter request failed.";
    throw new Error(providerError);
  }

  const rawAnswer =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message.content === "string"
      ? data.choices[0].message.content.trim()
      : "";

  if (!rawAnswer) {
    throw new Error("Empty answer from model.");
  }

  return rawAnswer;
}

// Basic security hardening
app.disable("x-powered-by");

// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// Clean error response for malformed JSON bodies
app.use(function (err, _req, res, next) {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  return next(err);
});

// Static files (HTML/CSS/JS)
app.use(express.static(path.join(__dirname)));

// Explicit routes for friendly URLs
app.get("/", function (_req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/result", function (_req, res) {
  res.sendFile(path.join(__dirname, "result.html"));
});

app.get("/about", function (_req, res) {
  res.sendFile(path.join(__dirname, "about.html"));
});

app.get("/contact", function (_req, res) {
  res.sendFile(path.join(__dirname, "contact.html"));
});

app.get("/privacy-policy", function (_req, res) {
  res.sendFile(path.join(__dirname, "privacy-policy.html"));
});

app.get("/privacy", function (_req, res) {
  res.sendFile(path.join(__dirname, "privacy-policy.html"));
});

// Health endpoint for deployment checks
app.get("/health", function (_req, res) {
  res.json({ ok: true });
});

// OpenRouter proxy endpoint
app.post("/api/ask", async function (req, res) {
  const question = String(req.body && req.body.question ? req.body.question : "")
    .trim()
    .replace(/\s+/g, " ");
  const detectedLanguage = detectSupportedLanguage(question);

  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  if (question.length > 500) {
    return res.status(400).json({ error: "Question is too long. Keep it under 500 characters." });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Server missing OPENROUTER_API_KEY." });
  }

  try {
    let usedRetry = false;
    let usedFallback = false;
    const baseMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content:
          `User language detected: ${detectedLanguage}. ` +
          `Reply only in ${detectedLanguage}. Do not switch language. Be dramatic and funny.`
      },
      { role: "user", content: question }
    ];

    let rawAnswer = await callOpenRouter(baseMessages);

    // For non-Latin scripts, retry once with a stricter script instruction when language drift is detected.
    if (!answerMatchesLanguage(rawAnswer, detectedLanguage)) {
      usedRetry = true;
      const rule = LANGUAGE_SCRIPT_RULES[detectedLanguage];
      const strictMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "system",
          content:
            `CRITICAL: Reply ONLY in ${detectedLanguage}` +
            (rule ? ` using ${rule.scriptName}` : "") +
            ". No English. No translation notes. Be dramatic and funny."
        },
        { role: "user", content: question }
      ];

      try {
        const retryAnswer = await callOpenRouter(strictMessages);
        if (answerMatchesLanguage(retryAnswer, detectedLanguage)) {
          rawAnswer = retryAnswer;
        } else {
          usedFallback = true;
          rawAnswer = fallbackForLanguage(detectedLanguage);
        }
      } catch {
        usedFallback = true;
        rawAnswer = fallbackForLanguage(detectedLanguage);
      }
    }

    const answer = limitToTwentyWords(rawAnswer || fallbackForLanguage(detectedLanguage));

    if (process.env.DEBUG_LANG === "1") {
      return res.json({
        answer: answer,
        detectedLanguage: detectedLanguage,
        usedRetry: usedRetry,
        usedFallback: usedFallback
      });
    }

    // Return only the AI message to frontend
    return res.json({ answer: answer });
  } catch (error) {
    console.error("OpenRouter error:", error);
    return res.status(502).json({ error: error.message || "Failed to contact AI provider." });
  }
});

// API 404 fallback
app.use("/api", function (_req, res) {
  res.status(404).json({ error: "API route not found." });
});

// App 404 fallback
app.use(function (_req, res) {
  res.status(404).sendFile(path.join(__dirname, "index.html"));
});

// Final error fallback
app.use(function (err, _req, res, _next) {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, HOST, function () {
  console.log(`Honest Search running on http://${HOST}:${PORT}`);
});
