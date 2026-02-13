import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, Button, Chip, Grid,
  Typography, Paper, IconButton, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import {
  Add, Receipt, AccountBalanceWallet, Edit, Delete, Category
} from '@mui/icons-material';
import expenseService from '../../services/expenseService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import toast from 'react-hot-toast';

const ExpenseList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state) => state.auth);
  const isDistributor = user?.role === 'distributor';
  const canCreate = ['distributor', 'computer_operator'].includes(user?.role);
  
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, count: 0 });
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    category: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, expense: null });

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseService.getExpenses({
        page: pagination.page + 1,
        limit: pagination.limit,
        search: filters.search || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        category: filters.category || undefined
      });
      setExpenses(response.data);
      setSummary(response.summary || { totalAmount: 0, count: 0 });
      setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 }));
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (expense) => {
    setDeleteDialog({ open: true, expense });
  };

  const handleDeleteConfirm = async () => {
    try {
      await expenseService.deleteExpense(deleteDialog.expense._id);
      toast.success('Expense deleted successfully');
      setDeleteDialog({ open: false, expense: null });
      fetchExpenses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete expense');
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'cash': return 'success';
      case 'bank_transfer': return 'primary';
      case 'cheque': return 'warning';
      case 'online': return 'info';
      default: return 'default';
    }
  };

  const formatPaymentMethod = (method) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'bank_transfer': return 'Bank Transfer';
      case 'cheque': return 'Cheque';
      case 'online': return 'Online';
      default: return method;
    }
  };

  const MobileCard = ({ expense }) => (
    <Paper sx={{ p: 2, mb: 1.5 }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="600" color="primary">{expense.expenseNumber}</Typography>
          <Typography variant="caption" color="text.secondary">{formatDate(expense.expenseDate)}</Typography>
        </Box>
        <Chip label={expense.categoryName || expense.category?.name || '-'} size="small" variant="outlined" color="secondary" />
      </Box>
      <Typography variant="body2" sx={{ mb: 1 }} noWrap>{expense.description}</Typography>
      {expense.vendorName && <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Vendor: {expense.vendorName}</Typography>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" color="error.main" fontWeight="700">{formatCurrency(expense.amount)}</Typography>
          <Chip label={formatPaymentMethod(expense.paymentMethod)} size="small" color={getPaymentMethodColor(expense.paymentMethod)} />
        </Box>
        {isDistributor && (
          <Box>
            <IconButton size="small" color="primary" onClick={() => navigate(`/expenses/${expense._id}/edit`)} sx={{ minWidth: 44, minHeight: 44 }}><Edit /></IconButton>
            <IconButton size="small" color="error" onClick={() => handleDeleteClick(expense)} sx={{ minWidth: 44, minHeight: 44 }}><Delete /></IconButton>
          </Box>
        )}
      </Box>
    </Paper>
  );

  if (loading && expenses.length === 0) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Expenses"
        subtitle="Track and manage business expenses"
        action={
          <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button
              variant="outlined"
              startIcon={<Category />}
              onClick={() => navigate('/expenses/categories')}
              sx={{ minHeight: 44 }}
            >
              Categories
            </Button>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/expenses/new')}
                sx={{ minHeight: 44 }}
              >
                New Expense
              </Button>
            )}
          </Box>
        }
      />

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '1px solid',
              borderColor: 'error.light'
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'error.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AccountBalanceWallet sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Total Expenses
              </Typography>
              <Typography variant="h5" fontWeight={700} color="error.dark">
                {formatCurrency(summary.totalAmount)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              border: '1px solid',
              borderColor: 'primary.light'
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Receipt sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Total Entries
              </Typography>
              <Typography variant="h5" fontWeight={700} color="primary.dark">
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
        onSearch={() => { setPagination(prev => ({ ...prev, page: 0 })); fetchExpenses(); }}
        searchPlaceholder="Search by expense # or description..."
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
        onEndDateChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
        showDateFilters={true}
        hasActiveFilters={!!(filters.startDate || filters.endDate)}
        onClearFilters={() => { setFilters({ search: '', startDate: '', endDate: '', category: '' }); setPagination(prev => ({ ...prev, page: 0 })); setTimeout(fetchExpenses, 0); }}
      />

      {/* Expenses Content */}
      <Card>
        {isMobile ? (
          <Box sx={{ p: 1.5 }}>
            {expenses.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No expenses found</Typography>
            ) : (
              expenses.map((expense) => <MobileCard key={expense._id} expense={expense} />)
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600 }}>Expense #</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                {isDistributor && <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDistributor ? 8 : 7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No expenses found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow
                    key={expense._id}
                    hover
                    sx={{ '&:last-child td': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography fontWeight={600} color="primary">
                        {expense.expenseNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={expense.categoryName || expense.category?.name || '-'}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                        {expense.description}
                      </Typography>
                      {expense.vendorName && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Vendor: {expense.vendorName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatPaymentMethod(expense.paymentMethod)}
                        size="small"
                        color={getPaymentMethodColor(expense.paymentMethod)}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={600} color="error.main">
                        {formatCurrency(expense.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {expense.createdByName || expense.createdBy?.fullName || '-'}
                      </Typography>
                    </TableCell>
                    {isDistributor && (
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => navigate(`/expenses/${expense._id}/edit`)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(expense)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page}
          onPageChange={(e, newPage) => setPagination(prev => ({ ...prev, page: newPage }))}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(e) => setPagination({ page: 0, limit: parseInt(e.target.value, 10), total: pagination.total })}
          rowsPerPageOptions={isMobile ? [10, 25] : [10, 25, 50, 100]}
          labelRowsPerPage={isMobile ? '' : 'Rows:'}
          sx={{ '.MuiTablePagination-selectLabel': { display: isMobile ? 'none' : 'block' } }}
        />
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Expense"
        message={`Are you sure you want to delete expense ${deleteDialog.expense?.expenseNumber}? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, expense: null })}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default ExpenseList;
