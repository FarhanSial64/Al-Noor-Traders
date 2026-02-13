import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Tooltip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import productService from '../../services/productService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import toast from 'react-hot-toast';

const Brands = () => {
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await productService.getBrands();
      setBrands(response.data || []);
    } catch (error) {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (brand = null) => {
    if (brand) {
      setSelectedBrand(brand);
      setFormData({
        name: brand.name,
        description: brand.description || '',
      });
    } else {
      setSelectedBrand(null);
      setFormData({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedBrand(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async () => {
    try {
      if (selectedBrand) {
        await productService.updateBrand(selectedBrand._id, formData);
        toast.success('Brand updated successfully');
      } else {
        await productService.createBrand(formData);
        toast.success('Brand created successfully');
      }
      handleCloseDialog();
      fetchBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save brand');
    }
  };

  const handleDelete = async () => {
    try {
      await productService.deleteBrand(selectedBrand._id);
      toast.success('Brand deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedBrand(null);
      fetchBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete brand');
    }
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Brands"
        subtitle="Manage product brands"
        backUrl="/products"
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Brand
          </Button>
        }
      />

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand._id} hover>
                  <TableCell>{brand.name}</TableCell>
                  <TableCell>{brand.description || '-'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Brand">
                      <IconButton size="small" onClick={() => handleOpenDialog(brand)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Brand">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedBrand(brand);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {brands.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No brands found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Brand Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedBrand ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Brand"
        message={`Are you sure you want to delete "${selectedBrand?.name}"?`}
        confirmText="Delete"
        confirmColor="error"
      />
    </Box>
  );
};

export default Brands;
