import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, MenuItem, FormControl, InputLabel, Select,
  Paper, TablePagination
} from '@mui/material';
import { Print, Refresh, TrendingDown, Inventory, LocalShipping } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import dashboardService from '../../services/dashboardService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ExportButtons from '../../components/common/ExportButtons';
import { columnDefinitions } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const PurchaseSummary = () => {
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

      const response = await dashboardService.getPurchaseSummaryProducts(params);
      setReportData(response.data);
      setPagination(prev => ({ ...prev, total: response.data?.products?.length || 0 }));
    } catch (error) {
      toast.error('Failed to load purchase summary');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase-Summary-${new Date().toISOString().split('T')[0]}`
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

  // Prepare data for export
  const getExportData = () => reportData?.products || [];

  return (
    <Box>
      <PageHeader 
        title="Purchase Summary" 
        subtitle="Product-wise purchase summary"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButtons
              title="Purchase Summary"
              subtitle={getPeriodLabel()}
              columns={columnDefinitions.purchaseSummary}
              data={getExportData()}
              filename={`Purchase_Summary_${new Date().toISOString().split('T')[0]}`}
              summary={{
                'Total Products': reportData?.products?.length || 0,
                'Total Quantity': reportData?.summary?.totalQuantity || 0,
                'Total Purchases': formatCurrency(reportData?.summary?.totalPurchases)
              }}
              orientation="landscape"
            />
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
          <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 3, textAlign: 'center', borderBottom: '2px solid #000', pb: 2 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>AL NOOR TRADERS</Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>Purchase Summary Report</Typography>
            <Typography variant="body2">Period: {getPeriodLabel()} | Generated: {new Date().toLocaleDateString()}</Typography>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Inventory sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Products Purchased</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reportData?.summary?.productCount || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <LocalShipping sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Quantity</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {(reportData?.summary?.totalQuantity || 0).toLocaleString()}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <TrendingDown sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Purchases</Typography>
                <Typography variant="h5" fontWeight={600} color="error.main">
                  {formatCurrency(reportData?.summary?.totalPurchases)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Product List */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Product-wise Purchases - {getPeriodLabel()}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>#</TableCell>
                      <TableCell>Product Name</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Qty Purchased</TableCell>
                      <TableCell align="right">Avg Purchase Price</TableCell>
                      <TableCell align="right">Total Purchases</TableCell>
                      <TableCell align="right">Bills Count</TableCell>
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
                        <TableCell align="right">{formatCurrency(product.avgPurchasePrice)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(product.totalPurchases)}</TableCell>
                        <TableCell align="right">{product.purchaseCount}</TableCell>
                      </TableRow>
                    ))}
                    {(!reportData?.products || reportData.products.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">No products purchased in this period</TableCell>
                      </TableRow>
                    )}
                    {/* Totals Row */}
                    {reportData?.products?.length > 0 && (
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell colSpan={3}><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>{(reportData.summary.totalQuantity || 0).toLocaleString()}</strong></TableCell>
                        <TableCell align="right">-</TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalPurchases)}</strong></TableCell>
                        <TableCell align="right">-</TableCell>
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

export default PurchaseSummary;
