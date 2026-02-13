import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, Autocomplete, MenuItem, Typography, Divider, CircularProgress, Dialog, DialogContent, DialogActions } from '@mui/material';
import { Save, Cancel, Print } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import vendorService from '../../services/vendorService';
import paymentService from '../../services/paymentService';
import PageHeader from '../../components/common/PageHeader';
import PaymentReceiptPrint from '../../components/common/PaymentReceiptPrint';
import toast from 'react-hot-toast';

const PaymentForm = () => {
  const navigate = useNavigate();
  const printRef = useRef();
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [createdPayment, setCreatedPayment] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formData, setFormData] = useState({ 
    vendor: null, 
    paymentDate: new Date().toISOString().split('T')[0], 
    amount: '', 
    paymentMethod: 'bank_transfer', 
    chequeNumber: '',
    chequeDate: '',
    chequeBank: '',
    transactionReference: '', 
    remarks: '' 
  });

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    try { 
      const response = await vendorService.getVendors({ limit: 1000 }); 
      setVendors(response.data || []); 
    } catch (error) { 
      toast.error('Failed to load vendors'); 
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payment-${createdPayment?.paymentNumber || 'New'}`,
    onAfterPrint: () => {
      setShowPrintDialog(false);
      navigate('/payments');
    }
  });

  const handleSubmit = async (e, shouldPrint = false) => {
    e.preventDefault();
    if (!formData.vendor) { toast.error('Select a vendor'); return; }
    if (!formData.amount || formData.amount <= 0) { toast.error('Enter valid amount'); return; }
    if (formData.paymentMethod === 'cheque' && !formData.chequeNumber) { toast.error('Enter cheque number'); return; }

    try {
      setSaving(true);
      const response = await paymentService.createPayment({
        vendorId: formData.vendor._id,
        paymentDate: formData.paymentDate,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        chequeNumber: formData.chequeNumber,
        chequeDate: formData.chequeDate,
        chequeBank: formData.chequeBank,
        transactionReference: formData.transactionReference,
        remarks: formData.remarks || `Payment to ${formData.vendor.businessName}`,
      });
      toast.success('Payment created successfully');
      
      if (shouldPrint && response.data) {
        setCreatedPayment(response.data);
        setShowPrintDialog(true);
      } else {
        navigate('/payments');
      }
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to create payment'); } finally { setSaving(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <Box>
      <PageHeader title="Create Payment" subtitle="Record payment made to vendor" backUrl="/payments" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Autocomplete options={vendors} getOptionLabel={(o) => `${o.vendorCode} - ${o.businessName}`} value={formData.vendor} onChange={(e, v) => setFormData(prev => ({ ...prev, vendor: v }))} renderInput={(params) => <TextField {...params} label="Select Vendor *" fullWidth />} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth type="date" label="Date" value={formData.paymentDate} onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  {formData.vendor && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Balance Due: <strong style={{ color: formData.vendor.currentBalance > 0 ? '#d32f2f' : '#2e7d32' }}>{formatCurrency(formData.vendor.currentBalance)}</strong></Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth type="number" label="Amount (PKR) *" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} inputProps={{ min: 0 }} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="Payment Method" value={formData.paymentMethod} onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="online">Online</MenuItem>
                    </TextField>
                  </Grid>
                  {formData.paymentMethod === 'cheque' && (
                    <>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Cheque Number *" value={formData.chequeNumber} onChange={(e) => setFormData(prev => ({ ...prev, chequeNumber: e.target.value }))} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth type="date" label="Cheque Date" value={formData.chequeDate} onChange={(e) => setFormData(prev => ({ ...prev, chequeDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Cheque Bank" value={formData.chequeBank} onChange={(e) => setFormData(prev => ({ ...prev, chequeBank: e.target.value }))} />
                      </Grid>
                    </>
                  )}
                  {(formData.paymentMethod === 'bank_transfer' || formData.paymentMethod === 'online') && (
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Transaction Reference" value={formData.transactionReference} onChange={(e) => setFormData(prev => ({ ...prev, transactionReference: e.target.value }))} placeholder="Transaction ID / Reference" />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2} label="Remarks" value={formData.remarks} onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/payments')}>Cancel</Button>
                      <Button 
                        type="submit" 
                        variant="outlined" 
                        color="primary"
                        startIcon={saving ? <CircularProgress size={20} /> : <Save />} 
                        disabled={saving}
                        onClick={(e) => handleSubmit(e, false)}
                      >
                        Save Only
                      </Button>
                      <Button 
                        variant="contained" 
                        color="warning"
                        startIcon={saving ? <CircularProgress size={20} /> : <Print />} 
                        disabled={saving}
                        onClick={(e) => handleSubmit(e, true)}
                      >
                        Save & Print
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Summary Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Payment Summary</Typography>
              <Divider sx={{ mb: 2 }} />
              
              {formData.vendor ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Vendor</Typography>
                    <Typography variant="subtitle1" fontWeight={500}>{formData.vendor.businessName}</Typography>
                    <Typography variant="caption" color="text.secondary">{formData.vendor.vendorCode}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Amount Payable</Typography>
                    <Typography variant="h6" color={formData.vendor.currentBalance > 0 ? 'error.main' : 'success.main'}>
                      {formatCurrency(formData.vendor.currentBalance)}
                    </Typography>
                  </Box>
                  
                  {formData.amount && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Payment Amount</Typography>
                      <Typography variant="h5" color="error.main" fontWeight={600}>
                        {formatCurrency(parseFloat(formData.amount) || 0)}
                      </Typography>
                    </Box>
                  )}
                  
                  {formData.amount && (
                    <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Balance After Payment</Typography>
                      <Typography variant="h6" color={(formData.vendor.currentBalance - (parseFloat(formData.amount) || 0)) > 0 ? 'error.main' : 'success.main'}>
                        {formatCurrency(formData.vendor.currentBalance - (parseFloat(formData.amount) || 0))}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary">Payment Method</Typography>
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {formData.paymentMethod.replace('_', ' ')}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a vendor to see summary
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onClose={() => setShowPrintDialog(false)} maxWidth="md" fullWidth>
        <DialogContent>
          {createdPayment && (
            <PaymentReceiptPrint ref={printRef} payments={[createdPayment]} type="payment" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowPrintDialog(false); navigate('/payments'); }}>Close</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>Print Voucher</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentForm;
