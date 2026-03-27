const saveInvoiceToDB = require("../helpers/saveInvoiceToDB");

exports.handleSave = async (req, res) => {
    try {
        const invoice = JSON.parse(req.body.invoiceData);

        const result = await saveInvoiceToDB(invoice, invoice.items);

        res.redirect(`/supplier-order/${result.supplierOrderId}`);

    } catch (err) {
        console.error("SAVE ERROR:", err);
        res.status(500).send("Error saving invoice");
    }
};
