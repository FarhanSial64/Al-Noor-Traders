import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Chip,
  Paper, TablePagination, useTheme, useMediaQuery
} from '@mui/material';
import { Print, Refresh, TrendingUp, ShoppingCart, Receipt, CheckCircle } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import dashboardService from '../../services/dashboardService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const MySalesReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, limit: 50, total: 0 });
  
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: ''
  });

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit
      };
      
      if (filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      }
      
      if (filters.status) {
        params.status = filters.status;
      }

      const response = await dashboardService.getMySalesReport(params);
      setReportData(response.data);
      setPagination(prev => ({ ...prev, total: response.data?.pagination?.total || 0 }));
    } catch (error) {
      toast.error('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `My-Sales-Report-${new Date().toISOString().split('T')[0]}`
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0
  }).format(amount || 0);

  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK');

  const handlePeriodChange = (period) => {
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'today':
        startDate = endDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
        break;
      default:
        startDate = filters.startDate;
        endDate = filters.endDate;
    }
    
    setFilters(prev => ({ ...prev, period, startDate, endDate }));
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      dispatched: 'primary',
      delivered: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  // Chart data
  const statusChartData = {
    labels: Object.keys(reportData?.statusBreakdown || {}),
    datasets: [{
      data: Object.values(reportData?.statusBreakdown || {}).map(s => s.count),
      backgroundColor: ['#ff9800', '#2196f3', '#1976d2', '#4caf50', '#f44336'],
    }]
  };

  if (loading && !reportData) return <Loading />;

  return (
    <Box>
      <PageHeader 
        title="My Sales Report" 
        subtitle="Track your orders and sales performance"
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
                  onChange={(e) => handlePeriodChange(e.target.value)}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
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
                <InputLabel>Status</InputLabel>
                <Select 
                  value={filters.status} 
                  label="Status"
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="dispatched">Dispatched</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button variant="contained" fullWidth onClick={fetchReport}>Apply Filters</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Total Orders</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {reportData?.summary?.totalOrders || 0}
                  </Typography>
                </Box>
                <ShoppingCart sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.success.main, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Total Value</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(reportData?.summary?.totalValue)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.info.main, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Total Items</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {reportData?.summary?.totalItems || 0}
                  </Typography>
                </Box>
                <Receipt sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.success.dark, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Delivered</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {reportData?.statusBreakdown?.delivered?.count || 0}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Order Status Breakdown</Typography>
              <Grid container spacing={2}>
                {Object.entries(reportData?.statusBreakdown || {}).map(([status, data]) => (
                  <Grid item xs={6} sm={4} md={2} key={status}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {status}
                      </Typography>
                      <Typography variant="h5" color={`${getStatusColor(status)}.main`}>
                        {data.count}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(data.value)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>By Status</Typography>
              {Object.keys(reportData?.statusBreakdown || {}).length > 0 && (
                <Box sx={{ height: 200 }}>
                  <Doughnut 
                    data={statusChartData} 
                    options={{ 
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } }
                    }} 
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Orders Table */}
      <Card ref={printRef}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Order Details</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Period: {filters.startDate} to {filters.endDate}
          </Typography>
          
          {/* Mobile Card View */}
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {(reportData?.orders || []).map((order) => (
                <Card key={order.id} variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{order.orderNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(order.createdAt)}</Typography>
                      </Box>
                      <Chip label={order.status} size="small" color={getStatusColor(order.status)} sx={{ textTransform: 'capitalize' }} />
                    </Box>
                    <Typography variant="body2" noWrap sx={{ mb: 0.5 }}>{order.customerBusiness || order.customerName}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{order.itemCount} items</Typography>
                      <Typography variant="body1" fontWeight={600} color="primary.main">{formatCurrency(order.grandTotal)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {(!reportData?.orders || reportData.orders.length === 0) && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No orders found for selected period</Typography>
              )}
            </Box>
          ) : (
            /* Desktop Table View */
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Order #</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Items</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reportData?.orders || []).map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        {order.customerBusiness || order.customerName}
                      </TableCell>
                      <TableCell align="center">{order.itemCount}</TableCell>
                      <TableCell align="right">{formatCurrency(order.grandTotal)}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={order.status} 
                          size="small" 
                          color={getStatusColor(order.status)}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!reportData?.orders || reportData.orders.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No orders found for selected period</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page}
            onPageChange={(e, page) => {
              setPagination(prev => ({ ...prev, page }));
              setTimeout(fetchReport, 0);
            }}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={(e) => {
              setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 0 }));
              setTimeout(fetchReport, 0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            sx={{ '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: { xs: '0.75rem', sm: '0.875rem' } } }}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default MySalesReport;
