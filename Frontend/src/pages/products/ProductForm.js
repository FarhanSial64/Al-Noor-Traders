import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Typography,
  Avatar,
} from '@mui/material';
import { Save, Cancel, CloudUpload } from '@mui/icons-material';
import productService from '../../services/productService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    barcode: '',
    description: '',
    category: '',
    brand: '',
    piecesPerCarton: 1,
    suggestedRetailPrice: '',
    minimumStock: 10,
    maximumStock: 100,
    isActive: true,
    image: null,
  });

  useEffect(() => {
    fetchFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, brandsRes] = await Promise.all([
        productService.getCategories(),
        productService.getBrands(),
      ]);

      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);

      if (isEdit) {
        const productRes = await productService.getProduct(id);
        const product = productRes.data;
        setFormData({
          sku: product.sku || '',
          name: product.name || '',
          barcode: product.barcode || '',
          description: product.description || '',
          category: product.category?._id || '',
          brand: product.brand?._id || '',
          piecesPerCarton: product.piecesPerCarton || 1,
          suggestedRetailPrice: product.suggestedRetailPrice || '',
          minimumStock: product.minimumStock || 10,
          maximumStock: product.maximumStock || 100,
          isActive: product.isActive !== false,
          image: product.image || null,
        });
        if (product.image) {
          setImagePreview(product.image);
        }
      }
    } catch (error) {
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await productService.updateProduct(id, formData);
        toast.success('Product updated successfully');
      } else {
        await productService.createProduct(formData);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit Product' : 'Add New Product'}
        backUrl="/products"
      />

      <Card>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Product Image Upload */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Product Image
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={imagePreview}
                    variant="rounded"
                    sx={{ width: 120, height: 120, bgcolor: 'grey.200' }}
                  >
                    {!imagePreview && 'No Image'}
                  </Avatar>
                  <Box>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      id="product-image-input"
                    />
                    <label htmlFor="product-image-input">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUpload />}
                        size="small"
                      >
                        Upload Image
                      </Button>
                    </label>
                    {imagePreview && (
                      <Button
                        size="small"
                        color="error"
                        onClick={handleRemoveImage}
                        sx={{ ml: 1 }}
                      >
                        Remove
                      </Button>
                    )}
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                      Max size: 2MB. Recommended: 300x300px
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SKU (Product Code)"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  helperText="Unique product identifier"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Barcode"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  select
                  label="Brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  required
                >
                  {brands.map((brand) => (
                    <MenuItem key={brand._id} value={brand._id}>
                      {brand.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Pieces per Carton"
                  name="piecesPerCarton"
                  type="number"
                  value={formData.piecesPerCarton}
                  onChange={handleChange}
                  inputProps={{ min: 1 }}
                  helperText="How many pieces in one carton"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Suggested Retail Price"
                  name="suggestedRetailPrice"
                  type="number"
                  value={formData.suggestedRetailPrice}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                  helperText="Reference price only - actual sale price is entered per order"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Minimum Stock"
                  name="minimumStock"
                  type="number"
                  value={formData.minimumStock}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                  helperText="Alert when stock falls below this level"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Maximum Stock"
                  name="maximumStock"
                  type="number"
                  value={formData.maximumStock}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                  helperText="Maximum stock capacity"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleChange}
                      name="isActive"
                    />
                  }
                  label="Active"
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={() => navigate('/products')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                    disabled={saving}
                  >
                    {isEdit ? 'Update' : 'Create'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProductForm;
