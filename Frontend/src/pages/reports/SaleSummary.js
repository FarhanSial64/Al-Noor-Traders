import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, MenuItem, FormControl, InputLabel, Select,
  Paper, TablePagination
} from '@mui/material';
import { Print, Refresh, TrendingUp, Inventory, Receipt, AttachMoney } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import dashboardService from '../../services/dashboardService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const SaleSummary = () => {
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, limit: 50, total: 0 });
  
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = { period: filters.period };
      
      if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      }

      const response = await dashboardService.getSaleSummary(params);
      setReportData(response.data);
      setPagination(prev => ({ ...prev, total: response.data?.products?.length || 0 }));
    } catch (error) {
      toast.error('Failed to load sale summary');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Sale-Summary-${new Date().toISOString().split('T')[0]}`
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0
  }).format(amount || 0);

  const getPeriodLabel = () => {
    switch (filters.period) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      case 'all': return 'All Time';
      case 'custom': return `${filters.startDate} to ${filters.endDate}`;
      default: return 'This Month';
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Sale Summary" 
        subtitle="Product-wise sales summary"
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select 
                  value={filters.period} 
                  label="Period"
                  onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="yesterday">Yesterday</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {filters.period === 'custom' && (
              <>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth size="small" type="date" label="From Date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth size="small" type="date" label="To Date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="contained" onClick={fetchReport}>Generate Report</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading ? <Loading /> : (
        <Box ref={printRef} sx={{ '@media print': { p: 2 } }}>
          {/* Print Header */}
          <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2, textAlign: 'center', borderBottom: '2px solid #000', pb: 1 } }}>
            <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>AL NOOR TRADERS</Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, mt: 0.5 }}>SALE SUMMARY REPORT</Typography>
            <Typography sx={{ fontSize: '10px', mt: 0.5 }}>Period: {getPeriodLabel()} | Generated: {new Date().toLocaleDateString()}</Typography>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Inventory sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Products Sold</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reportData?.summary?.productCount || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Receipt sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Quantity</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {(reportData?.summary?.totalQuantity || 0).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Sales</Typography>
                <Typography variant="h5" fontWeight={600} color="success.main">
                  {formatCurrency(reportData?.summary?.totalSales)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <AttachMoney sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Profit</Typography>
                <Typography variant="h5" fontWeight={600} color="warning.main">
                  {formatCurrency(reportData?.summary?.totalProfit)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Product List */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Product-wise Sales - {getPeriodLabel()}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>#</TableCell>
                      <TableCell>Product Name</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Qty Sold</TableCell>
                      <TableCell align="right">Avg Sale Price</TableCell>
                      <TableCell align="right">Avg Cost Price</TableCell>
                      <TableCell align="right">Total Sales</TableCell>
                      <TableCell align="right">Total Profit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData?.products?.slice(
                      pagination.page * pagination.limit,
                      (pagination.page + 1) * pagination.limit
                    ).map((product, idx) => (
                      <TableRow key={product._id || idx} hover>
                        <TableCell>{pagination.page * pagination.limit + idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{product.productName}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell align="right">{product.totalQuantity?.toLocaleString()}</TableCell>
                        <TableCell align="right">{formatCurrency(product.avgSalePrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(product.avgCostPrice)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(product.totalSales)}</TableCell>
                        <TableCell align="right" sx={{ color: product.totalProfit >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}>
                          {formatCurrency(product.totalProfit)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!reportData?.products || reportData.products.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">No products sold in this period</TableCell>
                      </TableRow>
                    )}
                    {/* Totals Row */}
                    {reportData?.products?.length > 0 && (
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell colSpan={3}><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>{(reportData.summary.totalQuantity || 0).toLocaleString()}</strong></TableCell>
                        <TableCell align="right">-</TableCell>
                        <TableCell align="right">-</TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalSales)}</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalProfit)}</strong></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {reportData?.products?.length > pagination.limit && (
                <TablePagination
                  component="div"
                  count={reportData.products.length}
                  page={pagination.page}
                  onPageChange={(e, p) => setPagination(prev => ({ ...prev, page: p }))}
                  rowsPerPage={pagination.limit}
                  onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 0 }))}
                  rowsPerPageOptions={[25, 50, 100]}
                />
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default SaleSummary;
