const express = require("express");

const app = express();
app.use(express.json());

// Static site (root + assets)
app.use(express.static("."));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, expert, lang } = req.body || {};
    const text = String(message || "").trim();
    if (!text) return res.status(400).json({ error: "Missing message" });

    // MVP fallback (API key yoksa da demo çalışsın)
    if (!process.env.OPENAI_API_KEY) {
      const prefix = (lang === "tr")
        ? "Demo yanıt (API key yok): "
        : "Demo reply (no API key): ";
      return res.json({ answer: prefix + text });
    }

    // If you already have your own OpenAI call here, keep it.
    // I’m leaving a simple placeholder to avoid breaking your deploy.
    // Replace with your existing working OpenAI request code if you have it.
    return res.json({
      answer:
        (lang === "tr" ? "Şu an API entegrasyonu yerine placeholder yanıt dönüyorum: " : "Placeholder answer: ") +
        text
    });

  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on", PORT));
