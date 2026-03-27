const { normalizeProductFromDescription } = require("../../helpers/productNormalizer");

function cleanNumber(val) {
  if (!val) return 0;
  val = String(val).replace(/[^\d.]/g, "");
  return val ? Number(val) : 0;
}

module.exports = function parsePfd(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const flat = text.replace(/\n/g, " ").replace(/\s+/g, " ");

  const invoiceNumber =
    (flat.match(/Invoice\s*No[:\s]+([A-Za-z0-9]+)/i) || [])[1] ||
    (flat.match(/Invoice[:\s]+([A-Za-z0-9]+)/i) || [])[1] ||
    null;

  const invoiceDate =
    (flat.match(/Invoice\s*Date[:\s]+([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{2,4})/i) || [])[1] ||
    null;

  const items = [];

  for (const line of lines) {
    // Match: CODE DESCRIPTION... UM QTY QTY PRICE NET GST TOTAL
    const match = line.match(
      /^(\d{6})\s+(.+?)\s+(EA|KG|CTN|PKT|BAG|BOX|LTR|ML|G|KGS?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/
    );

    if (!match) continue;

    const [
      _,
      code,
      description,
      unit,
      qtyOrdered,
      qtySupplied,
      price,
      net,
      gst,
      total
    ] = match;
const norm = normalizeProductFromDescription(description);


    items.push({
      code,
      description, // full description (Option A)
      unit,
      qty_ordered: cleanNumber(qtyOrdered),
      qty_supplied: cleanNumber(qtySupplied),
      unit_price: cleanNumber(price),
      net_value: cleanNumber(net),
      gst: cleanNumber(gst),
      total: cleanNumber(total)
    });
  }

  return {
    supplier: "PFD",
    invoiceNumber,
    invoiceDate,
    items
  };
};
