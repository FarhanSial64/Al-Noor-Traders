import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, FormControlLabel, Switch, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { Save, Cancel, ArrowBack } from '@mui/icons-material';
import vendorService from '../../services/vendorService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const VendorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ vendorCode: '', businessName: '', contactPerson: '', phone: '', email: '', address: '', city: '', paymentTerms: 'credit', creditDays: 30, isActive: true });

  useEffect(() => { 
    if (isEdit) { 
      fetchVendor(); 
    } else { 
      fetchNextCode(); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchNextCode = async () => {
    try {
      const response = await vendorService.getNextVendorCode();
      setFormData((prev) => ({ ...prev, vendorCode: response.data?.nextCode || '' }));
    } catch (error) {
      console.error('Failed to fetch next vendor code');
    }
  };

  const fetchVendor = async () => {
    try { setLoading(true); const response = await vendorService.getVendor(id); setFormData({ ...formData, ...response.data }); } catch (error) { toast.error('Failed to load vendor'); } finally { setLoading(false); }
  };

  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { setSaving(true); if (isEdit) { await vendorService.updateVendor(id, formData); toast.success('Vendor updated'); } else { await vendorService.createVendor(formData); toast.success('Vendor created'); } navigate('/vendors'); } catch (error) { toast.error(error.response?.data?.message || 'Failed to save vendor'); } finally { setSaving(false); }
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader title={isEdit ? 'Edit Vendor' : 'Add New Vendor'} backUrl="/vendors" />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField 
                  fullWidth 
                  label="Vendor Code" 
                  name="vendorCode" 
                  value={formData.vendorCode} 
                  disabled 
                  size={isMobile ? "small" : "medium"}
                  InputProps={{ sx: { bgcolor: 'grey.100' } }} 
                />
              </Grid>
              <Grid item xs={12} sm={6} md={8}>
                <TextField 
                  fullWidth 
                  label="Business Name" 
                  name="businessName" 
                  value={formData.businessName} 
                  onChange={handleChange} 
                  required 
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Contact Person" 
                  name="contactPerson" 
                  value={formData.contactPerson} 
                  onChange={handleChange} 
                  required 
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Phone" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required 
                  inputMode="tel"
                  size={isMobile ? "small" : "medium"}
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
                  inputMode="email"
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Credit Days" 
                  name="creditDays" 
                  type="number" 
                  value={formData.creditDays} 
                  onChange={handleChange} 
                  inputMode="numeric"
                  inputProps={{ min: 0 }} 
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Address" 
                  name="address" 
                  value={formData.address} 
                  onChange={handleChange} 
                  multiline 
                  rows={2} 
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="City" 
                  name="city" 
                  value={formData.city} 
                  onChange={handleChange} 
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={formData.isActive} 
                      onChange={handleChange} 
                      name="isActive" 
                    />
                  } 
                  label="Active" 
                />
              </Grid>
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: { xs: 1, sm: 2 }, 
                    justifyContent: 'flex-end',
                    flexDirection: { xs: 'column-reverse', sm: 'row' },
                  }}
                >
                  <Button 
                    variant="outlined" 
                    startIcon={isMobile ? <ArrowBack /> : <Cancel />} 
                    onClick={() => navigate('/vendors')}
                    fullWidth={isMobile}
                    sx={{ minHeight: { xs: 44, sm: 'auto' } }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    startIcon={saving ? <CircularProgress size={20} /> : <Save />} 
                    disabled={saving}
                    fullWidth={isMobile}
                    sx={{ minHeight: { xs: 44, sm: 'auto' } }}
                  >
                    {isEdit ? 'Update' : 'Create'}
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

export default VendorForm;
