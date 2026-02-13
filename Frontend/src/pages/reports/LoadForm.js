import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, Grid, TextField, MenuItem, FormControl, InputLabel, Select,
  Paper, Checkbox, Alert
} from '@mui/material';
import { Print, Refresh, LocalShipping, Assignment } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import dashboardService from '../../services/dashboardService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const LoadForm = () => {
  const printRef = useRef();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [orderBookers, setOrderBookers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [loadFormData, setLoadFormData] = useState(null);
  
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    orderBooker: ''
  });

  useEffect(() => {
    fetchOrderBookers();
  }, []);

  const fetchOrderBookers = async () => {
    try {
      const response = await dashboardService.getOrderBookers();
      setOrderBookers(response.data || []);
    } catch (error) {
      console.error('Failed to load order bookers');
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setLoadFormData(null);
      setSelectedOrders([]);
      
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate
      };
      
      if (filters.orderBooker) {
        params.orderBooker = filters.orderBooker;
      }

      const response = await dashboardService.getOrdersForLoadForm(params);
      setOrders(response.data || []);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedOrders(orders.map(order => order._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  const generateLoadForm = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      setGenerating(true);
      const response = await dashboardService.generateLoadForm({ orderIds: selectedOrders });
      setLoadFormData(response.data);
      toast.success('Load form generated successfully');
    } catch (error) {
      toast.error('Failed to generate load form');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Load-Form-${new Date().toISOString().split('T')[0]}`
  });

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', minimumFractionDigits: 0
  }).format(amount || 0);

  const formatDate = (date) => new Date(date).toLocaleDateString('en-PK');

  return (
    <Box>
      <PageHeader 
        title="Load Form" 
        subtitle="Generate product loading summary for warehouse"
        icon={<LocalShipping />}
      />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
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
            <Grid item xs={12} md={3}>
              <Button 
                variant="contained" 
                fullWidth 
                onClick={fetchOrders}
                startIcon={<Refresh />}
              >
                Load Orders
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Orders Selection */}
      {orders.length > 0 && !loadFormData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Select Orders ({selectedOrders.length} of {orders.length} selected)
              </Typography>
              <Button 
                variant="contained" 
                color="success"
                onClick={generateLoadForm}
                disabled={selectedOrders.length === 0 || generating}
                startIcon={<Assignment />}
              >
                {generating ? 'Generating...' : 'Generate Load Form'}
              </Button>
            </Box>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedOrders.length === orders.length && orders.length > 0}
                        indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                        onChange={handleSelectAll}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Order #</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Order Booker</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow 
                      key={order._id} 
                      hover
                      selected={selectedOrders.includes(order._id)}
                      onClick={() => handleSelectOrder(order._id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedOrders.includes(order._id)} />
                      </TableCell>
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.bookedByName}</TableCell>
                      <TableCell align="right">{formatCurrency(order.grandTotal)}</TableCell>
                      <TableCell>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            px: 1, py: 0.5, borderRadius: 1,
                            backgroundColor: order.status === 'approved' ? 'success.light' : 
                                           order.status === 'pending' ? 'warning.light' : 'info.light',
                            color: 'white'
                          }}
                        >
                          {order.status}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 && !loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Select date range and order booker, then click "Load Orders" to view available orders.
        </Alert>
      )}

      {loading && <Loading />}

      {/* Load Form Display */}
      {loadFormData && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Load Form Generated</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={() => setLoadFormData(null)}>
                  Back to Orders
                </Button>
                <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>
                  Print Load Form
                </Button>
              </Box>
            </Box>

            {/* Printable Content */}
            <Box ref={printRef} sx={{ p: 2 }}>
              <style>
                {`
                  @media print {
                    @page { size: A4; margin: 8mm; }
                  }
                `}
              </style>

              {/* Header */}
              <Box sx={{ textAlign: 'center', mb: 2, pb: 1, borderBottom: '2px solid #000' }}>
                <Typography sx={{ fontSize: '20px', fontWeight: 700 }}>AL NOOR TRADERS</Typography>
                <Typography sx={{ fontSize: '14px', fontWeight: 600, border: '1px solid #000', display: 'inline-block', px: 2, py: 0.5, mt: 0.5 }}>LOAD FORM</Typography>
                <Typography sx={{ fontSize: '11px', mt: 1 }}>
                  Date: {formatDate(filters.startDate)} {filters.startDate !== filters.endDate && `to ${formatDate(filters.endDate)}`}
                </Typography>
                <Typography sx={{ fontSize: '10px' }}>
                  Generated: {new Date().toLocaleString('en-PK')}
                </Typography>
              </Box>

              {/* Product Summary */}
              <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 1, p: 0.5, border: '2px solid #000', display: 'inline-block' }}>
                PRODUCT SUMMARY
              </Typography>
              <TableContainer sx={{ mb: 2, border: '1px solid #000' }}>
                <Table size="small" sx={{ '& .MuiTableCell-root': { border: '1px solid #000', padding: '4px 8px', fontSize: '10px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Cartons</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Pieces</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Total Qty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadFormData.products?.map((product, index) => (
                      <TableRow key={product.productId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{product.productName}</TableCell>
                        <TableCell>{product.productSku}</TableCell>
                        <TableCell align="center">{product.totalCartons || 0}</TableCell>
                        <TableCell align="center">{product.totalPieces || 0}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{product.totalQuantity}</TableCell>
                        <TableCell align="right">{formatCurrency(product.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ borderTop: '2px solid #000' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 700 }}>TOTAL</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {loadFormData.products?.reduce((sum, p) => sum + (p.totalCartons || 0), 0)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {loadFormData.products?.reduce((sum, p) => sum + (p.totalPieces || 0), 0)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {loadFormData.products?.reduce((sum, p) => sum + p.totalQuantity, 0)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(loadFormData.products?.reduce((sum, p) => sum + p.totalValue, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Order/Customer Details */}
              <Typography sx={{ fontSize: '12px', fontWeight: 700, mb: 1, mt: 2, p: 0.5, border: '2px solid #000', display: 'inline-block' }}>
                ORDER DETAILS
              </Typography>
              <TableContainer sx={{ border: '1px solid #000' }}>
                <Table size="small" sx={{ '& .MuiTableCell-root': { border: '1px solid #000', padding: '4px 8px', fontSize: '10px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Items</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadFormData.orders?.map((order, index) => (
                      <TableRow key={order.orderId}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{order.orderNumber}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{order.customerName}</TableCell>
                        <TableCell sx={{ fontSize: '9px' }}>{order.customerAddress || '-'}</TableCell>
                        <TableCell>{order.customerPhone || '-'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(order.grandTotal)}</TableCell>
                        <TableCell align="center">{order.itemCount}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ borderTop: '2px solid #000' }}>
                      <TableCell colSpan={5} sx={{ fontWeight: 700 }}>
                        TOTAL ({loadFormData.orders?.length} Orders)
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(loadFormData.orders?.reduce((sum, o) => sum + o.grandTotal, 0))}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {loadFormData.orders?.reduce((sum, o) => sum + o.itemCount, 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Signature Section */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Box sx={{ textAlign: 'center', width: '30%' }}>
                  <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 4 }}>
                    <Typography sx={{ fontSize: '10px' }}>Prepared By</Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center', width: '30%' }}>
                  <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 4 }}>
                    <Typography sx={{ fontSize: '10px' }}>Checked By</Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'center', width: '30%' }}>
                  <Box sx={{ borderTop: '1px solid #000', pt: 0.5, mt: 4 }}>
                    <Typography sx={{ fontSize: '10px' }}>Loaded By</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default LoadForm;
