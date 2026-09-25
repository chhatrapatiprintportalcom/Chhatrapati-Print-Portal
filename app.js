import * as pdfjsLib from
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

const pdfInput = document.getElementById("pdfInput");
const statusBox = document.getElementById("status");

const nameInput = document.getElementById("name");
const dobInput = document.getElementById("dob");
const genderInput = document.getElementById("gender");
const docNoInput = document.getElementById("docNo");
const addressInput = document.getElementById("address");

const cardType = document.getElementById("cardType");
const printBtn = document.getElementById("printBtn");
const downloadBtn = document.getElementById("downloadBtn");

function setStatus(message) {
  if (statusBox) {
    statusBox.textContent = message;
  }
}

function cleanText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function findName(text) {
  const patterns = [
    /(?:Name|नाम|नाव)\s*[:\-]?\s*([A-Za-zÀ-ÿअ-हऀ-ॿ .']{3,60})/i,
    /(?:Name\s*of\s*Person)\s*[:\-]?\s*([A-Za-zÀ-ÿअ-हऀ-ॿ .']{3,60})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].split(/\n/)[0].trim();
    }
  }

  return "";
}

function findDOB(text) {
  const patterns = [
    /(?:DOB|Date of Birth|जन्म तारीख|जन्मतारीख|जन्म दिनांक)\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /\b(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return "";
}

function findGender(text) {
  const lower = text.toLowerCase();

  if (/\bmale\b|पुरुष|पु\b/.test(lower)) return "Male";
  if (/\bfemale\b|महिला|स्त्री|स्त्री\b/.test(lower)) return "Female";

  return "";
}

function findAadhaar(text) {
  const match = text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
  return match ? match[0].replace(/\s/g, " ") : "";
}

function findPAN(text) {
  const match = text.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
  return match ? match[0] : "";
}

function findDocumentNumber(text) {
  const aadhaar = findAadhaar(text);
  if (aadhaar) return aadhaar;

  const pan = findPAN(text);
  if (pan) return pan;

  const patterns = [
    /(?:Document No|Document Number|ID No|ID Number|Card No|क्रमांक|दस्तऐवज क्र\.?)\s*[:\-]?\s*([A-Za-z0-9\/\-]{4,30})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return "";
}

function findAddress(text) {
  const patterns = [
    /(?:Address|पत्ता)\s*[:\-]?\s*([\s\S]{10,250}?)(?:\n(?:DOB|Date of Birth|Gender|Name|नाव|जन्म)|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1]
        .replace(/\n+/g, ", ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  return "";
}

function extractInformation(text) {
  return {
    name: findName(text),
    dob: findDOB(text),
    gender: findGender(text),
    docNo: findDocumentNumber(text),
    address: findAddress(text)
  };
}

function fillFields(data) {
  if (nameInput) nameInput.value = data.name || "";
  if (dobInput) dobInput.value = data.dob || "";
  if (genderInput) genderInput.value = data.gender || "";
  if (docNoInput) docNoInput.value = data.docNo || "";
  if (addressInput) addressInput.value = data.address || "";

  updatePreview();
}

async function extractPDF(file) {
  setStatus("⏳ PDF वाचत आहे...");

  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    setStatus(`⏳ PDF वाचत आहे... Page ${pageNumber}/${pdf.numPages}`);

    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str)
      .join(" ");

    fullText += pageText + "\n";
  }

  return cleanText(fullText);
}

if (pdfInput) {
  pdfInput.addEventListener("change", async function () {
    const file = this.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setStatus("❌ कृपया PDF file निवडा.");
      return;
    }

    try {
      const text = await extractPDF(file);

      if (!text || text.length < 5) {
        setStatus(
          "⚠️ PDF मधून text मिळाला नाही. ही scanned/image PDF असू शकते. OCR पुढील टप्प्यात जोडता येईल."
        );
        return;
      }

      const data = extractInformation(text);

      fillFields(data);

      setStatus(
        "✅ PDF मधील उपलब्ध माहिती fields मध्ये भरली आहे. कृपया तपासून घ्या."
      );

      console.log("Extracted PDF Text:", text);
      console.log("Detected Information:", data);

    } catch (error) {
      console.error(error);

      setStatus(
        "❌ PDF वाचताना समस्या आली. PDF पुन्हा upload करून पहा."
      );
    }
  });
}

function updatePreview() {
  document.querySelectorAll("[data-out]").forEach(element => {
    const key = element.getAttribute("data-out");

    const input = document.getElementById(key);

    if (input) {
      element.textContent = input.value || "—";
    }
  });

  const title = document.querySelector(".card-title");

  if (title && cardType) {
    const option =
      cardType.options[cardType.selectedIndex];

    title.textContent =
      option ? option.textContent.toUpperCase() : "CARD";
  }
}

[
  nameInput,
  dobInput,
  genderInput,
  docNoInput,
  addressInput,
  cardType
].forEach(element => {
  if (element) {
    element.addEventListener("input", updatePreview);
    element.addEventListener("change", updatePreview);
  }
});

if (printBtn) {
  printBtn.addEventListener("click", function () {
    updatePreview();
    window.print();
  });
}

if (downloadBtn) {
  downloadBtn.addEventListener("click", function () {
    updatePreview();

    const card = document.querySelector(".card");

    if (!card) {
      alert("Card preview उपलब्ध नाही.");
      return;
    }

    const html = `
<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="UTF-8">
<title>Chhatrapati Print Portal - Card</title>
<style>
body {
  font-family: Arial, sans-serif;
  padding: 20px;
}
.card {
  width: 350px;
  border: 1px solid #222;
  padding: 15px;
  box-sizing: border-box;
}
</style>
</head>
<body>
${card.outerHTML}
</body>
</html>
`;

    const blob = new Blob([html], {
      type: "text/html;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "chhatrapati-card.html";
    a.click();

    URL.revokeObjectURL(url);
  });
}

updatePreview();

setStatus("PDF निवडा आणि माहिती automatic extract करा.");
