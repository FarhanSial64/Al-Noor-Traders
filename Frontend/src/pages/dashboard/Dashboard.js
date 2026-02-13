import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  ShoppingCart,
  Receipt,
  Payment,
  People,
  Inventory,
  TrendingUp,
  TrendingDown,
  Warning,
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import dashboardService from '../../services/dashboardService';
import StatCard from '../../components/common/StatCard';
import Loading from '../../components/common/Loading';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, salesRes, productsRes, activityRes] = await Promise.all([
        dashboardService.getStats({ period: 'today' }),
        dashboardService.getSalesSummary({ period: 'week' }),
        dashboardService.getTopProducts({ period: 'month', limit: 5 }),
        dashboardService.getRecentActivity({ limit: 10 }),
      ]);

      setStats(statsRes.data);
      setSalesData(salesRes.data);
      setTopProducts(productsRes.data.products || []);
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

  if (loading) return <Loading message="Loading dashboard..." />;

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  // Chart data for sales
  const salesChartData = {
    labels: salesData?.chartData?.map(d => d._id) || [],
    datasets: [
      {
        label: 'Sales',
        data: salesData?.chartData?.map(d => d.totalSales) || [],
        backgroundColor: 'rgba(25, 118, 210, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  const salesChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Weekly Sales' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  // Render based on role
  const renderDistributorDashboard = () => (
    <>
      {/* Stats Cards - First Row */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Today's Orders"
            value={stats?.orders?.count || 0}
            icon={<ShoppingCart />}
            color="primary"
            subtitle={`${stats?.orders?.pending || 0} pending`}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Today's Sales"
            value={formatCurrency(stats?.sales?.total)}
            icon={<Receipt />}
            color="success"
            subtitle={`${stats?.sales?.count || 0} invoices`}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Receivables"
            value={formatCurrency(stats?.receivables)}
            icon={<TrendingUp />}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Payables"
            value={formatCurrency(stats?.payables)}
            icon={<TrendingDown />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Stats Cards - Second Row */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Today's Purchases"
            value={formatCurrency(stats?.purchases?.total)}
            icon={<Payment />}
            color="info"
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Receipts Collected"
            value={formatCurrency(stats?.receipts?.total)}
            icon={<Payment />}
            color="success"
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Low Stock Items"
            value={stats?.inventory?.lowStockCount || 0}
            icon={<Warning />}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={stats?.customers || 0}
            icon={<People />}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
              <Bar data={salesChartData} options={salesChartOptions} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Top Products
              </Typography>
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <Box
                    key={product._id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      borderBottom: index < topProducts.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      noWrap 
                      sx={{ 
                        maxWidth: '60%',
                        fontSize: { xs: '0.85rem', sm: '0.875rem' },
                      }}
                    >
                      {index + 1}. {product.productName}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="primary.main">
                      {formatCurrency(product.totalSales)}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No sales data
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Card sx={{ mt: { xs: 2, md: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Recent Activity
          </Typography>
          {recentActivity.length > 0 ? (
            recentActivity.slice(0, 5).map((activity, index) => (
              <Box
                key={`${activity.type}-${activity.id}`}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: index < 4 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  gap: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {activity.reference}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {activity.description}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(activity.amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(activity.date).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">No recent activity</Typography>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderOrderBookerDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="My Orders Today"
          value={stats?.myOrders?.today || 0}
          icon={<ShoppingCart />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Total Orders"
          value={stats?.myOrders?.total || 0}
          icon={<Receipt />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Pending Orders"
          value={stats?.myOrders?.pending || 0}
          icon={<Warning />}
          color="warning"
        />
      </Grid>
      <Grid item xs={12}>
        <StatCard
          title="My Sales This Period"
          value={formatCurrency(stats?.mySales?.total)}
          icon={<TrendingUp />}
          color="success"
        />
      </Grid>
    </Grid>
  );

  const renderCustomerDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="My Orders"
          value={stats?.myOrders || 0}
          icon={<ShoppingCart />}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Total Purchases"
          value={formatCurrency(stats?.totalPurchases)}
          icon={<Receipt />}
          color="success"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StatCard
          title="Current Balance"
          value={formatCurrency(stats?.currentBalance)}
          icon={<Payment />}
          color={stats?.currentBalance > 0 ? 'error' : 'success'}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <StatCard
          title="Credit Limit"
          value={formatCurrency(stats?.creditLimit)}
          icon={<Inventory />}
          color="info"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <StatCard
          title="Available Credit"
          value={formatCurrency(stats?.availableCredit)}
          icon={<TrendingUp />}
          color="success"
        />
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Welcome, {user?.fullName}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Typography>

      {user?.role === 'distributor' || user?.role === 'computer_operator'
        ? renderDistributorDashboard()
        : user?.role === 'order_booker'
        ? renderOrderBookerDashboard()
        : renderCustomerDashboard()}
    </Box>
  );
};

export default Dashboard;
