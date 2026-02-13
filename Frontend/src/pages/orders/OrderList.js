import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, Button, IconButton, Chip, Tooltip, Checkbox, Paper, Typography, useMediaQuery, useTheme 
} from '@mui/material';
import { Add, Visibility, Edit, Receipt, LocalShipping, Print } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import orderService from '../../services/orderService';
import userService from '../../services/userService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import InvoicePrint from '../../components/common/InvoicePrint';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

const OrderList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [bookedBy, setBookedBy] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [orderBookers, setOrderBookers] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [, setBulkActionAnchor] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [invoicesToPrint, setInvoicesToPrint] = useState([]);
  const printRef = useRef();

  const canEditOrder = user?.role === 'distributor' || user?.role === 'computer_operator';
  // Reserved for future permission checks
  // const canGenerateInvoice = user?.permissions?.includes('invoice:create') || user?.role === 'distributor';
  // const canUpdateOrder = user?.permissions?.includes('order:update') || user?.role === 'distributor';

  useEffect(() => { fetchOrders(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, status, bookedBy, startDate, endDate]);

  useEffect(() => { 
    const fetchOrderBookers = async () => {
      try {
        const response = await userService.getOrderBookers();
        console.log('Order bookers response:', response);
        setOrderBookers(response.data || []);
      } catch (error) {
        console.error('Failed to fetch order bookers:', error.response?.data || error.message);
      }
    };
    fetchOrderBookers();
  }, []);

  const fetchOrders = async () => {
    try { setLoading(true); const response = await orderService.getOrders({ page: pagination.page + 1, limit: pagination.limit, search, status, bookedBy, startDate, endDate }); setOrders(response.data); setPagination(prev => ({ ...prev, total: response.pagination.total })); } catch (error) { toast.error('Failed to load orders'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const getStatusColor = (s) => ({ pending: 'warning', confirmed: 'info', processing: 'primary', shipped: 'secondary', dispatched: 'secondary', delivered: 'success', cancelled: 'error' }[s] || 'default');

  // Selection handlers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedOrders(orders.map(o => o._id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const isSelected = (orderId) => selectedOrders.includes(orderId);

  // Bulk actions
  const handleBulkGenerateInvoices = async () => {
    setBulkActionAnchor(null);
    const eligibleOrders = orders.filter(o => 
      selectedOrders.includes(o._id) && 
      !o.invoiceGenerated && 
      o.status !== 'pending' && 
      o.status !== 'cancelled'
    );

    if (eligibleOrders.length === 0) {
      toast.error('No eligible orders selected. Orders must be approved and not already invoiced.');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Generate Invoices',
      message: `Generate invoices for ${eligibleOrders.length} order(s)?`,
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        setBulkLoading(true);
        try {
          const response = await orderService.bulkGenerateInvoices(eligibleOrders.map(o => o._id));
          toast.success(response.message);
          if (response.data.failed.length > 0) {
            response.data.failed.forEach(f => toast.error(`${f.orderNumber || f.orderId}: ${f.reason}`));
          }
          setSelectedOrders([]);
          fetchOrders();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to generate invoices');
        } finally {
          setBulkLoading(false);
        }
      }
    });
  };

  const handleBulkMarkDelivered = async () => {
    setBulkActionAnchor(null);
    const eligibleOrders = orders.filter(o => 
      selectedOrders.includes(o._id) && 
      o.invoiceGenerated && 
      o.status !== 'delivered' && 
      o.status !== 'cancelled'
    );

    if (eligibleOrders.length === 0) {
      toast.error('No eligible orders selected. Orders must have invoice generated and not already delivered.');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Mark as Delivered',
      message: `Mark ${eligibleOrders.length} order(s) as delivered?`,
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        setBulkLoading(true);
        try {
          const response = await orderService.bulkUpdateStatus(eligibleOrders.map(o => o._id), 'delivered');
          toast.success(response.message);
          if (response.data.failed.length > 0) {
            response.data.failed.forEach(f => toast.error(`${f.orderNumber || f.orderId}: ${f.reason}`));
          }
          setSelectedOrders([]);
          fetchOrders();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to update orders');
        } finally {
          setBulkLoading(false);
        }
      }
    });
  };

  const handleBulkConfirm = async () => {
    setBulkActionAnchor(null);
    const eligibleOrders = orders.filter(o => 
      selectedOrders.includes(o._id) && 
      o.status === 'pending'
    );

    if (eligibleOrders.length === 0) {
      toast.error('No pending orders selected.');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Confirm Orders',
      message: `Confirm ${eligibleOrders.length} order(s)?`,
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        setBulkLoading(true);
        try {
          const response = await orderService.bulkUpdateStatus(eligibleOrders.map(o => o._id), 'confirmed');
          toast.success(response.message);
          setSelectedOrders([]);
          fetchOrders();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to confirm orders');
        } finally {
          setBulkLoading(false);
        }
      }
    });
  };

  // Print handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Invoices',
    onAfterPrint: () => setInvoicesToPrint([])
  });

  const handleBulkPrint = async () => {
    if (selectedOrders.length === 0) {
      toast.error('No orders selected for printing.');
      return;
    }

    setBulkLoading(true);
    try {
      const response = await orderService.bulkGetInvoices(selectedOrders);
      if (response.data && response.data.length > 0) {
        setInvoicesToPrint(response.data);
        // Small delay to ensure state is updated before printing
        setTimeout(() => {
          handlePrint();
        }, 100);
      } else {
        toast.error('No data found for printing');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch data for printing');
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Sales Orders" 
        subtitle="Manage customer orders" 
        action={
          <Button 
            variant="contained" 
            startIcon={!isMobile && <Add />} 
            onClick={() => navigate('/orders/new')}
            size={isMobile ? "medium" : "large"}
          >
            {isMobile ? <Add /> : 'New Order'}
          </Button>
        } 
      />
      
      {/* Professional Search and Filters */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={(value) => setSearch(value)}
        onSearch={() => { setPagination(prev => ({ ...prev, page: 0 })); fetchOrders(); }}
        searchPlaceholder="Search order # or customer..."
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(value) => setStartDate(value)}
        onEndDateChange={(value) => setEndDate(value)}
        showDateFilters={true}
        filters={[
          {
            name: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: '', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'dispatched', label: 'Dispatched' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' },
            ]
          },
          ...(user?.role !== 'order_booker' ? [{
            name: 'bookedBy',
            label: 'Order Booker',
            value: bookedBy,
            options: [
              { value: '', label: 'All Bookers' },
              ...orderBookers.map(b => ({ value: b._id, label: b.fullName }))
            ]
          }] : [])
        ]}
        onFilterChange={(name, value) => {
          if (name === 'status') setStatus(value);
          if (name === 'bookedBy') setBookedBy(value);
        }}
        hasActiveFilters={!!(status || bookedBy || startDate || endDate)}
        onClearFilters={() => { setStatus(''); setBookedBy(''); setStartDate(''); setEndDate(''); }}
      />

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
          <CardContent sx={{ 
            py: { xs: 1, sm: 1.5 }, 
            px: { xs: 1.5, sm: 2 },
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 }, 
            flexWrap: 'wrap',
            overflowX: 'auto',
          }}>
            <Chip 
              label={`${selectedOrders.length} selected`} 
              color="primary" 
              size={isMobile ? "small" : "medium"}
            />
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<Receipt />} 
              onClick={handleBulkGenerateInvoices} 
              disabled={bulkLoading}
              sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
            >
              {isMobile ? 'Invoice' : 'Generate Invoices'}
            </Button>
            <Button 
              variant="contained" 
              size="small" 
              color="secondary" 
              startIcon={<Print />} 
              onClick={handleBulkPrint} 
              disabled={bulkLoading}
              sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
            >
              Print
            </Button>
            <Button 
              variant="contained" 
              size="small" 
              startIcon={<LocalShipping />} 
              onClick={handleBulkMarkDelivered} 
              disabled={bulkLoading}
              sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
            >
              {isMobile ? 'Deliver' : 'Mark Delivered'}
            </Button>
            {!isMobile && (
              <Button 
                variant="outlined" 
                size="small" 
                onClick={handleBulkConfirm} 
                disabled={bulkLoading} 
                sx={{ bgcolor: 'white' }}
              >
                Confirm Orders
              </Button>
            )}
            <Button 
              size="small" 
              onClick={() => setSelectedOrders([])} 
              sx={{ ml: 'auto', color: 'primary.dark', minWidth: 'auto' }}
            >
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        {loading || bulkLoading ? <Loading /> : (
          <>
            {/* Desktop Table View */}
            {!isMobile && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                          checked={orders.length > 0 && selectedOrders.length === orders.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Order #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Booked By</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order._id} hover selected={isSelected(order._id)}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={isSelected(order._id)} onChange={() => handleSelectOrder(order._id)} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{order.orderNumber}</TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>{order.customerName || order.customer?.businessName}</TableCell>
                        <TableCell>{order.bookedByName || order.bookedBy?.fullName}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500 }}>{formatCurrency(order.grandTotal)}</TableCell>
                        <TableCell>
                          {order.invoiceGenerated ? (
                            <Chip label="Generated" size="small" color="success" variant="outlined" />
                          ) : (
                            <Chip label="Pending" size="small" color="warning" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip label={order.status} size="small" color={getStatusColor(order.status)} />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Order Details">
                            <IconButton size="small" onClick={() => navigate(`/orders/${order._id}`)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canEditOrder && ['pending', 'confirmed'].includes(order.status) && !order.invoiceGenerated && (
                            <Tooltip title="Edit Order">
                              <IconButton size="small" color="primary" onClick={() => navigate(`/orders/${order._id}/edit`)}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center">No orders found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Mobile Card View */}
            {isMobile && (
              <Box sx={{ p: 1.5 }}>
                {orders.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No orders found
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {orders.map(order => (
                      <Paper
                        key={order._id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          borderColor: isSelected(order._id) ? 'primary.main' : 'divider',
                          bgcolor: isSelected(order._id) ? 'action.selected' : 'background.paper',
                        }}
                      >
                        {/* Header row with checkbox and order number */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Checkbox 
                            checked={isSelected(order._id)} 
                            onChange={() => handleSelectOrder(order._id)}
                            size="small"
                            sx={{ mr: 1, p: 0.5 }}
                          />
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                            {order.orderNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </Typography>
                        </Box>

                        {/* Customer name */}
                        <Typography variant="body2" sx={{ mb: 1, pl: 4 }}>
                          {order.customerName || order.customer?.businessName}
                        </Typography>

                        {/* Status chips and total */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, pl: 4 }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip label={order.status} size="small" color={getStatusColor(order.status)} />
                            {order.invoiceGenerated ? (
                              <Chip label="Invoiced" size="small" color="success" variant="outlined" />
                            ) : (
                              <Chip label="No Invoice" size="small" variant="outlined" />
                            )}
                          </Box>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {formatCurrency(order.grandTotal)}
                          </Typography>
                        </Box>

                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', pl: 4 }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<Visibility />}
                            onClick={() => navigate(`/orders/${order._id}`)}
                            sx={{ flex: 1, minHeight: 44 }}
                          >
                            View
                          </Button>
                          {canEditOrder && ['pending', 'confirmed'].includes(order.status) && !order.invoiceGenerated && (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                              startIcon={<Edit />}
                              onClick={() => navigate(`/orders/${order._id}/edit`)}
                              sx={{ flex: 1, minHeight: 44 }}
                            >
                              Edit
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            <TablePagination 
              component="div" 
              count={pagination.total} 
              page={pagination.page} 
              onPageChange={(e, p) => setPagination(prev => ({ ...prev, page: p }))} 
              rowsPerPage={pagination.limit} 
              onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 0 }))} 
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage={isMobile ? "Rows:" : "Rows per page:"}
              sx={{
                '.MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', sm: 'flex-end' },
                  px: { xs: 1, sm: 2 },
                },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false })}
      />

      {/* Hidden Print Component */}
      <Box sx={{ display: 'none' }}>
        <InvoicePrint ref={printRef} invoices={invoicesToPrint} />
      </Box>
    </Box>
  );
};

export default OrderList;
