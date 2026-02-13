import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Card, CardContent, Grid, TextField, Button, Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Typography, Divider, Paper, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip } from '@mui/material';
import { Add, Delete, Save, Cancel, Edit, Inventory } from '@mui/icons-material';
import vendorService from '../../services/vendorService';
import productService from '../../services/productService';
import purchaseService from '../../services/purchaseService';
import inventoryService from '../../services/inventoryService';
import PageHeader from '../../components/common/PageHeader';
import toast from 'react-hot-toast';

const PurchaseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { user } = useSelector(state => state.auth);
  const isDistributor = user?.role === 'distributor';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({ vendor: null, purchaseDate: new Date().toISOString().split('T')[0], invoiceNumber: '', notes: '', items: [] });
  const [newItem, setNewItem] = useState({ product: null, cartons: 0, pieces: 0, purchasePrice: 0 });
  const [canEdit, setCanEdit] = useState(true);
  const [stockUpdated, setStockUpdated] = useState(false);
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editItem, setEditItem] = useState({ cartons: 0, pieces: 0, purchasePrice: 0 });
  
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

  useEffect(() => {
    if (id && vendors.length > 0 && products.length > 0) {
      fetchPurchase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, vendors, products]);

  const fetchData = async () => {
    try {
      const [vendorRes, prodRes] = await Promise.all([vendorService.getVendors({ limit: 1000 }), productService.getProducts({ limit: 1000 })]);
      setVendors(vendorRes.data || []);
      setProducts(prodRes.data || []);
    } catch (error) { toast.error('Failed to load data'); }
  };

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      const response = await purchaseService.getPurchase(id);
      const purchase = response.data;
      
      // Check if purchase can be edited
      // Distributors can always edit, others can only edit if stock not updated
      if (purchase.stockUpdated) {
        setStockUpdated(true);
        if (!isDistributor) {
          setCanEdit(false);
          toast.error('This purchase cannot be edited - stock already updated. Only distributor can edit.');
        } else {
          toast.info('You are editing a purchase with stock already updated. Inventory will be adjusted.');
        }
      }

      // Find vendor from list
      const vendor = vendors.find(v => v._id === purchase.vendor._id || v._id === purchase.vendor);
      
      // Map items with product objects
      const items = purchase.items.map(item => {
        const product = products.find(p => p._id === item.product._id || p._id === item.product);
        const piecesPerCarton = item.piecesPerCarton || product?.piecesPerCarton || 1;
        const pricePerCarton = item.purchasePrice * piecesPerCarton;
        return {
          product: product || { _id: item.product, name: item.productName, sku: item.productSku },
          productName: item.productName,
          productCode: item.productSku,
          piecesPerCarton: piecesPerCarton,
          cartons: item.cartons || 0,
          pieces: item.pieces || 0,
          totalPieces: item.quantity,
          purchasePrice: item.purchasePrice,
          pricePerCarton: pricePerCarton,
          total: item.lineTotal
        };
      });

      setFormData({
        vendor,
        purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        invoiceNumber: purchase.vendorInvoiceNumber || '',
        notes: purchase.remarks || '',
        items
      });
    } catch (error) {
      toast.error('Failed to load purchase');
      navigate('/purchases');
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
    if (newItem.purchasePrice <= 0) { toast.error('Purchase price must be > 0'); return; }
    
    const exists = formData.items.find(i => i.product._id === newItem.product._id);
    if (exists) { toast.error('Product already added'); return; }

    const piecesPerCarton = newItem.product.piecesPerCarton || 1;
    const pricePerCarton = parseFloat(newItem.purchasePrice);
    const pricePerPiece = pricePerCarton / piecesPerCarton;
    const totalCartons = parseInt(newItem.cartons) || 0;
    const item = {
      product: newItem.product,
      productName: newItem.product.name,
      productCode: newItem.product.sku,
      piecesPerCarton: piecesPerCarton,
      cartons: totalCartons,
      pieces: parseInt(newItem.pieces) || 0,
      totalPieces: totalPieces,
      purchasePrice: pricePerPiece,
      pricePerCarton: pricePerCarton,
      total: (totalCartons * pricePerCarton) + ((parseInt(newItem.pieces) || 0) * pricePerPiece),
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, item] }));
    setNewItem({ product: null, cartons: 0, pieces: 0, purchasePrice: 0 });
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleEditClick = (index) => {
    const item = formData.items[index];
    setEditIndex(index);
    setEditItem({ cartons: item.cartons, pieces: item.pieces, purchasePrice: item.pricePerCarton || item.purchasePrice * (item.piecesPerCarton || 1) });
    setEditDialog(true);
  };

  const handleEditSave = () => {
    const item = formData.items[editIndex];
    const totalPieces = calculateTotalPieces(editItem.cartons, editItem.pieces, item.piecesPerCarton);
    if (totalPieces <= 0) { toast.error('Enter cartons or pieces'); return; }
    if (editItem.purchasePrice <= 0) { toast.error('Purchase price must be > 0'); return; }

    const piecesPerCarton = item.piecesPerCarton || 1;
    const pricePerCarton = parseFloat(editItem.purchasePrice);
    const pricePerPiece = pricePerCarton / piecesPerCarton;
    const totalCartons = parseInt(editItem.cartons) || 0;
    const updatedItems = [...formData.items];
    updatedItems[editIndex] = {
      ...item,
      cartons: totalCartons,
      pieces: parseInt(editItem.pieces) || 0,
      totalPieces: totalPieces,
      purchasePrice: pricePerPiece,
      pricePerCarton: pricePerCarton,
      total: (totalCartons * pricePerCarton) + ((parseInt(editItem.pieces) || 0) * pricePerPiece),
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
    if (!formData.vendor) { toast.error('Select a vendor'); return; }
    if (formData.items.length === 0) { toast.error('Add at least one item'); return; }
    if (isEditMode && !canEdit) { toast.error('Cannot edit this purchase'); return; }

    try {
      setSaving(true);
      const totals = calculateTotals();
      const purchaseData = {
        vendor: formData.vendor._id,
        purchaseDate: formData.purchaseDate,
        vendorInvoiceNumber: formData.invoiceNumber,
        notes: formData.notes,
        items: formData.items.map(item => ({
          product: item.product._id,
          productName: item.productName,
          productCode: item.productCode,
          cartons: item.cartons,
          pieces: item.pieces,
          piecesPerCarton: item.piecesPerCarton,
          quantity: item.totalPieces,
          purchasePrice: item.purchasePrice,
          total: item.total,
        })),
        subtotal: totals.subtotal,
        grandTotal: totals.grandTotal,
      };
      
      if (isEditMode) {
        await purchaseService.updatePurchase(id, purchaseData);
        toast.success('Purchase updated successfully');
      } else {
        await purchaseService.createPurchase(purchaseData);
        toast.success('Purchase created & inventory updated');
      }
      navigate('/purchases');
    } catch (error) { toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} purchase`); } finally { setSaving(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const totals = calculateTotals();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader 
        title={isEditMode ? "Edit Purchase" : "Create New Purchase"} 
        subtitle={isEditMode ? (stockUpdated ? (isDistributor ? "⚠️ Distributor Edit Mode - Inventory will be adjusted" : "This purchase cannot be edited - stock already updated") : "Modify purchase details") : "Record a purchase - inventory will be updated immediately"} 
        backUrl="/purchases" 
      />
      {isEditMode && stockUpdated && isDistributor && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Distributor Override:</strong> You are editing a purchase that already has inventory recorded. 
          Saving changes will automatically reverse the old inventory entries and apply new ones.
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Purchase Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Autocomplete options={vendors} getOptionLabel={(o) => `${o.vendorCode} - ${o.businessName}`} isOptionEqualToValue={(option, value) => option._id === value._id} value={formData.vendor} onChange={(e, v) => setFormData(prev => ({ ...prev, vendor: v }))} renderInput={(params) => <TextField {...params} label="Select Vendor *" fullWidth />} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth type="date" label="Purchase Date" value={formData.purchaseDate} onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField fullWidth label="Vendor Invoice #" value={formData.invoiceNumber} onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Add Items</Typography>
                <Paper sx={{ p: 2, bgcolor: 'info.50', mb: 2 }}>
                  <Typography variant="body2" color="info.dark">💡 Enter quantity in <strong>Cartons</strong> and/or <strong>Pieces</strong>. Price is per carton.</Typography>
                </Paper>
                
                {/* Stock Info Display */}
                {newItem.product && (
                  <Alert 
                    severity={loadingStock ? 'info' : 'success'} 
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
                          label={`Current Stock: ${stockInfo?.currentStock || 0} pcs`} 
                          color="primary" 
                          size="small" 
                        />
                        {(stockInfo?.currentStock || 0) > 0 && newItem.product.piecesPerCarton > 1 && (
                          <Chip 
                            label={`≈ ${Math.floor((stockInfo?.currentStock || 0) / newItem.product.piecesPerCarton)} cartons`} 
                            color="info" 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                        {stockInfo?.averageCost > 0 && (
                          <Chip 
                            label={`Avg Purchase: Rs. ${(stockInfo.averageCost * (newItem.product?.piecesPerCarton || 1)).toLocaleString()}/carton`} 
                            color="warning" 
                            size="small" 
                          />
                        )}
                      </Box>
                    )}
                  </Alert>
                )}
                
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} sm={6} md={4}>
                    <Autocomplete options={products} getOptionLabel={(o) => `${o.sku} - ${o.name}`} isOptionEqualToValue={(option, value) => option._id === value._id} value={newItem.product} onChange={(e, v) => setNewItem(prev => ({ ...prev, product: v, purchasePrice: 0 }))} renderInput={(params) => <TextField {...params} label="Select Product" fullWidth size="small" />} />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField fullWidth type="number" label="Cartons" size="small" value={newItem.cartons} onChange={(e) => setNewItem(prev => ({ ...prev, cartons: e.target.value }))} inputProps={{ min: 0 }} helperText={newItem.product ? `${newItem.product.piecesPerCarton || 1} pcs/ctn` : ' '} FormHelperTextProps={{ sx: { visibility: newItem.product ? 'visible' : 'hidden' } }} />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField fullWidth type="number" label="Pieces" size="small" value={newItem.pieces} onChange={(e) => setNewItem(prev => ({ ...prev, pieces: e.target.value }))} inputProps={{ min: 0 }} helperText=" " />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <TextField fullWidth type="number" label="Price/Carton *" size="small" value={newItem.purchasePrice} onChange={(e) => setNewItem(prev => ({ ...prev, purchasePrice: e.target.value }))} inputProps={{ min: 0 }} helperText=" " />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Button fullWidth variant="contained" startIcon={<Add />} onClick={handleAddItem} sx={{ height: 40 }}>Add</Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Purchase Items</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="center">Cartons</TableCell>
                        <TableCell align="center">Pieces</TableCell>
                        <TableCell align="right">Total Pcs</TableCell>
                        <TableCell align="right">Price/Ctn</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.productCode} - {item.productName}</TableCell>
                          <TableCell align="center">{item.cartons}</TableCell>
                          <TableCell align="center">{item.pieces}</TableCell>
                          <TableCell align="right">{item.totalPieces}</TableCell>
                          <TableCell align="right">{formatCurrency(item.pricePerCarton || item.purchasePrice * (item.piecesPerCarton || 1))}</TableCell>
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
                      {formData.items.length === 0 && <TableRow><TableCell colSpan={7} align="center">No items added</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ position: 'sticky', top: 80 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Purchase Summary</Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography>Subtotal:</Typography><Typography>{formatCurrency(totals.subtotal)}</Typography></Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}><Typography variant="h6">Grand Total:</Typography><Typography variant="h6" color="primary">{formatCurrency(totals.grandTotal)}</Typography></Box>
                <TextField fullWidth multiline rows={3} label="Notes" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} sx={{ mb: 2 }} disabled={isEditMode && !canEdit} />
                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                  <Button fullWidth type="submit" variant="contained" size="large" startIcon={saving ? <CircularProgress size={20} /> : <Save />} disabled={saving || (isEditMode && !canEdit)}>{isEditMode ? 'Update Purchase' : 'Create Purchase'}</Button>
                  <Button fullWidth variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/purchases')}>Cancel</Button>
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
              <TextField fullWidth type="number" label="Price per Carton" value={editItem.purchasePrice} onChange={(e) => setEditItem(prev => ({ ...prev, purchasePrice: e.target.value }))} inputProps={{ min: 0 }} />
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

export default PurchaseForm;
