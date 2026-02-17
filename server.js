const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// ✅ Static site
app.use(express.static(path.join(__dirname)));

// ✅ OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  try {
    const { message, expert, lang, userName } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing message" });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is missing on server" });
    }

    const expertName = expert?.name || "Expert AI";
    const expertCategory = expert?.category || "General";
    const expertDesc = expert?.description || "";

    const instruction = (expert?.instruction || "").trim();
    const disclaimer = (expert?.disclaimer || "").trim();
    const signature = (expert?.signature || "").trim();

    // ✅ Only enforce ending if provided
    const mandatoryEnding = [disclaimer, signature].filter(Boolean).join("\n");

    // ✅ If expert instruction suggests greeting, enforce 1-line greeting at start (investor demo stability)
    const wantsGreeting = /selam|selamla|merhaba|hoş\s*geldin|hos\s*geldin|greet|greeting|welcome|hello|hi|willkommen|grüß|gruss/i
      .test(instruction);

    const greetingRule = wantsGreeting
      ? `- Start the answer with EXACTLY 1 short greeting sentence that matches the Expert Instruction. If userName is provided and instruction allows, include the name in the greeting.`
      : `- Greeting is optional unless Expert Instruction requires it.`;

    const system = `
You are an Expert AI on AIStore.
Expert name: ${expertName}
Category: ${expertCategory}
Description: ${expertDesc}
Language: ${lang === "tr" ? "Turkish" : "English"}

User name (if provided): ${userName ? userName : "(not provided)"}

Expert Instruction (must follow):
${instruction || "- (No custom instruction provided.)"}

Rules:
- Follow the Expert Instruction exactly (tone, greeting, language choices, structure).
- Answer in the requested language, unless the instruction explicitly overrides it.
${greetingRule}
- Be helpful, structured, and concise.
- If topic is medical/legal/financial, add a short caution and suggest consulting a professional (unless instruction says otherwise).
- Do NOT invent facts. If unsure, say so.
- If Mandatory closing line and/or Signature are provided, your final output MUST end with them exactly.
${mandatoryEnding ? `- Mandatory ending:\n${mandatoryEnding}` : "- No mandatory ending provided."}
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

    // ✅ Guarantee ending only when provided
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
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => console.log("Server running on", PORT));
