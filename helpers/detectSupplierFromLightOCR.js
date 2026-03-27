module.exports = function detectSupplierFromLightOCR(text) {
  const t = text.toUpperCase();

  if (t.includes("SIMON") && t.includes("GEORGE")) return "SIMON_GEORGE";
  if (t.includes("PFD")) return "PFD";
  if (t.includes("FRESCO")) return "FRESCO";
  if (t.includes("BIDFOOD")) return "BIDFOOD";

  return "UNKNOWN";
};

