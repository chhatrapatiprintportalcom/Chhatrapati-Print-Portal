const $ = (id) => document.getElementById(id);

const fields = ["name","dob","gender","docNo","address"];

function updatePreview(){
  fields.forEach(k => {
    document.querySelector(`[data-out="${k}"]`).textContent = $(k).value.trim() || "—";
  });
  const type = $("cardType").value;
  const titles = {
    reference:"DOCUMENT REFERENCE",
    mahasarathi:"MAHA SARATHI — REFERENCE",
    farmer:"FARMER ID — REFERENCE",
    ration:"RATION CARD — REFERENCE"
  };
  document.querySelector(".card-title").textContent = titles[type] || titles.reference;
}

fields.forEach(k => $(k).addEventListener("input", updatePreview));
$("cardType").addEventListener("change", updatePreview);
$("previewBtn").addEventListener("click", updatePreview);

$("printBtn").addEventListener("click", () => {
  updatePreview();
  window.print();
});

$("downloadBtn").addEventListener("click", () => {
  updatePreview();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Card</title>
  <style>${document.querySelector("style").textContent}</style></head>
  <body><div style="padding:30px">${$("card").outerHTML}</div></body></html>`;
  const blob = new Blob([html], {type:"text/html;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "card-reference.html";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("pdfInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  $("status").textContent = "PDF तपासत आहे…";

  // Text-based PDFs: attempt basic text extraction using PDF.js.
  // Scanned/image PDFs will need OCR in the next phase.
  try {
    const pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({data}).promise;
    let text = "";
    const pages = Math.min(pdf.numPages, 3);

    for(let p=1;p<=pages;p++){
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map(x => x.str).join(" ") + "\n";
    }

    $("status").textContent = `PDF वाचली. ${pdf.numPages} page(s). पुढच्या टप्प्यात field-wise extraction जोडू.`;
    console.log("PDF text:", text);

    // Conservative demo extraction only; do not silently guess identity data.
    const nameMatch = text.match(/(?:Name|नाव)\s*[:\-]?\s*([A-Za-z\u0900-\u097F .'-]{3,})/i);
    if(nameMatch && !$("name").value) $("name").value = nameMatch[1].trim();

    updatePreview();
  } catch(err) {
    console.error(err);
    $("status").textContent = "PDF वाचता आली नाही. पुढच्या टप्प्यात OCR support जोडू.";
  }
});

updatePreview();