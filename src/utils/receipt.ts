import { jsPDF } from 'jspdf';
import { Sale } from '../types/sale';
import { formatCurrency } from './format';
import { loadReceiptConfig } from './receiptConfig';

export const generateReceipt = (sale: Sale) => {
  const config = loadReceiptConfig();

  // Initialize with portrait orientation
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [config.paperSize.width, config.paperSize.height],
    compress: true
  });

  let y = 10; // Starting y position
  const margin = config.paperSize.width * 0.07; // 7% of width as margin

  // Header
  doc.setFontSize(config.fontSize.title);
  const title = config.businessInfo.name;
  const titleWidth = doc.getStringUnitWidth(title) * doc.getFontSize() / doc.internal.scaleFactor;
  doc.text(title, (config.paperSize.width - titleWidth) / 2, y);
  
  y += 5;
  doc.setFontSize(config.fontSize.subtitle);
  const subtitle = config.businessInfo.subtitle;
  const subtitleWidth = doc.getStringUnitWidth(subtitle) * doc.getFontSize() / doc.internal.scaleFactor;
  doc.text(subtitle, (config.paperSize.width - subtitleWidth) / 2, y);

  // Additional business info
  if (config.businessInfo.address) {
    y += 4;
    doc.setFontSize(config.fontSize.body);
    doc.text(config.businessInfo.address, margin, y);
  }

  if (config.businessInfo.phone) {
    y += 4;
    doc.text(`Tel: ${config.businessInfo.phone}`, margin, y);
  }

  if (config.businessInfo.email) {
    y += 4;
    doc.text(config.businessInfo.email, margin, y);
  }

  y += 8;
  doc.setFontSize(config.fontSize.body);
  const reference = `Referencia: ${String(sale.invoiceNumber).padStart(6, '0')}`;
  doc.text(reference, margin, y);

  y += 4;
  const date = new Date(sale.date).toLocaleDateString('es-NI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Fecha: ${date}`, margin, y);

  y += 4;
  doc.text(`Cliente: ${sale.clientName}`, margin, y);
  
  if (sale.clientCode) {
    y += 4;
    doc.text(`Código: ${sale.clientCode}`, margin, y);
  }

  // Products header
  y += 6;
  doc.setFontSize(7);
  doc.text('Producto', margin, y);
  doc.text('Cant.', 35, y);
  doc.text('Precio', 45, y);
  doc.text('Total', 60, y);

  // Separator line
  y += 2;
  doc.line(margin, y, config.paperSize.width - margin, y);

  // Products
  y += 4;
  doc.setFontSize(7);
  for (const product of sale.products) {
    doc.text(product.name.substring(0, 25), margin, y);
    doc.text(product.quantity.toString(), 35, y);
    doc.text(formatCurrency(product.finalPrice), 45, y);
    doc.text(formatCurrency(product.finalPrice * product.quantity), 60, y);
    y += 4;
  }

  // Separator line
  doc.line(margin, y, config.paperSize.width - margin, y);
  y += 4;

  // Totals
  doc.setFontSize(7);
  doc.text('Subtotal:', 45, y);
  doc.text(formatCurrency(sale.subtotal), 60, y);

  if (sale.discount > 0) {
    y += 4;
    doc.text('Descuento:', 45, y);
    doc.text(`-${formatCurrency(sale.discount)}`, 60, y);
  }

  y += 4;
  doc.setFontSize(8);

  // Payment method
  y += 8;
  doc.setFontSize(7);
  const paymentMethods: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia'
  };
  doc.text(`Método de pago: ${paymentMethods[sale.paymentMethod]}`, margin, y);

  if (sale.reference) {
    y += 4;
    doc.text(`Referencia: ${sale.reference}`, margin, y);
  }

  // Thank you message
  y += 8;
  doc.setFontSize(8);
  const thankYou = '¡Gracias por su preferencia!';
  const thankYouWidth = doc.getStringUnitWidth(thankYou) * doc.getFontSize() / doc.internal.scaleFactor;
  doc.text(thankYou, (config.paperSize.width - thankYouWidth) / 2, y);

  return doc;
};