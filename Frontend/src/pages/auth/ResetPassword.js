import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
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
  Link,
} from '@mui/material';
import {
  Lock,
  Visibility,
  VisibilityOff,
  Check,
  Close,
  LockReset,
  Error as ErrorIcon,
  CheckCircle,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import authService from '../../services/authService';

const ResetPassword = () => {
  const { token } = useParams();
  
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await authService.verifyResetToken(token);
        if (response.success) {
          setTokenValid(true);
          setUserData(response.data);
        }
      } catch (error) {
        setTokenError(error.response?.data?.message || 'Invalid or expired reset link');
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
      setTokenError('No reset token provided');
    }
  }, [token]);

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
      await authService.resetPasswordWithToken(token, formData.newPassword);
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center', py: 4 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Verifying reset link...
        </Typography>
      </Box>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'error.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <ErrorIcon sx={{ fontSize: 40, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Link Expired or Invalid
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {tokenError}
        </Typography>
        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          Password reset links expire after 20 minutes for security. Please request a new password reset.
        </Alert>
        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          size="large"
          fullWidth
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  // Success state
  if (success) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Password Reset Successful!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your password has been updated. You can now login with your new password.
        </Typography>
        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          sx={{ py: 1.5 }}
        >
          Go to Login
        </Button>
      </Box>
    );
  }

  // Reset form
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <LockReset sx={{ fontSize: 32, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Create New Password
        </Typography>
        {userData && (
          <Typography variant="body2" color="text.secondary">
            Welcome back, <strong>{userData.fullName}</strong>! Please enter your new password.
          </Typography>
        )}
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Create a strong password you'll remember. This link will expire shortly.
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
          'Reset Password'
        )}
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2" underline="hover">
          Back to Login
        </Link>
      </Box>
    </Box>
  );
};

export default ResetPassword;
