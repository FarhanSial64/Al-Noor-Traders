import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import {
  Person,
  ArrowBack,
  LockReset,
  CheckCircle,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import authService from '../../services/authService';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    reason: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast.error('Please enter your username or email');
      return;
    }

    try {
      setLoading(true);
      await authService.forgotPassword(formData);
      setSuccess(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
        </Box>
        
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Request Submitted!
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your password reset request has been submitted successfully. 
          The administrator will review your request and send you a new password via email.
        </Typography>

        <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2">
            <strong>What happens next?</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>Administrator will review your request</li>
              <li>Once approved, you'll receive an email with a temporary password</li>
              <li>Use the temporary password to login</li>
              <li>You'll be prompted to create a new password</li>
            </ul>
          </Typography>
        </Alert>

        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/login')}
          fullWidth
        >
          Back to Login
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            bgcolor: 'primary.light',
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
          Forgot Password?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enter your username or email and we'll send your request to the administrator
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        This feature is available for <strong>Order Bookers</strong> and <strong>Computer Operators</strong> only.
        Distributor accounts should contact system support.
      </Alert>

      <TextField
        fullWidth
        label="Username or Email"
        name="username"
        value={formData.username}
        onChange={handleChange}
        margin="normal"
        required
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        fullWidth
        label="Reason (Optional)"
        name="reason"
        value={formData.reason}
        onChange={handleChange}
        margin="normal"
        multiline
        rows={2}
        placeholder="e.g., Forgot my password, need access urgently"
        helperText="Briefly explain why you need a password reset"
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{ mt: 3, mb: 2, py: 1.5 }}
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Submit Reset Request'
        )}
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Link
          component={RouterLink}
          to="/login"
          variant="body2"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBack fontSize="small" /> Back to Login
        </Link>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
