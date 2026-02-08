require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Static dosyaları servis et (index.html ve assets/*)
app.use(express.static(__dirname));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ✅ OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Uzman metni
function loadExpertText() {
  const p = path.join(__dirname, "expert.txt");
  return fs.readFileSync(p, "utf8");
}

// ✅ Basit rate limit (IP başına 1.2 sn)
const lastCallByIp = new Map();
function rateLimit(req, res, next) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const now = Date.now();
  const last = lastCallByIp.get(ip) || 0;

  if (now - last < 1200) {
    return res
      .status(429)
      .json({ error: "Çok hızlı. Lütfen 1-2 saniye bekleyip tekrar deneyin." });
  }
  lastCallByIp.set(ip, now);
  next();
}

// ✅ Health
app.get("/health", (req, res) => res.send("ok"));

// ✅ Chat API
app.post("/api/chat", rateLimit, async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ error: "message gerekli" });

    const lang = (req.body?.lang === "tr" ? "tr" : "en");
    const expert = req.body?.expert || {};
    const expertName = String(expert?.name || "").trim() || (lang === "tr" ? "Açık Uçlu Uzman ΛI" : "Expert ΛI");
    const expertCategory = String(expert?.category || "").trim() || (lang === "tr" ? "Genel" : "General");
    const expertDesc = String(expert?.description || "").trim() || (lang === "tr" ? "Yapılandırılmış, pratik öneriler verir." : "Gives structured, practical guidance.");

    // Optional: a small seed knowledge text (kept for backwards compatibility)
    let expertText = "";
    try { expertText = loadExpertText(); } catch (e) { expertText = ""; }

    const systemPrompt =
      (lang === "tr"
        ? `Sen ΛIStore üzerinde satılabilir bir "Uzman Yapay Zekâ" ürünüsün.
Amaç: Kullanıcıya premium, yapılandırılmış ve uygulanabilir yanıtlar vermek.

Uzman profili:
- İsim: ${expertName}
- Kategori: ${expertCategory}
- Açıklama: ${expertDesc}

Kurallar:
- Kısa ama dolu cevap ver (madde madde, adım adım).
- Gerekirse en fazla 1 netleştirici soru sor.
- Tıbbi/hukuki/finansal konularda kesin hüküm verme; riskleri belirt ve gerekirse profesyonele yönlendir.
- Gereksiz uzun yazma.`
        : `You are a monetizable "Expert AI" product on ΛIStore.
Goal: Provide premium, structured, actionable answers.

Expert profile:
- Name: ${expertName}
- Category: ${expertCategory}
- Description: ${expertDesc}

Rules:
- Be concise but high-value (bullets, steps).
- Ask at most 1 clarifying question if needed.
- No certainty for medical/legal/financial; include brief caveats and suggest a professional when appropriate.
- Avoid generic chatbot tone.`)
      + (expertText ? (lang === "tr" ? `

(İsteğe bağlı referans notları)
${expertText}` : `

(Optional reference notes)
${expertText}`) : "");

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.6,
      max_tokens: 350, // ✅ yatırımcı demosu için dengeli
    });

    return res.json({ answer: resp.choices?.[0]?.message?.content || "" });
  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// ✅ Default: upload sayfasına yönlendir (istersen index.html yapabilirsin)
app.get("/", (req, res) => {
  res.redirect("/assets/upload-ai.html?lang=en");
});

app.listen(3001, () => {
  console.log("🚀 Server: http://localhost:3001");
  console.log("✅ Upload:  http://localhost:3001/assets/upload-ai.html?lang=en");
});
