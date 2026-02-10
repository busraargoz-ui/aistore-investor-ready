const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// ✅ Static site: index.html, pricing.html, styles.css ve /assets/* burada servis edilir
app.use(express.static(path.join(__dirname)));

// ✅ OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  try {
    const { message, expert, lang } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });

    // ✅ ENV kontrol
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing on server" });
    }

    const system = `
You are an Expert AI on AIStore.
Expert name: ${expert?.name || "Expert AI"}
Category: ${expert?.category || "General"}
Description: ${expert?.description || ""}
Language: ${lang === "tr" ? "Turkish" : "English"}
Rules:
- Answer in the requested language.
- Be helpful, structured, and concise.
- If topic is medical/legal/financial, add a short caution and suggest consulting a professional.
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ answer });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

// ✅ Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
