import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_ID = process.env.MODEL_ID || "gemini-1.5-flash";

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

function toLines(items) {
  return items.filter(Boolean).join("\n");
}

function buildSpecByMode(mode, b, c, i) {
  // b = base fields, c = coding fields, i = image/video fields
  if (mode === "coding") {
    return toLines([
      b.goal && `เป้าหมาย: ${b.goal}`,
      b.audience && `กลุ่มเป้าหมาย: ${b.audience}`,
      b.scope && `บริบท/ขอบเขต: ${b.scope}`,
      b.tools && `เครื่องมือ/ข้อจำกัดเทคโนโลยี: ${b.tools}`,
      c.codeLanguage && `ภาษาเขียนโปรแกรม: ${c.codeLanguage}`,
      c.runtimeEnv && `Runtime/เวอร์ชัน/แพลตฟอร์ม: ${c.runtimeEnv}`,
      c.repoUrl && `ลิงก์โค้ด/ไฟล์ที่เกี่ยวข้อง: ${c.repoUrl}`,
      c.entryPoint && `ไฟล์/entry point: ${c.entryPoint}`,
      c.errorMessage && `Error log/Stack trace:\n${c.errorMessage}`,
      c.expectedBehavior && `พฤติกรรมที่คาดหวัง: ${c.expectedBehavior}`,
      c.testInputs && `เคสทดสอบ/อินพุต: ${c.testInputs}`,
      c.performanceTarget && `เป้าหมายด้านประสิทธิภาพ: ${c.performanceTarget}`,
      b.output && `ผลลัพธ์ที่ต้องการ: ${b.output}`,
      b.format && `รูปแบบผลลัพธ์: ${b.format}`,
      b.examples && `ตัวอย่าง/สไตล์อ้างอิง: ${b.examples}`,
      b.donts && `ข้อห้าม: ${b.donts}`,
      b.language && `ภาษา: ${b.language}`,
      b.tone && `โทน: ${b.tone}`,
      b.lengthPref && `ความยาวโดยรวม: ${b.lengthPref}`
    ]);
  }
  if (mode === "media") {
    return toLines([
      b.goal && `เป้าหมาย: ${b.goal}`,
      b.audience && `กลุ่มเป้าหมาย: ${b.audience}`,
      b.scope && `บริบท/ขอบเขต: ${b.scope}`,
      i.mediaType && `ชนิดสื่อ: ${i.mediaType}`,
      i.purpose && `วัตถุประสงค์การใช้งาน: ${i.purpose}`,
      i.style && `สไตล์/คีย์เวิร์ด: ${i.style}`,
      i.resolution && `ความละเอียด: ${i.resolution}`,
      i.aspectRatio && `อัตราส่วนภาพ: ${i.aspectRatio}`,
      i.colorPalette && `โทนสี/พาเล็ตต์: ${i.colorPalette}`,
      i.camera && `พารามิเตอร์กล้อง/ช็อต: ${i.camera}`,
      i.duration && `ความยาว (วิดีโอ): ${i.duration}`,
      i.platform && `แพลตฟอร์มเป้าหมาย: ${i.platform}`,
      i.references && `ภาพ/ลิงก์อ้างอิง: ${i.references}`,
      i.negative && `สิ่งที่ไม่ต้องการให้เกิดขึ้น: ${i.negative}`,
      b.output && `ผลลัพธ์ที่ต้องการ: ${b.output}`,
      b.format && `รูปแบบผลลัพธ์: ${b.format}`,
      b.examples && `ตัวอย่าง/สไตล์อ้างอิง: ${b.examples}`,
      b.donts && `ข้อห้าม: ${b.donts}`,
      b.language && `ภาษา: ${b.language}`,
      b.tone && `โทน: ${b.tone}`,
      b.lengthPref && `ความยาวโดยรวม: ${b.lengthPref}`
    ]);
  }
  // default = general
  return toLines([
    b.goal && `เป้าหมาย: ${b.goal}`,
    b.audience && `กลุ่มเป้าหมาย: ${b.audience}`,
    b.scope && `บริบท/ขอบเขต: ${b.scope}`,
    b.tools && `เครื่องมือ/ข้อจำกัดเทคโนโลยี: ${b.tools}`,
    b.output && `ผลลัพธ์ที่ต้องการ: ${b.output}`,
    b.format && `รูปแบบผลลัพธ์: ${b.format}`,
    b.examples && `ตัวอย่าง/สไตล์อ้างอิง: ${b.examples}`,
    b.donts && `ข้อห้าม: ${b.donts}`,
    b.language && `ภาษา: ${b.language}`,
    b.tone && `โทน: ${b.tone}`,
    b.lengthPref && `ความยาวโดยรวม: ${b.lengthPref}`
  ]);
}

function buildSystemHint(mode) {
  if (mode === "coding") {
    return "คุณคือ Prompt Engineer สายซอฟต์แวร์ สร้างพรอมป์เพื่อให้ LLM ช่วยโค้ด/ดีบัก/ปรับประสิทธิภาพได้ตรงประเด็น หลีกเลี่ยงทฤษฎีส่วนเกิน ใส่บริบทเวอร์ชัน แพ็กเกจ และข้อจำกัดให้ชัด";
  }
  if (mode === "media") {
    return "คุณคือ Prompt Engineer ด้านสื่อ สร้างพรอมป์สำหรับภาพ/วิดีโอที่เจาะจงสไตล์ องค์ประกอบ เทคนิครายละเอียด และข้อห้าม เพื่อให้ผลลัพธ์สม่ำเสมอและปลอดภัย";
  }
  return "คุณคือ Prompt Engineer ระดับมืออาชีพ สร้าง 'Single prompt' ที่พร้อมใช้กับ LLM โดยชัดเจน กระชับ และมีข้อจำกัดพอเหมาะ";
}

function buildUserTask(mode, language, tone, lengthPref, spec) {
  const common = `จากข้อมูลสรุปด้านล่าง ให้คุณสร้าง Prompt ภาษา${language} ในรูปแบบเดียวที่คัดลอกไปใช้ได้ทันที ปรับโทนให้${tone} ความยาว${lengthPref}. ถ้าบางฟิลด์ว่าง ให้ละไว้ ไม่ต้องเดาเอง\n\nข้อมูลสรุป:\n${spec}\n\nข้อกำหนดการส่งออก:\n1) เริ่มด้วยหัวข้อ: "FINAL PROMPT"\n2) ตามด้วยบล็อคข้อความ prompt เดียว ไม่มีคำอธิบายส่วนเกิน\n3) ใช้ bullet เฉพาะที่จำเป็น`;

  if (mode === "coding") {
    return common + `\n4) ระบุเวอร์ชัน/แพ็กเกจ/คำสั่งรันที่จำเป็นถ้ามี\n5) ถ้ามี error ให้ชี้แนวทางวินิจฉัยแบบเป็นขั้นตอนสั้นๆ ในพรอมป์`;
  }
  if (mode === "media") {
    return common + `\n4) ระบุองค์ประกอบภาพ/วิดีโอเป็นลำดับความสำคัญ\n5) ใส่ negative cues เพื่อกันผลลัพธ์ที่ไม่ต้องการ`;
  }
  return common;
}

app.post("/api/generate", async (req, res) => {
  try {
    const mode = (req.body.mode || "general").toLowerCase();

    // base fields
    const base = {
      goal: req.body.goal || "",
      audience: req.body.audience || "",
      scope: req.body.scope || "",
      tools: req.body.tools || "",
      output: req.body.output || "",
      format: req.body.format || "",
      examples: req.body.examples || "",
      donts: req.body.donts || "",
      language: req.body.language || "ไทย",
      tone: req.body.tone || "ชัดเจน ตรงประเด็น",
      lengthPref: req.body.lengthPref || "ปานกลาง",
      creativity: Number(req.body.creativity ?? 0.3)
    };

    // coding fields
    const coding = {
      codeLanguage: req.body.codeLanguage || "",
      runtimeEnv: req.body.runtimeEnv || "",
      repoUrl: req.body.repoUrl || "",
      entryPoint: req.body.entryPoint || "",
      errorMessage: req.body.errorMessage || "",
      expectedBehavior: req.body.expectedBehavior || "",
      testInputs: req.body.testInputs || "",
      performanceTarget: req.body.performanceTarget || ""
    };

    // media fields
    const media = {
      mediaType: req.body.mediaType || "",
      purpose: req.body.purpose || "",
      style: req.body.style || "",
      resolution: req.body.resolution || "",
      aspectRatio: req.body.aspectRatio || "",
      colorPalette: req.body.colorPalette || "",
      camera: req.body.camera || "",
      duration: req.body.duration || "",
      platform: req.body.platform || "",
      references: req.body.references || "",
      negative: req.body.negative || ""
    };

    const spec = buildSpecByMode(mode, base, coding, media);
    const systemHint = buildSystemHint(mode);
    const userTask = buildUserTask(mode, base.language, base.tone, base.lengthPref, spec);

    if (!GEMINI_API_KEY) {
      const fallback = `FINAL PROMPT\n\n${spec}`;
      return res.json({ model: "local-fallback", prompt: fallback, mode });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: `${systemHint}\n\n${userTask}` }] }],
      generationConfig: {
        temperature: base.creativity || 0.3,
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

    res.json({ model: MODEL_ID, prompt: text?.trim() || `FINAL PROMPT\n\n${spec}`, mode });
  } catch (err) {
    console.error(err);
    res.status(200).json({
      model: "local-fallback",
      prompt: "FINAL PROMPT\n\nเกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
      mode: req.body?.mode || "general"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
