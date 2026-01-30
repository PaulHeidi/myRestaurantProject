function loadOrders() {
  fetch("/get-orders")
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById("destinationTable").tBodies[0];
      tbody.innerHTML = "";

      const grouped = {};

      data.forEach(order => {
        if (!grouped[order.customer_phone]) {
          grouped[order.customer_phone] = {
            name: order.customer_name,
            phone: order.customer_phone,
            items: []
          };
        }
        grouped[order.customer_phone].items.push({
          dish: order.dishName,
          price: order.price
        });
      });

      Object.values(grouped).forEach(customer => {
        const headerRow = tbody.insertRow();
        headerRow.innerHTML = `
          <td colspan="3" style="font-weight:bold; background:#f0f0f0;">
            ${customer.name} (${customer.phone})
          </td>
        `;

        customer.items.forEach(item => {
          const row = tbody.insertRow();
          row.insertCell(0).textContent = item.dish;
          row.insertCell(1).textContent = item.price.toFixed(2);
          row.insertCell(2).textContent = "";
        });
      });
    })
    .catch(err => console.error("Error loading orders:", err));
}
