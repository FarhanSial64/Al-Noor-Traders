import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Chip, InputAdornment, Typography, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Paper, useTheme, useMediaQuery } from '@mui/material';
import { Search, Warning, Visibility, Close, Print } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import inventoryService from '../../services/inventoryService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const InventoryStock = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  
  // Dialog state for viewing purchase history
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  
  // Print refs
  const inventoryPrintRef = useRef();
  const movementsPrintRef = useRef();

  const handlePrintInventory = useReactToPrint({
    contentRef: inventoryPrintRef,
    documentTitle: `Inventory_Stock_${new Date().toLocaleDateString()}`,
  });

  const handlePrintMovements = useReactToPrint({
    contentRef: movementsPrintRef,
    documentTitle: `Stock_Movements_${selectedProduct?.sku || 'Product'}_${new Date().toLocaleDateString()}`,
  });

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try { setLoading(true); const response = await inventoryService.getStock(); setInventory(response.data || []); } catch (error) { toast.error('Failed to load inventory'); } finally { setLoading(false); }
  };

  const handleViewProduct = async (product) => {
    setSelectedProduct(product);
    setViewDialog(true);
    setLoadingMovements(true);
    try {
      const response = await inventoryService.getStockMovements(product._id, { limit: 100 });
      setMovements(response.data || []);
    } catch (error) {
      toast.error('Failed to load purchase history');
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleCloseDialog = () => {
    setViewDialog(false);
    setSelectedProduct(null);
    setMovements([]);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  const filteredInventory = inventory.filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase()) || 
    item.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filteredInventory.reduce((sum, item) => sum + (item.currentStock || 0), 0);

  const getStockStatus = (item) => {
    const totalPieces = item.currentStock || 0;
    if (totalPieces <= 0) return { label: 'Out of Stock', color: 'error' };
    if (totalPieces <= (item.minimumStock || 0)) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  const MobileCard = ({ item }) => {
    const totalPieces = item.currentStock || 0;
    const piecesPerCarton = item.piecesPerCarton || 1;
    const cartons = Math.floor(totalPieces / piecesPerCarton);
    const loosePieces = totalPieces % piecesPerCarton;
    const status = getStockStatus(item);
    return (
      <Paper sx={{ p: 2, mb: 1.5 }} elevation={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="600">{item.name}</Typography>
            <Typography variant="caption" color="text.secondary">{item.sku}</Typography>
          </Box>
          <Chip label={status.label} size="small" color={status.color} icon={status.color !== 'success' ? <Warning /> : undefined} />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Cartons</Typography>
            <Typography variant="h6" fontWeight="700">{cartons}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Pieces</Typography>
            <Typography variant="h6">{loosePieces}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Total</Typography>
            <Typography variant="h6">{totalPieces}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Min Stock</Typography>
            <Typography variant="body1">{item.minimumStock || 0}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">{item.category?.name || '-'} • {item.brand?.name || '-'}</Typography>
          </Box>
          <IconButton size="small" onClick={() => handleViewProduct(item)} color="primary" sx={{ minWidth: 44, minHeight: 44 }}>
            <Visibility />
          </IconButton>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      <PageHeader 
        title="Inventory Stock" 
        subtitle="Current stock levels and valuation" 
        action={
          <Button variant="outlined" startIcon={<Print />} onClick={handlePrintInventory}>
            Print Inventory
          </Button>
        }
      />
      
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: { xs: '100%', sm: 400 } }} size={isMobile ? 'small' : 'medium'} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
            <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ whiteSpace: 'nowrap' }}>Total Stock: <strong>{totalValue} items</strong></Typography>
          </Box>
        </CardContent>
      </Card>

      <Card>
        {loading ? <Loading /> : (
          isMobile ? (
            <Box sx={{ p: 1.5 }}>
              {filteredInventory.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No inventory data</Typography>
              ) : (
                filteredInventory.map((item, index) => <MobileCard key={item._id || index} item={item} />)
              )}
            </Box>
          ) : (
          <Box ref={inventoryPrintRef}>
            {/* Print Header - only visible when printing */}
            <Box sx={{ display: 'none', '@media print': { display: 'block', p: 2, mb: 2, textAlign: 'center', borderBottom: '2px solid #000', pb: 1 } }}>
              <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>AL NOOR TRADERS</Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, mt: 0.5 }}>INVENTORY STOCK REPORT</Typography>
              <Typography sx={{ fontSize: '10px', mt: 0.5 }}>
                Generated on: {new Date().toLocaleString()} | Total Items: {totalValue}
              </Typography>
            </Box>
            <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell align="center">Pcs/Ctn</TableCell>
                  <TableCell align="right">Cartons</TableCell>
                  <TableCell align="right">Pieces</TableCell>
                  <TableCell align="right">Total Pieces</TableCell>
                  <TableCell align="right">Min Stock</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInventory.map((item, index) => {
                  const totalPieces = item.currentStock || 0;
                  const piecesPerCarton = item.piecesPerCarton || 1;
                  const cartons = Math.floor(totalPieces / piecesPerCarton);
                  const loosePieces = totalPieces % piecesPerCarton;
                  const isLowStock = totalPieces <= (item.minimumStock || 0);
                  const isOutOfStock = totalPieces <= 0;
                  return (
                    <TableRow key={item._id || index} hover>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category?.name || '-'}</TableCell>
                      <TableCell>{item.brand?.name || '-'}</TableCell>
                      <TableCell align="center">{piecesPerCarton}</TableCell>
                      <TableCell align="right"><strong>{cartons}</strong></TableCell>
                      <TableCell align="right">{loosePieces}</TableCell>
                      <TableCell align="right">{totalPieces}</TableCell>
                      <TableCell align="right">{item.minimumStock || 0}</TableCell>
                      <TableCell>
                        {isOutOfStock ? <Chip icon={<Warning />} label="Out of Stock" size="small" color="error" /> :
                         isLowStock ? <Chip icon={<Warning />} label="Low Stock" size="small" color="warning" /> :
                         <Chip label="In Stock" size="small" color="success" />}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Purchase History">
                          <IconButton size="small" onClick={() => handleViewProduct(item)} color="primary">
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredInventory.length === 0 && <TableRow><TableCell colSpan={11} align="center">No inventory data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>
          )
        )}
      </Card>

      {/* Purchase History Dialog */}
      <Dialog open={viewDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6">Stock Movements</Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedProduct?.sku} - {selectedProduct?.name}
            </Typography>
          </Box>
          <Box>
            {movements.length > 0 && (
              <Tooltip title="Print Stock Movements">
                <IconButton onClick={handlePrintMovements} color="primary" sx={{ mr: 1 }}>
                  <Print />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={handleCloseDialog}><Close /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box ref={movementsPrintRef}>
            {/* Print Header - only visible when printing */}
            <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2 } }}>
              <Typography variant="h5" align="center" gutterBottom><strong>AL NOOR TRADERS</strong></Typography>
              <Typography variant="h6" align="center" gutterBottom>Stock Movements Report</Typography>
              <Typography variant="body1" align="center" gutterBottom>
                <strong>{selectedProduct?.sku}</strong> - {selectedProduct?.name}
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary">
                Generated on: {new Date().toLocaleString()}
              </Typography>
            </Box>
          {loadingMovements ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : movements.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ py: 4 }}>
              No stock movements found for this product
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align="right">Qty In</TableCell>
                    <TableCell align="right">Qty Out</TableCell>
                    <TableCell align="right">Price/Pc</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map((movement, idx) => (
                    <TableRow key={movement._id || idx} hover>
                      <TableCell>{new Date(movement.transactionDate || movement.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={movement.transactionType?.replace('_', ' ') || movement.type} 
                          size="small" 
                          color={
                            movement.transactionType === 'purchase' ? 'success' : 
                            movement.transactionType === 'sale' ? 'error' : 
                            movement.transactionType === 'adjustment_in' ? 'info' :
                            movement.transactionType === 'adjustment_out' ? 'warning' :
                            movement.transactionType === 'adjustment' ? 'secondary' :
                            movement.transactionType === 'edit_in' ? 'info' :
                            movement.transactionType === 'edit_out' ? 'primary' :
                            movement.transactionType === 'order_edit' ? 'primary' :
                            'default'
                          } 
                        />
                      </TableCell>
                      <TableCell>{movement.referenceNumber || '-'}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: movement.quantityIn > 0 ? 'bold' : 'normal' }}>
                        {movement.quantityIn > 0 ? `+${movement.quantityIn}` : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: movement.quantityOut > 0 ? 'bold' : 'normal' }}>
                        {movement.quantityOut > 0 ? `-${movement.quantityOut}` : '-'}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(movement.unitCost || movement.costPerUnit || 0)}</TableCell>
                      <TableCell align="right">{movement.balanceAfter}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          </Box>
        </DialogContent>
        <DialogActions>
          {movements.length > 0 && (
            <Button startIcon={<Print />} onClick={handlePrintMovements}>Print</Button>
          )}
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryStock;
