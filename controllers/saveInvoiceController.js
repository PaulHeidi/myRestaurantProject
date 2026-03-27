// controllers/saveInvoiceController.js

const saveInvoiceToDB = require("../helpers/saveInvoiceToDB");

// 1️⃣ OCR PREVIEW → RENDER SUPPLIER-SPECIFIC PREVIEW PAGE
exports.reviewInvoice = (req, res) => {
  // Invoice + items prepared by uploadController
  const invoice = req.body.invoice || req.body.invoiceData || req.body;
  const items = req.body.items || [];

  // Render the OCR preview file (supplier-specific tables)
  res.render("reviewInvoice_OCR", { invoice, items });
};


// 2️⃣ SAVE INVOICE TO DATABASE (after user reviews)
exports.saveInvoice = async (req, res) => {
  try {
    console.log("Saving invoice:", req.body);

    // Save invoice + items + products + price history
    const invoiceId = await saveInvoiceToDB(req.body);

    console.log("Invoice saved with ID:", invoiceId);

    // Redirect to DB invoice viewer
    res.redirect(`/invoices/${invoiceId}`);

  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).send("Error saving invoice");
  }
};

