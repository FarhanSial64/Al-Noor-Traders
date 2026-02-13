import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Chip,
  Paper, TablePagination, useTheme, useMediaQuery
} from '@mui/material';
import { Print, Refresh, AccountBalanceWallet, Receipt, MoneyOff, TrendingUp } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import dashboardService from '../../services/dashboardService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const MyCollectionsReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [pagination, setPagination] = useState({ page: 0, limit: 50, total: 0 });
  
  const [filters, setFilters] = useState({
    period: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
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

      const response = await dashboardService.getMyCollectionsReport(params);
      setReportData(response.data);
      setPagination(prev => ({ ...prev, total: response.data?.pagination?.total || 0 }));
    } catch (error) {
      toast.error('Failed to load collections report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `My-Collections-Report-${new Date().toISOString().split('T')[0]}`
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

  const getPaymentMethodColor = (method) => {
    const colors = {
      cash: 'success',
      bank_transfer: 'info',
      cheque: 'warning',
      online: 'primary'
    };
    return colors[method] || 'default';
  };

  // Chart data for daily trend
  const dailyChartData = {
    labels: (reportData?.dailyBreakdown || []).map(d => d.date),
    datasets: [{
      label: 'Collection Amount',
      data: (reportData?.dailyBreakdown || []).map(d => d.amount),
      backgroundColor: theme.palette.success.main,
      borderRadius: 4,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };

  if (loading && !reportData) return <Loading />;

  return (
    <Box>
      <PageHeader 
        title="My Collections Report" 
        subtitle="Track your payment receipts and collections"
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
              <Button variant="contained" fullWidth onClick={fetchReport}>Apply Filters</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.success.main, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Total Collected</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(reportData?.summary?.totalAmount)}
                  </Typography>
                </Box>
                <AccountBalanceWallet sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Total Receipts</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {reportData?.summary?.totalReceipts || 0}
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
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Cash Collection</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(reportData?.summary?.cashAmount)}
                  </Typography>
                </Box>
                <MoneyOff sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: theme.palette.info.main, color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Bank Collection</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(reportData?.summary?.bankAmount)}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Daily Collection Chart */}
      {(reportData?.dailyBreakdown || []).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Daily Collection Trend</Typography>
            <Box sx={{ height: 250 }}>
              <Bar data={dailyChartData} options={chartOptions} />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Receipts Table */}
      <Card ref={printRef}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Receipt Details</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Period: {filters.startDate} to {filters.endDate}
          </Typography>
          
          {/* Mobile Card View */}
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {(reportData?.receipts || []).map((receipt) => (
                <Card key={receipt.id} variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{receipt.receiptNumber}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatDate(receipt.paymentDate)}</Typography>
                      </Box>
                      <Chip label={receipt.paymentMethod?.replace('_', ' ')} size="small" color={getPaymentMethodColor(receipt.paymentMethod)} sx={{ textTransform: 'capitalize' }} />
                    </Box>
                    <Typography variant="body2" noWrap sx={{ mb: 0.5 }}>{receipt.customerBusiness || receipt.customerName}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">{receipt.reference || '-'}</Typography>
                      <Typography variant="body1" fontWeight={600} color="success.main">{formatCurrency(receipt.amount)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {(!reportData?.receipts || reportData.receipts.length === 0) && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No receipts found for selected period</Typography>
              )}
            </Box>
          ) : (
            /* Desktop Table View */
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(reportData?.receipts || []).map((receipt) => (
                    <TableRow key={receipt.id} hover>
                      <TableCell>{receipt.receiptNumber}</TableCell>
                      <TableCell>{formatDate(receipt.paymentDate)}</TableCell>
                      <TableCell>
                        {receipt.customerBusiness || receipt.customerName}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                        {formatCurrency(receipt.amount)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={receipt.paymentMethod?.replace('_', ' ')} 
                          size="small" 
                          color={getPaymentMethodColor(receipt.paymentMethod)}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>{receipt.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {(!reportData?.receipts || reportData.receipts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No receipts found for selected period</Typography>
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

export default MyCollectionsReport;
