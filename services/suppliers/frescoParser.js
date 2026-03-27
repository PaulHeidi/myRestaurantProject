const { normalizeProductFromDescription } = require("../../helpers/productNormalizer");

function parseFresco(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const items = [];

  const invoiceNumberMatch = text.match(/Invoice No\.?:?\s*([A-Za-z0-9\/\-]+)/i);
  const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1].trim() : null;

  const invoiceDateMatch = text.match(/Invoice Date\.?:?\s*([0-9]{1,2}\s+\w+\s+[0-9]{4})/i);
  const invoiceDate = invoiceDateMatch ? invoiceDateMatch[1].trim() : null;

  for (let rawLine of lines) {
    let line = rawLine.replace(/\s*\|\s*/g, " ");
    line = line.replace(/\s+/g, " ");

    const match = line.match(
      /^(\d+(?:\.\d+)?)\s+(?:(\w+)\s+)?(.*?)\s+(\d+(?:\.\d+)?|OS)\s+KG\s+(\d+(?:\.\d+)?|OS)$/
    );

    if (!match) continue;

    const [_, qty, stockcodeRaw, description, price, total] = match;

    const stockcode = stockcodeRaw || "UNKNOWN";
    const isOS = price === "OS" || total === "OS";
const norm = normalizeProductFromDescription(description);


    items.push({
      stockcode,
      description: description.trim(),
      unit: "KG",
      quantity: parseFloat(qty),
      unit_price: isOS ? 0 : parseFloat(price),
      total: isOS ? 0 : parseFloat(total),
      out_of_season: isOS
    });
  }

  return {
    supplier: "Fresco",
    invoiceNumber,
    invoiceDate,
    items
  };
}

module.exports = parseFresco;
