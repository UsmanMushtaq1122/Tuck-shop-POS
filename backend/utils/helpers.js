function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateBarcode() {
  return Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
}

function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateTax(amount, rate) {
  return amount * (rate / 100);
}

function calculateDiscount(amount, discount) {
  return amount * (discount / 100);
}

module.exports = {
  generateId,
  generateBarcode,
  generateOrderNumber,
  formatCurrency,
  calculateTax,
  calculateDiscount,
};
