import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ShoppingCart,
  Receipt,
  Payment,
  People,
  Inventory,
  TrendingUp,
  Warning,
  AccountBalanceWallet,
  Store,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  MonetizationOn,
  LocalShipping,
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import dashboardService from '../../services/dashboardService';
import Loading from '../../components/common/Loading';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Filler);

const DistributorDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState(null);
  const [salesTrend, setSalesTrend] = useState(null);
  const [customerAging, setCustomerAging] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, trendRes, agingRes, productsRes, activityRes] = await Promise.all([
        dashboardService.getDistributorStats({ period }),
        dashboardService.getSalesTrend({ days: 30 }),
        dashboardService.getCustomerAging(),
        dashboardService.getTopProducts({ period: 'month', limit: 5 }),
        dashboardService.getRecentActivity({ limit: 10 }),
      ]);

      setStats(statsRes.data);
      setSalesTrend(trendRes.data);
      setCustomerAging(agingRes.data || []);
      setTopProducts(productsRes.data?.products || []);
      setRecentActivity(activityRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <ArrowUpward fontSize="small" sx={{ color: 'success.main' }} />;
    if (growth < 0) return <ArrowDownward fontSize="small" sx={{ color: 'error.main' }} />;
    return null;
  };

  if (loading) return <Loading message="Loading distributor dashboard..." />;

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <IconButton size="small" onClick={fetchDashboardData} sx={{ ml: 2 }}>
          <Refresh />
        </IconButton>
      </Alert>
    );
  }

  // Chart data for sales trend
  const salesTrendData = {
    labels: salesTrend?.salesTrend?.map(d => new Date(d._id).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })) || [],
    datasets: [
      {
        label: 'Sales',
        data: salesTrend?.salesTrend?.map(d => d.sales) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Profit',
        data: salesTrend?.salesTrend?.map(d => d.profit) || [],
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  // Cash position doughnut chart
  const cashPositionData = {
    labels: stats?.cashPosition?.accounts?.map(a => a.accountName) || [],
    datasets: [
      {
        data: stats?.cashPosition?.accounts?.map(a => a.currentBalance) || [],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">
            Welcome, {user?.fullName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your business today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={period}
            exclusive
            onChange={(e, val) => val && setPeriod(val)}
            size="small"
          >
            <ToggleButton value="today">Today</ToggleButton>
            <ToggleButton value="week">This Week</ToggleButton>
            <ToggleButton value="month">This Month</ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDashboardData} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Metrics Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Sales</Typography>
                <Typography variant="h4" fontWeight={700}>{formatCurrency(stats?.sales?.total)}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  {getGrowthIcon(stats?.sales?.growth)}
                  <Typography variant="body2" sx={{ ml: 0.5 }}>
                    {Math.abs(stats?.sales?.growth || 0).toFixed(1)}% vs last period
                  </Typography>
                </Box>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                <MonetizationOn />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Receipts Collected</Typography>
                <Typography variant="h4" fontWeight={700}>{formatCurrency(stats?.receipts?.total)}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Typography variant="body2">
                    {stats?.receipts?.count || 0} transactions
                  </Typography>
                </Box>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                <AccountBalanceWallet />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Receivables</Typography>
                <Typography variant="h4" fontWeight={700}>{formatCurrency(stats?.receivables?.total)}</Typography>
                <Typography variant="body2">
                  {stats?.receivables?.count || 0} customers
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                <TrendingUp />
              </Avatar>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 2.5,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Cash Position</Typography>
                <Typography variant="h4" fontWeight={700}>{formatCurrency(stats?.cashPosition?.total)}</Typography>
                <Typography variant="body2">
                  Cash: {formatCurrency(stats?.cashPosition?.cashInHand)}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                <Payment />
              </Avatar>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Secondary Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <ShoppingCart color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600}>{stats?.orders?.total || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Orders</Typography>
            {stats?.orders?.pending > 0 && (
              <Chip label={`${stats.orders.pending} pending`} size="small" color="warning" sx={{ mt: 0.5 }} />
            )}
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Receipt color="success" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600}>{stats?.sales?.count || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Invoices</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Store color="info" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600}>{stats?.purchases?.count || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Purchases</Typography>
            <Typography variant="caption" color="text.secondary">{formatCurrency(stats?.purchases?.total)}</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <People color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600}>{stats?.customers?.active || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Active Customers</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <LocalShipping color="secondary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600}>{stats?.vendors || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Vendors</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', py: 2 }}>
            <Warning color="warning" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600}>{stats?.inventory?.lowStockCount || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Low Stock</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Sales Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Sales & Profit Trend (Last 30 Days)
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line data={salesTrendData} options={salesChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Cash Position */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Cash Position
              </Typography>
              <Box sx={{ height: 200, display: 'flex', justifyContent: 'center' }}>
                <Doughnut
                  data={cashPositionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Cash in Hand</Typography>
                <Typography fontWeight={600}>{formatCurrency(stats?.cashPosition?.cashInHand)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Bank Balance</Typography>
                <Typography fontWeight={600}>{formatCurrency(stats?.cashPosition?.bankBalance)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Customer Aging */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Top Receivables
                </Typography>
                <Chip
                  label={`${formatCurrency(stats?.receivables?.total)} total`}
                  color="warning"
                  size="small"
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell align="right">Last Payment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerAging.slice(0, 8).map((customer) => (
                      <TableRow
                        key={customer._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/customers/${customer._id}/ledger`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {customer.businessName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.customerCode}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} color="error.main">
                            {formatCurrency(customer.currentBalance)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {customer.lastPayment?.lastPaymentDate
                              ? new Date(customer.lastPayment.lastPaymentDate).toLocaleDateString()
                              : 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {customerAging.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No outstanding receivables
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Order Bookers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Top Order Bookers
              </Typography>
              <List disablePadding>
                {stats?.topOrderBookers?.map((ob, index) => (
                  <ListItem key={ob._id} divider={index < stats.topOrderBookers.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: index === 0 ? 'warning.main' : 'primary.main' }}>
                        {index + 1}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={ob.fullName || 'Unknown'}
                      secondary={`${ob.totalOrders} orders`}
                    />
                    <ListItemSecondaryAction>
                      <Typography fontWeight={600} color="primary.main">
                        {formatCurrency(ob.totalValue)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {(!stats?.topOrderBookers || stats.topOrderBookers.length === 0) && (
                  <ListItem>
                    <ListItemText
                      primary="No data available"
                      secondary="Orders will appear here"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Top Selling Products (This Month)
              </Typography>
              <List disablePadding>
                {topProducts.map((product, index) => (
                  <ListItem key={product._id} divider={index < topProducts.length - 1}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.light' }}>
                        <Inventory />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={product.productName}
                      secondary={`${product.totalQuantity} units sold`}
                    />
                    <ListItemSecondaryAction>
                      <Typography fontWeight={600} color="success.main">
                        {formatCurrency(product.totalSales)}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {topProducts.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No sales data available" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Recent Activity
              </Typography>
              <List disablePadding>
                {recentActivity.slice(0, 8).map((activity, index) => (
                  <ListItem key={`${activity.type}-${activity.id}`} divider={index < 7}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor:
                            activity.type === 'order'
                              ? 'primary.light'
                              : activity.type === 'invoice'
                              ? 'success.light'
                              : activity.type === 'receipt'
                              ? 'info.light'
                              : 'warning.light',
                        }}
                      >
                        {activity.type === 'order' ? (
                          <ShoppingCart />
                        ) : activity.type === 'invoice' ? (
                          <Receipt />
                        ) : (
                          <Payment />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.description}
                      secondary={new Date(activity.date).toLocaleString()}
                    />
                    <ListItemSecondaryAction>
                      <Typography fontWeight={500}>{formatCurrency(activity.amount)}</Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {recentActivity.length === 0 && (
                  <ListItem>
                    <ListItemText primary="No recent activity" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Alert */}
        {stats?.inventory?.lowStockItems?.length > 0 && (
          <Grid item xs={12}>
            <Alert
              severity="warning"
              action={
                <Chip
                  label="View All"
                  size="small"
                  onClick={() => navigate('/inventory')}
                  sx={{ cursor: 'pointer' }}
                />
              }
            >
              <Typography fontWeight={600}>Low Stock Alert!</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {stats.inventory.lowStockItems.map((item) => (
                  <Chip
                    key={item._id}
                    label={`${item.productName}: ${item.currentStock} left`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default DistributorDashboard;
