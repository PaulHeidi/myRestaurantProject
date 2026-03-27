const conn = require("../dbConfig");

async function getInvoiceById(invoiceId) {
    return new Promise((resolve, reject) => {
        const invoiceSql = `
            SELECT i.*, s.name AS supplier_name
            FROM invoices i
            JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.id = ?
        `;

        conn.query(invoiceSql, [invoiceId], (err, invoiceRows) => {
            if (err) return reject(err);
            if (invoiceRows.length === 0) return resolve(null);

            const invoice = invoiceRows[0];

            const itemsSql = `
                SELECT ii.*, p.product_code, p.description, p.brand, p.pack_size, p.unit_of_measure
                FROM invoice_items ii
                JOIN products p ON ii.product_id = p.id
                WHERE ii.invoice_id = ?
            `;

            conn.query(itemsSql, [invoiceId], (err2, itemRows) => {
                if (err2) return reject(err2);

                invoice.items = itemRows;
                resolve(invoice);
            });
        });
    });
}

module.exports = getInvoiceById;
