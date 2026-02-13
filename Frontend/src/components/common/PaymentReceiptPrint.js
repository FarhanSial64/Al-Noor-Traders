import React, { forwardRef } from 'react';
import { Box, Typography, Grid } from '@mui/material';

const PaymentReceiptPrint = forwardRef(({ payments = [], companyInfo, type = 'receipt' }, ref) => {
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

  const formatTime = (date) => new Date(date).toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const company = companyInfo || {
    name: 'AL NOOR TRADERS',
    tagline: 'Your Trusted Distribution Partner',
    address: 'Main Market, Lahore, Pakistan',
    phone: '+92 300 1234567'
  };

  const isReceipt = type === 'receipt';
  const documentTitle = isReceipt ? 'CASH RECEIPT' : 'PAYMENT VOUCHER';
  const partyLabel = isReceipt ? 'Received From' : 'Paid To';
  const amountLabel = isReceipt ? 'Amount Received' : 'Amount Paid';

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertLessThanThousand = (n) => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    
    const convert = (n) => {
      if (n < 1000) return convertLessThanThousand(n);
      if (n < 100000) return convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convertLessThanThousand(n % 1000) : '');
      if (n < 10000000) return convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };
    
    return convert(Math.floor(num)) + ' Rupees Only';
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: 'Cash',
      cheque: 'Cheque',
      bank_transfer: 'Bank Transfer',
      online: 'Online Transfer',
      other: 'Other'
    };
    return methods[method] || method;
  };

  return (
    <Box ref={ref}>
      <style>
        {`
          @media print {
            @page { size: A5 landscape; margin: 6mm; }
            .receipt-page { page-break-after: always; }
            .receipt-page:last-child { page-break-after: auto; }
          }
        `}
      </style>

      {payments.map((payment, index) => (
        <Box
          key={payment._id || index}
          className="receipt-page"
          sx={{
            width: '100%',
            maxWidth: '700px',
            margin: '0 auto',
            p: 2,
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            bgcolor: '#fff',
            border: '1px solid #000',
            mb: index < payments.length - 1 ? 2 : 0
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', borderBottom: '2px solid #000', pb: 1, mb: 1.5 }}>
            <Typography sx={{ fontSize: '16px', fontWeight: 700, letterSpacing: 0.5 }}>
              {company.name}
            </Typography>
            <Typography sx={{ fontSize: '9px', fontStyle: 'italic' }}>
              {company.tagline}
            </Typography>
            <Typography sx={{ fontSize: '9px' }}>
              {company.address} | {company.phone}
            </Typography>
          </Box>

          {/* Document Title */}
          <Box sx={{ textAlign: 'center', py: 0.75, mb: 1.5, border: '2px solid #000' }}>
            <Typography sx={{ fontSize: '14px', fontWeight: 700, letterSpacing: 2 }}>
              {documentTitle}
            </Typography>
          </Box>

          {/* Receipt Info */}
          <Grid container spacing={2} sx={{ mb: 1.5 }}>
            <Grid item xs={6}>
              <Box sx={{ fontSize: '10px' }}>
                <Box sx={{ display: 'flex', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '10px', width: 75 }}>Receipt No:</Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 600 }}>{payment.paymentNumber}</Typography>
                </Box>
                <Box sx={{ display: 'flex', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '10px', width: 75 }}>Date:</Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>{formatDate(payment.paymentDate)}</Typography>
                </Box>
                <Box sx={{ display: 'flex' }}>
                  <Typography sx={{ fontSize: '10px', width: 75 }}>Time:</Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>{formatTime(payment.createdAt || payment.paymentDate)}</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ fontSize: '10px' }}>
                <Box sx={{ display: 'flex', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '10px', width: 90 }}>Payment Mode:</Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 600 }}>{getPaymentMethodLabel(payment.paymentMethod)}</Typography>
                </Box>
                {payment.chequeNumber && (
                  <Box sx={{ display: 'flex', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '10px', width: 90 }}>Cheque No:</Typography>
                    <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>{payment.chequeNumber}</Typography>
                  </Box>
                )}
                {payment.chequeBank && (
                  <Box sx={{ display: 'flex' }}>
                    <Typography sx={{ fontSize: '10px', width: 90 }}>Bank:</Typography>
                    <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>{payment.chequeBank}</Typography>
                  </Box>
                )}
                {payment.transactionReference && (
                  <Box sx={{ display: 'flex' }}>
                    <Typography sx={{ fontSize: '10px', width: 90 }}>Ref No:</Typography>
                    <Typography sx={{ fontSize: '10px', fontWeight: 500 }}>{payment.transactionReference}</Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Party Details */}
          <Box sx={{ mb: 1.5, p: 1, border: '1px solid #000' }}>
            <Typography sx={{ fontSize: '9px', fontWeight: 600, mb: 0.25 }}>{partyLabel}:</Typography>
            <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>{payment.partyName}</Typography>
            <Typography sx={{ fontSize: '10px' }}>Code: {payment.partyCode}</Typography>
          </Box>

          {/* Amount Box */}
          <Box sx={{ mb: 1.5, p: 1.5, border: '2px solid #000', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '9px', fontWeight: 600, mb: 0.5 }}>{amountLabel}</Typography>
            <Typography sx={{ fontSize: '22px', fontWeight: 700, mb: 0.5 }}>
              {formatCurrency(payment.amount)}
            </Typography>
            <Typography sx={{ fontSize: '9px', fontStyle: 'italic' }}>
              ({numberToWords(payment.amount)})
            </Typography>
          </Box>

          {/* Balance Info */}
          <Grid container spacing={2} sx={{ mb: 1.5 }}>
            <Grid item xs={6}>
              <Box sx={{ p: 1, border: '1px solid #000', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '9px' }}>Previous Balance</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 600 }}>{formatCurrency(payment.partyBalanceBefore)}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ p: 1, border: '1px solid #000', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '9px' }}>Current Balance</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 700 }}>{formatCurrency(payment.partyBalanceAfter)}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Remarks */}
          {payment.remarks && (
            <Box sx={{ mb: 1.5, p: 1, border: '1px dashed #000' }}>
              <Typography sx={{ fontSize: '9px', fontWeight: 600 }}>Remarks:</Typography>
              <Typography sx={{ fontSize: '10px' }}>{payment.remarks}</Typography>
            </Box>
          )}

          {/* Signatures */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 3 }}>
                <Typography sx={{ fontSize: '9px' }}>Received By</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 3 }}>
                <Typography sx={{ fontSize: '9px' }}>Authorized By</Typography>
              </Box>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 3 }}>
                <Typography sx={{ fontSize: '9px' }}>{isReceipt ? 'Customer Sign' : 'Vendor Sign'}</Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Footer */}
          <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #000', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '8px' }}>
              Computer Generated {isReceipt ? 'Receipt' : 'Voucher'} | Generated by: {payment.createdByName || 'System'}
            </Typography>
            <Typography sx={{ fontSize: '8px', fontWeight: 500 }}>
              {company.name} - Distribution Management System
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
});

PaymentReceiptPrint.displayName = 'PaymentReceiptPrint';

export default PaymentReceiptPrint;
