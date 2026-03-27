// routes/invoiceRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const uploadController = require("../controllers/uploadController");
const saveController = require("../controllers/saveInvoiceController");

const conn = require("../dbConfig");

// ===============================
// UPLOAD PAGE
// ===============================
router.get("/upload_invoice", (req, res) => {
  res.render("upload_invoice");
});

// ===============================
// 1) UPLOAD → OCR → PARSE → PREVIEW
// ===============================
router.post(
  "/upload-invoice",
  upload.single("invoice"),
  uploadController.handleUpload
);

// ===============================
// 2) OCR PREVIEW → REVIEW
// ===============================
router.post("/review-invoice", saveController.reviewInvoice);

// ===============================
// 3) REVIEW → SAVE TO DATABASE
// ===============================
router.post("/save-invoice", saveController.saveInvoice);

// ===============================
// 4) LIST ALL SAVED INVOICES (NEW TABLE)
// ===============================
router.get("/invoices", (req, res) => {
  const sql = `
        SELECT 
            so.id, 
            so.invoice_number, 
            so.invoice_date, 
            so.total_amount, 
            s.name AS supplier_name
        FROM supplier_orders so
        JOIN suppliers s ON so.supplier_id = s.id
        ORDER BY so.invoice_date DESC
    `;

  conn.query(sql, (err, rows) => {
    if (err) return res.status(500).send("Database error");
    res.render("invoiceList", { invoices: rows });
  });
});

// ===============================
// 5) VIEW A SINGLE SAVED INVOICE (NEW TABLES)
// ===============================
router.get("/invoices/:id", (req, res) => {
  const invoiceId = req.params.id;

  const headerSql = `
        SELECT 
            so.*, 
            s.name AS supplier_name
        FROM supplier_orders so
        JOIN suppliers s ON so.supplier_id = s.id
        WHERE so.id = ?
    `;

  conn.query(headerSql, [invoiceId], (err, headerRows) => {
    if (err) return res.status(500).send("Database error");
    if (!headerRows.length) return res.status(404).send("Invoice not found");

    const invoice = headerRows[0];

    // ⭐ FIXED: product_code now included because we select soi.*
    const itemsSql = `
            SELECT 
                soi.*, 
                p.description, 
                p.brand, 
                p.pack_size, 
                p.unit_of_measure
            FROM supplier_order_items soi
            JOIN products p ON soi.product_id = p.id
            WHERE soi.supplier_order_id = ?
        `;

    conn.query(itemsSql, [invoiceId], (err2, itemRows) => {
      if (err2) return res.status(500).send("Database error");

      res.render("reviewInvoice", {
        invoice,
        items: itemRows
      });
    });
  });
});

module.exports = router;

