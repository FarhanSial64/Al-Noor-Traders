import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  CircularProgress,
  Badge,
  Alert,
  InputAdornment,
  Tabs,
  Tab,
  Fade,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Lock,
  Visibility,
  VisibilityOff,
  Email,
  Phone,
  Home,
  Badge as BadgeIcon,
  Work,
  CheckCircle,
  Security,
  AccountCircle,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getMe } from '../../store/slices/authSlice';

// Tab Panel Component
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`profile-tabpanel-${index}`}
    aria-labelledby={`profile-tab-${index}`}
    {...other}
  >
    {value === index && <Fade in={value === index}><Box sx={{ py: 3 }}>{children}</Box></Fade>}
  </div>
);

const ProfileManagement = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    profilePicture: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      const userData = response.data.data;
      setProfileData(userData);
      setFormData({
        fullName: userData.fullName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
        profilePicture: userData.profilePicture || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Calculate password strength
  useEffect(() => {
    const password = passwordData.newPassword;
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    setPasswordStrength(Math.min(100, strength));
  }, [passwordData.newPassword]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return 'error';
    if (passwordStrength < 60) return 'warning';
    return 'success';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 30) return 'Weak';
    if (passwordStrength < 60) return 'Medium';
    return 'Strong';
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePasswordChange = useCallback((e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!formData.fullName?.trim()) {
      toast.error('Full name is required');
      return;
    }

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

  const handleChangePassword = useCallback(async () => {
    // Validation
    if (!passwordData.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!passwordData.newPassword) {
      toast.error('New password is required');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }, [passwordData]);

  // Compress image before upload
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
        const compressedImage = await compressImage(file, 200, 0.7);
        setFormData(prev => ({ ...prev, profilePicture: compressedImage }));
      } catch (error) {
        toast.error('Failed to process image');
      }
    }
  }, [compressImage]);

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getRoleLabel = (role) => {
    const labels = {
      distributor: 'Distributor',
      computer_operator: 'Computer Operator',
      order_booker: 'Order Booker',
      customer: 'Customer',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      distributor: '#1976d2',
      computer_operator: '#7b1fa2',
      order_booker: '#388e3c',
      customer: '#f57c00',
    };
    return colors[role] || '#757575';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          mb: 3,
          background: `linear-gradient(135deg, ${getRoleColor(user?.role)} 0%, ${getRoleColor(user?.role)}99 100%)`,
          borderRadius: 3,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
          <AccountCircle sx={{ fontSize: { xs: 32, sm: 40 } }} />
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
              My Profile
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, display: { xs: 'none', sm: 'block' } }}>
              Manage your account settings and preferences
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Profile Card - Left Side */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2, sm: 3 },
              textAlign: 'center',
              borderRadius: 3,
              background: 'linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%)',
            }}
          >
            {/* Profile Picture */}
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
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
                          boxShadow: 3,
                          '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.1)' },
                          transition: 'all 0.2s ease-in-out',
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
                    width: { xs: 100, sm: 140 },
                    height: { xs: 100, sm: 140 },
                    fontSize: { xs: 40, sm: 56 },
                    bgcolor: getRoleColor(user?.role),
                    border: '4px solid white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': { transform: editing ? 'scale(1.05)' : 'none' },
                  }}
                >
                  {formData.fullName?.charAt(0) || 'U'}
                </Avatar>
              </Badge>
              {profileData?.isActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    right: editing ? -5 : 10,
                    bgcolor: 'success.main',
                    borderRadius: '50%',
                    p: 0.3,
                    border: '2px solid white',
                  }}
                >
                  <CheckCircle sx={{ color: 'white', fontSize: 16 }} />
                </Box>
              )}
            </Box>

            {/* User Info */}
            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              {formData.fullName}
            </Typography>
            
            <Chip
              icon={<Work sx={{ fontSize: 18 }} />}
              label={getRoleLabel(user?.role)}
              sx={{
                bgcolor: `${getRoleColor(user?.role)}15`,
                color: getRoleColor(user?.role),
                fontWeight: 600,
                mb: 2,
                px: 1,
              }}
            />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5, wordBreak: 'break-all' }}>
                <Email fontSize="small" sx={{ flexShrink: 0 }} /> {formData.email}
              </Typography>
              {formData.phone && (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <Phone fontSize="small" /> {formData.phone}
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Edit/Save Buttons */}
            {!editing ? (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setEditing(true)}
                fullWidth
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  boxShadow: 2,
                  '&:hover': { boxShadow: 4 },
                }}
              >
                Edit Profile
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1.5 }}>
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
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
                  onClick={handleSaveProfile}
                  disabled={saving}
                  fullWidth
                  sx={{ py: 1.5, borderRadius: 2, fontWeight: 600 }}
                >
                  Save
                </Button>
              </Box>
            )}

            {/* Account Stats */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Member Since
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {profileData?.createdAt 
                  ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </Typography>
              {profileData?.lastLogin && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Last Login
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(profileData.lastLogin).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Details Panel - Right Side */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {/* Tabs */}
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                bgcolor: 'grey.50',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiTab-root': {
                  fontWeight: 600,
                  py: 2,
                  minWidth: { xs: 'auto', sm: 120 },
                  px: { xs: 2, sm: 3 },
                },
              }}
            >
              <Tab 
                icon={<Person sx={{ fontSize: 20 }} />} 
                iconPosition="start" 
                label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Personal Info</Box>}
                aria-label="Personal Info"
              />
              <Tab 
                icon={<Security sx={{ fontSize: 20 }} />} 
                iconPosition="start" 
                label={<Box sx={{ display: { xs: 'none', sm: 'block' } }}>Security</Box>}
                aria-label="Security"
              />
            </Tabs>

            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {/* Personal Information Tab */}
              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 3 }}>
                  Personal Information
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      value={formData.email}
                      disabled
                      helperText="Email cannot be changed. Contact administrator for updates."
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!editing}
                      placeholder="+92 300 1234567"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Phone color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Role"
                      value={getRoleLabel(user?.role)}
                      disabled
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Work color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
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
                      multiline
                      rows={3}
                      placeholder="Enter your address"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                            <Home color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
                    />
                  </Grid>
                </Grid>

                {user?.role === 'order_booker' && profileData?.assignedAreas?.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Assigned Areas
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {profileData.assignedAreas.map((area, index) => (
                        <Chip
                          key={index}
                          label={area}
                          size="small"
                          sx={{
                            bgcolor: 'primary.light',
                            color: 'white',
                            fontWeight: 500,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </TabPanel>

              {/* Security Tab */}
              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Change Password
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Ensure your account stays secure by using a strong password
                </Typography>

                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  Password should be at least 6 characters and include a mix of letters, numbers, and special characters for better security.
                </Alert>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Current Password"
                      name="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => togglePasswordVisibility('current')}
                              edge="end"
                            >
                              {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="New Password"
                      name="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => togglePasswordVisibility('new')}
                              edge="end"
                            >
                              {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
                    />
                    {passwordData.newPassword && (
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Password Strength
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color={`${getPasswordStrengthColor()}.main`}
                            fontWeight={600}
                          >
                            {getPasswordStrengthLabel()}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={passwordStrength}
                          color={getPasswordStrengthColor()}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      name="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                      helperText={
                        passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                          ? 'Passwords do not match'
                          : ''
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => togglePasswordVisibility('confirm')}
                              edge="end"
                            >
                              {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={textFieldStyle}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={changingPassword ? <CircularProgress size={18} color="inherit" /> : <Security />}
                      onClick={handleChangePassword}
                      disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      sx={{
                        py: 1.5,
                        px: 4,
                        borderRadius: 2,
                        fontWeight: 600,
                        boxShadow: 2,
                        '&:hover': { boxShadow: 4 },
                      }}
                    >
                      {changingPassword ? 'Changing...' : 'Change Password'}
                    </Button>
                  </Grid>
                </Grid>
              </TabPanel>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Styled TextField
const textFieldStyle = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    },
    '&.Mui-focused': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
  },
};

export default ProfileManagement;
