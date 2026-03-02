import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Button, IconButton, Chip, Tooltip, Typography, Paper, useTheme, useMediaQuery } from '@mui/material';
import { Add, Visibility, Edit, Delete } from '@mui/icons-material';
import purchaseService from '../../services/purchaseService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const PurchaseList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector(state => state.auth);
  // KPO and Distributor can edit/delete any purchase at any status
  const canEditDelete = user?.role === 'distributor' || user?.role === 'computer_operator';
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, purchase: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchPurchases(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, status]);

  const fetchPurchases = async () => {
    try { setLoading(true); const response = await purchaseService.getPurchases({ page: pagination.page + 1, limit: pagination.limit, search, status }); setPurchases(response.data); setPagination(prev => ({ ...prev, total: response.pagination.total })); } catch (error) { toast.error('Failed to load purchases'); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteDialog.purchase) return;
    try {
      setDeleting(true);
      await purchaseService.deletePurchase(deleteDialog.purchase._id);
      toast.success('Purchase deleted successfully');
      setDeleteDialog({ open: false, purchase: null });
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete purchase');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const getStatusColor = (s) => ({ draft: 'default', ordered: 'info', received: 'success', partial: 'warning', cancelled: 'error' }[s] || 'default');

  const MobileCard = ({ purchase }) => (
    <Paper sx={{ p: 2, mb: 1.5 }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="600">{purchase.purchaseNumber}</Typography>
          <Typography variant="caption" color="text.secondary">{new Date(purchase.purchaseDate).toLocaleDateString()}</Typography>
        </Box>
        <Chip label={purchase.status} size="small" color={getStatusColor(purchase.status)} />
      </Box>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="body2"><strong>Vendor:</strong> {purchase.vendorName || purchase.vendor?.businessName}</Typography>
        <Typography variant="body2"><strong>By:</strong> {purchase.enteredByName || purchase.enteredBy?.name}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" color="primary.main" fontWeight="700">{formatCurrency(purchase.grandTotal)}</Typography>
        <Box>
          {canEditDelete && (
            <>
              <IconButton size="small" onClick={() => navigate(`/purchases/${purchase._id}/edit`)} color="primary" sx={{ minWidth: 44, minHeight: 44 }}>
                <Edit />
              </IconButton>
              <IconButton size="small" onClick={() => setDeleteDialog({ open: true, purchase })} color="error" sx={{ minWidth: 44, minHeight: 44 }}>
                <Delete />
              </IconButton>
            </>
          )}
          <IconButton size="small" onClick={() => navigate(`/purchases/${purchase._id}`)} sx={{ minWidth: 44, minHeight: 44 }}>
            <Visibility />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <Box>
      <PageHeader title="Purchases" subtitle="Manage vendor purchases" action={<Button variant="contained" startIcon={<Add />} onClick={() => navigate('/purchases/new')} sx={{ minHeight: 44 }}>New Purchase</Button>} />
      
      {/* Professional Search & Filters */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        onSearch={() => { setPagination(prev => ({ ...prev, page: 0 })); fetchPurchases(); }}
        searchPlaceholder="Search by PO # or vendor..."
        showDateFilters={false}
        filters={[
          {
            name: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: '', label: 'All' },
              { value: 'draft', label: 'Draft' },
              { value: 'ordered', label: 'Ordered' },
              { value: 'received', label: 'Received' },
              { value: 'cancelled', label: 'Cancelled' }
            ]
          }
        ]}
        onFilterChange={(name, value) => setStatus(value)}
        hasActiveFilters={!!status}
        onClearFilters={() => { setSearch(''); setStatus(''); fetchPurchases(); }}
      />

      {/* Content */}
      <Card>
        {loading ? <Loading /> : (
          <>
            {isMobile ? (
              <Box sx={{ p: 1.5 }}>
                {purchases.map(purchase => <MobileCard key={purchase._id} purchase={purchase} />)}
                {purchases.length === 0 && <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No purchases found</Typography>}
              </Box>
            ) : (
              <TableContainer><Table>
                <TableHead><TableRow><TableCell>PO #</TableCell><TableCell>Date</TableCell><TableCell>Vendor</TableCell><TableCell>Entered By</TableCell><TableCell align="right">Total</TableCell><TableCell>Status</TableCell><TableCell align="center">Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {purchases.map(purchase => (
                    <TableRow key={purchase._id} hover>
                      <TableCell>{purchase.purchaseNumber}</TableCell>
                      <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                      <TableCell>{purchase.vendorName || purchase.vendor?.businessName}</TableCell>
                      <TableCell>{purchase.enteredByName || purchase.enteredBy?.name}</TableCell>
                      <TableCell align="right">{formatCurrency(purchase.grandTotal)}</TableCell>
                      <TableCell><Chip label={purchase.status} size="small" color={getStatusColor(purchase.status)} /></TableCell>
                      <TableCell align="center">
                        {canEditDelete && (
                          <>
                            <Tooltip title="Edit Purchase">
                              <IconButton size="small" onClick={() => navigate(`/purchases/${purchase._id}/edit`)} color="primary">
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Purchase">
                              <IconButton size="small" onClick={() => setDeleteDialog({ open: true, purchase })} color="error">
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="View Purchase Details">
                          <IconButton size="small" onClick={() => navigate(`/purchases/${purchase._id}`)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {purchases.length === 0 && <TableRow><TableCell colSpan={7} align="center">No purchases found</TableCell></TableRow>}
                </TableBody>
              </Table></TableContainer>
            )}
            <TablePagination 
              component="div" 
              count={pagination.total} 
              page={pagination.page} 
              onPageChange={(e, p) => setPagination(prev => ({ ...prev, page: p }))} 
              rowsPerPage={pagination.limit} 
              onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 0 }))} 
              rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50]}
              labelRowsPerPage={isMobile ? '' : 'Rows:'}
              sx={{ '.MuiTablePagination-selectLabel': { display: isMobile ? 'none' : 'block' } }}
            />
          </>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Purchase"
        message={`Are you sure you want to delete purchase ${deleteDialog.purchase?.purchaseNumber}? This will reverse all inventory and accounting entries.`}
        confirmText="Delete"
        confirmColor="error"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialog({ open: false, purchase: null })}
      />
    </Box>
  );
};

export default PurchaseList;
