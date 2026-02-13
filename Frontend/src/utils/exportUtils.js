import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Format currency for display
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Export data to PDF with professional formatting
 * @param {Object} options - Export options
 * @param {string} options.title - Document title
 * @param {string} options.subtitle - Document subtitle (optional)
 * @param {Array} options.columns - Column definitions [{header: 'Name', key: 'name', width: 40}]
 * @param {Array} options.data - Data array
 * @param {string} options.filename - Output filename (without extension)
 * @param {Object} options.summary - Summary data to show at bottom (optional)
 * @param {Object} options.headerInfo - Header information like customer details (optional)
 * @param {string} options.orientation - 'portrait' or 'landscape' (default: 'portrait')
 */
export const exportToPDF = (options) => {
  const {
    title,
    subtitle = '',
    columns,
    data,
    filename,
    summary = null,
    headerInfo = null,
    orientation = 'portrait'
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 15;

  // Company Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Al Noor Traders', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }

  // Generated date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated: ${new Date().toLocaleString('en-PK')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Header Info (for ledgers, etc.)
  if (headerInfo) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    Object.entries(headerInfo).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yPos);
      yPos += 5;
    });
    yPos += 3;
  }

  // Table
  const tableColumns = columns.map(col => col.header);
  const tableData = data.map(row => 
    columns.map(col => {
      let value = row[col.key];
      if (col.format === 'currency') {
        value = formatCurrency(value);
      } else if (col.format === 'date') {
        value = formatDate(value);
      } else if (col.format === 'number') {
        value = Number(value || 0).toLocaleString();
      }
      return value ?? '-';
    })
  );

  autoTable(doc, {
    startY: yPos,
    head: [tableColumns],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      halign: 'left'
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: columns.reduce((acc, col, index) => {
      acc[index] = {
        cellWidth: col.width || 'auto',
        halign: col.align || (col.format === 'currency' || col.format === 'number' ? 'right' : 'left')
      };
      return acc;
    }, {}),
    margin: { top: 10, right: 10, bottom: 20, left: 10 },
    didDrawPage: (tableData) => {
      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });

  // Summary at the end
  if (summary) {
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    Object.entries(summary).forEach(([key, value], index) => {
      doc.text(`${key}: ${value}`, pageWidth - 60, finalY + (index * 6));
    });
  }

  doc.save(`${filename}.pdf`);
};

/**
 * Export data to Excel with formatting
 * @param {Object} options - Export options
 * @param {string} options.title - Sheet title
 * @param {Array} options.columns - Column definitions [{header: 'Name', key: 'name'}]
 * @param {Array} options.data - Data array
 * @param {string} options.filename - Output filename (without extension)
 * @param {Object} options.headerInfo - Header information (optional)
 * @param {Object} options.summary - Summary data (optional)
 */
export const exportToExcel = (options) => {
  const {
    title,
    columns,
    data,
    filename,
    headerInfo = null,
    summary = null
  } = options;

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  
  // Prepare header rows
  const headerRows = [];
  headerRows.push(['Al Noor Traders']);
  headerRows.push([title]);
  headerRows.push([`Generated: ${new Date().toLocaleString('en-PK')}`]);
  headerRows.push([]);

  // Add header info if provided
  if (headerInfo) {
    Object.entries(headerInfo).forEach(([key, value]) => {
      headerRows.push([`${key}: ${value}`]);
    });
    headerRows.push([]);
  }

  // Column headers
  const columnHeaders = columns.map(col => col.header);
  
  // Data rows
  const dataRows = data.map(row => 
    columns.map(col => {
      let value = row[col.key];
      if (col.format === 'currency' || col.format === 'number') {
        return Number(value || 0);
      } else if (col.format === 'date') {
        return formatDate(value);
      }
      return value ?? '';
    })
  );

  // Combine all rows
  const allRows = [...headerRows, columnHeaders, ...dataRows];

  // Add summary if provided
  if (summary) {
    allRows.push([]);
    Object.entries(summary).forEach(([key, value]) => {
      allRows.push([key, value]);
    });
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.excelWidth || col.width || 15 }));
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31)); // Excel sheet name max 31 chars

  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

/**
 * Common column definitions for different report types
 */
export const columnDefinitions = {
  // Customer Ledger columns
  customerLedger: [
    { header: 'Date', key: 'entryDate', format: 'date', width: 25 },
    { header: 'Reference', key: 'sourceNumber', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Debit', key: 'debitAmount', format: 'currency', width: 25, align: 'right' },
    { header: 'Credit', key: 'creditAmount', format: 'currency', width: 25, align: 'right' },
    { header: 'Balance', key: 'runningBalance', format: 'currency', width: 25, align: 'right' }
  ],

  // Vendor Ledger columns (same structure as customer ledger)
  vendorLedger: [
    { header: 'Date', key: 'entryDate', format: 'date', width: 25 },
    { header: 'Reference', key: 'sourceNumber', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Debit', key: 'debitAmount', format: 'currency', width: 25, align: 'right' },
    { header: 'Credit', key: 'creditAmount', format: 'currency', width: 25, align: 'right' },
    { header: 'Balance', key: 'runningBalance', format: 'currency', width: 25, align: 'right' }
  ],

  // Inventory Stock columns
  inventoryStock: [
    { header: 'SKU', key: 'sku', width: 25 },
    { header: 'Product Name', key: 'name', width: 45 },
    { header: 'Category', key: 'categoryName', width: 25 },
    { header: 'Cartons', key: 'cartons', format: 'number', width: 20, align: 'right' },
    { header: 'Pieces', key: 'loosePieces', format: 'number', width: 20, align: 'right' },
    { header: 'Total Stock', key: 'currentStock', format: 'number', width: 20, align: 'right' },
    { header: 'Min Stock', key: 'minimumStock', format: 'number', width: 20, align: 'right' },
    { header: 'Status', key: 'status', width: 20 }
  ],

  // Stock Movements columns
  stockMovements: [
    { header: 'Date', key: 'transactionDate', format: 'date', width: 25 },
    { header: 'SKU', key: 'productCode', width: 25 },
    { header: 'Product', key: 'productName', width: 40 },
    { header: 'Type', key: 'transactionType', width: 20 },
    { header: 'Quantity', key: 'quantity', format: 'number', width: 20, align: 'right' },
    { header: 'Unit Cost', key: 'unitCost', format: 'currency', width: 25, align: 'right' },
    { header: 'Reference', key: 'referenceNumber', width: 30 }
  ],

  // Sales Report columns
  salesReport: [
    { header: 'Date', key: 'invoiceDate', format: 'date', width: 25 },
    { header: 'Invoice #', key: 'invoiceNumber', width: 25 },
    { header: 'Customer', key: 'customerName', width: 40 },
    { header: 'Order Booker', key: 'orderBookerName', width: 30 },
    { header: 'Total', key: 'grandTotal', format: 'currency', width: 25, align: 'right' },
    { header: 'Cost', key: 'totalCost', format: 'currency', width: 25, align: 'right' },
    { header: 'Profit', key: 'totalProfit', format: 'currency', width: 25, align: 'right' }
  ],

  // Purchase Report columns
  purchaseReport: [
    { header: 'Date', key: 'createdAt', format: 'date', width: 25 },
    { header: 'Purchase #', key: 'purchaseNumber', width: 30 },
    { header: 'Vendor', key: 'vendorName', width: 40 },
    { header: 'Subtotal', key: 'subtotal', format: 'currency', width: 25, align: 'right' },
    { header: 'Discount', key: 'discount', format: 'currency', width: 20, align: 'right' },
    { header: 'Total', key: 'grandTotal', format: 'currency', width: 25, align: 'right' },
    { header: 'Status', key: 'status', width: 20 }
  ],

  // Generic receivables/payables
  receivables: [
    { header: 'Customer', key: 'businessName', width: 40 },
    { header: 'Contact', key: 'contactPerson', width: 30 },
    { header: 'Phone', key: 'phone', width: 25 },
    { header: 'Balance', key: 'currentBalance', format: 'currency', width: 25, align: 'right' }
  ],

  payables: [
    { header: 'Vendor', key: 'businessName', width: 40 },
    { header: 'Contact', key: 'contactPerson', width: 30 },
    { header: 'Phone', key: 'phone', width: 25 },
    { header: 'Balance', key: 'currentBalance', format: 'currency', width: 25, align: 'right' }
  ],

  // Cash Book columns
  cashBook: [
    { header: 'Date', key: 'entryDate', format: 'date', width: 25 },
    { header: 'Reference', key: 'referenceNumber', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Cash In', key: 'cashIn', format: 'currency', width: 25, align: 'right' },
    { header: 'Cash Out', key: 'cashOut', format: 'currency', width: 25, align: 'right' },
    { header: 'Balance', key: 'runningBalance', format: 'currency', width: 25, align: 'right' }
  ],

  // Expense Report columns
  expenseReport: [
    { header: 'Date', key: 'expenseDate', format: 'date', width: 25 },
    { header: 'Category', key: 'category', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Amount', key: 'amount', format: 'currency', width: 25, align: 'right' },
    { header: 'Payment Method', key: 'paymentMethod', width: 25 }
  ],

  // Profit & Loss columns
  profitLoss: [
    { header: 'Category', key: 'category', width: 40 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Amount', key: 'amount', format: 'currency', width: 30, align: 'right' }
  ],

  // Trial Balance columns
  trialBalance: [
    { header: 'Account Code', key: 'accountCode', width: 25 },
    { header: 'Account Name', key: 'accountName', width: 45 },
    { header: 'Debit', key: 'debit', format: 'currency', width: 30, align: 'right' },
    { header: 'Credit', key: 'credit', format: 'currency', width: 30, align: 'right' }
  ],

  // Collections Report columns
  collections: [
    { header: 'Date', key: 'paymentDate', format: 'date', width: 25 },
    { header: 'Receipt #', key: 'receiptNumber', width: 25 },
    { header: 'Customer', key: 'customerName', width: 40 },
    { header: 'Method', key: 'paymentMethod', width: 20 },
    { header: 'Amount', key: 'amount', format: 'currency', width: 25, align: 'right' }
  ],

  // Product Pricing columns
  productPricing: [
    { header: 'SKU', key: 'sku', width: 20 },
    { header: 'Product', key: 'name', width: 40 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Stock', key: 'currentStock', format: 'number', width: 15, align: 'right' },
    { header: 'Avg Cost/Pc', key: 'avgCostPerPiece', format: 'currency', width: 20, align: 'right' },
    { header: 'Sale Price/Pc', key: 'suggestedSalePricePerPiece', format: 'currency', width: 20, align: 'right' },
    { header: 'Sale Price/Ctn', key: 'suggestedSalePricePerCarton', format: 'currency', width: 20, align: 'right' }
  ],

  // Sale Summary columns
  saleSummary: [
    { header: 'Product', key: 'productName', width: 40 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Qty Sold', key: 'totalQuantity', format: 'number', width: 15, align: 'right' },
    { header: 'Avg Sale Price', key: 'avgSalePrice', format: 'currency', width: 20, align: 'right' },
    { header: 'Avg Cost', key: 'avgCostPrice', format: 'currency', width: 20, align: 'right' },
    { header: 'Total Sales', key: 'totalSales', format: 'currency', width: 20, align: 'right' },
    { header: 'Total Cost', key: 'totalCost', format: 'currency', width: 20, align: 'right' },
    { header: 'Profit', key: 'totalProfit', format: 'currency', width: 20, align: 'right' }
  ],

  // Purchase Summary columns
  purchaseSummary: [
    { header: 'Product', key: 'productName', width: 40 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Qty Purchased', key: 'totalQuantity', format: 'number', width: 20, align: 'right' },
    { header: 'Avg Price', key: 'avgPurchasePrice', format: 'currency', width: 20, align: 'right' },
    { header: 'Total Purchases', key: 'totalPurchases', format: 'currency', width: 25, align: 'right' }
  ],

  // My Sales Report columns (for Order Bookers)
  mySales: [
    { header: 'Date', key: 'invoiceDate', format: 'date', width: 25 },
    { header: 'Invoice #', key: 'invoiceNumber', width: 25 },
    { header: 'Customer', key: 'customerName', width: 40 },
    { header: 'Subtotal', key: 'subtotal', format: 'currency', width: 25, align: 'right' },
    { header: 'Discount', key: 'discount', format: 'currency', width: 20, align: 'right' },
    { header: 'Total', key: 'totalAmount', format: 'currency', width: 25, align: 'right' }
  ]
};

const exportUtils = {
  exportToPDF,
  exportToExcel,
  columnDefinitions
};

export default exportUtils;
