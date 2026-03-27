// scripts/backfillProducts.js
const conn = require("../dbConfig");
const {
    normalizeProductFromDescription,
} = require("../helpers/productNormalizer");

function backfillProducts() {
    const selectSql = `
        SELECT id, description, brand, pack_size, unit_of_measure
        FROM products
    `;

    conn.query(selectSql, async (err, rows) => {
        if (err) {
            console.error("SELECT products error:", err);
            process.exit(1);
        }

        console.log(`Found ${rows.length} products to backfill`);

        for (const row of rows) {
            const norm = normalizeProductFromDescription(row.description);

            const newBrand = row.brand || norm.brand;
            const newPackSize = row.pack_size || norm.pack_size;
            const newUnit = row.unit_of_measure || norm.unit;

            if (!norm.brand && !norm.pack_size && !norm.unit) continue;

            const updateSql = `
                UPDATE products
                SET brand = ?, pack_size = ?, unit_of_measure = ?
                WHERE id = ?
            `;

            await new Promise((resolve, reject) => {
                conn.query(
                    updateSql,
                    [newBrand, newPackSize, newUnit, row.id],
                    (uErr) => {
                        if (uErr) return reject(uErr);
                        resolve();
                    }
                );
            });
        }

        console.log("Backfill complete.");
        process.exit(0);
    });
}

backfillProducts();
