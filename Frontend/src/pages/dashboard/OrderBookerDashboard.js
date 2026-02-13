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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  CalendarToday,
  DateRange,
  EventNote,
  LocalAtm,
  CheckCircle,
  HourglassEmpty,
  LocalShipping,
  Cancel,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import dashboardService from '../../services/dashboardService';
import Loading from '../../components/common/Loading';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const OrderBookerDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getOrderBookerDashboard();
      setDashboardData(response.data);
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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      dispatched: 'primary',
      delivered: 'success',
      cancelled: 'error',
      returned: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <HourglassEmpty fontSize="small" />,
      confirmed: <CheckCircle fontSize="small" />,
      dispatched: <LocalShipping fontSize="small" />,
      delivered: <CheckCircle fontSize="small" />,
      cancelled: <Cancel fontSize="small" />,
    };
    return icons[status] || null;
  };

  if (loading) return <Loading message="Loading dashboard..." />;

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const { summary, orderStatus, recentOrders, topCustomers, topProducts, dailyTrend } = dashboardData || {};

  // Chart data for daily trend
  const trendChartData = {
    labels: dailyTrend?.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric' });
    }) || [],
    datasets: [
      {
        label: 'Orders Value',
        data: dailyTrend?.map((d) => d.value) || [],
        backgroundColor: 'rgba(25, 118, 210, 0.8)',
        borderRadius: 6,
      },
    ],
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value).replace('PKR', ''),
        },
      },
    },
  };

  // Doughnut chart for order status
  const statusData = {
    labels: ['Pending', 'Confirmed', 'Dispatched', 'Delivered', 'Cancelled'],
    datasets: [
      {
        data: [
          orderStatus?.pending?.count || 0,
          orderStatus?.confirmed?.count || 0,
          orderStatus?.dispatched?.count || 0,
          orderStatus?.delivered?.count || 0,
          orderStatus?.cancelled?.count || 0,
        ],
        backgroundColor: [
          '#ff9800',
          '#2196f3',
          '#9c27b0',
          '#4caf50',
          '#f44336',
        ],
        borderWidth: 0,
      },
    ],
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 },
        },
      },
    },
    cutout: '65%',
  };

  // Summary Card Component
  const SummaryCard = ({ title, icon, bgColor, stats }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: bgColor, mr: 2 }}>{icon}</Avatar>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Orders
            </Typography>
            <Typography variant="h5" fontWeight={600}>
              {stats.orders}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Value
            </Typography>
            <Typography variant="h6" fontWeight={600} color="primary.main">
              {formatCurrency(stats.ordersValue)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Collections
            </Typography>
            <Typography variant="h6" fontWeight={500} color="success.main">
              {formatCurrency(stats.receipts)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Receipt Count
            </Typography>
            <Typography variant="h6" fontWeight={500}>
              {stats.receiptsCount}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, md: 4 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
          Welcome back, {user?.fullName}!
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Typography>
          {dashboardData?.user?.area && (
            <Chip
              label={dashboardData.user.area}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Period Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="Today"
            icon={<CalendarToday />}
            bgColor="#1976d2"
            stats={summary?.today || {}}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="This Week"
            icon={<DateRange />}
            bgColor="#2e7d32"
            stats={summary?.thisWeek || {}}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <SummaryCard
            title="This Month"
            icon={<EventNote />}
            bgColor="#9c27b0"
            stats={summary?.thisMonth || {}}
          />
        </Grid>
      </Grid>

      {/* Performance & Growth */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Weekly Growth
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {summary?.thisWeek?.growthPercent > 0 ? '+' : ''}
                    {summary?.thisWeek?.growthPercent || 0}%
                  </Typography>
                </Box>
                {summary?.thisWeek?.growthPercent >= 0 ? (
                  <TrendingUp sx={{ fontSize: 48, opacity: 0.8 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 48, opacity: 0.8 }} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Customers Served
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {summary?.thisMonth?.customersServed || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    This Month
                  </Typography>
                </Box>
                <People sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Pending Orders
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {(orderStatus?.pending?.count || 0) + (orderStatus?.confirmed?.count || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Awaiting Delivery
                  </Typography>
                </Box>
                <HourglassEmpty sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%', bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Collections
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(summary?.thisMonth?.receipts)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    This Month
                  </Typography>
                </Box>
                <LocalAtm sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Daily Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Last 7 Days Performance
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar data={trendChartData} options={trendChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Order Status Doughnut */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Order Status Overview
              </Typography>
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Doughnut data={statusData} options={statusChartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tables Row */}
      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                  Recent Orders
                </Typography>
                <Chip
                  label="View All"
                  size="small"
                  clickable
                  onClick={() => navigate('/orders')}
                  color="primary"
                  variant="outlined"
                />
              </Box>

              {/* Mobile Card View */}
              {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {recentOrders?.slice(0, 6).map((order) => (
                    <Card
                      key={order.id}
                      variant="outlined"
                      sx={{ cursor: 'pointer', '&:active': { bgcolor: 'action.selected' } }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{order.orderNumber}</Typography>
                            <Typography variant="caption" color="text.secondary">{order.customerName}</Typography>
                          </Box>
                          <Chip label={order.status} size="small" color={getStatusColor(order.status)} />
                        </Box>
                        <Typography variant="body1" fontWeight={600} color="primary.main">
                          {formatCurrency(order.amount)}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                  {(!recentOrders || recentOrders.length === 0) && (
                    <Typography color="text.secondary" align="center" sx={{ py: 2 }}>No recent orders</Typography>
                  )}
                </Box>
              ) : (
                /* Desktop Table View */
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order #</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders?.slice(0, 6).map((order) => (
                        <TableRow
                          key={order.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {order.orderNumber}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                              {order.customerName}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={500}>
                              {formatCurrency(order.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              size="small"
                              color={getStatusColor(order.status)}
                              icon={getStatusIcon(order.status)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!recentOrders || recentOrders.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography color="text.secondary">No recent orders</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Customers & Products */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={3}>
            {/* Top Customers */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Top Customers (This Month)
                  </Typography>
                  {topCustomers?.length > 0 ? (
                    topCustomers.map((customer, index) => (
                      <Box
                        key={customer.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: index < topCustomers.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              mr: 1.5,
                              bgcolor: index === 0 ? 'warning.main' : index === 1 ? 'grey.400' : index === 2 ? '#cd7f32' : 'primary.light',
                              fontSize: '0.875rem',
                            }}
                          >
                            {index + 1}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 150 }}>
                              {customer.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {customer.orders} orders
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {formatCurrency(customer.value)}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography color="text.secondary">No customer data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Top Products */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Top Products Sold (This Month)
                  </Typography>
                  {topProducts?.length > 0 ? (
                    topProducts.map((product, index) => (
                      <Box
                        key={product.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 1.5,
                          borderBottom: index < topProducts.length - 1 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Qty: {product.quantity}
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="success.main">
                          {formatCurrency(product.value)}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography color="text.secondary">No product data</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OrderBookerDashboard;
