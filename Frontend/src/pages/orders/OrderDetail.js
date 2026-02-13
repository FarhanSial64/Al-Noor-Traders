import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Divider } from '@mui/material';
import { Receipt, CheckCircle, Cancel, Edit } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import orderService from '../../services/orderService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [processing, setProcessing] = useState(false);

  const canEditOrder = (user?.role === 'distributor' || user?.role === 'computer_operator') && 
                       order && ['pending', 'confirmed'].includes(order.status) && !order.invoiceGenerated;

  useEffect(() => { fetchOrder(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchOrder = async () => {
    try { setLoading(true); const response = await orderService.getOrder(id); setOrder(response.data); } catch (error) { toast.error('Failed to load order'); } finally { setLoading(false); }
  };

  const handleConfirmOrder = async () => {
    try { setProcessing(true); await orderService.updateOrderStatus(id, 'confirmed'); toast.success('Order confirmed'); fetchOrder(); setShowConfirm(false); } catch (error) { toast.error('Failed to confirm order'); } finally { setProcessing(false); }
  };

  const handleCancelOrder = async () => {
    try { setProcessing(true); await orderService.updateOrderStatus(id, 'cancelled'); toast.success('Order cancelled'); fetchOrder(); setShowCancel(false); } catch (error) { toast.error('Failed to cancel order'); } finally { setProcessing(false); }
  };

  const handleGenerateInvoice = async () => {
    try { setProcessing(true); await orderService.generateInvoice(id); toast.success('Invoice generated and order marked as delivered'); fetchOrder(); } catch (error) { toast.error(error.response?.data?.message || 'Failed to generate invoice'); } finally { setProcessing(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const getStatusColor = (s) => ({ pending: 'warning', confirmed: 'info', processing: 'primary', shipped: 'secondary', delivered: 'success', cancelled: 'error' }[s] || 'default');

  if (loading) return <Loading />;
  if (!order) return <Typography>Order not found</Typography>;

  return (
    <Box>
      <PageHeader title={`Order: ${order.orderNumber}`} backUrl="/orders" action={
        <Box sx={{ display: 'flex', gap: 1 }}>
          {canEditOrder && <Button variant="outlined" color="primary" startIcon={<Edit />} onClick={() => navigate(`/orders/${order._id}/edit`)}>Edit Order</Button>}
          {order.status === 'pending' && <><Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => setShowConfirm(true)}>Confirm</Button><Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setShowCancel(true)}>Cancel</Button></>}
          {order.status === 'confirmed' && <Button variant="contained" color="primary" startIcon={<Receipt />} onClick={handleGenerateInvoice} disabled={processing}>Generate Invoice & Deliver</Button>}
        </Box>
      } />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Order Details</Typography>
                <Chip label={order.status.toUpperCase()} color={getStatusColor(order.status)} />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Order Date</Typography><Typography fontWeight={500}>{new Date(order.orderDate).toLocaleDateString()}</Typography></Grid>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Customer</Typography><Typography fontWeight={500}>{order.customerName}</Typography></Grid>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Customer Code</Typography><Typography fontWeight={500}>{order.customerCode}</Typography></Grid>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Order Booker</Typography><Typography fontWeight={500}>{order.orderBookerName}</Typography></Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Order Items</Typography>
              <TableContainer>
                <Table>
                  <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="center">Cartons</TableCell><TableCell align="center">Pieces</TableCell><TableCell align="center">Total Pcs</TableCell><TableCell align="right">Price/Pc</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
                  <TableBody>
                    {order.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productSku} - {item.productName}</TableCell>
                        <TableCell align="center">{item.cartons || 0}</TableCell>
                        <TableCell align="center">{item.pieces || 0}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.salePrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.netAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Order Summary</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography>Subtotal:</Typography><Typography>{formatCurrency(order.subtotal)}</Typography></Box>
              {order.discountAmount > 0 && <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography>Discount:</Typography><Typography color="error">-{formatCurrency(order.discountAmount)}</Typography></Box>}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="h6">Grand Total:</Typography><Typography variant="h6" color="primary">{formatCurrency(order.grandTotal)}</Typography></Box>
              {order.notes && <><Divider sx={{ my: 2 }} /><Typography variant="body2" color="text.secondary">Notes:</Typography><Typography variant="body2">{order.notes}</Typography></>}
              {order.invoice && <><Divider sx={{ my: 2 }} /><Typography variant="body2" color="text.secondary">Invoice Number:</Typography><Typography fontWeight={500} color="success.main">{order.invoice.invoiceNumber || 'Generated'}</Typography></>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog open={showConfirm} title="Confirm Order" message="Are you sure you want to confirm this order?" onConfirm={handleConfirmOrder} onCancel={() => setShowConfirm(false)} />
      <ConfirmDialog open={showCancel} title="Cancel Order" message="Are you sure you want to cancel this order? This action cannot be undone." onConfirm={handleCancelOrder} onCancel={() => setShowCancel(false)} confirmColor="error" />
    </Box>
  );
};

export default OrderDetail;
