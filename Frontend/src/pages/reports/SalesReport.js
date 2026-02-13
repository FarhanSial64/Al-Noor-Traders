import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, MenuItem, FormControl, InputLabel, Select, Chip,
  Paper, TablePagination
} from '@mui/material';
import { Print, Refresh, TrendingUp, ShoppingCart, Receipt, Person } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import dashboardService from '../../services/dashboardService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ExportButtons from '../../components/common/ExportButtons';
import { columnDefinitions } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const SalesReport = () => {
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [orderBookers, setOrderBookers] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, limit: 50, total: 0 });
  
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: '',
    endDate: '',
    orderBooker: '',
    groupBy: 'day'
  });

  useEffect(() => {
    fetchOrderBookers();
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrderBookers = async () => {
    try {
      const response = await dashboardService.getInvoiceOrderBookers();
      setOrderBookers(response.data || []);
    } catch (error) {
      console.error('Failed to load order bookers');
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
      
      if (filters.orderBooker) {
        params.orderBooker = filters.orderBooker;
      }

      const response = await dashboardService.getSalesReport(params);
      setReportData(response.data);
      setPagination(prev => ({ ...prev, total: response.data?.invoices?.length || 0 }));
    } catch (error) {
      toast.error('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Sales-Report-${new Date().toISOString().split('T')[0]}`
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
  const salesChartData = {
    labels: reportData?.chartData?.map(d => d._id) || [],
    datasets: [{
      label: 'Sales',
      data: reportData?.chartData?.map(d => d.totalSales) || [],
      backgroundColor: 'rgba(25, 118, 210, 0.8)',
      borderRadius: 4,
    }]
  };

  const orderBookerChartData = {
    labels: reportData?.orderBookerWise?.slice(0, 5).map(ob => ob.orderBookerName || 'Direct') || [],
    datasets: [{
      data: reportData?.orderBookerWise?.slice(0, 5).map(ob => ob.totalSales) || [],
      backgroundColor: ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f'],
    }]
  };

  // Prepare data for export
  const getExportData = () => reportData?.invoices || [];

  return (
    <Box>
      <PageHeader 
        title="Sales Report" 
        subtitle="Comprehensive sales analysis with filters"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButtons
              title="Sales Report"
              subtitle={getPeriodLabel()}
              columns={columnDefinitions.salesReport}
              data={getExportData()}
              filename={`Sales_Report_${new Date().toISOString().split('T')[0]}`}
              summary={{
                'Total Sales': formatCurrency(reportData?.summary?.totalSales),
                'Total Invoices': reportData?.summary?.count || 0,
                'Avg Order Value': formatCurrency(reportData?.summary?.avgOrderValue)
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
              <FormControl fullWidth size="small">
                <InputLabel>Order Booker</InputLabel>
                <Select 
                  value={filters.orderBooker} 
                  label="Order Booker"
                  onChange={(e) => setFilters(prev => ({ ...prev, orderBooker: e.target.value }))}
                >
                  <MenuItem value="">All Order Bookers</MenuItem>
                  {orderBookers.map(ob => (
                    <MenuItem key={ob._id} value={ob._id}>{ob.fullName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Sales</Typography>
                <Typography variant="h5" fontWeight={600} color="success.main">
                  {formatCurrency(reportData?.summary?.totalSales)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Receipt sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {reportData?.summary?.count || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <ShoppingCart sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Avg Order Value</Typography>
                <Typography variant="h5" fontWeight={600}>
                  {formatCurrency(reportData?.summary?.avgOrderValue)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">Total Profit</Typography>
                <Typography variant="h5" fontWeight={600} color="warning.main">
                  {formatCurrency(reportData?.summary?.totalProfit)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Sales Trend - {getPeriodLabel()}</Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar 
                      data={salesChartData} 
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
                  <Typography variant="h6" gutterBottom>Sales by Order Booker</Typography>
                  {reportData?.orderBookerWise?.length > 0 ? (
                    <Box sx={{ height: 250 }}>
                      <Doughnut 
                        data={orderBookerChartData} 
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

          {/* Order Booker Wise Summary */}
          {!filters.orderBooker && reportData?.orderBookerWise?.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Order Booker Performance</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell>Order Booker</TableCell>
                        <TableCell align="right">Total Orders</TableCell>
                        <TableCell align="right">Total Sales</TableCell>
                        <TableCell align="right">Avg Order Value</TableCell>
                        <TableCell align="right">Contribution %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reportData.orderBookerWise.map((ob, idx) => (
                        <TableRow key={ob._id || idx} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Person fontSize="small" color="action" />
                              {ob.orderBookerName || 'Direct Sales'}
                            </Box>
                          </TableCell>
                          <TableCell align="right">{ob.count}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(ob.totalSales)}</TableCell>
                          <TableCell align="right">{formatCurrency(ob.totalSales / ob.count)}</TableCell>
                          <TableCell align="right">
                            <Chip 
                              label={`${((ob.totalSales / reportData.summary.totalSales) * 100).toFixed(1)}%`}
                              size="small"
                              color="primary"
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

          {/* Detailed Invoice List */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Invoice Details</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Order Booker</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Profit</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData?.invoices?.slice(
                      pagination.page * pagination.limit,
                      (pagination.page + 1) * pagination.limit
                    ).map((inv, idx) => (
                      <TableRow key={inv._id || idx} hover>
                        <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customerName}</TableCell>
                        <TableCell>{inv.orderBookerName || 'Direct'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(inv.grandTotal)}</TableCell>
                        <TableCell align="right">{formatCurrency(inv.totalCost)}</TableCell>
                        <TableCell align="right" sx={{ color: inv.totalProfit > 0 ? 'success.main' : 'error.main' }}>
                          {formatCurrency(inv.totalProfit)}
                        </TableCell>
                        <TableCell>
                          <Chip label={inv.status || 'completed'} size="small" color="success" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!reportData?.invoices || reportData.invoices.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">No invoices found for this period</TableCell>
                      </TableRow>
                    )}
                    {/* Totals Row */}
                    {reportData?.invoices?.length > 0 && (
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell colSpan={4}><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalSales)}</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalCost)}</strong></TableCell>
                        <TableCell align="right"><strong>{formatCurrency(reportData.summary.totalProfit)}</strong></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {reportData?.invoices?.length > pagination.limit && (
                <TablePagination
                  component="div"
                  count={reportData.invoices.length}
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

export default SalesReport;
