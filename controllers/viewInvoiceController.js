const conn = require("../dbConfig");

exports.viewInvoice = (req, res) => {
    const invoiceId = req.params.id;

    const headerSql = `
        SELECT *
        FROM supplier_orders
        WHERE id = ?
    `;

    conn.query(headerSql, [invoiceId], (err, headerRows) => {
        if (err) return res.status(500).send("Database error");
        if (!headerRows.length) return res.status(404).send("Invoice not found");

        const invoice = headerRows[0];

        const itemsSql = `
            SELECT soi.*, p.description, p.brand, p.pack_size, p.unit_of_measure
            FROM supplier_order_items soi
            JOIN products p ON soi.product_id = p.id
            WHERE soi.supplier_order_id = ?
        `;

        conn.query(itemsSql, [invoiceId], (err2, itemRows) => {
            if (err2) return res.status(500).send("Database error");

            res.render("invoiceView", {
                invoice,
                items: itemRows
            });
        });
    });
};

