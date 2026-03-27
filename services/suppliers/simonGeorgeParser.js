const { normalizeProductFromDescription } = require("../../helpers/productNormalizer");

function normalizeSGDate(dateStr) {
  if (!dateStr) return null;

  const monthMap = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
  };

  // 17-MAR-26 or 17-MAR-2026
  let m = dateStr.match(/(\d{1,2})[-\/\s]([A-Za-z]{3})[-\/\s](\d{2,4})/);
  if (m) {
    let day = m[1].padStart(2, "0");
    let month = monthMap[m[2].toUpperCase()];
    let year = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${day}/${month}/${year}`;
  }

  // 17/03/2026
  m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let day = m[1].padStart(2, "0");
    let month = m[2].padStart(2, "0");
    let year = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${day}/${month}/${year}`;
  }

  return null;
}

function parseSimonGeorge(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const flat = text.replace(/\s+/g, " ");

  // -----------------------------
  // INVOICE NUMBER
  // -----------------------------
  const invoiceNumber =
    (flat.match(/Invoice\s*No[:\s]+([A-Za-z0-9]+)/i) || [])[1] ||
    (flat.match(/TAX\s+INVOICE\s+([A-Za-z0-9]+)/i) || [])[1] ||
    null;

  // -----------------------------
  // INVOICE DATE (scan entire header)
  // -----------------------------
  let rawDate = null;

  // Look for any valid date pattern anywhere
  const dateMatch = flat.match(/(\d{1,2}[-\/][A-Za-z]{3}[-\/]\d{2,4})|(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateMatch) rawDate = dateMatch[0];

  const invoiceDate = normalizeSGDate(rawDate);

  // -----------------------------
  // ACCOUNT NUMBER (must be digits or alphanumeric)
  // -----------------------------
  let account = null;

  // Find any alphanumeric token after "Account"
  const accMatch = flat.match(/Account[:\s]+([A-Za-z0-9]+)/i);
  if (accMatch) {
    const candidate = accMatch[1];
    if (!["CODE", "ACCOUNT", "DATE", "INVOICE"].includes(candidate.toUpperCase())) {
      account = candidate;
    }
  }

  // -----------------------------
  // ITEMS
  // -----------------------------
  const items = [];

  for (const line of lines) {
    const match = line.match(
      /^([A-Z0-9]+)\s+(.*?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+([A-Z]+)\s+(\d+(?:\.\d+)?)\s+\/[A-Z]+\s+(\d+(?:\.\d+)?|OS)$/
    );

    if (!match) continue;

    const [
      _,
      product_code,
      description,
      orderQty,
      supplyQty,
      unit,
      price,
      total
    ] = match;

    const out_of_season = total === "OS";
const norm = normalizeProductFromDescription(description);


    items.push({
      product_code,
      description,
      brand: "",
      pack_size: "",
      unit,
      quantity: out_of_season ? 0 : Number(supplyQty),
      unit_price: out_of_season ? 0 : Number(price),
      gst: 0,
      total: out_of_season ? 0 : Number(total),
      out_of_season
    });
  }

  return {
    supplier: "SIMON_GEORGE",
    invoiceNumber,
    invoiceDate,
    account,
    items
  };
}

module.exports = parseSimonGeorge;
