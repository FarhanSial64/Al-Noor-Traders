import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, TextField, Button, Chip, InputAdornment, Grid, Typography, Paper, Checkbox, 
  IconButton, Dialog, DialogContent, DialogActions, DialogTitle, Tooltip, useMediaQuery, useTheme 
} from '@mui/material';
import { Add, AccountBalanceWallet, Receipt, Print, PrintOutlined, Edit, Delete } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import paymentService from '../../services/paymentService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import PaymentReceiptPrint from '../../components/common/PaymentReceiptPrint';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import toast from 'react-hot-toast';

const ReceiptList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state) => state.auth);
  const isDistributor = user?.role === 'distributor';
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printReceipts, setPrintReceipts] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, receipt: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, receipt: null });
  const [editData, setEditData] = useState({ amount: '', paymentDate: '', remarks: '' });

  useEffect(() => { fetchReceipts(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  const fetchReceipts = async () => {
    try { 
      setLoading(true); 
      const response = await paymentService.getReceipts({ 
        page: pagination.page + 1, 
        limit: pagination.limit, 
        search: filters.search,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      }); 
      setReceipts(response.data); 
      setSummary(response.summary || { totalAmount: 0, count: 0 });
      setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));
      setSelectedReceipts([]);
    } catch (error) { 
      toast.error('Failed to load receipts'); 
    } finally { 
      setLoading(false); 
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReceipts(receipts.map(r => r._id));
    } else {
      setSelectedReceipts([]);
    }
  };

  const handleSelectReceipt = (id) => {
    setSelectedReceipts(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Receipts-${new Date().toISOString().split('T')[0]}`,
    onAfterPrint: () => setShowPrintDialog(false)
  });

  const handlePrintSingle = (receipt) => {
    setPrintReceipts([receipt]);
    setShowPrintDialog(true);
  };

  const handleBulkPrint = () => {
    const selected = receipts.filter(r => selectedReceipts.includes(r._id));
    if (selected.length === 0) {
      toast.error('Select receipts to print');
      return;
    }
    setPrintReceipts(selected);
    setShowPrintDialog(true);
  };

  const handleEditClick = (receipt) => {
    setEditData({
      amount: receipt.amount,
      paymentDate: new Date(receipt.paymentDate).toISOString().split('T')[0],
      remarks: receipt.remarks || ''
    });
    setEditDialog({ open: true, receipt });
  };

  const handleEditSave = async () => {
    try {
      await paymentService.updateReceipt(editDialog.receipt._id, editData);
      toast.success('Receipt updated successfully');
      setEditDialog({ open: false, receipt: null });
      fetchReceipts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update receipt');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await paymentService.deleteReceipt(deleteDialog.receipt._id);
      toast.success('Receipt deleted successfully');
      setDeleteDialog({ open: false, receipt: null });
      fetchReceipts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete receipt');
    }
  };

  return (
    <Box>
      <PageHeader 
        title="Receipts" 
        subtitle="Payments received from customers" 
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedReceipts.length > 0 && (
              <Button 
                variant="outlined" 
                startIcon={<Print />} 
                onClick={handleBulkPrint}
                size={isMobile ? "small" : "medium"}
              >
                {isMobile ? selectedReceipts.length : `Print (${selectedReceipts.length})`}
              </Button>
            )}
            <Button 
              variant="contained" 
              startIcon={!isMobile && <Add />} 
              onClick={() => navigate('/receipts/new')}
              size={isMobile ? "medium" : "large"}
            >
              {isMobile ? <Add /> : 'New Receipt'}
            </Button>
          </Box>
        } 
      />
      
      {/* Summary Cards */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2 }}>
        <Grid item xs={6} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'success.light' }}>
              <AccountBalanceWallet sx={{ color: 'success.dark', fontSize: { xs: 20, sm: 24 } }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Received</Typography>
              <Typography variant="h6" fontWeight={600} color="success.main" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {formatCurrency(summary.totalAmount)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={6} md={4}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Box sx={{ p: { xs: 1, sm: 1.5 }, borderRadius: 2, bgcolor: 'primary.light' }}>
              <Receipt sx={{ color: 'primary.dark', fontSize: { xs: 20, sm: 24 } }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total Receipts</Typography>
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
        onSearch={() => { setPagination(prev => ({ ...prev, page: 0 })); fetchReceipts(); }}
        searchPlaceholder="Search receipt # or customer..."
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
        onEndDateChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
        showDateFilters={true}
        hasActiveFilters={!!(filters.startDate || filters.endDate)}
        onClearFilters={() => { setFilters({ search: '', startDate: '', endDate: '' }); fetchReceipts(); }}
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
                          indeterminate={selectedReceipts.length > 0 && selectedReceipts.length < receipts.length}
                          checked={receipts.length > 0 && selectedReceipts.length === receipts.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Receipt #</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Payment Method</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Received By</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {receipts.map(receipt => (
                      <TableRow key={receipt._id} hover selected={selectedReceipts.includes(receipt._id)}>
                        <TableCell padding="checkbox">
                          <Checkbox 
                            checked={selectedReceipts.includes(receipt._id)}
                            onChange={() => handleSelectReceipt(receipt._id)}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{receipt.paymentNumber}</TableCell>
                        <TableCell>{new Date(receipt.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell>{receipt.partyName || receipt.partyId?.businessName}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>{receipt.paymentMethod?.replace('_', ' ')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 500, color: 'success.main' }}>{formatCurrency(receipt.amount)}</TableCell>
                        <TableCell>{receipt.createdBy?.fullName || receipt.createdByName || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={receipt.status || 'completed'} 
                            size="small" 
                            color={receipt.status === 'cancelled' ? 'error' : 'success'} 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="Print Receipt">
                              <IconButton size="small" onClick={() => handlePrintSingle(receipt)}>
                                <PrintOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {isDistributor && receipt.status !== 'cancelled' && (
                              <>
                                <Tooltip title="Edit Receipt">
                                  <IconButton size="small" color="primary" onClick={() => handleEditClick(receipt)}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Receipt">
                                  <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, receipt })}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                    {receipts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} align="center">No receipts found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Mobile Card View */}
            {isMobile && (
              <Box sx={{ p: 1.5 }}>
                {receipts.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No receipts found
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {receipts.map(receipt => (
                      <Paper
                        key={receipt._id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          borderColor: selectedReceipts.includes(receipt._id) ? 'primary.main' : 'divider',
                          bgcolor: selectedReceipts.includes(receipt._id) ? 'action.selected' : 'background.paper',
                        }}
                      >
                        {/* Header with checkbox */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Checkbox 
                            checked={selectedReceipts.includes(receipt._id)}
                            onChange={() => handleSelectReceipt(receipt._id)}
                            size="small"
                            sx={{ mr: 1, p: 0.5 }}
                          />
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                            {receipt.paymentNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(receipt.paymentDate).toLocaleDateString()}
                          </Typography>
                        </Box>

                        {/* Customer name */}
                        <Typography variant="body2" sx={{ mb: 1, pl: 4 }}>
                          {receipt.partyName || receipt.partyId?.businessName}
                        </Typography>

                        {/* Details */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, pl: 4 }}>
                          <Typography variant="caption" color="text.secondary">Method:</Typography>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {receipt.paymentMethod?.replace('_', ' ')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pl: 4 }}>
                          <Chip 
                            label={receipt.status || 'completed'} 
                            size="small" 
                            color={receipt.status === 'cancelled' ? 'error' : 'success'} 
                          />
                          <Typography variant="body2" fontWeight={600} color="success.main">
                            {formatCurrency(receipt.amount)}
                          </Typography>
                        </Box>

                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', pl: 4 }}>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<Print />}
                            onClick={() => handlePrintSingle(receipt)}
                            sx={{ flex: 1, minHeight: 44 }}
                          >
                            Print
                          </Button>
                          {isDistributor && receipt.status !== 'cancelled' && (
                            <>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditClick(receipt)}
                                sx={{ minWidth: 44, minHeight: 44, border: '1px solid', borderColor: 'divider' }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteDialog({ open: true, receipt })}
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
          <PaymentReceiptPrint ref={printRef} payments={printReceipts} type="receipt" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPrintDialog(false)}>Close</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>
            Print {printReceipts.length > 1 ? `(${printReceipts.length} Receipts)` : 'Receipt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, receipt: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Receipt - {editDialog.receipt?.paymentNumber}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Customer"
                value={editDialog.receipt?.partyName || ''}
                disabled
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={editData.amount}
                onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">Rs.</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={editData.paymentDate}
                onChange={(e) => setEditData(prev => ({ ...prev, paymentDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remarks"
                value={editData.remarks}
                onChange={(e) => setEditData(prev => ({ ...prev, remarks: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, receipt: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Receipt"
        message={`Are you sure you want to delete receipt ${deleteDialog.receipt?.paymentNumber}? This will reverse the customer balance adjustment.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, receipt: null })}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default ReceiptList;
