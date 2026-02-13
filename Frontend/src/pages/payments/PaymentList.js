import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, TextField, Button, Chip, Grid, Typography, Paper, Checkbox, 
  IconButton, Dialog, DialogContent, DialogActions, DialogTitle, Tooltip, useMediaQuery, useTheme 
} from '@mui/material';
import { Add, AccountBalanceWallet, Payment, Print, PrintOutlined, Edit, Delete } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import paymentService from '../../services/paymentService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import PaymentReceiptPrint from '../../components/common/PaymentReceiptPrint';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const PaymentList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const printRef = useRef();
  const { user } = useSelector((state) => state.auth);
  const isDistributor = user?.role === 'distributor';
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printPayments, setPrintPayments] = useState([]);
  
  // Edit/Delete states for distributor
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => { fetchPayments(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  const fetchPayments = async () => {
    try { 
      setLoading(true); 
      const response = await paymentService.getPayments({ 
        page: pagination.page + 1, 
        limit: pagination.limit, 
        search: filters.search,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      }); 
      setPayments(response.data); 
      setSummary(response.summary || { totalAmount: 0, count: 0 });
      setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));
      setSelectedPayments([]);
    } catch (error) { 
      toast.error('Failed to load payments'); 
    } finally { 
      setLoading(false); 
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPayments(payments.map(p => p._id));
    } else {
      setSelectedPayments([]);
    }
  };

  const handleSelectPayment = (id) => {
    setSelectedPayments(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Payments-${new Date().toISOString().split('T')[0]}`,
    onAfterPrint: () => setShowPrintDialog(false)
  });

  const handlePrintSingle = (payment) => {
    setPrintPayments([payment]);
    setShowPrintDialog(true);
  };

  const handleBulkPrint = () => {
    const selected = payments.filter(p => selectedPayments.includes(p._id));
    if (selected.length === 0) {
      toast.error('Select payments to print');
      return;
    }
    setPrintPayments(selected);
    setShowPrintDialog(true);
  };

  // Edit/Delete handlers for distributor
  const handleEditClick = (payment) => {
    setEditData({
      _id: payment._id,
      amount: payment.amount,
      paymentDate: payment.paymentDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      remarks: payment.remarks || '',
      vendorName: payment.partyName || payment.partyId?.businessName || 'Unknown Vendor'
    });
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    try {
      await paymentService.updatePayment(editData._id, {
        amount: parseFloat(editData.amount),
        paymentDate: editData.paymentDate,
        remarks: editData.remarks
      });
      toast.success('Payment updated successfully');
      setEditDialog(false);
      setEditData(null);
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment');
    }
  };

  const handleDeleteClick = (payment) => {
    setEditData({
      _id: payment._id,
      paymentNumber: payment.paymentNumber,
      vendorName: payment.partyName || payment.partyId?.businessName || 'Unknown Vendor',
      amount: payment.amount
    });
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await paymentService.deletePayment(editData._id);
      toast.success('Payment deleted successfully');
      setDeleteDialog(false);
      setEditData(null);
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete payment');
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Payments" 
        subtitle="Payments made to vendors" 
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedPayments.length > 0 && (
              <Button 
                variant="outlined" 
                startIcon={<Print />} 
                onClick={handleBulkPrint}
                size={isMobile ? "small" : "medium"}
              >
                {isMobile ? selectedPayments.length : `Print (${selectedPayments.length})`}
              </Button>
            )}
            <Button 
              variant="contained" 
              startIcon={!isMobile && <Add />} 
              onClick={() => navigate('/payments/new')}
              size={isMobile ? "medium" : "large"}
            >
              {isMobile ? <Add /> : 'New Payment'}
            </Button>
          </Box>
        } 
      />
      
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2 }}>
        <Grid item xs={6} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'error.light' }}>
              <AccountBalanceWallet sx={{ color: 'error.dark', fontSize: { xs: 20, sm: 24 } }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Paid</Typography>
              <Typography variant="h6" fontWeight={600} color="error.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {formatCurrency(summary.totalAmount)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={6} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'primary.light' }}>
              <Payment sx={{ color: 'primary.dark', fontSize: { xs: 20, sm: 24 } }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Payments</Typography>
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {summary.count}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Professional Search & Filters */}
      <SearchFilterBar
        searchValue={filters.search}
        onSearchChange={(value) => setFilters(prev => ({ ...prev, search: value }))}
        onSearch={() => { setPagination(prev => ({ ...prev, page: 0 })); fetchPayments(); }}
        searchPlaceholder="Search payment # or vendor..."
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
        onEndDateChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
        showDateFilters={true}
        hasActiveFilters={!!(filters.startDate || filters.endDate)}
        onClearFilters={() => { setFilters({ search: '', startDate: '', endDate: '' }); fetchPayments(); }}
      />

      <Card>
        {loading ? <Loading /> : (
          <>
            {/* Desktop Table View */}
            {!isMobile && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox 
                          indeterminate={selectedPayments.length > 0 && selectedPayments.length < payments.length}
                          checked={payments.length > 0 && selectedPayments.length === payments.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Payment #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Paid By</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Print</TableCell>
                      {isDistributor && <TableCell align="center">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map(payment => (
                      <TableRow key={payment._id} hover selected={selectedPayments.includes(payment._id)}>
                        <TableCell padding="checkbox">
                          <Checkbox 
                            checked={selectedPayments.includes(payment._id)}
                            onChange={() => handleSelectPayment(payment._id)}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{payment.paymentNumber}</TableCell>
                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.partyName || payment.partyId?.businessName}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{payment.paymentMethod?.replace('_', ' ')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, color: 'error.main' }}>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.createdBy?.fullName || payment.createdByName || '-'}</TableCell>
                        <TableCell><Chip label={payment.status || 'completed'} size="small" color="success" /></TableCell>
                        <TableCell align="center">
                          <Tooltip title="Print Voucher">
                            <IconButton size="small" onClick={() => handlePrintSingle(payment)}>
                              <PrintOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        {isDistributor && (
                          <TableCell align="center">
                            <Tooltip title="Edit Payment">
                              <IconButton size="small" color="primary" onClick={() => handleEditClick(payment)} disabled={payment.status === 'cancelled'}>
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Payment">
                              <IconButton size="small" color="error" onClick={() => handleDeleteClick(payment)} disabled={payment.status === 'cancelled'}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isDistributor ? 10 : 9} align="center">No payments found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Mobile Card View */}
            {isMobile && (
              <Box sx={{ p: 1.5 }}>
                {payments.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No payments found
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {payments.map(payment => (
                      <Paper
                        key={payment._id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          borderColor: selectedPayments.includes(payment._id) ? 'primary.main' : 'divider',
                          bgcolor: selectedPayments.includes(payment._id) ? 'action.selected' : 'background.paper',
                        }}
                      >
                        {/* Header with checkbox */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Checkbox 
                            checked={selectedPayments.includes(payment._id)}
                            onChange={() => handleSelectPayment(payment._id)}
                            size="small"
                            sx={{ mr: 1, p: 0.5 }}
                          />
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                            {payment.paymentNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </Typography>
                        </Box>

                        {/* Vendor name */}
                        <Typography variant="body2" sx={{ mb: 1, pl: 4 }}>
                          {payment.partyName || payment.partyId?.businessName}
                        </Typography>

                        {/* Details */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, pl: 4 }}>
                          <Typography variant="caption" color="text.secondary">Method:</Typography>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {payment.paymentMethod?.replace('_', ' ')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pl: 4 }}>
                          <Chip label={payment.status || 'completed'} size="small" color="success" />
                          <Typography variant="body2" fontWeight={600} color="error.main">
                            {formatCurrency(payment.amount)}
                          </Typography>
                        </Box>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', pl: 4 }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<Print />}
                            onClick={() => handlePrintSingle(payment)}
                            sx={{ flex: 1, minHeight: 44 }}
                          >
                            Print
                          </Button>
                          {isDistributor && (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditClick(payment)}
                                disabled={payment.status === 'cancelled'}
                                sx={{ minWidth: 44, minHeight: 44, border: '1px solid', borderColor: 'divider' }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(payment)}
                                disabled={payment.status === 'cancelled'}
                                sx={{ minWidth: 44, minHeight: 44, border: '1px solid', borderColor: 'divider' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </>
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

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onClose={() => setShowPrintDialog(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <PaymentReceiptPrint ref={printRef} payments={printPayments} type="payment" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrintDialog(false)}>Close</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>
            Print {printPayments.length > 1 ? `(${printPayments.length} Vouchers)` : 'Voucher'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Payment Dialog - Distributor Only */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Editing payment to: <strong>{editData?.vendorName}</strong>
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={editData?.amount || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={editData?.paymentDate || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, paymentDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                multiline
                rows={2}
                value={editData?.remarks || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment"
        message={`Are you sure you want to delete payment ${editData?.paymentNumber} for ${editData?.vendorName}? Amount: ${formatCurrency(editData?.amount)}. This action will reverse the vendor's balance and cannot be undone.`}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default PaymentList;
