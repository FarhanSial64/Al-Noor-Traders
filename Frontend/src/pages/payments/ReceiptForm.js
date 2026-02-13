import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, Autocomplete, MenuItem, Typography, Divider, CircularProgress, Dialog, DialogContent, DialogActions } from '@mui/material';
import { Save, Cancel, Print } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import customerService from '../../services/customerService';
import paymentService from '../../services/paymentService';
import PageHeader from '../../components/common/PageHeader';
import PaymentReceiptPrint from '../../components/common/PaymentReceiptPrint';
import toast from 'react-hot-toast';

const ReceiptForm = () => {
  const navigate = useNavigate();
  const printRef = useRef();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [createdReceipt, setCreatedReceipt] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [formData, setFormData] = useState({ 
    customer: null, 
    paymentDate: new Date().toISOString().split('T')[0], 
    amount: '', 
    paymentMethod: 'cash', 
    chequeNumber: '',
    chequeDate: '',
    chequeBank: '',
    transactionReference: '', 
    remarks: '' 
  });

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try { 
      const response = await customerService.getCustomers({ limit: 1000 }); 
      setCustomers(response.data || []); 
    } catch (error) { 
      toast.error('Failed to load customers'); 
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receipt-${createdReceipt?.paymentNumber || 'New'}`,
    onAfterPrint: () => {
      setShowPrintDialog(false);
      navigate('/receipts');
    }
  });

  const handleSubmit = async (e, shouldPrint = false) => {
    e.preventDefault();
    if (!formData.customer) { toast.error('Select a customer'); return; }
    if (!formData.amount || formData.amount <= 0) { toast.error('Enter valid amount'); return; }
    if (formData.paymentMethod === 'cheque' && !formData.chequeNumber) { toast.error('Enter cheque number'); return; }

    try {
      setSaving(true);
      const response = await paymentService.createReceipt({
        customerId: formData.customer._id,
        paymentDate: formData.paymentDate,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        chequeNumber: formData.chequeNumber,
        chequeDate: formData.chequeDate,
        chequeBank: formData.chequeBank,
        transactionReference: formData.transactionReference,
        remarks: formData.remarks || `Receipt from ${formData.customer.businessName}`,
      });
      toast.success('Receipt created successfully');
      
      if (shouldPrint && response.data) {
        setCreatedReceipt(response.data);
        setShowPrintDialog(true);
      } else {
        navigate('/receipts');
      }
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to create receipt'); } finally { setSaving(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <Box>
      <PageHeader title="Create Receipt" subtitle="Record payment received from customer" backUrl="/receipts" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Autocomplete options={customers} getOptionLabel={(o) => `${o.customerCode} - ${o.businessName}`} value={formData.customer} onChange={(e, v) => setFormData(prev => ({ ...prev, customer: v }))} renderInput={(params) => <TextField {...params} label="Select Customer *" fullWidth />} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth type="date" label="Date" value={formData.paymentDate} onChange={(e) => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  {formData.customer && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Current Balance: <strong style={{ color: formData.customer.currentBalance > 0 ? '#ed6c02' : '#2e7d32' }}>{formatCurrency(formData.customer.currentBalance)}</strong></Typography>
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
                      <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/receipts')}>Cancel</Button>
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
                        color="success"
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
              <Typography variant="h6" gutterBottom>Receipt Summary</Typography>
              <Divider sx={{ mb: 2 }} />
              
              {formData.customer ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Customer</Typography>
                    <Typography variant="subtitle1" fontWeight={500}>{formData.customer.businessName}</Typography>
                    <Typography variant="caption" color="text.secondary">{formData.customer.customerCode}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Current Balance</Typography>
                    <Typography variant="h6" color={formData.customer.currentBalance > 0 ? 'warning.main' : 'success.main'}>
                      {formatCurrency(formData.customer.currentBalance)}
                    </Typography>
                  </Box>
                  
                  {formData.amount && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Receipt Amount</Typography>
                      <Typography variant="h5" color="success.main" fontWeight={600}>
                        {formatCurrency(parseFloat(formData.amount) || 0)}
                      </Typography>
                    </Box>
                  )}
                  
                  {formData.amount && (
                    <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Balance After Receipt</Typography>
                      <Typography variant="h6" color={(formData.customer.currentBalance - (parseFloat(formData.amount) || 0)) > 0 ? 'warning.main' : 'success.main'}>
                        {formatCurrency(formData.customer.currentBalance - (parseFloat(formData.amount) || 0))}
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
                  Select a customer to see summary
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onClose={() => setShowPrintDialog(false)} maxWidth="md" fullWidth>
        <DialogContent>
          {createdReceipt && (
            <PaymentReceiptPrint ref={printRef} payments={[createdReceipt]} type="receipt" />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowPrintDialog(false); navigate('/receipts'); }}>Close</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>Print Receipt</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReceiptForm;
