import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, Divider, Tooltip, IconButton } from '@mui/material';
import { Inventory, Cancel, Edit, Delete } from '@mui/icons-material';
import purchaseService from '../../services/purchaseService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const PurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState(null);
  const [showReceive, setShowReceive] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchPurchase(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPurchase = async () => {
    try { setLoading(true); const response = await purchaseService.getPurchase(id); setPurchase(response.data); } catch (error) { toast.error('Failed to load purchase'); } finally { setLoading(false); }
  };

  const handleReceiveGoods = async () => {
    try { setProcessing(true); await purchaseService.receiveGoods(id); toast.success('Goods received and inventory updated'); fetchPurchase(); setShowReceive(false); } catch (error) { toast.error(error.response?.data?.message || 'Failed to receive goods'); } finally { setProcessing(false); }
  };

  const handleCancelPurchase = async () => {
    try { setProcessing(true); await purchaseService.updatePurchaseStatus(id, 'cancelled'); toast.success('Purchase cancelled'); fetchPurchase(); setShowCancel(false); } catch (error) { toast.error('Failed to cancel purchase'); } finally { setProcessing(false); }
  };

  const handleDeletePurchase = async () => {
    try {
      setProcessing(true);
      await purchaseService.deletePurchase(id);
      toast.success('Purchase deleted successfully');
      navigate('/purchases');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete purchase');
    } finally {
      setProcessing(false);
      setShowDelete(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const getStatusColor = (s) => ({ draft: 'default', ordered: 'info', received: 'success', partial: 'warning', cancelled: 'error' }[s] || 'default');

  if (loading) return <Loading />;
  if (!purchase) return <Typography>Purchase not found</Typography>;

  return (
    <Box>
      <PageHeader title={`Purchase: ${purchase.purchaseNumber}`} backUrl="/purchases" action={
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {!purchase.stockUpdated && (
            <Tooltip title="Edit Purchase">
              <IconButton color="primary" onClick={() => navigate(`/purchases/${id}/edit`)}>
                <Edit />
              </IconButton>
            </Tooltip>
          )}
          {!purchase.stockUpdated && (
            <Tooltip title="Delete Purchase">
              <IconButton color="error" onClick={() => setShowDelete(true)}>
                <Delete />
              </IconButton>
            </Tooltip>
          )}
          {(purchase.status === 'draft' || purchase.status === 'ordered') && !purchase.stockUpdated && <><Button variant="contained" color="success" startIcon={<Inventory />} onClick={() => setShowReceive(true)} disabled={processing}>Receive Goods</Button><Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setShowCancel(true)}>Cancel</Button></>}
        </Box>
      } />

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Purchase Details</Typography>
                <Chip label={purchase.status.toUpperCase()} color={getStatusColor(purchase.status)} />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Purchase Date</Typography><Typography fontWeight={500}>{new Date(purchase.purchaseDate).toLocaleDateString()}</Typography></Grid>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Vendor</Typography><Typography fontWeight={500}>{purchase.vendorName}</Typography></Grid>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Vendor Code</Typography><Typography fontWeight={500}>{purchase.vendorCode}</Typography></Grid>
                <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Vendor Invoice</Typography><Typography fontWeight={500}>{purchase.vendorInvoiceNumber || '-'}</Typography></Grid>
                {purchase.receivedDate && <Grid item xs={6} md={3}><Typography variant="body2" color="text.secondary">Received Date</Typography><Typography fontWeight={500}>{new Date(purchase.receivedDate).toLocaleDateString()}</Typography></Grid>}
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Purchase Items</Typography>
              <TableContainer>
                <Table>
                  <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="center">Cartons</TableCell><TableCell align="center">Pieces</TableCell><TableCell align="center">Total Pcs</TableCell><TableCell align="right">Price/Pc</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
                  <TableBody>
                    {purchase.items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productSku} - {item.productName}</TableCell>
                        <TableCell align="center">{item.cartons || 0}</TableCell>
                        <TableCell align="center">{item.pieces || 0}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.purchasePrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.lineTotal)}</TableCell>
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
              <Typography variant="h6" gutterBottom>Purchase Summary</Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography>Subtotal:</Typography><Typography>{formatCurrency(purchase.subtotal)}</Typography></Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography variant="h6">Grand Total:</Typography><Typography variant="h6" color="primary">{formatCurrency(purchase.grandTotal)}</Typography></Box>
              {purchase.notes && <><Divider sx={{ my: 2 }} /><Typography variant="body2" color="text.secondary">Notes:</Typography><Typography variant="body2">{purchase.notes}</Typography></>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ConfirmDialog open={showReceive} title="Receive Goods" message="This will update inventory with the purchased quantities and create accounting entries. Continue?" onConfirm={handleReceiveGoods} onCancel={() => setShowReceive(false)} />
      <ConfirmDialog open={showCancel} title="Cancel Purchase" message="Are you sure you want to cancel this purchase?" onConfirm={handleCancelPurchase} onCancel={() => setShowCancel(false)} confirmColor="error" />
      <ConfirmDialog open={showDelete} title="Delete Purchase" message="Are you sure you want to permanently delete this purchase? This action cannot be undone." onConfirm={handleDeletePurchase} onCancel={() => setShowDelete(false)} confirmColor="error" />
    </Box>
  );
};

export default PurchaseDetail;
