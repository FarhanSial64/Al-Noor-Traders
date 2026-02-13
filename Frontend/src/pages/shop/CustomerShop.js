import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Badge,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  Add,
  Remove,
  Delete,
  Store,
  FilterList,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import shopService from '../../services/shopService';
import { debounce, formatCurrency } from '../../utils/helpers';

const CustomerShop = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);

  // Debounced search handler using useMemo to avoid ESLint warning
  const debouncedSetSearch = useMemo(
    () => debounce((value) => {
      setDebouncedSearch(value);
    }, 400),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSetSearch(value);
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      if (debouncedSearch) params.search = debouncedSearch;
      
      const response = await shopService.getProducts(params);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await shopService.getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  const addToCart = useCallback((product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product._id === product._id);
      
      if (existingItem) {
        if (existingItem.quantity >= product.stock) {
          toast.error('Maximum available stock reached');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { product, quantity: 1 }];
      }
    });
    toast.success(`${product.name} added to cart`);
  }, []);

  const updateQuantity = useCallback((productId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty < 1) return null;
            if (newQty > item.product.stock) {
              toast.error('Maximum available stock reached');
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.product._id !== productId));
    toast.success('Item removed from cart');
  }, []);

  // Memoize cart total to avoid recalculation on every render
  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.product.salePrice * item.quantity,
      0
    );
  }, [cart]);

  const getCartTotal = () => cartTotal;

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setPlacing(true);
      const orderData = {
        items: cart.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
        })),
      };

      const response = await shopService.placeOrder(orderData);
      
      toast.success(`Order ${response.data.orderNumber} placed successfully!`);
      setCart([]);
      setCartOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Store color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={600}>
              Al Noor Traders Shop
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Search */}
            <Box component="form" onSubmit={handleSearch}>
              <TextField
                size="small"
                placeholder="Search products..."
                value={search}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 250 }}
              />
            </Box>

            {/* Category Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
                startAdornment={<FilterList sx={{ mr: 1 }} />}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat._id} value={cat._id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Cart Button */}
            <IconButton
              color="primary"
              onClick={() => setCartOpen(true)}
              sx={{ bgcolor: 'primary.light', color: 'white' }}
            >
              <Badge badgeContent={cart.length} color="error">
                <ShoppingCart />
              </Badge>
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Products Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={60} />
        </Box>
      ) : products.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>
          No products available. Please check back later.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {products.map((product) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardMedia
                  component="div"
                  sx={{
                    height: 160,
                    bgcolor: 'grey.100',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Store sx={{ fontSize: 60, color: 'grey.400' }} />
                </CardMedia>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="h2" noWrap>
                    {product.name}
                  </Typography>

                  <Box sx={{ mb: 1 }}>
                    <Chip
                      label={product.category?.name || 'Uncategorized'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={product.brand?.name || 'No Brand'}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" noWrap>
                    SKU: {product.sku}
                  </Typography>

                  <Typography
                    variant="h5"
                    color="primary"
                    fontWeight={700}
                    sx={{ mt: 1 }}
                  >
                    {formatCurrency(product.salePrice)}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    per {product.unit?.name || 'unit'}
                  </Typography>

                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={`${product.stock} in stock`}
                      size="small"
                      color={product.stock > 10 ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Add />}
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0 || product.salePrice === 0}
                  >
                    Add to Cart
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
            Shopping Cart ({cart.length} items)
          </Typography>
        </Box>

        <Divider />

        {cart.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ShoppingCart sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
            <Typography color="text.secondary">Your cart is empty</Typography>
          </Box>
        ) : (
          <>
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
              {cart.map((item) => (
                <React.Fragment key={item.product._id}>
                  <ListItem sx={{ py: 2 }}>
                    <ListItemText
                      primary={item.product.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="primary">
                            {formatCurrency(item.product.salePrice)} x{' '}
                            {item.quantity}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            = {formatCurrency(item.product.salePrice * item.quantity)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item.product._id, -1)}
                        >
                          <Remove />
                        </IconButton>
                        <Typography>{item.quantity}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(item.product._id, 1)}
                        >
                          <Add />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeFromCart(item.product._id)}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>

            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary" fontWeight={700}>
                  {formatCurrency(getCartTotal())}
                </Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={placeOrder}
                disabled={placing}
              >
                {placing ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Place Order'
                )}
              </Button>
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
};

export default CustomerShop;
