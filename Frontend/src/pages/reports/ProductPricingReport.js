import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, FormControl, InputLabel, Select, MenuItem,
  Paper, Chip, useTheme, useMediaQuery
} from '@mui/material';
import { Print, Refresh, Inventory, AttachMoney, TrendingUp } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import inventoryService from '../../services/inventoryService';
import productService from '../../services/productService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const ProductPricingReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [showCost, setShowCost] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: ''
  });

  useEffect(() => {
    fetchMasterData();
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMasterData = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        productService.getCategories(),
        productService.getBrands()
      ]);
      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
    } catch (error) {
      console.error('Failed to load master data');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.brand) params.brand = filters.brand;

      const response = await inventoryService.getPricingReport(params);
      setReportData(response.data || []);
      setShowCost(response.showCost || false);
    } catch (error) {
      toast.error('Failed to load pricing report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Product-Pricing-Report-${new Date().toISOString().split('T')[0]}`
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0
  }).format(amount || 0);

  // Calculate totals
  const totals = reportData.reduce((acc, item) => ({
    totalStock: acc.totalStock + (item.currentStock || 0),
    totalCostValue: acc.totalCostValue + ((item.avgCostPerPiece || 0) * (item.currentStock || 0)),
    totalSaleValue: acc.totalSaleValue + ((item.suggestedSalePricePerPiece || 0) * (item.currentStock || 0))
  }), { totalStock: 0, totalCostValue: 0, totalSaleValue: 0 });

  return (
    <Box>
      <PageHeader 
        title="Product Pricing Report" 
        subtitle="Average cost and suggested sale prices for all products"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<Print />} onClick={handlePrint}>Print</Button>
            <Button variant="contained" startIcon={<Refresh />} onClick={fetchReport}>Refresh</Button>
          </Box>
        }
      />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth size="small" label="Search Product"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="SKU or Name..."
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select 
                  value={filters.category} 
                  label="Category"
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat._id} value={cat._id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Brand</InputLabel>
                <Select 
                  value={filters.brand} 
                  label="Brand"
                  onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
                >
                  <MenuItem value="">All Brands</MenuItem>
                  {brands.map(brand => (
                    <MenuItem key={brand._id} value={brand._id}>{brand.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="contained" onClick={fetchReport}>Generate Report</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? <Loading /> : (
        <Box ref={printRef} sx={{ '@media print': { p: 2 } }}>
          {/* Print Header */}
          <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 3, textAlign: 'center', borderBottom: '2px solid #000', pb: 2 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>AL NOOR TRADERS</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Product Pricing Report</Typography>
            <Typography variant="body2">Generated: {new Date().toLocaleDateString()} | Total Products: {reportData.length}</Typography>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Inventory sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Products</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reportData.length}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Inventory sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Stock (pcs)</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {totals.totalStock.toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            {showCost && (
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <AttachMoney sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">Total Cost Value</Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {formatCurrency(totals.totalCostValue)}
                  </Typography>
                </Paper>
              </Grid>
            )}
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Sale Value</Typography>
                <Typography variant="h5" fontWeight={600} color="success.main">
                  {formatCurrency(totals.totalSaleValue)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Info Chip */}
          <Box sx={{ mb: 2 }}>
            <Chip 
              label="Suggested Sale Price = Avg Cost + 5% Margin" 
              color="info" 
              variant="outlined" 
              size="small"
            />
          </Box>

          {/* Product List */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Product Pricing Details</Typography>
              
              {/* Mobile Card View */}
              {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {reportData.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No products found</Typography>
                  ) : (
                    reportData.map((item, index) => (
                      <Card key={item._id} variant="outlined">
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>{item.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.sku} | {item.category}</Typography>
                            </Box>
                            <Chip label={item.currentStock} size="small" color={item.currentStock > 0 ? 'success' : 'error'} variant="outlined" />
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Per Piece</Typography>
                              <Typography variant="body2" fontWeight={500} color="primary.main">
                                {item.suggestedSalePricePerPiece > 0 ? formatCurrency(item.suggestedSalePricePerPiece) : '-'}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" color="text.secondary">Per Carton ({item.piecesPerCarton} pcs)</Typography>
                              <Typography variant="body2" fontWeight={600} color="success.main">
                                {item.suggestedSalePricePerCarton > 0 ? formatCurrency(item.suggestedSalePricePerCarton) : '-'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
              ) : (
                /* Desktop Table View */
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>#</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Product Name</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell align="center">Pcs/Ctn</TableCell>
                        <TableCell align="right">Stock</TableCell>
                        {showCost && (
                          <>
                            <TableCell align="right">Avg Cost/Pc</TableCell>
                            <TableCell align="right">Avg Cost/Ctn</TableCell>
                          </>
                        )}
                        <TableCell align="right">Sale Price/Pc</TableCell>
                        <TableCell align="right">Sale Price/Ctn</TableCell>
                        {showCost && (
                          <>
                            <TableCell align="right">Profit/Ctn</TableCell>
                            <TableCell align="right">Margin %</TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={showCost ? 12 : 8} align="center">
                            No products found
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportData.map((item, index) => (
                          <TableRow key={item._id} hover>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>{item.sku}</Typography>
                            </TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell align="center">{item.piecesPerCarton}</TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={item.currentStock} 
                                size="small" 
                                color={item.currentStock > 0 ? 'success' : 'error'}
                                variant="outlined"
                              />
                            </TableCell>
                            {showCost && (
                              <>
                                <TableCell align="right">
                                  {item.avgCostPerPiece > 0 ? formatCurrency(item.avgCostPerPiece) : '-'}
                                </TableCell>
                                <TableCell align="right">
                                  {item.avgCostPerCarton > 0 ? formatCurrency(item.avgCostPerCarton) : '-'}
                                </TableCell>
                              </>
                            )}
                            <TableCell align="right">
                              <Typography fontWeight={500} color="primary.main">
                                {item.suggestedSalePricePerPiece > 0 ? formatCurrency(item.suggestedSalePricePerPiece) : '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={600} color="success.main">
                                {item.suggestedSalePricePerCarton > 0 ? formatCurrency(item.suggestedSalePricePerCarton) : '-'}
                              </Typography>
                            </TableCell>
                            {showCost && (
                              <>
                                <TableCell align="right">
                                  <Typography color={item.profitPerCarton > 0 ? 'success.main' : 'error.main'}>
                                    {item.profitPerCarton > 0 ? formatCurrency(item.profitPerCarton) : '-'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  {item.profitMargin > 0 ? (
                                    <Chip label={`${item.profitMargin}%`} size="small" color="info" />
                                  ) : '-'}
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default ProductPricingReport;
