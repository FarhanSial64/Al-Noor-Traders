import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';
import { Visibility, ShoppingBag, Receipt } from '@mui/icons-material';
import toast from 'react-hot-toast';
import shopService from '../../services/shopService';

const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    confirmed: 'info',
    processing: 'info',
    shipped: 'primary',
    delivered: 'success',
    cancelled: 'error',
  };
  return colors[status] || 'default';
};

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await shopService.getMyOrders();
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const viewOrderDetail = async (orderId) => {
    try {
      setDetailLoading(true);
      const response = await shopService.getOrderDetail(orderId);
      setSelectedOrder(response.data);
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <ShoppingBag color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={600}>
            My Orders
          </Typography>
        </Box>

        {orders.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Receipt sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
            <Typography color="text.secondary">
              You haven't placed any orders yet.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Items</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{order.orderNumber}</Typography>
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell align="center">{order.itemCount}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600} color="primary">
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={order.status.toUpperCase()}
                        color={getStatusColor(order.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => viewOrderDetail(order._id)}
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        maxWidth="md"
        fullWidth
      >
        {detailLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : selectedOrder ? (
          <>
            <DialogTitle>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6">
                  Order Details - {selectedOrder.orderNumber}
                </Typography>
                <Chip
                  label={selectedOrder.status?.toUpperCase()}
                  color={getStatusColor(selectedOrder.status)}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Order Date
                  </Typography>
                  <Typography fontWeight={600}>
                    {formatDate(selectedOrder.createdAt)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Address
                  </Typography>
                  <Typography fontWeight={600}>
                    {selectedOrder.deliveryAddress || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Order Items
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="center">Qty</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedOrder.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.productSku}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.totalPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Typography variant="body1">
                  Subtotal: {formatCurrency(selectedOrder.subtotal)}
                </Typography>
                {selectedOrder.discount > 0 && (
                  <Typography variant="body1" color="success.main">
                    Discount: -{formatCurrency(selectedOrder.discount)}
                  </Typography>
                )}
                <Typography variant="h6" color="primary" fontWeight={700}>
                  Total: {formatCurrency(selectedOrder.totalAmount)}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedOrder(null)}>Close</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Box>
  );
};

export default MyOrders;
