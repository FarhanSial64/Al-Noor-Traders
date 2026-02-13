import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, MenuItem, FormControl, InputLabel, Select, Chip,
  Paper, TablePagination, Autocomplete
} from '@mui/material';
import { Print, Refresh, TrendingDown, LocalShipping, Receipt, Store } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import dashboardService from '../../services/dashboardService';
import vendorService from '../../services/vendorService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ExportButtons from '../../components/common/ExportButtons';
import { columnDefinitions } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const PurchaseReport = () => {
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, limit: 50, total: 0 });
  
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: '',
    endDate: '',
    vendor: null,
    groupBy: 'day'
  });

  useEffect(() => {
    fetchVendors();
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await vendorService.getVendors({ limit: 500 });
      setVendors(response.data || []);
    } catch (error) {
      console.error('Failed to load vendors');
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        period: filters.period,
        groupBy: filters.groupBy,
        page: pagination.page + 1,
        limit: pagination.limit
      };
      
      if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      }
      
      if (filters.vendor) {
        params.vendor = filters.vendor._id;
      }

      const response = await dashboardService.getPurchaseReport(params);
      setReportData(response.data);
      setPagination(prev => ({ ...prev, total: response.data?.purchases?.length || 0 }));
    } catch (error) {
      toast.error('Failed to load purchase report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase-Report-${new Date().toISOString().split('T')[0]}`
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0
  }).format(amount || 0);

  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK');

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

  // Chart data
  const purchaseChartData = {
    labels: reportData?.chartData?.map(d => d._id) || [],
    datasets: [{
      label: 'Purchases',
      data: reportData?.chartData?.map(d => d.totalPurchases) || [],
      backgroundColor: 'rgba(211, 47, 47, 0.8)',
      borderRadius: 4,
    }]
  };

  const vendorChartData = {
    labels: reportData?.vendorWise?.slice(0, 5).map(v => v.vendorName || 'Unknown') || [],
    datasets: [{
      data: reportData?.vendorWise?.slice(0, 5).map(v => v.totalPurchases) || [],
      backgroundColor: ['#d32f2f', '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0'],
    }]
  };

  // Prepare data for export
  const getExportData = () => reportData?.purchases || [];

  return (
    <Box>
      <PageHeader 
        title="Purchase Report" 
        subtitle="Comprehensive purchase analysis with filters"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButtons
              title="Purchase Report"
              subtitle={getPeriodLabel()}
              columns={columnDefinitions.purchaseReport}
              data={getExportData()}
              filename={`Purchase_Report_${new Date().toISOString().split('T')[0]}`}
              summary={{
                'Total Purchases': formatCurrency(reportData?.summary?.totalPurchases),
                'Total Orders': reportData?.summary?.count || 0
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
            
            <Grid item xs={12} md={3}>
              <Autocomplete
                size="small"
                options={vendors}
                getOptionLabel={(option) => option.businessName || option.name || ''}
                value={filters.vendor}
                onChange={(e, value) => setFilters(prev => ({ ...prev, vendor: value }))}
                renderInput={(params) => (
                  <TextField {...params} label="Vendor" placeholder="All Vendors" />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Group By</InputLabel>
                <Select 
                  value={filters.groupBy} 
                  label="Group By"
                  onChange={(e) => setFilters(prev => ({ ...prev, groupBy: e.target.value }))}
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
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
        <Box ref={printRef}>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <TrendingDown sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Purchases</Typography>
                <Typography variant="h5" fontWeight={600} color="error.main">
                  {formatCurrency(reportData?.summary?.totalPurchases)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Receipt sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Bills</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reportData?.summary?.count || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <LocalShipping sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Avg Purchase Value</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {formatCurrency(reportData?.summary?.avgPurchaseValue)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Store sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Vendors</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reportData?.summary?.vendorCount || 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Purchase Trend - {getPeriodLabel()}</Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar 
                      data={purchaseChartData} 
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                      }} 
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Purchases by Vendor</Typography>
                  {reportData?.vendorWise?.length > 0 ? (
                    <Box sx={{ height: 250 }}>
                      <Doughnut 
                        data={vendorChartData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } }
                        }} 
                      />
                    </Box>
                  ) : (
                    <Typography color="text.secondary">No data available</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Vendor Wise Summary */}
          {!filters.vendor && reportData?.vendorWise?.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Vendor Wise Summary</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>Vendor</TableCell>
                        <TableCell align="right">Total Bills</TableCell>
                        <TableCell align="right">Total Purchases</TableCell>
                        <TableCell align="right">Avg Purchase Value</TableCell>
                        <TableCell align="right">Contribution %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.vendorWise.map((v, idx) => (
                        <TableRow key={v._id || idx} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Store fontSize="small" color="action" />
                              {v.vendorName || 'Unknown Vendor'}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{v.count}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(v.totalPurchases)}</TableCell>
                          <TableCell align="right">{formatCurrency(v.totalPurchases / v.count)}</TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${((v.totalPurchases / reportData.summary.totalPurchases) * 100).toFixed(1)}%`}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Purchase List */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Purchase Details</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Purchase #</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell align="right">Subtotal</TableCell>
                      <TableCell align="right">Discount</TableCell>
                      <TableCell align="right">Grand Total</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData?.purchases?.slice(
                      pagination.page * pagination.limit,
                      (pagination.page + 1) * pagination.limit
                    ).map((pur, idx) => (
                      <TableRow key={pur._id || idx} hover>
                        <TableCell>{formatDate(pur.createdAt)}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{pur.purchaseNumber}</TableCell>
                        <TableCell>{pur.vendorName}</TableCell>
                        <TableCell align="right">{formatCurrency(pur.subtotal)}</TableCell>
                        <TableCell align="right">{formatCurrency(pur.discount || 0)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(pur.grandTotal)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={pur.status || 'completed'} 
                            size="small" 
                            color={pur.status === 'completed' ? 'success' : 'warning'} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!reportData?.purchases || reportData.purchases.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">No purchases found for this period</TableCell>
                      </TableRow>
                    )}
                    {/* Totals Row */}
                    {reportData?.purchases?.length > 0 && (
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell colSpan={3}><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalSubtotal)}</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalDiscount)}</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalPurchases)}</strong></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {reportData?.purchases?.length > pagination.limit && (
                <TablePagination
                  component="div"
                  count={reportData.purchases.length}
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

export default PurchaseReport;
