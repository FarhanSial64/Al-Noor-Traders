import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  IconButton,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Star,
  EmojiEvents,
  ShoppingCart,
  LocalOffer,
  TrendingUp,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getMe } from '../../store/slices/authSlice';

const CustomerProfile = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState({
    points: 0,
    tier: 'Bronze',
    totalOrders: 0,
    totalSpent: 0,
    nextTierPoints: 500,
    tierProgress: 0,
  });
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    profilePicture: '',
  });

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Make parallel API calls for better performance
      const [userResponse, profileResponse] = await Promise.all([
        api.get('/auth/me', { skipCache: true }),
        api.get('/shop/profile', { skipCache: true }).catch(() => null)
      ]);
      
      const userData = userResponse.data.data;
      setProfileData(userData);
      setFormData({
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        profilePicture: userData.profilePicture || '',
      });

      // Use combined profile endpoint if available
      if (profileResponse?.data?.data?.loyalty) {
        setLoyaltyData(profileResponse.data.data.loyalty);
      } else if (userData.customerId) {
        // Fallback: fetch loyalty separately
        try {
          const loyaltyResponse = await api.get('/shop/loyalty');
          setLoyaltyData(loyaltyResponse.data.data);
        } catch {
          // If loyalty endpoint fails, use defaults
          setLoyaltyData({
            points: 0,
            tier: 'Bronze',
            totalOrders: 0,
            totalSpent: 0,
            nextTierPoints: 500,
            tierProgress: 0,
          });
        }
      }
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await api.put('/auth/profile', {
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        profilePicture: formData.profilePicture,
      });
      
      dispatch(getMe());
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [formData, dispatch]);

  // Compress image before upload for faster performance
  const compressImage = useCallback((file, maxWidth = 200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      try {
        // Compress image to max 200x200 pixels with 70% quality
        const compressedImage = await compressImage(file, 200, 0.7);
        setFormData(prev => ({ ...prev, profilePicture: compressedImage }));
      } catch (error) {
        toast.error('Failed to process image');
      }
    }
  }, [compressImage]);

  const tierColors = useMemo(() => ({
    Bronze: '#CD7F32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Platinum: '#E5E4E2',
  }), []);

  const getTierColor = useCallback((tier) => {
    return tierColors[tier] || '#CD7F32';
  }, [tierColors]);

  const tierProgress = useMemo(() => {
    if (loyaltyData.tierProgress !== undefined) {
      return loyaltyData.tierProgress;
    }
    if (loyaltyData.tier === 'Platinum') return 100;
    const tierThresholds = { Bronze: 0, Silver: 500, Gold: 1000, Platinum: 2000 };
    const currentThreshold = tierThresholds[loyaltyData.tier] || 0;
    const nextThreshold = loyaltyData.nextTierPoints;
    const progress = ((loyaltyData.points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [loyaltyData]);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  editing && (
                    <label htmlFor="profile-upload">
                      <input
                        accept="image/*"
                        id="profile-upload"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                      <IconButton
                        component="span"
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' },
                        }}
                        size="small"
                      >
                        <PhotoCamera fontSize="small" />
                      </IconButton>
                    </label>
                  )
                }
              >
                <Avatar
                  src={formData.profilePicture}
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: 48,
                    bgcolor: 'primary.main',
                    border: `4px solid ${getTierColor(loyaltyData.tier)}`,
                  }}
                >
                  {formData.fullName?.charAt(0) || 'C'}
                </Avatar>
              </Badge>
            </Box>

            <Typography variant="h5" fontWeight={600} gutterBottom>
              {formData.fullName}
            </Typography>
            
            <Chip
              icon={<Star />}
              label={`${loyaltyData.tier} Member`}
              sx={{
                bgcolor: getTierColor(loyaltyData.tier),
                color: loyaltyData.tier === 'Gold' ? 'black' : 'white',
                fontWeight: 600,
                mb: 2,
              }}
            />

            <Typography variant="body2" color="text.secondary" gutterBottom>
              {formData.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formData.phone}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {!editing ? (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setEditing(true)}
                fullWidth
              >
                Edit Profile
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      fullName: profileData.fullName || '',
                      email: profileData.email || '',
                      phone: profileData.phone || '',
                      address: profileData.address || '',
                      profilePicture: profileData.profilePicture || '',
                    });
                  }}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                  onClick={handleSave}
                  disabled={saving}
                  fullWidth
                >
                  Save
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Profile Details & Loyalty */}
        <Grid item xs={12} md={8}>
          {/* Loyalty Points Card */}
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <EmojiEvents sx={{ fontSize: 32, color: getTierColor(loyaltyData.tier) }} />
              <Typography variant="h6" fontWeight={600}>
                Loyalty Program
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Star sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h4" fontWeight={700}>
                      {loyaltyData.points}
                    </Typography>
                    <Typography variant="body2">Points</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <ShoppingCart sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h4" fontWeight={700}>
                      {loyaltyData.totalOrders}
                    </Typography>
                    <Typography variant="body2">Orders</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: 'warning.light', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <LocalOffer sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight={700}>
                      {formatCurrency(loyaltyData.totalSpent).replace('PKR', '').trim()}
                    </Typography>
                    <Typography variant="body2">Total Spent</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <TrendingUp sx={{ fontSize: 32, mb: 1 }} />
                    <Typography variant="h5" fontWeight={700}>
                      {loyaltyData.tier}
                    </Typography>
                    <Typography variant="body2">Tier</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {loyaltyData.tier !== 'Platinum' && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Progress to next tier
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loyaltyData.points} / {loyaltyData.nextTierPoints} points
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={tierProgress}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getTierColor(loyaltyData.tier),
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Earn {loyaltyData.nextTierPoints - loyaltyData.points} more points to reach{' '}
                  {loyaltyData.tier === 'Bronze' ? 'Silver' : loyaltyData.tier === 'Silver' ? 'Gold' : 'Platinum'} tier!
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              How to earn points:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="1 point per PKR 100 spent" size="small" variant="outlined" />
              <Chip label="50 bonus points on first order" size="small" variant="outlined" />
              <Chip label="Double points on weekends" size="small" variant="outlined" />
            </Box>
          </Paper>

          {/* Profile Information */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Person color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h6" fontWeight={600}>
                Profile Information
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={!editing}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={formData.email}
                  disabled
                  size="small"
                  helperText="Email cannot be changed"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!editing}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={profileData?.username || ''}
                  disabled
                  size="small"
                  helperText="Username cannot be changed"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!editing}
                  size="small"
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerProfile;
