const { normalizeProductFromDescription } = require("../../helpers/productNormalizer");

// Known Bidfood brands
const KNOWN_BRANDS = [
  "FARMYARD",
  "WESTERN STAR",
  "CATERERS CHOICE",
  "KARA",
  "MCCAIN",
  "SEAFROST",
  "RIVIANA",
  "FARM",
  "ANGELO'S",
  "YARDE",
  "CASA DELLA"
];

// Clean numeric garbage or units mistaken as brands
function cleanBrand(brand) {
  if (!brand) return "";

  brand = brand.trim().toUpperCase();

  const invalidUnits = [
    "PKT", "CTN", "EA", "BLK", "BAG", "CAN", "KG", "GR", "LT", "ML", "L",
    "BOX", "BTL", "TIN", "JAR"
  ];

  if (invalidUnits.includes(brand)) return "";
  if (/^\d+\.?$/.test(brand)) return "";     // 11. , 1.
  if (/^[A-Z]$/.test(brand)) return "";      // C, I, L
  if (/^[A-Z]\.$/.test(brand)) return "";    // C., I.

  return brand;
}

// Detect brand inside description (exact + fuzzy + suffix)
function detectBrand(description) {
  const upper = description.toUpperCase().trim();

  // 1. Exact match first
  for (const brand of KNOWN_BRANDS) {
    if (upper.includes(brand)) {
      return brand;
    }
  }

  // 2. Fuzzy OCR-damaged endings
  const fuzzyMap = {
    "WESTERN ST": "WESTERN STAR",
    "WESTERN": "WESTERN STAR",
    "CATERERS C": "CATERERS CHOICE",
    "CATERERS": "CATERERS CHOICE"
  };

  for (const key in fuzzyMap) {
    const idx = upper.indexOf(key);
    if (idx !== -1) {
      if (idx >= upper.length - key.length - 6) {
        return fuzzyMap[key];
      }
    }
  }

  return "";
}

function cleanNum(v) {
  if (!v) return 0;
  v = String(v).replace(/[^\d.-]/g, "");
  return v ? Number(v) : 0;
}

module.exports = function parseBidfood(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const items = [];

  for (let raw of lines) {
    let line = raw
      .replace(/[\|\[\]\(\)]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const codeMatch = line.match(/^(\d{4,6})\s+(.*)$/);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    let rest = codeMatch[2];

    rest = rest.replace(/(\d+)\.\s+(\d+)/g, "$1.$2");

    let qty, unitPrice, price, excl, gst, total;

    let tailMatch = rest.match(
      /(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/
    );

    if (tailMatch) {
      qty = tailMatch[1];
      unitPrice = tailMatch[2];
      price = tailMatch[3];
      excl = tailMatch[4];
      gst = tailMatch[5];
      total = tailMatch[6];

      rest = rest.replace(tailMatch[0], "").trim();
    } else {
      tailMatch = rest.match(/(\d+)\s+([\d.]+)\s+([\d.]+)$/);

      if (!tailMatch) continue;

      qty = tailMatch[1];
      unitPrice = tailMatch[2];
      total = tailMatch[3];

      price = unitPrice;
      excl = total;
      gst = 0;

      rest = rest.replace(tailMatch[0], "").trim();
    }

    // ⭐ OCR NORMALISATION FOR PACK SIZE & UNIT
    rest = rest
      .replace(/\b11t\b/gi, "1lt")
      .replace(/\bllt\b/gi, "1lt")
      .replace(/\bSkg\b/gi, "5kg")
      .replace(/\bskg\b/gi, "5kg");

    rest = rest
      .replace(/\bCIN\b/gi, "CTN")
      .replace(/\bClN\b/gi, "CTN")
      .replace(/\bCTM\b/gi, "CTN")
      .replace(/\bPK\b/gi, "PKT")
      .replace(/\bPRT\b/gi, "PKT");

    // IMPROVED PACK SIZE + UNIT EXTRACTION
    const packMatch = rest.match(
      /(\d+(?:x\d+)?(?:kg|gr|g|lt|ml|l|KG|GR|G|LT|ML|L))\s+(PKT|CTN|BAG|CAN|EA|BLK|BOX|BTL|TIN|JAR)\b/i
    );

    let packSize = "";
    let unit = "";
    let beforePack = rest;

    if (packMatch) {
      packSize = packMatch[1];
      unit = packMatch[2];
      beforePack = rest.replace(packMatch[0], "").trim();
    }

    // BRAND DETECTION
    let brand = detectBrand(beforePack);
    let description = beforePack;

    if (brand) {
      description = description.replace(new RegExp(brand, "i"), "").trim();
    } else {
      const parts = beforePack.split(" ").filter(Boolean);
      if (parts.length > 1) {
        const possibleBrand = parts.pop();
        brand = cleanBrand(possibleBrand);
        description = parts.join(" ");
      }
    }

    unit = unit.toUpperCase();

    items.push({
      product_code: code,
      description: description.trim(),
      brand: brand.trim(),
      pack_size: packSize.trim(),
      unit: unit.trim(),
      quantity: cleanNum(qty),
      unit_price: cleanNum(unitPrice),
      price: cleanNum(price),
      excl_gst: cleanNum(excl),
      gst: cleanNum(gst),
      total: cleanNum(total)
    });
  }

  const flat = text.replace(/\s+/g, " ");

  const invoiceNumber =
    (flat.match(/Document\s*No[:\s]+([A-Za-z0-9.]+)/i) || [])[1] ||
    (flat.match(/DocumentNo[:\s]+([A-Za-z0-9.]+)/i) || [])[1] ||
    null;

  let dateMatch =
    flat.match(/tnvoice\s*pate[^\d]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    flat.match(/invoice\s*pate[^\d]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    flat.match(/invoice\s*date[^\d]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    flat.match(/lnvoice\s*date[^\d]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    flat.match(/document\s*date[^\d]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ||
    flat.match(/date[^\d]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  const invoiceDate = dateMatch ? dateMatch[1] : null;

  return {
    supplier: "BIDFOOD",
    invoiceNumber,
    invoiceDate,
    items
  };
};

