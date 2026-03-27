// controllers/uploadController.js

const extractPdfText = require("../helpers/extractPdfText");
const parseInvoiceBySupplier = require("../services/suppliers/parseInvoiceBySupplier");

exports.handleUpload = async (req, res) => {
  try {
    // 1. Extract OCR text
    const text = await extractPdfText(req.file.path);

    console.log("RAW PDF TEXT START =====================");
    console.log(text);
    console.log("RAW PDF TEXT END =======================");

    // 2. Parse invoice (supplier detection happens inside)
    const parsed = parseInvoiceBySupplier(text);

    console.log("PARSED INVOICE:\n", JSON.stringify(parsed, null, 2));

    // 3. Render OCR preview (supplier-specific tables)
    res.render("reviewInvoice_OCR", {
      invoice: parsed,
      items: parsed.items || []
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).send("Error processing invoice");
  }
};
