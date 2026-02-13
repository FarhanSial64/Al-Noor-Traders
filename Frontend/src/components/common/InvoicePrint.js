import React, { forwardRef } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid } from '@mui/material';

const InvoicePrint = forwardRef(({ invoices = [], companyInfo }, ref) => {
  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { 
    style: 'currency', 
    currency: 'PKR', 
    minimumFractionDigits: 0 
  }).format(amount || 0);

  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const getDocumentType = (invoice) => {
    if (invoice.invoiceGenerated) return 'INVOICE';
    if (invoice.orderStatus === 'pending') return 'DRAFT ORDER';
    if (invoice.orderStatus === 'confirmed') return 'CONFIRMED ORDER';
    return 'ORDER';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      processing: 'Processing',
      dispatched: 'Dispatched',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return labels[status] || status || 'Unknown';
  };

  const company = companyInfo || {
    name: 'AL NOOR TRADERS',
    tagline: 'Quality Products at Best Prices',
    address: 'Main Market, Lahore, Pakistan',
    phone: '+92 300 1234567',
    ntn: 'NTN: 1234567-8'
  };

  return (
    <Box ref={ref}>
      <style>
        {`
          @media print {
            @page { size: A4; margin: 8mm; }
            .invoice-page { page-break-after: always; }
            .invoice-page:last-child { page-break-after: auto; }
          }
        `}
      </style>

      {invoices.map((invoice, index) => (
        <Box 
          key={invoice._id || index} 
          className="invoice-page"
          sx={{ 
            p: 2, 
            bgcolor: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            lineHeight: 1.4
          }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            borderBottom: '2px solid #000',
            pb: 1.5,
            mb: 2
          }}>
            <Box>
              <Typography sx={{ fontSize: '20px', fontWeight: 700, letterSpacing: 0.5 }}>
                {company.name}
              </Typography>
              <Typography sx={{ fontSize: '10px', fontStyle: 'italic', color: '#444' }}>
                {company.tagline}
              </Typography>
              <Typography sx={{ fontSize: '10px', mt: 0.5 }}>
                {company.address}
              </Typography>
              <Typography sx={{ fontSize: '10px' }}>
                Phone: {company.phone} | {company.ntn}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ 
                fontSize: '16px', 
                fontWeight: 700, 
                border: '2px solid #000',
                px: 2,
                py: 0.5,
                display: 'inline-block'
              }}>
                {getDocumentType(invoice)}
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, mt: 1 }}>
                {invoice.invoiceNumber || invoice.orderNumber}
              </Typography>
              <Typography sx={{ fontSize: '10px' }}>
                Date: {formatDate(invoice.invoiceDate || invoice.orderDate)}
              </Typography>
              <Typography sx={{ fontSize: '10px', fontWeight: 500, mt: 0.5 }}>
                Status: {getStatusLabel(invoice.orderStatus)}
              </Typography>
            </Box>
          </Box>

          {/* Customer & Order Info */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Box sx={{ border: '1px solid #000', p: 1.5 }}>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, borderBottom: '1px solid #000', pb: 0.5, mb: 1 }}>
                  BILL TO
                </Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>
                  {invoice.customerName}
                </Typography>
                <Typography sx={{ fontSize: '10px' }}>
                  Code: {invoice.customerCode}
                </Typography>
                {invoice.customerAddress && (
                  <Typography sx={{ fontSize: '10px', mt: 0.5 }}>
                    {invoice.customerAddress}
                  </Typography>
                )}
                {invoice.customerPhone && (
                  <Typography sx={{ fontSize: '10px' }}>
                    Phone: {invoice.customerPhone}
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ border: '1px solid #000', p: 1.5 }}>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, borderBottom: '1px solid #000', pb: 0.5, mb: 1 }}>
                  ORDER DETAILS
                </Typography>
                <Typography sx={{ fontSize: '10px' }}>
                  <strong>Order #:</strong> {invoice.orderNumber}
                </Typography>
                <Typography sx={{ fontSize: '10px' }}>
                  <strong>Booked By:</strong> {invoice.orderBookerName || invoice.createdByName || '-'}
                </Typography>
                <Typography sx={{ fontSize: '10px' }}>
                  <strong>Type:</strong> {invoice.orderBookerRole === 'order_booker' ? 'Field Order' : 'Manual Entry'}
                </Typography>
                {invoice.dueDate && (
                  <Typography sx={{ fontSize: '10px' }}>
                    <strong>Due Date:</strong> {formatDate(invoice.dueDate)}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Items Table */}
          <TableContainer sx={{ mb: 2 }}>
            <Table size="small" sx={{ 
              border: '1px solid #000',
              '& .MuiTableCell-root': { 
                border: '1px solid #000',
                padding: '4px 8px',
                fontSize: '10px'
              }
            }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 30 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Unit</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Rate</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Disc</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items?.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <strong>{item.productSku}</strong>
                      <br />
                      <span style={{ fontSize: '9px' }}>{item.productName}</span>
                    </TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="center">{item.unitName || 'Pcs'}</TableCell>
                    <TableCell align="right">{formatCurrency(item.salePrice)}</TableCell>
                    <TableCell align="right">{item.discount > 0 ? formatCurrency(item.discount) : '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {formatCurrency(item.netAmount || item.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Totals */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Box sx={{ width: 250, border: '1px solid #000' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 0.75, borderBottom: '1px solid #ccc' }}>
                <Typography sx={{ fontSize: '10px' }}>Subtotal:</Typography>
                <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>{formatCurrency(invoice.subtotal)}</Typography>
              </Box>
              {invoice.totalDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 0.75, borderBottom: '1px solid #ccc' }}>
                  <Typography sx={{ fontSize: '10px' }}>Discount:</Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>-{formatCurrency(invoice.totalDiscount)}</Typography>
                </Box>
              )}
              {invoice.taxAmount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 0.75, borderBottom: '1px solid #ccc' }}>
                  <Typography sx={{ fontSize: '10px' }}>Tax:</Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>{formatCurrency(invoice.taxAmount)}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderTop: '2px solid #000' }}>
                <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>GRAND TOTAL:</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>{formatCurrency(invoice.grandTotal)}</Typography>
              </Box>
            </Box>
          </Box>

          {/* Amount in Words */}
          <Box sx={{ border: '1px solid #000', p: 1, mb: 2 }}>
            <Typography sx={{ fontSize: '10px' }}>
              <strong>Amount in Words:</strong> {numberToWords(invoice.grandTotal)} Rupees Only
            </Typography>
          </Box>

          {/* Footer */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: '1px dashed #000' }}>
            <Box sx={{ width: '55%' }}>
              <Typography sx={{ fontSize: '9px', fontWeight: 600 }}>Terms & Conditions:</Typography>
              <Typography sx={{ fontSize: '8px' }}>1. Goods once sold will not be taken back.</Typography>
              <Typography sx={{ fontSize: '8px' }}>2. Payment is due within the agreed credit period.</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', width: '35%' }}>
              <Box sx={{ borderBottom: '1px solid #000', pt: 4, mb: 0.5 }} />
              <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>Authorized Signature</Typography>
            </Box>
          </Box>

          {/* Thank You */}
          <Box sx={{ textAlign: 'center', mt: 2, pt: 1, borderTop: '1px solid #000' }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, fontStyle: 'italic' }}>
              Thank you for your business!
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
});

function numberToWords(num) {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };
  return numToWords(Math.round(num));
}

InvoicePrint.displayName = 'InvoicePrint';

export default InvoicePrint;
