import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  InputAdornment,
  Tooltip,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Search, Edit, Block, CheckCircle } from '@mui/icons-material';
import productService from '../../services/productService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const ProductList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useSelector((state) => state.auth);
  const isOrderBooker = user?.role === 'order_booker';
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 25,
    total: 0,
  });
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts({
        page: pagination.page + 1,
        limit: pagination.limit,
        search,
      });
      setProducts(response.data);
      setPagination((prev) => ({ ...prev, total: response.pagination.total }));
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 0 }));
    fetchProducts();
  };

  const handlePageChange = (event, newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0,
    }));
  };

  const handleToggleActive = async (product) => {
    try {
      await productService.updateProduct(product._id, { isActive: !product.isActive });
      toast.success(`Product ${product.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStockColor = (product) => {
    if (product.currentStock <= 0) return 'error';
    if (product.currentStock <= product.minimumStock) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle={isOrderBooker ? "View product catalog" : "Manage your product catalog"}
        action={
          !isOrderBooker && (
            <Button
              variant="contained"
              startIcon={!isMobile && <Add />}
              onClick={() => navigate('/products/new')}
              size={isMobile ? "medium" : "large"}
            >
              {isMobile ? <Add /> : 'Add Product'}
            </Button>
          )
        }
      />

      {/* Search Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              placeholder={isMobile ? "Search products..." : "Search by name, code, or barcode..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="outlined" type="submit" sx={{ minWidth: 'auto', px: { xs: 1.5, sm: 2 } }}>
              <Search />
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <Loading />
        ) : (
          <>
            {/* Desktop Table View */}
            {!isMobile && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Product Name</TableCell>
                      {!isOrderBooker && <TableCell>Category</TableCell>}
                      {!isOrderBooker && <TableCell>Brand</TableCell>}
                      <TableCell align="right">{isOrderBooker ? 'Avg Sale Price' : 'Suggested Price'}</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      {!isOrderBooker && <TableCell>Status</TableCell>}
                      {!isOrderBooker && <TableCell align="center">Actions</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product._id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{product.sku}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        {!isOrderBooker && <TableCell>{product.category?.name || '-'}</TableCell>}
                        {!isOrderBooker && <TableCell>{product.brand?.name || '-'}</TableCell>}
                        <TableCell align="right">
                          {formatCurrency(product.suggestedRetailPrice)}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={product.currentStock}
                            size="small"
                            color={getStockColor(product)}
                          />
                        </TableCell>
                        {!isOrderBooker && (
                          <TableCell>
                            <Chip
                              label={product.isActive ? 'Active' : 'Inactive'}
                              size="small"
                              color={product.isActive ? 'success' : 'default'}
                            />
                          </TableCell>
                        )}
                        {!isOrderBooker && (
                          <TableCell align="center">
                            <Tooltip title="Edit Product">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/products/${product._id}/edit`)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={product.isActive ? 'Deactivate Product' : 'Activate Product'}>
                              <IconButton size="small" onClick={() => handleToggleActive(product)} color={product.isActive ? 'error' : 'success'}>
                                {product.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {products.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isOrderBooker ? 4 : 8} align="center">
                          No products found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Mobile Card View */}
            {isMobile && (
              <Box sx={{ p: 1.5 }}>
                {products.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No products found
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {products.map((product) => (
                      <Paper
                        key={product._id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          borderColor: 'divider',
                        }}
                      >
                        {/* Header row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {product.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {product.sku}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                            <Chip
                              label={product.currentStock}
                              size="small"
                              color={getStockColor(product)}
                            />
                            {!isOrderBooker && (
                              <Chip
                                label={product.isActive ? 'Active' : 'Off'}
                                size="small"
                                color={product.isActive ? 'success' : 'default'}
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Details */}
                        {!isOrderBooker && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Category:</Typography>
                            <Typography variant="body2">{product.category?.name || '-'}</Typography>
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {isOrderBooker ? 'Avg Price:' : 'Suggested:'}
                          </Typography>
                          <Typography variant="body2" fontWeight={600} color="primary.main">
                            {formatCurrency(product.suggestedRetailPrice)}
                          </Typography>
                        </Box>

                        {/* Action buttons - Only for non-order bookers */}
                        {!isOrderBooker && (
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              gap: 1, 
                              pt: 1, 
                              borderTop: '1px solid', 
                              borderColor: 'divider',
                            }}
                          >
                            <Button 
                              size="small" 
                              variant="outlined" 
                              startIcon={<Edit />}
                              onClick={() => navigate(`/products/${product._id}/edit`)}
                              sx={{ flex: 1, minHeight: 44 }}
                            >
                              Edit
                            </Button>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(product)}
                              color={product.isActive ? 'error' : 'success'}
                              sx={{ minWidth: 44, minHeight: 44, border: '1px solid', borderColor: 'divider' }}
                            >
                              {product.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                            </IconButton>
                          </Box>
                        )}
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
              onPageChange={handlePageChange}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[10, 25, 50, 100]}
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
    </Box>
  );
};

export default ProductList;
