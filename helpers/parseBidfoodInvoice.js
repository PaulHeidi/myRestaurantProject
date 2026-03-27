// -------------------------------
// Extract Invoice Number
// -------------------------------
function extractInvoiceNumber(text) {
    const match = text.match(/Order\s+No[: ]+\s*(\d{6,})/i);
    return match ? match[1].trim() : "";
}

// -------------------------------
// Extract Invoice Date
// -------------------------------
function extractInvoiceDate(text) {
    const match = text.match(/Order\s+date[: ]+\s*([0-9]{1,2}\s+\w+\s+\d{4})/i);
    return match ? match[1].trim() : "";
}

// -------------------------------
// Auto-correct common OCR mistakes
// -------------------------------
function fixOCR(text) {
    return text
        .replace(/O(?=\d)/g, "0")        // O → 0 before numbers
        .replace(/I(?=\d)/g, "1")        // I → 1 before numbers
        .replace(/S(?=\d)/g, "5")        // S → 5 before numbers
        .replace(/ {2,}/g, " ")          // collapse spaces
        .trim();
}

// -------------------------------
// Brand list (Bidfood-style)
// -------------------------------
const KNOWN_BRANDS = [
    "CATERERS CHOICE", "CATERERS", "CHOICE",
    "FARMYARD", "HEINZ", "KNORR", "MCCAIN",
    "DAIRY FARMERS", "YARDE FARM", "THE COUNTRY CHEF",
    "LEE KUM KEE", "WESTERN STAR", "SEAFROST",
    "SEAF", "PHILADELPHIA", "PACK STAR", "THE COUNTRY"
];

// -------------------------------
// Extract brand using 1,2,3,4 combined
// -------------------------------
function extractBrand(description, extraLines = []) {
    const upperDesc = description.toUpperCase();
    const upperExtra = extraLines.join(" ").toUpperCase();
    const combined = upperDesc + " " + upperExtra;

    // 1) From known brand list
    for (const b of KNOWN_BRANDS) {
        if (combined.includes(b)) return b;
    }

    // 2) Any uppercase word after main description (heuristic)
    const words = combined.split(/\s+/);
    const candidates = words.filter(w => w.length > 2 && /^[A-Z]+$/.test(w));
    if (candidates.length > 0) {
        return candidates[0];
    }

    // 3) BRAND column (if OCR captured header, it's already in description area)
    //    We already scan combined text, so this is implicitly covered.

    // 4) Fallback: empty string
    return "";
}

// -------------------------------
// Extract pack size (KG, G, LT, L, ML, Xn, etc.)
// -------------------------------
function extractPackSize(description) {
    const match = description.match(/(\d+(\.\d+)?\s*(KG|G|LT|L|ML|X\s*\d+))/i);
    return match ? match[0].trim() : "";
}

// -------------------------------
// Extract unit of measure (BAG, PACKET, CAN, BOTTLE, BLOCK, EACH, ROLL, etc.)
// -------------------------------
function extractUnit(description) {
    const units = ["BAG", "PACKET", "CAN", "BOTTLE", "BLOCK", "EACH", "ROLL", "PACK", "PKT"];
    const upper = description.toUpperCase();

    for (const u of units) {
        if (upper.includes(u)) return u;
    }

    return "";
}

// -------------------------------
// Merge multi-line product blocks
// -------------------------------
function buildProductBlocks(lines) {
    const blocks = [];
    let current = [];

    const productCodeRegex = /^[0-9]{3,6}\b/;

    for (const line of lines) {
        if (productCodeRegex.test(line)) {
            // New product starts
            if (current.length > 0) {
                blocks.push([...current]);
            }
            current = [line];
        } else {
            // Continuation of previous product (description/brand/etc.)
            if (current.length > 0) {
                current.push(line);
            }
        }
    }

    if (current.length > 0) {
        blocks.push([...current]);
    }

    return blocks;
}

// -------------------------------
// Parse a single product block
// -------------------------------
function parseProductBlock(blockLines) {
    // First line should contain: code, description, qty, prices
    const first = blockLines[0].replace(/\s+/g, " ").trim();

    // Regex: code, description, qty, unit_price, price_ex_gst, gst, total
    const itemRegex =
        /^(?<code>[0-9]{3,6})\s+(?<description>.+?)\s+(?<qty>[0-9]+)\s+\$(?<unit>[0-9.]+)\s+\$(?<price>[0-9.]+)\s+\$(?<gst>[0-9.]+)\s+\$(?<total>[0-9.]+)/;

    const match = first.match(itemRegex);
    if (!match) {
        return null;
    }

    // Combine all lines for richer description/brand extraction
    const fullText = blockLines.join(" ").replace(/\s+/g, " ").trim();
    const desc = match.groups.description.trim();

    const brand = extractBrand(desc, blockLines.slice(1));
    const packSize = extractPackSize(fullText);
    const unit = extractUnit(fullText);

    const qty = parseInt(match.groups.qty, 10) || 0;
    const unitPrice = parseFloat(match.groups.unit) || 0;
    const total = parseFloat(match.groups.total) || 0;
    const gst = parseFloat(match.groups.gst) || 0;

    return {
        product_code: match.groups.code || "",
        description: desc || "",
        brand: brand || "",
        pack_size: packSize || "",
        unit_of_measure: unit || "",
        quantity: qty,
        unit_price: unitPrice,
        total: total,
        gst: gst
    };
}

// -------------------------------
// Main Parser
// -------------------------------
function parseBidfoodInvoice(rawText) {
    let text = fixOCR(rawText);

    const lines = text
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // Cut off footer/noise after TOTAL or copyright if needed
    // (Optional: can be refined later)
    const cleanedLines = [];
    for (const line of lines) {
        cleanedLines.push(line);
        if (/Copyright/i.test(line)) break;
    }

    const productBlocks = buildProductBlocks(cleanedLines);

    const items = [];
    for (const block of productBlocks) {
        const item = parseProductBlock(block);
        if (item) {
            items.push(item);
        }
    }

    return {
        invoice_number: extractInvoiceNumber(text),
        invoice_date: extractInvoiceDate(text),
        items
    };
}

module.exports = parseBidfoodInvoice;
