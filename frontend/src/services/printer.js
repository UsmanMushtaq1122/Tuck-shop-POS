const DEFAULT_SETTINGS = {
  paperWidth: 80,
  autoPrint: false,
  showLogo: true,
  showBarcode: true,
  showTaxDetails: true,
  receiptHeader: 'Thank you for your purchase!',
  receiptFooter: 'Visit us again!',
  copies: 1,
};

function loadSettings() {
  try {
    const stored = localStorage.getItem('printer_settings');
    return { ...DEFAULT_SETTINGS, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem('printer_settings', JSON.stringify(settings));
}

class ThermalPrinter {
  constructor(options = {}) {
    const settings = loadSettings();
    this.paperWidth = options.paperWidth || settings.paperWidth || 80;
    this.settings = settings;
  }

  getCols() {
    return this.paperWidth === 58 ? 32 : 48;
  }

  generateTextReceipt(order) {
    const {
      shopName = 'Tuck Shop POS',
      shopAddress = 'Main Street, City',
      shopPhone = '0300-1234567',
      shopLogo = '🏪',
      orderNumber,
      date,
      cashier,
      items = [],
      subtotal = 0,
      discount = 0,
      tax = 0,
      total = 0,
      paymentMethod = 'cash',
      customerName,
    } = order;

    const cols = this.getCols();
    const s = this.settings;
    let receipt = '';

    if (s.showLogo) {
      receipt += this.center(shopLogo, cols) + '\n';
    }
    receipt += this.center(shopName, cols) + '\n';
    receipt += this.center(shopAddress, cols) + '\n';
    receipt += this.center(`Tel: ${shopPhone}`, cols) + '\n';
    receipt += this.separator(cols) + '\n';
    receipt += `Invoice: ${orderNumber}\n`;
    receipt += `Date: ${date}\n`;
    receipt += `Cashier: ${cashier}\n`;
    if (customerName) {
      receipt += `Customer: ${customerName}\n`;
    }
    receipt += this.separator(cols) + '\n';

    receipt += this.padRight('Item', cols - 12) + this.padLeft('Qty', 4) + this.padLeft('Price', 8) + '\n';
    receipt += this.separator(cols) + '\n';

    for (const item of items) {
      const name = (item.product_name || item.name || '').substring(0, cols - 13);
      receipt += this.padRight(name, cols - 12) + this.padLeft(String(item.quantity || 0), 4) + this.padLeft(this.fmt(item.total || item.price * item.quantity), 8) + '\n';
    }

    receipt += this.separator(cols) + '\n';
    receipt += this.padRight('Subtotal', cols - 10) + this.padLeft(this.fmt(subtotal), 10) + '\n';

    if (discount > 0) {
      receipt += this.padRight('Discount', cols - 10) + this.padLeft(this.fmt(discount), 10) + '\n';
    }
    if (s.showTaxDetails && tax > 0) {
      receipt += this.padRight('Tax', cols - 10) + this.padLeft(this.fmt(tax), 10) + '\n';
    }

    receipt += this.separator(cols) + '\n';
    receipt += this.padRight('TOTAL', cols - 10) + this.padLeft(this.fmt(total), 10) + '\n';
    receipt += this.separator(cols) + '\n';
    receipt += `Payment: ${paymentMethod}\n`;
    receipt += this.separator(cols) + '\n';
    receipt += this.center(s.receiptHeader || 'Thank you!', cols) + '\n';
    receipt += this.center(s.receiptFooter || '', cols) + '\n';
    receipt += '\n'.repeat(4);

    return receipt;
  }

  generateHtmlReceipt(order) {
    const {
      shopName = 'Tuck Shop POS',
      shopAddress = 'Main Street, City',
      shopPhone = '0300-1234567',
      shopLogo = '🏪',
      orderNumber,
      date,
      cashier,
      items = [],
      subtotal = 0,
      discount = 0,
      tax = 0,
      total = 0,
      paymentMethod = 'cash',
      customerName,
    } = order;

    const s = this.settings;
    const is58 = this.paperWidth === 58;
    const maxW = is58 ? '280px' : '384px';
    const fs = is58 ? '11px' : '12px';

    const itemRows = items.map(item =>
      `<tr>
        <td style="padding:2px 0;font-size:${fs}">${item.product_name || item.name}</td>
        <td style="padding:2px 0;font-size:${fs};text-align:center">${item.quantity}</td>
        <td style="padding:2px 0;font-size:${fs};text-align:right">${this.fmt(item.total || item.price * item.quantity)}</td>
      </tr>`
    ).join('');

    return `
      <div style="font-family:'Courier New',Courier,monospace;width:${maxW};margin:0 auto;padding:16px;color:#000;background:#fff;">
        ${s.showLogo ? `<div style="text-align:center;font-size:24px;margin-bottom:4px">${shopLogo}</div>` : ''}
        <div style="text-align:center;font-weight:bold;font-size:14px;margin-bottom:2px">${shopName}</div>
        <div style="text-align:center;font-size:${fs};color:#555">${shopAddress}</div>
        <div style="text-align:center;font-size:${fs};color:#555">Tel: ${shopPhone}</div>
        <hr style="border-top:1px dashed #333;margin:8px 0" />

        <table style="width:100%;font-size:${fs}">
          <tr><td style="color:#888">Invoice:</td><td style="text-align:right;font-weight:bold">${orderNumber}</td></tr>
          <tr><td style="color:#888">Date:</td><td style="text-align:right">${date}</td></tr>
          <tr><td style="color:#888">Cashier:</td><td style="text-align:right">${cashier}</td></tr>
          ${customerName ? `<tr><td style="color:#888">Customer:</td><td style="text-align:right">${customerName}</td></tr>` : ''}
        </table>

        <hr style="border-top:1px dashed #333;margin:8px 0" />
        <table style="width:100%;font-size:${fs}">
          <thead>
            <tr style="font-weight:bold">
              <th style="text-align:left">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <hr style="border-top:1px dashed #333;margin:8px 0" />

        <table style="width:100%;font-size:${fs}">
          <tr><td>Subtotal</td><td style="text-align:right">${this.fmt(subtotal)}</td></tr>
          ${discount > 0 ? `<tr><td>Discount</td><td style="text-align:right;color:#22c55e">-${this.fmt(discount)}</td></tr>` : ''}
          ${s.showTaxDetails && tax > 0 ? `<tr><td>Tax</td><td style="text-align:right">${this.fmt(tax)}</td></tr>` : ''}
        </table>
        <hr style="border-top:2px solid #333;margin:8px 0" />
        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px">
          <span>TOTAL</span>
          <span>${this.fmt(total)}</span>
        </div>
        <hr style="border-top:1px dashed #333;margin:8px 0" />
        <div style="font-size:${fs};color:#555">Payment: ${paymentMethod}</div>
        <hr style="border-top:1px dashed #333;margin:8px 0" />

        <div style="text-align:center;font-size:${fs};margin-top:4px">${s.receiptHeader || 'Thank you!'}</div>
        ${s.receiptFooter ? `<div style="text-align:center;font-size:${fs}">${s.receiptFooter}</div>` : ''}
      </div>
    `;
  }

  printText(receipt) {
    if (window.electronAPI?.print) {
      window.electronAPI.print(receipt);
    } else {
      const w = window.open('', '_blank', `width=${this.paperWidth === 58 ? 300 : 400},height=600`);
      if (w) {
        w.document.write('<pre style="font-family:monospace;font-size:12px;margin:0">');
        w.document.write(receipt);
        w.document.write('</pre>');
        w.document.close();
        w.print();
      }
    }
  }

  printHtml(html) {
    const w = window.open('', '_blank', `width=${this.paperWidth === 58 ? 300 : 400},height=600`);
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }

  printOrder(order) {
    const receipt = this.generateTextReceipt(order);
    this.printText(receipt);
    return receipt;
  }

  printPreviewHtml(order) {
    return this.generateHtmlReceipt(order);
  }

  storeLastReceipt(order) {
    try {
      localStorage.setItem('last_receipt', JSON.stringify(order));
    } catch {}
  }

  getLastReceipt() {
    try {
      return JSON.parse(localStorage.getItem('last_receipt') || 'null');
    } catch {
      return null;
    }
  }

  center(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  padRight(text, width) {
    return String(text).padEnd(width, ' ');
  }

  padLeft(text, width) {
    return String(text).padStart(width, ' ');
  }

  separator(width) {
    return '-'.repeat(width);
  }

  fmt(amount) {
    return `Rs.${Math.round(amount)}`;
  }
}

export default ThermalPrinter;
