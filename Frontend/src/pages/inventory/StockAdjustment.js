import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, Autocomplete, MenuItem, Typography, CircularProgress } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import productService from '../../services/productService';
import inventoryService from '../../services/inventoryService';
import PageHeader from '../../components/common/PageHeader';
import toast from 'react-hot-toast';

const StockAdjustment = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [currentStock, setCurrentStock] = useState(null);
  const [formData, setFormData] = useState({ product: null, adjustmentType: 'adjustment_in', quantity: '', reason: '', notes: '' });

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try { const response = await productService.getProducts({ limit: 1000 }); setProducts(response.data || []); } catch (error) { toast.error('Failed to load products'); }
  };

  const fetchCurrentStock = async (productId) => {
    try { const response = await inventoryService.getProductStock(productId); setCurrentStock(response.data); } catch (error) { setCurrentStock(null); }
  };

  const handleProductChange = (product) => {
    setFormData(prev => ({ ...prev, product }));
    if (product) { fetchCurrentStock(product._id); } else { setCurrentStock(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.product) { toast.error('Select a product'); return; }
    if (!formData.quantity || formData.quantity <= 0) { toast.error('Enter valid quantity'); return; }
    if (!formData.reason) { toast.error('Enter a reason'); return; }

    try {
      setSaving(true);
      await inventoryService.adjustStock({
        product: formData.product._id,
        adjustmentType: formData.adjustmentType,
        quantity: parseFloat(formData.quantity),
        reason: formData.reason,
        notes: formData.notes,
      });
      toast.success('Stock adjustment recorded');
      // Reset form and refresh stock info for same product
      const currentProduct = formData.product;
      setFormData({ product: null, adjustmentType: 'adjustment_in', quantity: '', reason: '', notes: '' });
      setCurrentStock(null);
      // Optionally re-select the same product to continue adjustments
      // handleProductChange(currentProduct);
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to adjust stock'); } finally { setSaving(false); }
  };

  return (
    <Box>
      <PageHeader title="Stock Adjustment" subtitle="Adjust inventory levels" backUrl="/inventory/stock" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Autocomplete options={products} getOptionLabel={(o) => `${o.sku} - ${o.name}`} value={formData.product} onChange={(e, v) => handleProductChange(v)} renderInput={(params) => <TextField {...params} label="Select Product *" fullWidth />} />
                  </Grid>
                  {currentStock && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Current Stock: <strong style={{ color: currentStock.quantity > 0 ? 'green' : 'red' }}>{currentStock.quantity || currentStock.currentStock || 0}</strong> units | 
                        Avg Cost: <strong>{new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(currentStock.averageCost || 0)}</strong>
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="Adjustment Type" value={formData.adjustmentType} onChange={(e) => setFormData(prev => ({ ...prev, adjustmentType: e.target.value }))}>
                      <MenuItem value="adjustment_in">Add Stock (Increase)</MenuItem>
                      <MenuItem value="adjustment_out">Remove Stock (Decrease)</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth type="number" label="Quantity *" value={formData.quantity} onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))} inputProps={{ min: 1 }} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth select label="Reason *" value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}>
                      <MenuItem value="damaged">Damaged Goods</MenuItem>
                      <MenuItem value="expired">Expired Products</MenuItem>
                      <MenuItem value="theft">Theft/Loss</MenuItem>
                      <MenuItem value="counting_error">Counting Error</MenuItem>
                      <MenuItem value="sample">Sample/Promotional</MenuItem>
                      <MenuItem value="received_extra">Received Extra</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={3} label="Notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Additional details about this adjustment" />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/inventory/stock')}>Cancel</Button>
                      <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={20} /> : <Save />} disabled={saving}>Save Adjustment</Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StockAdjustment;
