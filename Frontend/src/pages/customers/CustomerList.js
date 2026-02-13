import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add, Search, Edit, AccountBalance, Block, CheckCircle, Phone, LocationOn } from '@mui/icons-material';
import customerService from '../../services/customerService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const CustomerList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getCustomers({
        page: pagination.page + 1,
        limit: pagination.limit,
        search,
      });
      setCustomers(response.data);
      setPagination((prev) => ({ ...prev, total: response.pagination.total }));
    } catch (error) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 0 }));
    fetchCustomers();
  };

  const handleToggleActive = async (customer) => {
    try {
      await customerService.updateCustomer(customer._id, { isActive: !customer.isActive });
      toast.success(`Customer ${customer.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to update customer status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <Box>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer accounts"
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/customers/new')}>
            {isMobile ? 'Add' : 'Add Customer'}
          </Button>
        }
      />

      {/* Search Card */}
      <Card sx={{ mb: { xs: 2, md: 3 } }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <Box 
            component="form" 
            onSubmit={handleSearch} 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2 
            }}
          >
            <TextField
              placeholder="Search by name, code, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
              }}
            />
            <Button 
              variant="outlined" 
              type="submit"
              sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 100 }}
            >
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Customers List */}
      <Card>
        {loading ? (
          <Loading />
        ) : (
          <>
            {/* Desktop Table View */}
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Business Name</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Area</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell align="right">Credit Limit</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer._id} hover>
                        <TableCell>{customer.customerCode}</TableCell>
                        <TableCell>{customer.businessName}</TableCell>
                        <TableCell>{customer.contactPerson}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.area || '-'}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={formatCurrency(customer.currentBalance)}
                            size="small"
                            color={customer.currentBalance > 0 ? 'warning' : 'success'}
                          />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(customer.creditLimit)}</TableCell>
                        <TableCell>
                          <Chip label={customer.isActive ? 'Active' : 'Inactive'} size="small" color={customer.isActive ? 'success' : 'default'} />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit Customer">
                            <IconButton size="small" onClick={() => navigate(`/customers/${customer._id}/edit`)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Ledger">
                            <IconButton size="small" onClick={() => navigate(`/customers/${customer._id}/ledger`)}>
                              <AccountBalance fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={customer.isActive ? 'Deactivate Customer' : 'Activate Customer'}>
                            <IconButton size="small" onClick={() => handleToggleActive(customer)} color={customer.isActive ? 'error' : 'success'}>
                              {customer.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {customers.length === 0 && (
                      <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>No customers found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Mobile Card View */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1.5 }}>
              {customers.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography>No customers found</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {customers.map((customer) => (
                    <Paper 
                      key={customer._id} 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        '&:active': { bgcolor: 'action.selected' },
                      }}
                    >
                      {/* Header row */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" fontWeight={600} noWrap>
                            {customer.businessName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {customer.customerCode} • {customer.contactPerson}
                          </Typography>
                        </Box>
                        <Chip 
                          label={customer.isActive ? 'Active' : 'Inactive'} 
                          size="small" 
                          color={customer.isActive ? 'success' : 'default'} 
                        />
                      </Box>

                      {/* Info row */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone fontSize="small" color="action" />
                          <Typography variant="body2">{customer.phone}</Typography>
                        </Box>
                        {customer.area && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn fontSize="small" color="action" />
                            <Typography variant="body2">{customer.area}</Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Balance row */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Balance</Typography>
                          <Typography variant="body2" fontWeight={600} color={customer.currentBalance > 0 ? 'warning.main' : 'success.main'}>
                            {formatCurrency(customer.currentBalance)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">Credit Limit</Typography>
                          <Typography variant="body2">{formatCurrency(customer.creditLimit)}</Typography>
                        </Box>
                      </Box>

                      {/* Actions row */}
                      <Box sx={{ display: 'flex', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button 
                          size="small" 
                          startIcon={<Edit />} 
                          onClick={() => navigate(`/customers/${customer._id}/edit`)}
                          sx={{ flex: 1, minHeight: 44 }}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<AccountBalance />} 
                          onClick={() => navigate(`/customers/${customer._id}/ledger`)}
                          sx={{ flex: 1, minHeight: 44 }}
                        >
                          Ledger
                        </Button>
                        <IconButton 
                          size="small" 
                          onClick={() => handleToggleActive(customer)} 
                          color={customer.isActive ? 'error' : 'success'}
                          sx={{ minWidth: 44, minHeight: 44 }}
                        >
                          {customer.isActive ? <Block /> : <CheckCircle />}
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>

            <TablePagination
              component="div"
              count={pagination.total}
              page={pagination.page}
              onPageChange={(e, p) => setPagination(prev => ({ ...prev, page: p }))}
              rowsPerPage={pagination.limit}
              onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 0 }))}
              rowsPerPageOptions={[10, 25, 50]}
              sx={{
                '.MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', sm: 'flex-end' },
                },
                '.MuiTablePagination-spacer': {
                  display: { xs: 'none', sm: 'block' },
                },
              }}
            />
          </>
        )}
      </Card>
    </Box>
  );
};

export default CustomerList;
