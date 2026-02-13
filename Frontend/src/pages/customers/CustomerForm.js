import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, MenuItem, FormControlLabel, Switch, CircularProgress } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import customerService from '../../services/customerService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    customerCode: '',
    businessName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    area: '',
    creditLimit: 50000,
    creditDays: 7,
    customerType: 'retailer',
    isActive: true,
  });

  useEffect(() => {
    if (isEdit) {
      fetchCustomer();
    } else {
      fetchNextCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchNextCode = async () => {
    try {
      const response = await customerService.getNextCustomerCode();
      setFormData((prev) => ({ ...prev, customerCode: response.data?.nextCode || '' }));
    } catch (error) {
      console.error('Failed to fetch next customer code');
    }
  };

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await customerService.getCustomer(id);
      setFormData({ ...formData, ...response.data });
    } catch (error) {
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await customerService.updateCustomer(id, formData);
        toast.success('Customer updated successfully');
      } else {
        await customerService.createCustomer(formData);
        toast.success('Customer created successfully');
      }
      navigate('/customers');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader title={isEdit ? 'Edit Customer' : 'Add New Customer'} backUrl="/customers" />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField 
                  fullWidth 
                  label="Customer Code" 
                  name="customerCode" 
                  value={formData.customerCode} 
                  disabled
                  InputProps={{
                    sx: { bgcolor: 'grey.100' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={8}>
                <TextField fullWidth label="Business Name" name="businessName" value={formData.businessName} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Contact Person" name="contactPerson" value={formData.contactPerson} onChange={handleChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Phone" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required 
                  type="tel"
                  inputProps={{ inputMode: 'tel' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Email" 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  inputProps={{ inputMode: 'email' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth select label="Customer Type" name="customerType" value={formData.customerType} onChange={handleChange}>
                  <MenuItem value="retailer">Retailer</MenuItem>
                  <MenuItem value="wholesaler">Wholesaler</MenuItem>
                  <MenuItem value="distributor">Sub-Distributor</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Address" name="address" value={formData.address} onChange={handleChange} multiline rows={2} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="City" name="city" value={formData.city} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Area" name="area" value={formData.area} onChange={handleChange} />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  fullWidth 
                  label="Credit Limit (PKR)" 
                  name="creditLimit" 
                  type="number" 
                  value={formData.creditLimit} 
                  onChange={handleChange} 
                  inputProps={{ min: 0, inputMode: 'numeric' }} 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  fullWidth 
                  label="Credit Days" 
                  name="creditDays" 
                  type="number" 
                  value={formData.creditDays} 
                  onChange={handleChange} 
                  inputProps={{ min: 0, inputMode: 'numeric' }} 
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel 
                  control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" />} 
                  label="Active"
                  sx={{ ml: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column-reverse', sm: 'row' },
                    gap: 2, 
                    justifyContent: { xs: 'stretch', sm: 'flex-end' },
                  }}
                >
                  <Button 
                    variant="outlined" 
                    startIcon={<Cancel />} 
                    onClick={() => navigate('/customers')}
                    fullWidth
                    sx={{ width: { sm: 'auto' } }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} 
                    disabled={saving}
                    fullWidth
                    sx={{ width: { sm: 'auto' } }}
                  >
                    {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CustomerForm;
