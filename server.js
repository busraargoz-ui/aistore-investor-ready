import express from "express";

const app = express();
app.use(express.json());

// ✅ Static files (HTML/CSS/JS/assets) repo root'tan servis edilir
app.use(express.static(process.cwd()));

// ✅ Health
app.get("/health", (_, res) => res.json({ ok: true }));

// ✅ API CHAT (placeholder)
// Buraya kendi OpenAI çağrını bağlayacaksın.
// Şimdilik cevap döndürüyorum ki frontend “çalışıyor mu” görülsün.
app.post("/api/chat", async (req, res) => {
  try {
    const { message, expert, lang } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });

    // TODO: OpenAI / ChatGPT bağlantın burada olmalı
    // return res.json({ answer: "..." });

    const name = expert?.name ? ` (${expert.name})` : "";
    const answer =
      (lang === "tr")
        ? `Demo cevap${name}: "${message}" sorunu aldım. (OpenAI entegrasyonu server.js içine eklenecek.)`
        : `Demo answer${name}: I received "${message}". (OpenAI integration will be added in server.js.)`;

    return res.json({ answer });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
});

// ✅ Explicit routes (Render bazen static route’larda sorun çıkarınca netleştiriyoruz)
app.get("/", (_, res) => res.sendFile(process.cwd() + "/index.html"));
app.get("/upload-ai.html", (_, res) => res.sendFile(process.cwd() + "/upload-ai.html"));
app.get("/pricing.html", (_, res) => res.sendFile(process.cwd() + "/pricing.html"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server listening on", port));
