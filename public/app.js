const form = document.getElementById("prompt-form");
const resultEl = document.getElementById("result");
const modelEl = document.getElementById("model");
const genBtn = document.getElementById("gen-btn");
const copyBtn = document.getElementById("copy-btn");

function getFormData() {
  const fd = new FormData(form);
  const payload = {};
  for (const [k, v] of fd.entries()) payload[k] = v.trim();
  // range returns string, keep it
  return payload;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = getFormData();
  resultEl.textContent = "กำลังสร้าง prompt...";
  modelEl.textContent = "";
  genBtn.disabled = true;

  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const json = await r.json();
    resultEl.textContent = json.prompt || "(ไม่มีผลลัพธ์)";
    modelEl.textContent = `model: ${json.model}`;
  } catch (err) {
    console.error(err);
    resultEl.textContent = "เกิดข้อผิดพลาดในการเรียก API";
  } finally {
    genBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  const text = resultEl.textContent.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  copyBtn.textContent = "คัดลอกแล้ว";
  setTimeout(() => (copyBtn.textContent = "คัดลอก"), 1200);
});
