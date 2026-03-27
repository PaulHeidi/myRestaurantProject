// helpers/extractPdfText.js

const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");
const pdfPoppler = require("pdf-poppler");
const sharp = require("sharp");
const { PdfReader } = require("pdfreader");
const detectSupplierFromLightOCR = require("./detectSupplierFromLightOCR");

module.exports = async function extractPdfText(filePath) {
  try {
    const outputDir = path.join(__dirname, "../uploads/pdf_images");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Clean old PNGs
    fs.readdirSync(outputDir).forEach(file => {
      if (file.endsWith(".png")) {
        fs.unlinkSync(path.join(outputDir, file));
      }
    });

    // Convert PDF → PNG (for OCR suppliers)
    const opts = {
      format: "png",
      out_dir: outputDir,
      out_prefix: "page",
      page: null,
      dpi: 300
    };

    await pdfPoppler.convert(filePath, opts);

    const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".png"));

    // ⭐ STEP 1 — LIGHT OCR TO DETECT SUPPLIER
    const firstPage = path.join(outputDir, files[0]);
    const lightImage = await sharp(firstPage)
      .grayscale()
      .normalize()
      .resize({ width: 2000 })
      .toBuffer();

    const lightOCR = await Tesseract.recognize(lightImage, "eng", {
      tessedit_pageseg_mode: 4,
      tessedit_ocr_engine_mode: 1
    });

    const supplier = detectSupplierFromLightOCR(lightOCR.data.text);
      console.log("OCR MODE SUPPLIER DETECTED:", supplier);

      // ⭐ USE PDFREADER FOR SIMON GEORGE + PFD
      if (supplier === "SIMON_GEORGE" || supplier === "PFD") {
        console.log(`${supplier} — USING PDFREADER TABLE EXTRACTION`);
        return await extractUsingPdfReader(filePath);
      }



    // ⭐ STEP 3 — ALL OTHER SUPPLIERS USE OCR
    let fullText = "";

    for (const file of files) {
      const imgPath = path.join(outputDir, file);
      console.log("OCR processing:", imgPath);

      const processedImage = await sharp(imgPath)
        .grayscale()
        .normalize()
        .resize({ width: 2200 })
        .toBuffer();

      const result = await Tesseract.recognize(processedImage, "eng", {
        tessedit_pageseg_mode: 4,
        tessedit_ocr_engine_mode: 1
      });

      fullText += result.data.text + "\n";
    }

    return fullText;

  } catch (err) {
    console.error("OCR ERROR:", err);
    throw err;
  }
};


// ⭐ PDFREADER TABLE EXTRACTION FOR SIMON GEORGE
function extractUsingPdfReader(filePath) {
  return new Promise((resolve, reject) => {
    const rows = {}; // { y: { x: text } }

    new PdfReader().parseFileItems(filePath, (err, item) => {
      if (err) return reject(err);

      if (!item) {
        // END OF FILE → reconstruct text
        const lines = Object.keys(rows)
          .sort((a, b) => parseFloat(a) - parseFloat(b))
          .map(y => {
            const cols = rows[y];
            const line = Object.keys(cols)
              .sort((a, b) => parseFloat(a) - parseFloat(b))
              .map(x => cols[x])
              .join(" ");
            return line;
          })
          .join("\n");

        return resolve(lines);
      }

      if (item.text) {
        rows[item.y] = rows[item.y] || {};
        rows[item.y][item.x] = item.text;
      }
    });
  });
}

