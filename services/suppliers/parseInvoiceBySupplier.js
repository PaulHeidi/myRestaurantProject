const parseFresco = require("./frescoParser");
const parsePFD = require("./pfdParser");
const parseSimonGeorge = require("./simonGeorgeParser");
const parseBidfood = require("./bidfoodParser");

function detectSupplier(text) {
  if (/SIMON GEORGE/i.test(text)) return "SIMON_GEORGE";
  if (/PFD Food/i.test(text)) return "PFD";
  if (/Fresco/i.test(text)) return "Fresco";
  if (/BIDFOOD/i.test(text) || /Bidfood/i.test(text)) return "BIDFOOD";
  return "UNKNOWN";
}

module.exports = function parseInvoiceBySupplier(text) {
  const supplier = detectSupplier(text);

  if (supplier === "SIMON_GEORGE") return parseSimonGeorge(text);
  if (supplier === "PFD") return parsePFD(text);
  if (supplier === "Fresco") return parseFresco(text);
  if (supplier === "BIDFOOD") return parseBidfood(text);

  return { supplier: "UNKNOWN", items: [] };
};
