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

    const expertName = expert?.name || "Expert AI";
    const expertCategory = expert?.category || "General";
    const expertDesc = expert?.description || "";

    const instruction = (expert?.instruction || "").trim();
    const disclaimer = (expert?.disclaimer || "").trim();
    const signature = (expert?.signature || "").trim();

    // ✅ Her zaman en sonda görünsün diye "mandatory ending"
    const mandatoryEnding = [disclaimer, signature].filter(Boolean).join("\n");

    const system = `
You are an Expert AI on AIStore.
Expert name: ${expertName}
Category: ${expertCategory}
Description: ${expertDesc}
Language: ${lang === "tr" ? "Turkish" : "English"}

Expert Instruction (must follow):
${instruction || "- (No custom instruction provided.)"}

Rules:
- Answer in the requested language.
- Be helpful, structured, and concise.
- If topic is medical/legal/financial, add a short caution and suggest consulting a professional.
- Do NOT invent facts. If unsure, say so.
- IMPORTANT: Your final output MUST end with the following lines exactly (if present):
${mandatoryEnding ? mandatoryEnding : "(No mandatory ending)"}
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
    });

    let answer = completion.choices?.[0]?.message?.content?.trim() || "";

    // ✅ Model unutsa bile server garanti ekler (demo sağlamlığı)
    if (mandatoryEnding) {
      const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
      const hasDisclaimer = disclaimer ? norm(answer).includes(norm(disclaimer)) : true;
      const hasSignature = signature ? norm(answer).includes(norm(signature)) : true;

      if (!hasDisclaimer || !hasSignature) {
        answer = (answer ? answer + "\n\n" : "") + mandatoryEnding;
      }
    }

    return res.json({ answer });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
});

// ✅ Render port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));
