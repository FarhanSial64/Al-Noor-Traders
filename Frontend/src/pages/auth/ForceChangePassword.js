import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Lock,
  Visibility,
  VisibilityOff,
  Check,
  Close,
  Security,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { getMe } from '../../store/slices/authSlice';

const ForceChangePassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const passwordRequirements = [
    { label: 'At least 6 characters', valid: formData.newPassword.length >= 6 },
    { label: 'Contains a number', valid: /\d/.test(formData.newPassword) },
    { label: 'Contains a letter', valid: /[a-zA-Z]/.test(formData.newPassword) },
    { label: 'Passwords match', valid: formData.newPassword && formData.newPassword === formData.confirmPassword },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.valid);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!allRequirementsMet) {
      toast.error('Please meet all password requirements');
      return;
    }

    try {
      setLoading(true);
      await authService.forceChangePassword(formData.newPassword);
      toast.success('Password changed successfully!');
      
      // Refresh user data to clear the mustChangePassword flag
      await dispatch(getMe()).unwrap();
      
      // Navigate to dashboard
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            bgcolor: 'warning.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <Security sx={{ fontSize: 32, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Change Your Password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome back{user?.name ? `, ${user.name}` : ''}! For security reasons, you need to set a new password.
        </Typography>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }}>
        Your account requires a password change. Please create a new secure password to continue.
      </Alert>

      <TextField
        fullWidth
        label="New Password"
        name="newPassword"
        type={showPassword ? 'text' : 'password'}
        value={formData.newPassword}
        onChange={handleChange}
        margin="normal"
        required
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        fullWidth
        label="Confirm New Password"
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleChange}
        margin="normal"
        required
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                edge="end"
              >
                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Paper
        variant="outlined"
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Password Requirements:
        </Typography>
        <List dense disablePadding>
          {passwordRequirements.map((req, index) => (
            <ListItem key={index} disablePadding sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {req.valid ? (
                  <Check fontSize="small" color="success" />
                ) : (
                  <Close fontSize="small" color="disabled" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={req.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: req.valid ? 'success.main' : 'text.secondary',
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading || !allRequirementsMet}
        sx={{ mt: 3, mb: 2, py: 1.5 }}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Change Password & Continue'
        )}
      </Button>
    </Box>
  );
};

export default ForceChangePassword;
