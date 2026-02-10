import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(express.json());

// If you serve static files from same server:
app.use(express.static("."));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  try {
    const { message, expert, lang } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });

    const expertName = expert?.name || "Expert ΛI";
    const expertCategory = expert?.category || "General";
    const expertDesc = expert?.description || "";

    const system =
      (lang === "tr"
        ? `Sen ${expertName} adlı bir uzman yapay zekâsın. Kategori: ${expertCategory}. Açıklama: ${expertDesc}
Kısa, net, yardımsever cevap ver. Uydurma yapma; emin değilsen “bilmiyorum” de. Gerektiğinde madde madde anlat.`
        : `You are ${expertName}, an expert AI. Category: ${expertCategory}. Description: ${expertDesc}
Answer clearly, helpfully, and concisely. Do not invent facts. If unsure, say you don’t know. Use bullet points when helpful.`);

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: String(message) },
      ],
      temperature: 0.6,
      max_tokens: 300,
    });

    const answer = completion.choices?.[0]?.message?.content || "";
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Server error" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on :${port}`));
