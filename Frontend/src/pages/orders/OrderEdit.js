import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Typography, Divider, Paper, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert } from '@mui/material';
import { Add, Delete, Save, Cancel, Edit, Inventory } from '@mui/icons-material';
import productService from '../../services/productService';
import orderService from '../../services/orderService';
import inventoryService from '../../services/inventoryService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const OrderEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ customer: null, customerName: '', orderDate: '', notes: '', items: [] });
  const [newItem, setNewItem] = useState({ product: null, cartons: 0, pieces: 0, salePrice: 0 });
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editItem, setEditItem] = useState({ cartons: 0, pieces: 0, salePrice: 0 });
  
  // Stock monitoring state
  const [stockInfo, setStockInfo] = useState(null);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => { fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  
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
      setLoading(true);
      const [orderRes, prodRes] = await Promise.all([
        orderService.getOrder(id),
        productService.getProducts({ limit: 1000 })
      ]);
      
      const order = orderRes.data;
      setProducts(prodRes.data || []);
      
      // Check if order can be edited
      if (!['pending', 'confirmed'].includes(order.status)) {
        toast.error('This order cannot be edited');
        navigate(`/orders/${id}`);
        return;
      }
      
      if (order.invoiceGenerated) {
        toast.error('Cannot edit order with generated invoice');
        navigate(`/orders/${id}`);
        return;
      }

      // Map order items to form format
      const items = order.items.map(item => ({
        product: prodRes.data.find(p => p._id === item.product?._id || p._id === item.product) || { _id: item.product, name: item.productName, sku: item.productSku },
        productName: item.productName,
        productCode: item.productSku,
        piecesPerCarton: item.piecesPerCarton || 1,
        cartons: item.cartons || 0,
        pieces: item.pieces || 0,
        totalPieces: item.quantity,
        salePrice: item.salePrice,
        total: item.netAmount || item.lineTotal,
      }));

      setFormData({
        customer: order.customer,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.orderDate).toISOString().split('T')[0],
        notes: order.remarks || order.deliveryNotes || '',
        items: items
      });
    } catch (error) {
      toast.error('Failed to load order');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
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
      availableStock: availableStock,
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
    if (saving || isSubmittingRef.current) return;
    if (formData.items.length === 0) { toast.error('Add at least one item'); return; }

    isSubmittingRef.current = true;
    setSaving(true);
    try {
      const orderData = {
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
        remarks: formData.notes,
      };
      await orderService.updateOrder(id, orderData);
      toast.success('Order updated successfully');
      navigate(`/orders/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order');
    } finally {
      isSubmittingRef.current = false;
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const totals = calculateTotals();

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader title={`Edit Order: ${formData.orderNumber}`} subtitle={`Customer: ${formData.customerName}`} backUrl={`/orders/${id}`} />
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Order Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField fullWidth label="Customer" value={formData.customerName} disabled />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth type="date" label="Order Date" value={formData.orderDate} disabled InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Add Items</Typography>
                <Paper sx={{ p: 2, bgcolor: 'warning.50', mb: 2 }}>
                  <Typography variant="body2" color="warning.dark">⚠️ Enter quantity in <strong>Cartons</strong> and/or <strong>Pieces</strong>. Price is per piece.</Typography>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2">
                          <strong>{newItem.product.name}</strong>
                        </Typography>
                        <Chip 
                          label={`Stock: ${stockInfo?.currentStock || 0} pcs`} 
                          color={stockInfo?.currentStock > 0 ? 'success' : 'error'} 
                          size="small" 
                        />
                        {stockInfo?.currentStock > 0 && newItem.product.piecesPerCarton > 1 && (
                          <Chip 
                            label={`≈ ${Math.floor((stockInfo?.currentStock || 0) / newItem.product.piecesPerCarton)} cartons`} 
                            color="info" 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                        {calculateTotalPieces(newItem.cartons, newItem.pieces, newItem.product.piecesPerCarton) > (stockInfo?.currentStock || 0) && (
                          <Chip label="⚠️ Exceeds available stock!" color="error" size="small" />
                        )}
                      </Box>
                    )}
                  </Alert>
                )}
                
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} sm={6} md={3}>
                    <Autocomplete options={products} getOptionLabel={(o) => `${o.sku} - ${o.name}`} isOptionEqualToValue={(option, value) => option._id === value._id} value={newItem.product} onChange={(e, v) => setNewItem(prev => ({ ...prev, product: v, salePrice: 0 }))} renderInput={(params) => <TextField {...params} label="Select Product" fullWidth size="small" />} />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField fullWidth type="number" label="Cartons" size="small" value={newItem.cartons} onChange={(e) => setNewItem(prev => ({ ...prev, cartons: e.target.value }))} inputProps={{ min: 0 }} helperText={newItem.product ? `${newItem.product.piecesPerCarton || 1} pcs/ctn` : ' '} FormHelperTextProps={{ sx: { visibility: newItem.product ? 'visible' : 'hidden' } }} />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField fullWidth type="number" label="Pieces" size="small" value={newItem.pieces} onChange={(e) => setNewItem(prev => ({ ...prev, pieces: e.target.value }))} inputProps={{ min: 0 }} helperText=" " />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField fullWidth type="number" label="Price/Piece *" size="small" value={newItem.salePrice} onChange={(e) => setNewItem(prev => ({ ...prev, salePrice: e.target.value }))} inputProps={{ min: 0 }} helperText=" " />
                  </Grid>
                  <Grid item xs={6} sm={3} md={3}>
                    <Button fullWidth variant="contained" startIcon={<Add />} onClick={handleAddItem} sx={{ height: 40 }}>Add</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Order Items</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Stock</TableCell>
                        <TableCell align="center">Cartons</TableCell>
                        <TableCell align="center">Pieces</TableCell>
                        <TableCell align="right">Total Pcs</TableCell>
                        <TableCell align="right">Price/Pc</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.productCode} - {item.productName}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={item.availableStock || '-'} 
                              size="small" 
                              color={item.availableStock ? (item.totalPieces <= item.availableStock ? 'success' : 'error') : 'default'}
                            />
                          </TableCell>
                          <TableCell align="center">{item.cartons}</TableCell>
                          <TableCell align="center">{item.pieces}</TableCell>
                          <TableCell align="right">{item.totalPieces}</TableCell>
                          <TableCell align="right">{formatCurrency(item.salePrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total)}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="Edit Item">
                              <IconButton size="small" onClick={() => handleEditClick(index)}><Edit fontSize="small" color="primary" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Remove Item">
                              <IconButton size="small" onClick={() => handleRemoveItem(index)}><Delete fontSize="small" color="error" /></IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {formData.items.length === 0 && <TableRow><TableCell colSpan={8} align="center">No items added</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 80 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Order Summary</Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography>Subtotal:</Typography><Typography>{formatCurrency(totals.subtotal)}</Typography></Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}><Typography variant="h6">Grand Total:</Typography><Typography variant="h6" color="primary">{formatCurrency(totals.grandTotal)}</Typography></Box>
                <TextField fullWidth multiline rows={3} label="Notes / Remarks" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                  <Button fullWidth type="submit" variant="contained" size="large" startIcon={saving ? <CircularProgress size={20} /> : <Save />} disabled={saving}>Update Order</Button>
                  <Button fullWidth variant="outlined" startIcon={<Cancel />} onClick={() => navigate(`/orders/${id}`)}>Cancel</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Edit Item Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Cartons" value={editItem.cartons} onChange={(e) => setEditItem(prev => ({ ...prev, cartons: e.target.value }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="number" label="Pieces" value={editItem.pieces} onChange={(e) => setEditItem(prev => ({ ...prev, pieces: e.target.value }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="number" label="Price per Piece" value={editItem.salePrice} onChange={(e) => setEditItem(prev => ({ ...prev, salePrice: e.target.value }))} inputProps={{ min: 0 }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderEdit;
