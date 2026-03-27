// helpers/productNormalizer.js

// Normalize unit labels to a consistent form
function normalizeUnit(rawUnit) {
    if (!rawUnit) return "";

    const u = rawUnit.toString().trim().toUpperCase();

    const map = {
        KG: "kg",
        KGS: "kg",
        G: "g",
        GRAM: "g",
        GRAMS: "g",
        BAG: "bag",
        BAGS: "bag",
        BUNCH: "bunch",
        BUNCHES: "bunch",
        PUNNET: "punnet",
        PUNNETS: "punnet",
        EACH: "each",
        EA: "each",
        DOZ: "dozen",
        DOZEN: "dozen",
        CASE: "case",
        CTN: "carton",
        CARTON: "carton",
        PKT: "packet",
        PACKET: "packet",
        TUB: "tub",
        TRAY: "tray",
    };

    return map[u] || u.toLowerCase();
}

// Extract unit from description
function extractUnit(description) {
    if (!description) return "";

    const units = [
        "KG", "KGS", "G", "GRAM", "GRAMS", "BAG", "BAGS", "BUNCH", "BUNCHES",
        "PUNNET", "PUNNETS", "EACH", "EA", "DOZ", "DOZEN", "CASE", "CTN",
        "CARTON", "PKT", "PACKET", "TUB", "TRAY"
    ];

    const regex = new RegExp(`\\b(${units.join("|")})\\b`, "i");
    const match = description.toUpperCase().match(regex);

    return match ? normalizeUnit(match[1]) : "";
}

// Extract pack size (250G, 1KG, 5KG, 12PK, 2X5KG, etc.)
function extractPackSize(description) {
    if (!description) return "";

    const text = description.toUpperCase();

    const regex = /(\d+\s?(?:X\s?)?\d*(?:G|KG|PK|PKT|EA|EACH|DOZ|DOZEN))/;
    const match = text.match(regex);

    return match ? match[1].replace(/\s+/g, "") : "";
}

// Extract quantity (12PK → 12, 6EA → 6, 2X5KG → 2)
function extractQuantity(description) {
    if (!description) return "";

    const text = description.toUpperCase();

    const regex = /^(\d+)\s?(?:X|\bPK\b|\bPKT\b|\bEA\b|\bEACH\b|\bDOZ\b|\bDOZEN\b)/;
    const match = text.match(regex);

    if (match) return match[1];

    const leading = text.match(/^(\d+)\b/);
    return leading ? leading[1] : "";
}

// Extract brand
function extractBrand(description) {
    if (!description) return "";

    const upper = description.toUpperCase();

    const knownBrands = [
        "SUNNY QUEEN",
        "RIVERINA",
        "FARM FRESH",
        "FRESHFIELDS",
        "CASA DELLA",
        "BLACK & GOLD",
        "WOOLWORTHS",
        "COLES",
        "PREMIUM"
    ];

    for (const brand of knownBrands) {
        if (upper.includes(brand)) return brand;
    }

    const genericBrand = upper.match(/^[A-Z]{3,}(?:\s[A-Z]{3,})?/);
    if (genericBrand) return genericBrand[0];

    return "";
}

// Main normalizer
function normalizeProductFromDescription(description) {
    const desc = description || "";

    return {
        description: desc,
        brand: extractBrand(desc),
        pack_size: extractPackSize(desc),
        unit: extractUnit(desc),
        quantity: extractQuantity(desc),
    };
}

module.exports = {
    normalizeUnit,
    extractUnit,
    extractPackSize,
    extractQuantity,
    extractBrand,
    normalizeProductFromDescription,
};

