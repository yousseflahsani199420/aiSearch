// Honest Search front-end logic
// Handles home search, result fetching, copy/share actions, and loading states.

(function () {
  "use strict";

  const body = document.body;
  const page = body ? body.dataset.page : "";

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");
  const quickChips = Array.from(document.querySelectorAll(".quick-chip"));

  // Result page elements
  const resultCard = document.querySelector(".result-card");
  const queryHint = document.getElementById("queryHint");
  const loadingText = document.getElementById("loadingText");
  const answerWrap = document.getElementById("answerWrap");
  const answerText = document.getElementById("answerText");
  const errorText = document.getElementById("errorText");
  const copyAnswerBtn = document.getElementById("copyAnswerBtn");
  const shareLinkBtn = document.getElementById("shareLinkBtn");
  const shareShotBtn = document.getElementById("shareShotBtn");
  const loadingPhrases = [
    "Summoning chaos...",
    "Sharpening sarcasm knives...",
    "Consulting your past bad decisions...",
    "Brewing a spicy reality check...",
    "Charging unfiltered truth..."
  ];
  let loadingTicker = null;

  function normalizeQuery(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function show(el) {
    if (el) el.classList.remove("hidden");
  }

  function hide(el) {
    if (el) el.classList.add("hidden");
  }

  function setQueryHint(question) {
    if (!queryHint) return;
    if (!question) {
      hide(queryHint);
      queryHint.textContent = "";
      return;
    }

    const compact = question.length > 140 ? question.slice(0, 137) + "..." : question;
    queryHint.textContent = "Your brave question: \"" + compact + "\"";
    show(queryHint);
  }

  function setError(message) {
    if (!errorText) return;
    errorText.textContent = message;
    show(errorText);
  }

  function clearError() {
    if (!errorText) return;
    errorText.textContent = "";
    hide(errorText);
  }

  function setLoading(isLoading) {
    if (!loadingText || !resultCard) return;

    if (isLoading) {
      if (searchBtn) searchBtn.disabled = true;
      resultCard.setAttribute("aria-busy", "true");
      rotateLoadingCopy(true);
      show(loadingText);
      hide(answerWrap);
      clearError();
      return;
    }

    if (searchBtn) searchBtn.disabled = false;
    resultCard.setAttribute("aria-busy", "false");
    rotateLoadingCopy(false);
    hide(loadingText);
  }

  function rotateLoadingCopy(isActive) {
    if (!loadingText) return;

    if (!isActive) {
      if (loadingTicker) {
        clearInterval(loadingTicker);
        loadingTicker = null;
      }
      return;
    }

    let index = Math.floor(Math.random() * loadingPhrases.length);
    loadingText.textContent = loadingPhrases[index];

    if (loadingTicker) {
      clearInterval(loadingTicker);
    }

    loadingTicker = setInterval(function () {
      index = (index + 1) % loadingPhrases.length;
      loadingText.textContent = loadingPhrases[index];
    }, 1250);
  }

  function pushResultUrl(question) {
    const url = new URL(window.location.href);
    url.pathname = "/result";
    url.searchParams.set("q", question);
    window.history.replaceState({}, "", url.toString());
  }

  function goToResult(question) {
    window.location.href = "/result?q=" + encodeURIComponent(question);
  }

  async function copyToClipboard(text) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
  }

  function wrapTextLines(ctx, text, maxWidth) {
    const source = String(text || "");
    if (!source) return [""];

    const lines = [];
    const chunks = source.split(/\r?\n/);

    chunks.forEach(function (chunk) {
      if (!chunk) {
        lines.push("");
        return;
      }

      let current = "";
      for (const ch of chunk) {
        const next = current + ch;
        if (ctx.measureText(next).width > maxWidth && current) {
          lines.push(current);
          current = ch;
        } else {
          current = next;
        }
      }

      if (current) {
        lines.push(current);
      }
    });

    return lines.length ? lines : [""];
  }

  function drawRoundRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  async function buildResultScreenshot(question, answer) {
    const canvas = document.createElement("canvas");
    const width = 1200;
    const outerPad = 72;
    const cardPad = 56;
    const contentWidth = width - (outerPad + cardPad) * 2;

    canvas.width = width;
    canvas.height = 900;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas unavailable.");
    }

    ctx.font = "700 34px Manrope, Segoe UI, sans-serif";
    const questionLines = wrapTextLines(ctx, question, contentWidth);

    ctx.font = "800 42px Manrope, Segoe UI, sans-serif";
    const answerLines = wrapTextLines(ctx, answer, contentWidth);

    const questionBlockHeight = Math.max(92, questionLines.length * 44 + 44);
    const answerBlockHeight = Math.max(138, answerLines.length * 54 + 54);
    const cardHeight = 210 + questionBlockHeight + answerBlockHeight;
    const totalHeight = Math.max(760, cardHeight + outerPad * 2);

    canvas.height = totalHeight;

    const bg = ctx.createLinearGradient(0, 0, width, totalHeight);
    bg.addColorStop(0, "#f7f8fa");
    bg.addColorStop(1, "#eef2ff");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, totalHeight);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(width - 140, 120, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff5f1f";
    ctx.beginPath();
    ctx.arc(120, totalHeight - 100, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const cardX = outerPad;
    const cardY = outerPad;
    const cardWidth = width - outerPad * 2;

    drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 34);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#d8dde6";
    ctx.lineWidth = 2;
    ctx.stroke();

    const startX = cardX + cardPad;
    let cursorY = cardY + cardPad + 16;

    ctx.font = "800 58px Manrope, Segoe UI, sans-serif";
    const titleGradient = ctx.createLinearGradient(startX, 0, startX + 550, 0);
    titleGradient.addColorStop(0, "#ff5f1f");
    titleGradient.addColorStop(0.5, "#f43f5e");
    titleGradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = titleGradient;
    ctx.fillText("Honest Search 😈", startX, cursorY);

    cursorY += 52;
    ctx.font = "700 26px Manrope, Segoe UI, sans-serif";
    ctx.fillStyle = "#5e6674";
    ctx.fillText("Unfiltered verdict screenshot", startX, cursorY);

    cursorY += 58;
    ctx.font = "800 24px Manrope, Segoe UI, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Question", startX, cursorY);

    cursorY += 18;
    ctx.strokeStyle = "#e7ebf2";
    ctx.beginPath();
    ctx.moveTo(startX, cursorY);
    ctx.lineTo(startX + contentWidth, cursorY);
    ctx.stroke();

    cursorY += 46;
    ctx.font = "700 34px Manrope, Segoe UI, sans-serif";
    ctx.fillStyle = "#1f2937";
    questionLines.forEach(function (line) {
      ctx.fillText(line, startX, cursorY);
      cursorY += 44;
    });

    cursorY += 20;
    ctx.font = "800 24px Manrope, Segoe UI, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Brutal answer", startX, cursorY);

    cursorY += 18;
    ctx.strokeStyle = "#e7ebf2";
    ctx.beginPath();
    ctx.moveTo(startX, cursorY);
    ctx.lineTo(startX + contentWidth, cursorY);
    ctx.stroke();

    cursorY += 54;
    ctx.font = "800 42px Manrope, Segoe UI, sans-serif";
    ctx.fillStyle = "#111827";
    answerLines.forEach(function (line) {
      ctx.fillText(line, startX, cursorY);
      cursorY += 54;
    });

    ctx.font = "800 24px Manrope, Segoe UI, sans-serif";
    ctx.fillStyle = "#475569";
    ctx.textAlign = "center";
    ctx.fillText("www.honestsearch.online", width / 2, totalHeight - 26);
    ctx.textAlign = "start";

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error("Screenshot failed."));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  async function askQuestion(question) {
    setLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: question })
      });

      const payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || !payload.answer) {
        const msg = payload && payload.error ? payload.error : "The chaos engine sneezed. Try roasting again in a moment.";
        throw new Error(msg);
      }

      if (answerText) {
        answerText.textContent = payload.answer;
      }

      show(answerWrap);
      clearError();
    } catch (error) {
      hide(answerWrap);
      setError(error.message || "Reality glitched for a second. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // Main search action based on current page
  function runSearch(rawValue) {
    const question = normalizeQuery(rawValue);
    if (!question) {
      if (searchInput) searchInput.focus();
      return;
    }

    if (page === "result") {
      pushResultUrl(question);
      setQueryHint(question);
      askQuestion(question);
      return;
    }

    goToResult(question);
  }

  // Submit handler for both pages
  if (searchForm && searchInput) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      runSearch(searchInput.value);
    });
  }

  // Quick suggestion chips on home page
  if (quickChips.length && searchInput) {
    quickChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        const query = normalizeQuery(chip.dataset.query || chip.textContent || "");
        if (!query) return;
        searchInput.value = query;
        runSearch(query);
      });
    });
  }

  // Result-page bootstrapping
  if (page === "result") {
    const queryFromUrl = normalizeQuery(new URLSearchParams(window.location.search).get("q"));

    if (searchInput && queryFromUrl) {
      searchInput.value = queryFromUrl;
    }

    if (queryFromUrl) {
      setQueryHint(queryFromUrl);
      askQuestion(queryFromUrl);
    } else {
      setError("No question found. Type one above and hit Roast Me.");
    }

    // Copy answer button
    if (copyAnswerBtn) {
      copyAnswerBtn.addEventListener("click", async function () {
        const answer = answerText ? answerText.textContent.trim() : "";
        if (!answer) return;

        try {
          await copyToClipboard(answer);
          copyAnswerBtn.textContent = "Copied. Chaos archived.";
          setTimeout(function () {
            copyAnswerBtn.textContent = "Copy roast";
          }, 1200);
        } catch {
          setError("Clipboard said no. Copy it manually, warrior.");
        }
      });
    }

    // Share link button (native share if available, else copy URL)
    if (shareLinkBtn) {
      shareLinkBtn.addEventListener("click", async function () {
        const shareUrl = window.location.href;

        try {
          if (navigator.share) {
            await navigator.share({
              title: "Honest Search Verdict",
              text: "This answer roasted me. Your turn.",
              url: shareUrl
            });
          } else {
            await copyToClipboard(shareUrl);
            shareLinkBtn.textContent = "Link copied. Spread the chaos.";
            setTimeout(function () {
              shareLinkBtn.textContent = "Share this chaos";
            }, 1200);
          }
        } catch {
          // Ignore canceled share dialog
        }
      });
    }

    // Share screenshot button (native file share when possible, else download PNG)
    if (shareShotBtn) {
      shareShotBtn.addEventListener("click", async function () {
        const answer = answerText ? answerText.textContent.trim() : "";
        const question = normalizeQuery((searchInput && searchInput.value) || queryFromUrl);
        if (!answer || !question) {
          setError("Ask first, then we can screenshot the damage.");
          return;
        }

        shareShotBtn.disabled = true;
        shareShotBtn.textContent = "Rendering screenshot...";
        clearError();

        try {
          const blob = await buildResultScreenshot(question, answer);
          const fileName = "honest-search-verdict-" + new Date().toISOString().slice(0, 10) + ".png";
          const screenshotFile = new File([blob], fileName, { type: "image/png" });
          const canShareFiles =
            navigator.share &&
            typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [screenshotFile] });

          if (canShareFiles) {
            await navigator.share({
              title: "Honest Search Verdict",
              text: "Evidence of emotional damage.",
              files: [screenshotFile]
            });
            shareShotBtn.textContent = "Shared. Damage delivered.";
          } else {
            downloadBlob(blob, fileName);
            shareShotBtn.textContent = "Screenshot saved.";
          }
        } catch (error) {
          setError("Could not create screenshot. Please try again.");
          shareShotBtn.textContent = "Share screenshot";
        } finally {
          setTimeout(function () {
            shareShotBtn.textContent = "Share screenshot";
            shareShotBtn.disabled = false;
          }, 1500);
        }
      });
    }
  }
})();
