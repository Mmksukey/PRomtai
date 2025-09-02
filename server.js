import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = process.env.MODEL_ID || "gemini-1.5-flash";

// กันลืมตั้งคีย์
if (!GEMINI_API_KEY) {
  console.warn("[WARN] GEMINI_API_KEY is not set. The API route will fall back to local assembly.");
}

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cors());
app.use(express.static("public"));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api/", limiter);

app.get("/healthz", (req, res) => res.send("ok"));

app.post("/api/generate", async (req, res) => {
  try {
    const {
      goal = "",
      audience = "",
      scope = "",
      tools = "",
      output = "",
      format = "",
      examples = "",
      donts = "",
      language = "ไทย",
      tone = "ชัดเจน ตรงประเด็น",
      lengthPref = "ปานกลาง",
      creativity = 0.3
    } = req.body || {};

    // รวมข้อมูลที่ผู้ใช้กรอก
    const spec = [
      goal && `เป้าหมาย: ${goal}`,
      audience && `กลุ่มเป้าหมาย: ${audience}`,
      scope && `ขอบเขตและบริบท: ${scope}`,
      tools && `เครื่องมือ/ข้อจำกัดด้านเทคโนโลยี: ${tools}`,
      output && `ผลลัพธ์ที่ต้องการ: ${output}`,
      format && `รูปแบบผลลัพธ์: ${format}`,
      examples && `ตัวอย่าง/สไตล์อ้างอิง: ${examples}`,
      donts && `ข้อห้าม: ${donts}`,
      language && `ภาษา: ${language}`,
      tone && `โทน: ${tone}`,
      lengthPref && `ความยาวโดยรวม: ${lengthPref}`
    ].filter(Boolean).join("\n");

    const systemHint =
      "คุณคือ Prompt Engineer ระดับมืออาชีพ สร้าง 'Single prompt' ที่พร้อมนำไปใช้กับ LLM ใดก็ได้ " +
      "โครงสร้างต้องกระชับ ชัดเจน มีบริบทพอ และใส่ข้อจำกัดสำคัญให้ครบ โดยไม่สาธยายทฤษฎีเพิ่ม";

    const userTask =
      `จากข้อมูลสรุปด้านล่าง ให้คุณสร้าง Prompt ภาษา${language} ในรูปแบบเดียวที่คัดลอกไปใช้ได้ทันที ` +
      `ปรับโทนให้${tone} ความยาว${lengthPref}. ถ้าบางฟิลด์ว่าง ให้ละไว้ ไม่ต้องเดาเอง\n\n` +
      `ข้อมูลสรุป:\n${spec}\n\n` +
      `ข้อกำหนดการส่งออก:\n` +
      `1) เริ่มด้วยหัวข้อ: "FINAL PROMPT"\n` +
      `2) ตามด้วยบล็อคข้อความ prompt เดียว ไม่มีคำอธิบายส่วนเกิน\n` +
      `3) ใช้ bullet เท่าที่จำเป็น หลีกเลี่ยงน้ำไม่จำเป็น`;

    // ถ้าไม่มีคีย์ ให้ fallback เป็นการประกอบ prompt แบบ deterministic
    if (!GEMINI_API_KEY) {
      const fallback = [
        "FINAL PROMPT",
        "",
        `บทบาท: คุณคือผู้ช่วยที่มีความเชี่ยวชาญ`,
        goal && `เป้าหมาย: ${goal}`,
        audience && `ผู้รับสาร: ${audience}`,
        scope && `บริบท: ${scope}`,
        tools && `เครื่องมือ/ข้อจำกัด: ${tools}`,
        output && `ผลลัพธ์ที่ต้องการ: ${output}`,
        format && `รูปแบบผลลัพธ์: ${format}`,
        donts && `ข้อห้าม: ${donts}`,
        examples && `ตัวอย่างอ้างอิง: ${examples}`,
        `ภาษา: ${language}`,
        `โทน: ${tone}`,
        `คำสั่ง: ทำตามรายการด้านบนอย่างเคร่งครัด หากข้อมูลบางส่วนว่างให้ละเว้น`
      ].filter(Boolean).join("\n");
      return res.json({ model: "local-fallback", prompt: fallback });
    }

    // เรียก Gemini generateContent
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: `${systemHint}\n\n${userTask}` }] }
      ],
      generationConfig: {
        temperature: Number(creativity) || 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1024
      }
    };

    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`Gemini API error ${r.status}: ${errText}`);
    }

    const data = await r.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    // ถ้า Gemini เงียบ ให้ fallback
    const finalText = text && text.trim().length > 0
      ? text.trim()
      : `FINAL PROMPT\n\n${spec}`;

    res.json({ model: MODEL_ID, prompt: finalText });
  } catch (err) {
    console.error(err);
    // fallback กรณี error
    res.status(200).json({
      model: "local-fallback",
      prompt: "FINAL PROMPT\n\nกรอกข้อมูลใหม่อีกครั้ง ขณะนี้ไม่สามารถเรียก Gemini API ได้"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
