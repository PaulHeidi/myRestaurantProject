const conn = require("../dbConfig");
const { normalizeProductFromDescription } = require("./productNormalizer");

// ------------------------------------------------------
// DATE NORMALIZER — handles formats like "17 Mar 26"
// ------------------------------------------------------
function normalizeDate(dateString) {
    if (!dateString) return null;

    dateString = dateString.trim();

    // Handle "17 Mar 26"
    const shortMonthRegex = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2})$/;
    const matchShort = dateString.match(shortMonthRegex);

    if (matchShort) {
        const day = matchShort[1];
        const month = matchShort[2];
        const year = matchShort[3];

        const monthMap = {
            Jan: "01", Feb: "02", Mar: "03", Apr: "04",
            May: "05", Jun: "06", Jul: "07", Aug: "08",
            Sep: "09", Oct: "10", Nov: "11", Dec: "12"
        };

        const mm = monthMap[month];
        const yyyy = "20" + year;

        return `${yyyy}-${mm}-${day.padStart(2, "0")}`;
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const slashRegex = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/;
    const matchSlash = dateString.match(slashRegex);

    if (matchSlash) {
        const day = matchSlash[1].padStart(2, "0");
        const month = matchSlash[2].padStart(2, "0");
        const year = matchSlash[3];

        return `${year}-${month}-${day}`;
    }

    // Try native parsing
    // Try native parsing
const d = new Date(dateString);
if (!isNaN(d)) {
    return d.toISOString().split("T")[0];
}

// If still invalid → fallback to today's date
const today = new Date();
return today.toISOString().split("T")[0];



    return null;
}


// ------------------------------------------------------
// 1. GET OR CREATE PRODUCT
// ------------------------------------------------------
function getOrCreateProduct(supplier_id, item) {
    return new Promise((resolve, reject) => {
        const product_code =
            item.product_code || item.code || item.stockcode || null;

        if (!product_code) {
            return reject(new Error("Missing product_code for item"));
        }

        const checkSql = `
            SELECT id 
            FROM products
            WHERE supplier_id = ? AND product_code = ?
            LIMIT 1
        `;

        conn.query(checkSql, [supplier_id, product_code], (err, rows) => {
            if (err) return reject(err);

            if (rows.length > 0) {
                return resolve(rows[0].id);
            }

            const rawDescription = item.description || "";
            const norm = normalizeProductFromDescription(rawDescription);

            const description = rawDescription;
            const brand = item.brand || norm.brand || "";
            const pack_size = item.pack_size || norm.pack_size || "";
            const unit_of_measure = item.unit || norm.unit || "";

            const insertSql = `
                INSERT INTO products
                    (supplier_id, product_code, description, brand, pack_size, unit_of_measure)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            conn.query(
                insertSql,
                [
                    supplier_id,
                    product_code,
                    description,
                    brand,
                    pack_size,
                    unit_of_measure,
                ],
                (err2, result) => {
                    if (err2) {
                        if (err2.code === "ER_DUP_ENTRY") {
                            conn.query(
                                checkSql,
                                [supplier_id, product_code],
                                (err3, rows2) => {
                                    if (err3) return reject(err3);
                                    if (!rows2.length) return reject(err2);
                                    return resolve(rows2[0].id);
                                }
                            );
                        } else {
                            return reject(err2);
                        }
                    } else {
                        return resolve(result.insertId);
                    }
                }
            );
        });
    });
}

// ------------------------------------------------------
// 2. SAVE INVOICE TO DB
// ------------------------------------------------------
async function saveInvoiceToDB(invoice) {
    return new Promise(async (resolve, reject) => {
        try {
            const { supplier_id, invoice_number, invoice_date, items } = invoice;

            console.log("RAW DATE FROM PARSER:", invoice_date);

            const cleanDate = normalizeDate(invoice_date);

            const headerSql = `
                INSERT INTO supplier_orders 
                    (supplier_id, invoice_number, invoice_date, total_amount)
                VALUES (?, ?, ?, ?)
            `;

            const totalAmount = items.reduce(
                (sum, i) => sum + Number(i.total || 0),
                0
            );

            conn.query(
                headerSql,
                [supplier_id, invoice_number, cleanDate, totalAmount],
                async (err, headerResult) => {

                    // ------------------------------------------------------
                    // DUPLICATE INVOICE HANDLING
                    // ------------------------------------------------------
                    if (err) {
                        if (err.code === "ER_DUP_ENTRY") {
                            console.log("Duplicate invoice detected. Fetching existing order...");

                            const findSql = `
                                SELECT id 
                                FROM supplier_orders
                                WHERE supplier_id = ? AND invoice_number = ?
                                LIMIT 1
                            `;

                            return conn.query(
                                findSql,
                                [supplier_id, invoice_number],
                                (err2, rows) => {
                                    if (err2) return reject(err2);
                                    if (!rows.length) return reject(err);

                                    return resolve(rows[0].id);
                                }
                            );
                        }

                        return reject(err);
                    }

                    // ------------------------------------------------------
                    // NEW INVOICE INSERTED
                    // ------------------------------------------------------
                    const orderId = headerResult.insertId;

                    for (const item of items) {
                        const productId = await getOrCreateProduct(
                            supplier_id,
                            item
                        );

                        const itemSql = `
                            INSERT INTO supplier_order_items 
                            (supplier_order_id, product_id, product_code, quantity, unit_price, gst, total)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `;


                        await new Promise((resolve2, reject2) => {
                            conn.query(
                                itemSql,
                                [
                                     orderId,
                                    productId,
                                    item.product_code || null,
                                    item.quantity || 0,
                                    item.unit_price || 0,
                                    item.gst || 0,
                                    item.total || 0
                                ],
                                (err2) => {
                                    if (err2) return reject2(err2);
                                    resolve2();
                                }
                            );
                        });

                        const priceSql = `
                            INSERT INTO price_history (product_id, supplier_id, price, gst, date_recorded)
                            VALUES (?, ?, ?, ?, ?)
                        `;

                        await new Promise((resolve2, reject2) => {
                            conn.query(
                                priceSql,
                                [
                                    productId,
                                    supplier_id,
                                    item.unit_price || 0,
                                    item.gst || 0,
                                    cleanDate,
                                ],
                                (err2) => {
                                    if (err2) return reject2(err2);
                                    resolve2();
                                }
                            );
                        });
                    }

                    resolve(orderId);
                }
            );
        } catch (err) {
            reject(err);
        }
    });
}

// ------------------------------------------------------
// 3. EXPORT FUNCTION
// ------------------------------------------------------
module.exports = saveInvoiceToDB;

