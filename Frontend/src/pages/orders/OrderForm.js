import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Typography, Divider, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert } from '@mui/material';
import { Add, Delete, Save, Cancel, Edit, Inventory } from '@mui/icons-material';
import customerService from '../../services/customerService';
import productService from '../../services/productService';
import orderService from '../../services/orderService';
import inventoryService from '../../services/inventoryService';
import PageHeader from '../../components/common/PageHeader';
import toast from 'react-hot-toast';

const OrderForm = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ customer: null, orderDate: new Date().toISOString().split('T')[0], notes: '', items: [] });
  const [newItem, setNewItem] = useState({ product: null, cartons: 0, pieces: 0, salePrice: 0 });
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editItem, setEditItem] = useState({ cartons: 0, pieces: 0, salePrice: 0 });
  
  // Stock monitoring state
  const [stockInfo, setStockInfo] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => { fetchData(); }, []);
  
  // Fetch stock when product is selected
  useEffect(() => {
    if (newItem.product) {
      fetchProductStock(newItem.product._id);
    } else {
      setStockInfo(null);
    }
  }, [newItem.product]);

  const fetchProductStock = async (productId) => {
    try {
      setLoadingStock(true);
      const response = await inventoryService.getProductStock(productId);
      setStockInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch stock:', error);
      setStockInfo(null);
    } finally {
      setLoadingStock(false);
    }
  };

  const fetchData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([customerService.getCustomers({ limit: 1000 }), productService.getProducts({ limit: 1000 })]);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
    } catch (error) { toast.error('Failed to load data'); }
  };

  const calculateTotalPieces = (cartons, pieces, piecesPerCarton) => {
    return (parseInt(cartons) || 0) * (piecesPerCarton || 1) + (parseInt(pieces) || 0);
  };

  const handleAddItem = () => {
    if (!newItem.product) { toast.error('Select a product'); return; }
    const totalPieces = calculateTotalPieces(newItem.cartons, newItem.pieces, newItem.product.piecesPerCarton);
    if (totalPieces <= 0) { toast.error('Enter cartons or pieces'); return; }
    if (newItem.salePrice <= 0) { toast.error('Sale price must be > 0'); return; }
    
    // Check stock availability
    const availableStock = stockInfo?.currentStock || newItem.product.currentStock || 0;
    if (totalPieces > availableStock) {
      toast.error(`Insufficient stock! Available: ${availableStock} pieces, Requested: ${totalPieces} pieces`);
      return;
    }
    
    const exists = formData.items.find(i => i.product._id === newItem.product._id);
    if (exists) { toast.error('Product already added'); return; }

    const item = {
      product: newItem.product,
      productName: newItem.product.name,
      productCode: newItem.product.sku,
      piecesPerCarton: newItem.product.piecesPerCarton || 1,
      cartons: parseInt(newItem.cartons) || 0,
      pieces: parseInt(newItem.pieces) || 0,
      totalPieces: totalPieces,
      salePrice: parseFloat(newItem.salePrice),
      total: totalPieces * parseFloat(newItem.salePrice),
      availableStock: stockInfo?.currentStock || newItem.product.currentStock || 0,
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, item] }));
    setNewItem({ product: null, cartons: 0, pieces: 0, salePrice: 0 });
    setStockInfo(null);
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleEditClick = (index) => {
    const item = formData.items[index];
    setEditIndex(index);
    setEditItem({ cartons: item.cartons, pieces: item.pieces, salePrice: item.salePrice });
    setEditDialog(true);
  };

  const handleEditSave = () => {
    const item = formData.items[editIndex];
    const totalPieces = calculateTotalPieces(editItem.cartons, editItem.pieces, item.piecesPerCarton);
    if (totalPieces <= 0) { toast.error('Enter cartons or pieces'); return; }
    if (editItem.salePrice <= 0) { toast.error('Sale price must be > 0'); return; }

    const updatedItems = [...formData.items];
    updatedItems[editIndex] = {
      ...item,
      cartons: parseInt(editItem.cartons) || 0,
      pieces: parseInt(editItem.pieces) || 0,
      totalPieces: totalPieces,
      salePrice: parseFloat(editItem.salePrice),
      total: totalPieces * parseFloat(editItem.salePrice),
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
    setEditDialog(false);
    setEditIndex(null);
    toast.success('Item updated');
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    return { subtotal, grandTotal: subtotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || isSubmittingRef.current) return; // Prevent duplicate submissions
    if (!formData.customer) { toast.error('Select a customer'); return; }
    if (formData.items.length === 0) { toast.error('Add at least one item'); return; }

    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const totals = calculateTotals();
      const orderData = {
        customer: formData.customer._id,
        orderDate: formData.orderDate,
        notes: formData.notes,
        items: formData.items.map(item => ({
          product: item.product._id,
          productName: item.productName,
          productCode: item.productCode,
          cartons: item.cartons,
          pieces: item.pieces,
          piecesPerCarton: item.piecesPerCarton,
          quantity: item.totalPieces,
          salePrice: item.salePrice,
          total: item.total,
        })),
        subtotal: totals.subtotal,
        grandTotal: totals.grandTotal,
      };
      await orderService.createOrder(orderData);
      toast.success('Order created successfully');
      navigate('/orders');
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to create order'); } finally { isSubmittingRef.current = false; setSaving(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const totals = calculateTotals();

  return (
    <Box>
      <PageHeader title="Create New Order" subtitle="Book a sales order with manual pricing" backUrl="/orders" />
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* Main content area */}
          <Grid item xs={12} lg={8}>
            {/* Customer Selection Card */}
            <Card sx={{ mb: { xs: 2, md: 3 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Order Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Autocomplete 
                      options={customers} 
                      getOptionLabel={(o) => `${o.customerCode} - ${o.businessName}`} 
                      isOptionEqualToValue={(option, value) => option._id === value._id} 
                      value={formData.customer} 
                      onChange={(e, v) => setFormData(prev => ({ ...prev, customer: v }))} 
                      renderInput={(params) => <TextField {...params} label="Select Customer *" fullWidth />}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ py: 1.5 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>{option.businessName}</Typography>
                            <Typography variant="caption" color="text.secondary">{option.customerCode} • {option.phone}</Typography>
                          </Box>
                        </Box>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField 
                      fullWidth 
                      type="date" 
                      label="Order Date" 
                      value={formData.orderDate} 
                      onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))} 
                      InputLabelProps={{ shrink: true }} 
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Add Items Card */}
            <Card sx={{ mb: { xs: 2, md: 3 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Add Items
                </Typography>
                <Paper sx={{ p: 1.5, bgcolor: 'warning.50', mb: 2 }}>
                  <Typography variant="body2" color="warning.dark" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    ⚠️ Enter quantity in <strong>Cartons</strong> and/or <strong>Pieces</strong>. Price is per piece.
                  </Typography>
                </Paper>
                
                {/* Stock Info Display */}
                {newItem.product && (
                  <Alert 
                    severity={loadingStock ? 'info' : (stockInfo?.currentStock > 0 ? 'success' : 'error')} 
                    icon={<Inventory />}
                    sx={{ mb: 2 }}
                  >
                    {loadingStock ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} /> Loading stock...
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                          <strong>{newItem.product.name}</strong>
                        </Typography>
                        <Chip 
                          label={`Stock: ${stockInfo?.currentStock || 0}`} 
                          color={stockInfo?.currentStock > 0 ? 'success' : 'error'} 
                          size="small" 
                        />
                        {stockInfo?.suggestedSalePrice > 0 && (
                          <Chip 
                            label={`Rs. ${stockInfo.suggestedSalePrice.toLocaleString()}/pc`} 
                            color="warning" 
                            size="small" 
                          />
                        )}
                      </Box>
                    )}
                  </Alert>
                )}
                
                {/* Product Input Row - Mobile Optimized */}
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Autocomplete 
                      options={products} 
                      getOptionLabel={(o) => `${o.sku} - ${o.name}`} 
                      isOptionEqualToValue={(option, value) => option._id === value._id} 
                      value={newItem.product} 
                      onChange={(e, v) => setNewItem(prev => ({ ...prev, product: v, salePrice: 0 }))} 
                      renderInput={(params) => <TextField {...params} label="Select Product" fullWidth />}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ py: 1.5 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{option.sku} • {option.piecesPerCarton} pcs/ctn</Typography>
                          </Box>
                        </Box>
                      )}
                    />
                  </Grid>
                  <Grid item xs={4} sm={3}>
                    <TextField 
                      fullWidth 
                      type="number" 
                      label="Cartons" 
                      value={newItem.cartons} 
                      onChange={(e) => setNewItem(prev => ({ ...prev, cartons: e.target.value }))} 
                      inputProps={{ min: 0, inputMode: 'numeric' }} 
                      helperText={newItem.product ? `${newItem.product.piecesPerCarton || 1}/ctn` : ' '} 
                      FormHelperTextProps={{ sx: { fontSize: '0.7rem' } }} 
                    />
                  </Grid>
                  <Grid item xs={4} sm={3}>
                    <TextField 
                      fullWidth 
                      type="number" 
                      label="Pieces" 
                      value={newItem.pieces} 
                      onChange={(e) => setNewItem(prev => ({ ...prev, pieces: e.target.value }))} 
                      inputProps={{ min: 0, inputMode: 'numeric' }} 
                    />
                  </Grid>
                  <Grid item xs={4} sm={3}>
                    <TextField 
                      fullWidth 
                      type="number" 
                      label="Price/Pc" 
                      value={newItem.salePrice} 
                      onChange={(e) => setNewItem(prev => ({ ...prev, salePrice: e.target.value }))} 
                      inputProps={{ min: 0, inputMode: 'decimal' }} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button 
                      fullWidth 
                      variant="contained" 
                      startIcon={<Add />} 
                      onClick={handleAddItem} 
                      sx={{ height: { xs: 48, sm: 56 } }}
                    >
                      Add Item
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Order Items Card */}
            <Card>
              <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, px: { xs: 0.5, sm: 0 } }}>
                  Order Items ({formData.items.length})
                </Typography>
                
                {/* Desktop Table View */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="center">Stock</TableCell>
                          <TableCell align="center">Ctns</TableCell>
                          <TableCell align="center">Pcs</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="center" width={80}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.productCode} - {item.productName}</TableCell>
                            <TableCell align="center">
                              <Chip label={item.availableStock || 0} size="small" color={item.totalPieces <= (item.availableStock || 0) ? 'success' : 'error'} />
                            </TableCell>
                            <TableCell align="center">{item.cartons}</TableCell>
                            <TableCell align="center">{item.pieces}</TableCell>
                            <TableCell align="right">{item.totalPieces}</TableCell>
                            <TableCell align="right">{formatCurrency(item.salePrice)}</TableCell>
                            <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" onClick={() => handleEditClick(index)}><Edit fontSize="small" color="primary" /></IconButton>
                              <IconButton size="small" onClick={() => handleRemoveItem(index)}><Delete fontSize="small" color="error" /></IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        {formData.items.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No items added. Select a product above to add items.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>

                {/* Mobile Card View */}
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  {formData.items.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="body2">No items added yet</Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {formData.items.map((item, index) => (
                        <Paper 
                          key={index} 
                          variant="outlined" 
                          sx={{ p: 1.5, borderRadius: 2 }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {item.productName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.productCode}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                              <IconButton size="small" onClick={() => handleEditClick(index)} sx={{ minWidth: 40, minHeight: 40 }}>
                                <Edit fontSize="small" color="primary" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleRemoveItem(index)} sx={{ minWidth: 40, minHeight: 40 }}>
                                <Delete fontSize="small" color="error" />
                              </IconButton>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip label={`${item.cartons} ctn`} size="small" variant="outlined" />
                              <Chip label={`${item.pieces} pc`} size="small" variant="outlined" />
                              <Chip label={`= ${item.totalPieces} pcs`} size="small" color="primary" />
                            </Box>
                            <Typography variant="body2" fontWeight={600} color="primary.main">
                              {formatCurrency(item.total)}
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Order Summary Sidebar */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Order Summary
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                {/* Summary details */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Items:</Typography>
                  <Typography>{formData.items.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Total Pieces:</Typography>
                  <Typography>{formData.items.reduce((sum, item) => sum + item.totalPieces, 0)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Subtotal:</Typography>
                  <Typography>{formatCurrency(totals.subtotal)}</Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Grand Total:</Typography>
                  <Typography variant="h6" color="primary" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                    {formatCurrency(totals.grandTotal)}
                  </Typography>
                </Box>
                
                <TextField 
                  fullWidth 
                  multiline 
                  rows={2} 
                  label="Notes (Optional)" 
                  value={formData.notes} 
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
                  sx={{ mb: 2 }} 
                />
                
                <Box sx={{ display: 'flex', gap: 1.5, flexDirection: 'column' }}>
                  <Button 
                    fullWidth 
                    type="submit" 
                    variant="contained" 
                    size="large" 
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />} 
                    disabled={saving || formData.items.length === 0}
                    sx={{ py: 1.5 }}
                  >
                    {saving ? 'Creating...' : 'Create Order'}
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    startIcon={<Cancel />} 
                    onClick={() => navigate('/orders')}
                  >
                    Cancel
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Edit Item Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Edit Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField 
                fullWidth 
                type="number" 
                label="Cartons" 
                value={editItem.cartons} 
                onChange={(e) => setEditItem(prev => ({ ...prev, cartons: e.target.value }))} 
                inputProps={{ min: 0, inputMode: 'numeric' }} 
              />
            </Grid>
            <Grid item xs={6}>
              <TextField 
                fullWidth 
                type="number" 
                label="Pieces" 
                value={editItem.pieces} 
                onChange={(e) => setEditItem(prev => ({ ...prev, pieces: e.target.value }))} 
                inputProps={{ min: 0, inputMode: 'numeric' }} 
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                type="number" 
                label="Price per Piece" 
                value={editItem.salePrice} 
                onChange={(e) => setEditItem(prev => ({ ...prev, salePrice: e.target.value }))} 
                inputProps={{ min: 0, inputMode: 'decimal' }} 
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialog(false)} variant="outlined">Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderForm;
