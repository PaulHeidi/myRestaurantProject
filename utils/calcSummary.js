function calculateSummary(items) {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.total || 0);
  }, 0);

  const gst = 0;
  const grand_total = subtotal + gst;

  return { subtotal, gst, grand_total };
}

module.exports = { calculateSummary };

