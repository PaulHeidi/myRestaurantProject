// services/suppliers/extractInvoiceMeta.js

function extractInvoiceNumber(text) {
  const cleaned = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[:.]+/g, ':')
    .replace(/\s+:/g, ':')
    .replace(/:\s+/g, ':');

  const patterns = [
    /tax\s*invoice\s*([0-9]{6,12})/i, // Simon George
    /invoice\s*no\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
    /inv\s*no\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
    /invoice\s*number\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
    /invoice\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
    /order\s*no\s*[:\-]?\s*([A-Z0-9\/\-]+)/i,
    /^[^\n]{0,200}.*?([0-9]{6,10})/i // fallback
  ];

  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m && m[1]) return m[1].trim();
  }

  return '';
}

function extractInvoiceDate(text) {
  const cleaned = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[:.]+/g, ':')
    .replace(/\s+:/g, ':')
    .replace(/:\s+/g, ':');

  const patterns = [
    /([0-9]{1,2}[-\/][A-Za-z]{3}[-\/][0-9]{2,4})/i, // 17-MAR-26
    /invoice\s*date\s*[:\-]?\s*([0-9]{1,2}\s+[A-Za-z]{3,12}\s+[0-9]{2,4})/i,
    /date\s*[:\-]?\s*([0-9]{1,2}\s+[A-Za-z]{3,12}\s+[0-9]{2,4})/i
  ];

  for (const re of patterns) {
    const m = cleaned.match(re);
    if (m && m[1]) return m[1].trim();
  }

  return '';
}

module.exports = {
  extractInvoiceNumber,
  extractInvoiceDate
};
