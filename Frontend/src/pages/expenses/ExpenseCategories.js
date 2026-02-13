import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Button, Typography, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, FormControl, InputLabel, Select, MenuItem,
  Tooltip, Chip
} from '@mui/material';
import { Add, ArrowBack, Edit, Delete, Category } from '@mui/icons-material';
import expenseService from '../../services/expenseService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const ExpenseCategories = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isDistributor = user?.role === 'distributor';
  const canManage = ['distributor', 'computer_operator'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, category: null });
  const [formData, setFormData] = useState({
    _id: null,
    name: '',
    description: '',
    expenseAccount: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, accountsRes] = await Promise.all([
        expenseService.getCategories(),
        expenseService.getExpenseAccounts()
      ]);
      setCategories(categoriesRes.data || []);
      setExpenseAccounts(accountsRes.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setFormData({
        _id: category._id,
        name: category.name,
        description: category.description || '',
        expenseAccount: category.expenseAccount?._id || ''
      });
    } else {
      setFormData({
        _id: null,
        name: '',
        description: '',
        expenseAccount: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ _id: null, name: '', description: '', expenseAccount: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        expenseAccount: formData.expenseAccount || undefined
      };

      if (formData._id) {
        await expenseService.updateCategory(formData._id, data);
        toast.success('Category updated successfully');
      } else {
        await expenseService.createCategory(data);
        toast.success('Category created successfully');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteClick = (category) => {
    setDeleteDialog({ open: true, category });
  };

  const handleDeleteConfirm = async () => {
    try {
      await expenseService.deleteCategory(deleteDialog.category._id);
      toast.success('Category deleted successfully');
      setDeleteDialog({ open: false, category: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Expense Categories"
        subtitle="Manage expense categories for better tracking"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/expenses')}
            >
              Back to Expenses
            </Button>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                New Category
              </Button>
            )}
          </Box>
        }
      />

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Category Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Linked Account</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  {canManage && <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} align="center" sx={{ py: 4 }}>
                      <Category sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                      <Typography color="text.secondary">No categories found</Typography>
                      {canManage && (
                        <Button
                          variant="text"
                          color="primary"
                          onClick={() => handleOpenDialog()}
                          sx={{ mt: 1 }}
                        >
                          Create First Category
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category._id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{category.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {category.description || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {category.expenseAccount ? (
                          <Chip
                            label={`${category.expenseAccount.accountCode} - ${category.expenseAccount.accountName}`}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">Not linked</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={category.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={category.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell align="center">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(category)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isDistributor && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteClick(category)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {formData._id ? 'Edit Category' : 'New Expense Category'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Category Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Utilities, Transport, Office Supplies"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of this expense category"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Link to Expense Account</InputLabel>
                <Select
                  name="expenseAccount"
                  value={formData.expenseAccount}
                  onChange={handleChange}
                  label="Link to Expense Account"
                >
                  <MenuItem value="">
                    <em>None (Use default expense account)</em>
                  </MenuItem>
                  {expenseAccounts.map((account) => (
                    <MenuItem key={account._id} value={account._id}>
                      {account.accountCode} - {account.accountName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Link to a specific expense account in your Chart of Accounts for accurate P&L
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {formData._id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteDialog.category?.name}"? This cannot be undone if no expenses are using this category.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, category: null })}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default ExpenseCategories;
