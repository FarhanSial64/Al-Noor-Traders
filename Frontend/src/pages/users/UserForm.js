import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Grid, TextField, Button, MenuItem, FormControlLabel, Switch, CircularProgress, Alert } from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import userService from '../../services/userService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', username: '', email: '', phone: '', password: '', confirmPassword: '', role: 'order_booker', isActive: true });
  const [errors, setErrors] = useState({});

  useEffect(() => { if (isEdit) fetchUser(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchUser = async () => {
    try { setLoading(true); const response = await userService.getUser(id); setFormData({ ...formData, ...response.data, password: '', confirmPassword: '' }); } catch (error) { toast.error('Failed to load user'); } finally { setLoading(false); }
  };

  const handleChange = (e) => { 
    const { name, value, type, checked } = e.target; 
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); 
    // Clear error when field is modified
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName?.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.username?.trim()) newErrors.username = 'Username is required';
    else if (formData.username.length < 3 || formData.username.length > 30) newErrors.username = 'Username must be 3-30 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) newErrors.username = 'Username can only contain letters, numbers, and underscores';
    
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    
    if (!isEdit) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.role) newErrors.role = 'Role is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    try {
      setSaving(true);
      const userData = { ...formData };
      delete userData.confirmPassword;
      if (isEdit && !userData.password) delete userData.password;
      
      if (isEdit) { await userService.updateUser(id, userData); toast.success('User updated'); } 
      else { await userService.createUser(userData); toast.success('User created successfully. Login credentials have been sent to their email.'); }
      navigate('/users');
    } catch (error) { 
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        const backendErrors = {};
        error.response.data.errors.forEach(err => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error(error.response?.data?.message || 'Failed to save user'); 
      }
    } finally { setSaving(false); }
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader title={isEdit ? 'Edit User' : 'Add New User'} backUrl="/users" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}><Alert severity="info">Roles: <strong>Distributor</strong> (Full Access) | <strong>Computer Operator</strong> (KPO - Data Entry) | <strong>Order Booker</strong> (Field Sales) | <strong>Customer</strong> (Limited)</Alert></Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Full Name *" name="fullName" value={formData.fullName} onChange={handleChange} required 
                      error={Boolean(errors.fullName)} helperText={errors.fullName} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Username *" name="username" value={formData.username} onChange={handleChange} required disabled={isEdit} 
                      error={Boolean(errors.username)} helperText={errors.username || 'Letters, numbers, underscores only'} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} required
                      error={Boolean(errors.email)} helperText={errors.email || 'Login credentials will be sent to this email'} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Phone" name="phone" value={formData.phone} onChange={handleChange}
                      error={Boolean(errors.phone)} helperText={errors.phone} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="Role *" name="role" value={formData.role} onChange={handleChange}
                      error={Boolean(errors.role)} helperText={errors.role}>
                      <MenuItem value="distributor">Distributor (Admin)</MenuItem>
                      <MenuItem value="computer_operator">Computer Operator (KPO)</MenuItem>
                      <MenuItem value="order_booker">Order Booker (Sales)</MenuItem>
                      <MenuItem value="customer">Customer</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={6}><FormControlLabel control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" />} label="Active" /></Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label={isEdit ? 'New Password (leave blank to keep)' : 'Password *'} name="password" type="password" 
                      value={formData.password} onChange={handleChange} required={!isEdit}
                      error={Boolean(errors.password)} helperText={errors.password || 'Minimum 6 characters'} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" 
                      value={formData.confirmPassword} onChange={handleChange} required={!isEdit || formData.password}
                      error={Boolean(errors.confirmPassword)} helperText={errors.confirmPassword} />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate('/users')}>Cancel</Button>
                      <Button type="submit" variant="contained" startIcon={saving ? <CircularProgress size={20} /> : <Save />} disabled={saving}>{isEdit ? 'Update' : 'Create'}</Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UserForm;
