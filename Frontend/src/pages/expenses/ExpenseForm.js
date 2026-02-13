import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, TextField, Button, Typography,
  FormControl, InputLabel, Select, MenuItem, InputAdornment, Paper,
  Divider
} from '@mui/material';
import { Save, ArrowBack, Receipt, AttachMoney } from '@mui/icons-material';
import expenseService from '../../services/expenseService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const ExpenseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    expenseDate: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    paymentMethod: 'cash',
    bankAccount: '',
    chequeNumber: '',
    transactionReference: '',
    description: '',
    notes: '',
    vendorName: '',
    receiptNumber: ''
  });

  useEffect(() => {
    fetchCategories();
    if (isEdit) {
      fetchExpense();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await expenseService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      toast.error('Failed to load expense categories');
    }
  };

  const fetchExpense = async () => {
    try {
      setLoading(true);
      const response = await expenseService.getExpense(id);
      const expense = response.data;
      setFormData({
        expenseDate: expense.expenseDate?.split('T')[0] || '',
        category: expense.category?._id || expense.category || '',
        amount: expense.amount || '',
        paymentMethod: expense.paymentMethod || 'cash',
        bankAccount: expense.bankAccount || '',
        chequeNumber: expense.chequeNumber || '',
        transactionReference: expense.transactionReference || '',
        description: expense.description || '',
        notes: expense.notes || '',
        vendorName: expense.vendorName || '',
        receiptNumber: expense.receiptNumber || ''
      });
    } catch (error) {
      toast.error('Failed to load expense');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    try {
      setSaving(true);
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (isEdit) {
        await expenseService.updateExpense(id, data);
        toast.success('Expense updated successfully');
      } else {
        await expenseService.createExpense(data);
        toast.success('Expense created successfully');
      }
      navigate('/expenses');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit Expense' : 'New Expense'}
        subtitle={isEdit ? 'Update expense details' : 'Record a new business expense'}
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/expenses')}
          >
            Back to List
          </Button>
        }
      />

      <Grid container spacing={3}>
        {/* Main Form */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                {/* Basic Details */}
                <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Receipt color="primary" />
                  Expense Details
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Expense Date"
                      name="expenseDate"
                      value={formData.expenseDate}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        label="Category"
                      >
                        {categories.map((cat) => (
                          <MenuItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">Rs.</InputAdornment>
                      }}
                      required
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        label="Payment Method"
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                        <MenuItem value="cheque">Cheque</MenuItem>
                        <MenuItem value="online">Online Payment</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Brief description of the expense"
                      required
                    />
                  </Grid>
                </Grid>

                {/* Payment Details - Conditional */}
                {(formData.paymentMethod === 'bank_transfer' || formData.paymentMethod === 'cheque') && (
                  <>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoney color="primary" />
                      Payment Details
                    </Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={3}>
                      {formData.paymentMethod === 'cheque' && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Cheque Number"
                            name="chequeNumber"
                            value={formData.chequeNumber}
                            onChange={handleChange}
                          />
                        </Grid>
                      )}
                      {formData.paymentMethod === 'bank_transfer' && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Transaction Reference"
                            name="transactionReference"
                            value={formData.transactionReference}
                            onChange={handleChange}
                          />
                        </Grid>
                      )}
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Bank Account"
                          name="bankAccount"
                          value={formData.bankAccount}
                          onChange={handleChange}
                          placeholder="Account number or name"
                        />
                      </Grid>
                    </Grid>
                  </>
                )}

                {/* Additional Details */}
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 4, mb: 2 }}>
                  Additional Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Vendor/Payee Name"
                      name="vendorName"
                      value={formData.vendorName}
                      onChange={handleChange}
                      placeholder="Who was paid?"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Receipt/Invoice Number"
                      name="receiptNumber"
                      value={formData.receiptNumber}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Additional Notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Any other details..."
                    />
                  </Grid>
                </Grid>

                {/* Submit Buttons */}
                <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    startIcon={<Save />}
                    disabled={saving}
                    sx={{ minWidth: 150 }}
                  >
                    {saving ? 'Saving...' : (isEdit ? 'Update Expense' : 'Save Expense')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/expenses')}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Side Panel - Quick Info */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom color="primary">
              Expense Entry Tips
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" paragraph>
              - Select the appropriate category to track expenses properly
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              - Enter the exact amount paid
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              - Write a clear description for future reference
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              - Keep the receipt/invoice number for audit purposes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              - All expenses are automatically recorded in the accounting system
            </Typography>
          </Paper>

          {/* Categories Quick View */}
          {categories.length > 0 && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Available Categories
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {categories.slice(0, 6).map((cat) => (
                <Typography key={cat._id} variant="body2" sx={{ py: 0.5 }}>
                  • {cat.name}
                </Typography>
              ))}
              {categories.length > 6 && (
                <Typography variant="body2" color="primary" sx={{ mt: 1, cursor: 'pointer' }} onClick={() => navigate('/expenses/categories')}>
                  View all {categories.length} categories →
                </Typography>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpenseForm;
