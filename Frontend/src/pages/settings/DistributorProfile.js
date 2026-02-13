import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Typography,
  Divider,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  InputAdornment,
  Paper,
  Chip,
} from '@mui/material';
import {
  Save,
  Person,
  Business,
  Phone,
  Email,
  Lock,
  Add,
  Delete,
  AccountBalance,
  Receipt,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import authService from '../../services/authService';
import settingsService from '../../services/settingsService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import { getMe } from '../../store/slices/authSlice';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const DistributorProfile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState({});

  // Profile form
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Business settings form
  const [businessData, setBusinessData] = useState({
    businessName: '',
    tagline: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Pakistan',
      postalCode: '',
    },
    phone: {
      primary: '',
      secondary: '',
      whatsapp: '',
    },
    email: '',
    website: '',
    ntn: '',
    strn: '',
    cnic: '',
    bankDetails: [],
    invoiceSettings: {
      prefix: 'INV',
      termsAndConditions: '',
      footerNote: 'Thank you for your business!',
      showBankDetails: true,
      showTaxNumber: true,
    },
    receiptSettings: {
      prefix: 'RCV',
      footerNote: 'Thank you for your payment!',
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, settingsRes] = await Promise.all([
        authService.getMe(),
        settingsService.getBusinessSettings(),
      ]);

      // Set profile data
      setProfileData({
        fullName: profileRes.fullName || '',
        email: profileRes.email || '',
        phone: profileRes.phone || '',
        address: profileRes.address || '',
      });

      // Set business data
      if (settingsRes.data) {
        setBusinessData(prev => ({
          ...prev,
          ...settingsRes.data,
          address: { ...prev.address, ...settingsRes.data.address },
          phone: { ...prev.phone, ...settingsRes.data.phone },
          invoiceSettings: { ...prev.invoiceSettings, ...settingsRes.data.invoiceSettings },
          receiptSettings: { ...prev.receiptSettings, ...settingsRes.data.receiptSettings },
        }));
      }
    } catch (error) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleBusinessChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');
    
    if (keys.length === 2) {
      setBusinessData(prev => ({
        ...prev,
        [keys[0]]: { ...prev[keys[0]], [keys[1]]: value }
      }));
    } else {
      setBusinessData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await authService.updateProfile(profileData);
      dispatch(getMe());
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessSettings = async () => {
    try {
      setSaving(true);
      await settingsService.updateBusinessSettings(businessData);
      toast.success('Business settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const addBankAccount = () => {
    setBusinessData(prev => ({
      ...prev,
      bankDetails: [
        ...prev.bankDetails,
        { bankName: '', accountTitle: '', accountNumber: '', iban: '', branchCode: '' }
      ]
    }));
  };

  const removeBankAccount = (index) => {
    setBusinessData(prev => ({
      ...prev,
      bankDetails: prev.bankDetails.filter((_, i) => i !== index)
    }));
  };

  const handleBankChange = (index, field, value) => {
    setBusinessData(prev => ({
      ...prev,
      bankDetails: prev.bankDetails.map((bank, i) => 
        i === index ? { ...bank, [field]: value } : bank
      )
    }));
  };

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader
        title="Profile & Settings"
        subtitle="Manage your account and business settings"
      />

      <Card>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider', 
            px: { xs: 0, sm: 2 },
            '& .MuiTab-root': {
              minWidth: { xs: 'auto', sm: 120 },
              px: { xs: 1.5, sm: 2 },
            },
          }}
        >
          <Tab icon={<Person />} label={<Box sx={{ display: { xs: 'none', sm: 'inline' } }}>My Profile</Box>} iconPosition="start" aria-label="My Profile" />
          <Tab icon={<Lock />} label={<Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Password</Box>} iconPosition="start" aria-label="Change Password" />
          <Tab icon={<Business />} label={<Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Business</Box>} iconPosition="start" aria-label="Business Settings" />
          <Tab icon={<AccountBalance />} label={<Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Bank</Box>} iconPosition="start" aria-label="Bank Accounts" />
          <Tab icon={<Receipt />} label={<Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Invoice</Box>} iconPosition="start" aria-label="Invoice Settings" />
        </Tabs>

        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32 }}>
                {user?.fullName?.charAt(0) || 'D'}
              </Avatar>
              <Box sx={{ ml: 3 }}>
                <Typography variant="h5" fontWeight={600}>{user?.fullName}</Typography>
                <Chip label="Distributor" color="primary" size="small" sx={{ mt: 0.5 }} />
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  name="fullName"
                  value={profileData.fullName}
                  onChange={handleProfileChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Person /></InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Email /></InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Phone /></InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Address"
                  name="address"
                  value={profileData.address}
                  onChange={handleProfileChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  Save Profile
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Password Tab */}
        <TabPanel value={activeTab} index={1}>
          <CardContent>
            <Grid container spacing={3} maxWidth={500}>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Password must be at least 6 characters long.
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  name="currentPassword"
                  type={showPassword.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(p => ({ ...p, current: !p.current }))}>
                          {showPassword.current ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type={showPassword.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}>
                          {showPassword.new ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                  helperText={
                    passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                      ? 'Passwords do not match'
                      : ''
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}>
                          {showPassword.confirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={saving ? <CircularProgress size={20} /> : <Lock />}
                  onClick={handleChangePassword}
                  disabled={saving || !passwordData.currentPassword || !passwordData.newPassword}
                >
                  Change Password
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </TabPanel>

        {/* Business Settings Tab */}
        <TabPanel value={activeTab} index={2}>
          <CardContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              These details will appear on your invoices and receipts.
            </Alert>

            <Typography variant="h6" gutterBottom>Business Information</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Business Name *"
                  name="businessName"
                  value={businessData.businessName}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tagline"
                  name="tagline"
                  value={businessData.tagline}
                  onChange={handleBusinessChange}
                  placeholder="Quality Products at Best Prices"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={businessData.email}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Website"
                  name="website"
                  value={businessData.website}
                  onChange={handleBusinessChange}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>Contact Numbers</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Primary Phone"
                  name="phone.primary"
                  value={businessData.phone.primary}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Secondary Phone"
                  name="phone.secondary"
                  value={businessData.phone.secondary}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="WhatsApp"
                  name="phone.whatsapp"
                  value={businessData.phone.whatsapp}
                  onChange={handleBusinessChange}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>Address</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="address.street"
                  value={businessData.address.street}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="City"
                  name="address.city"
                  value={businessData.address.city}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="State/Province"
                  name="address.state"
                  value={businessData.address.state}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Country"
                  name="address.country"
                  value={businessData.address.country}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  name="address.postalCode"
                  value={businessData.address.postalCode}
                  onChange={handleBusinessChange}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>Tax & Registration</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="NTN (National Tax Number)"
                  name="ntn"
                  value={businessData.ntn}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="STRN (Sales Tax Registration)"
                  name="strn"
                  value={businessData.strn}
                  onChange={handleBusinessChange}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="CNIC"
                  name="cnic"
                  value={businessData.cnic}
                  onChange={handleBusinessChange}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSaveBusinessSettings}
              disabled={saving}
            >
              Save Business Settings
            </Button>
          </CardContent>
        </TabPanel>

        {/* Bank Accounts Tab */}
        <TabPanel value={activeTab} index={3}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Bank Accounts</Typography>
              <Button startIcon={<Add />} variant="outlined" onClick={addBankAccount}>
                Add Bank Account
              </Button>
            </Box>

            {businessData.bankDetails.length === 0 ? (
              <Alert severity="info">
                No bank accounts added yet. Add your bank details to show on invoices.
              </Alert>
            ) : (
              businessData.bankDetails.map((bank, index) => (
                <Paper key={index} sx={{ p: 3, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Bank Account {index + 1}
                    </Typography>
                    <IconButton color="error" onClick={() => removeBankAccount(index)}>
                      <Delete />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Bank Name"
                        value={bank.bankName}
                        onChange={(e) => handleBankChange(index, 'bankName', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Account Title"
                        value={bank.accountTitle}
                        onChange={(e) => handleBankChange(index, 'accountTitle', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Account Number"
                        value={bank.accountNumber}
                        onChange={(e) => handleBankChange(index, 'accountNumber', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="IBAN"
                        value={bank.iban}
                        onChange={(e) => handleBankChange(index, 'iban', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Branch Code"
                        value={bank.branchCode}
                        onChange={(e) => handleBankChange(index, 'branchCode', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))
            )}

            {businessData.bankDetails.length > 0 && (
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSaveBusinessSettings}
                disabled={saving}
                sx={{ mt: 2 }}
              >
                Save Bank Accounts
              </Button>
            )}
          </CardContent>
        </TabPanel>

        {/* Invoice Settings Tab */}
        <TabPanel value={activeTab} index={4}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Invoice Settings</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Invoice Prefix"
                  name="invoiceSettings.prefix"
                  value={businessData.invoiceSettings.prefix}
                  onChange={handleBusinessChange}
                  helperText="e.g., INV, BILL"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Terms & Conditions"
                  name="invoiceSettings.termsAndConditions"
                  value={businessData.invoiceSettings.termsAndConditions}
                  onChange={handleBusinessChange}
                  placeholder="Enter your terms and conditions..."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Footer Note"
                  name="invoiceSettings.footerNote"
                  value={businessData.invoiceSettings.footerNote}
                  onChange={handleBusinessChange}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>Receipt Settings</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Receipt Prefix"
                  name="receiptSettings.prefix"
                  value={businessData.receiptSettings.prefix}
                  onChange={handleBusinessChange}
                  helperText="e.g., RCV, REC"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Receipt Footer Note"
                  name="receiptSettings.footerNote"
                  value={businessData.receiptSettings.footerNote}
                  onChange={handleBusinessChange}
                />
              </Grid>
            </Grid>

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
              onClick={handleSaveBusinessSettings}
              disabled={saving}
            >
              Save Invoice Settings
            </Button>
          </CardContent>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default DistributorProfile;
