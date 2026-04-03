/**
 * Invoice PDF Generator
 * Generates PDF documents from invoice JSON data using jsPDF and jsPDF-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download invoice PDF
 * @param {Object} invoiceData - Invoice data from backend
 * @param {string} fileName - Output filename (without .pdf extension)
 */
export const generateInvoicePDF = (invoiceData, fileName = 'invoice') => {
  try {
    console.log('[invoicePdfGenerator] 📄 Generating PDF for invoice:', invoiceData.billNumber);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // Header Section
    doc.setFontSize(20);
    doc.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Company and Invoice Details
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoiceData.billNumber}`, 10, yPosition);
    yPosition += 5;
    doc.text(`Date: ${formatDate(invoiceData.billDate)}`, 10, yPosition);
    yPosition += 10;

    // Customer Details
    doc.setFontSize(11);
    doc.text('Bill To:', 10, yPosition);
    yPosition += 5;
    doc.setFontSize(10);
    doc.text(`${invoiceData.customerName || 'Customer'}`, 10, yPosition);
    yPosition += 5;
    if (invoiceData.customerPhone) {
      doc.text(`Phone: ${invoiceData.customerPhone}`, 10, yPosition);
      yPosition += 5;
    }
    if (invoiceData.customerAddress) {
      doc.text(`Address: ${invoiceData.customerAddress}`, 10, yPosition);
      yPosition += 5;
    }
    if (invoiceData.customerPlace) {
      doc.text(`Place: ${invoiceData.customerPlace}`, 10, yPosition);
      yPosition += 5;
    }
    yPosition += 5;

    // Items Table
    const itemsData = (invoiceData.items || []).map((item, index) => [
      (index + 1).toString(),
      item.productName || 'N/A',
      item.quantity?.toString() || '0',
      `₹${item.unitPrice?.toFixed(2) || '0.00'}`,
      `${item.gstPercent?.toString() || '0'}%`,
      `₹${item.lineSubtotal?.toFixed(2) || '0.00'}`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Product Name', 'Qty', 'Unit Price', 'GST', 'Subtotal']],
      body: itemsData,
      theme: 'striped',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: 50
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 25 }
      },
      margin: { left: 10, right: 10 },
      didDrawPage: function(data) {
        // Footer with page numbers
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();
        doc.setFontSize(8);
        doc.text(
          `Page ${doc.internal.getNumberOfPages()}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // Totals Section
    doc.setFontSize(10);
    const totalsStartX = pageWidth - 60;

    doc.text('Subtotal:', totalsStartX, yPosition);
    doc.text(`₹${(invoiceData.subtotal || 0).toFixed(2)}`, pageWidth - 10, yPosition, { align: 'right' });
    yPosition += 5;

    if (invoiceData.discountPercent > 0) {
      doc.setTextColor(220, 53, 69); // Red for discount
      doc.text(`Discount (${invoiceData.discountPercent}%):`, totalsStartX, yPosition);
      doc.text(`-₹${(invoiceData.discountAmount || 0).toFixed(2)}`, pageWidth - 10, yPosition, { align: 'right' });
      doc.setTextColor(0, 0, 0); // Reset to black
      yPosition += 5;
    }

    // GST Details
    if (invoiceData.isSameState) {
      // SGST/CGST for same state
      if (invoiceData.sgst > 0) {
        doc.text(`SGST (9%):`, totalsStartX, yPosition);
        doc.text(`₹${invoiceData.sgst.toFixed(2)}`, pageWidth - 10, yPosition, { align: 'right' });
        yPosition += 5;
      }
      if (invoiceData.cgst > 0) {
        doc.text(`CGST (9%):`, totalsStartX, yPosition);
        doc.text(`₹${invoiceData.cgst.toFixed(2)}`, pageWidth - 10, yPosition, { align: 'right' });
        yPosition += 5;
      }
    } else {
      // IGST for different state
      if (invoiceData.igst > 0) {
        doc.text(`IGST (18%):`, totalsStartX, yPosition);
        doc.text(`₹${invoiceData.igst.toFixed(2)}`, pageWidth - 10, yPosition, { align: 'right' });
        yPosition += 5;
      }
    }

    // Grand Total (highlighted)
    doc.setFontSize(12);
    doc.setFillColor(41, 128, 185);
    doc.setTextColor(255, 255, 255);
    doc.rect(totalsStartX - 2, yPosition - 4, 70, 8, 'F');
    doc.text('Grand Total:', totalsStartX, yPosition);
    doc.text(`₹${(invoiceData.grandTotal || 0).toFixed(2)}`, pageWidth - 10, yPosition, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset to black

    yPosition += 8;

    // Payment Mode
    doc.setFontSize(9);
    doc.text(`Payment Mode: ${invoiceData.paymentMode || 'Cash'}`, 10, yPosition);
    yPosition += 5;

    // EMI Details if present
    if (invoiceData.emiDetails) {
      doc.setFontSize(9);
      doc.text('EMI Details:', 10, yPosition);
      yPosition += 4;
      doc.setFontSize(8);
      doc.text(`Principal: ₹${invoiceData.emiDetails.principalAmount?.toFixed(2) || '0.00'}`, 15, yPosition);
      yPosition += 3;
      doc.text(`Months: ${invoiceData.emiDetails.months || 'N/A'}`, 15, yPosition);
      yPosition += 3;
      doc.text(`Monthly EMI: ₹${invoiceData.emiDetails.emiAmount?.toFixed(2) || '0.00'}`, 15, yPosition);
      yPosition += 3;
      doc.text(`Total Amount: ₹${invoiceData.emiDetails.totalAmount?.toFixed(2) || '0.00'}`, 15, yPosition);
    }

    // Save PDF
    const fullFileName = `${fileName}.pdf`;
    doc.save(fullFileName);

    console.log('[invoicePdfGenerator] ✅ PDF generated successfully:', fullFileName);
    return true;
  } catch (error) {
    console.error('[invoicePdfGenerator] ❌ Error generating PDF:', error);
    throw error;
  }
};

/**
 * Format date for display
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date
 */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateString.toString().split('T')[0];
  }
};
