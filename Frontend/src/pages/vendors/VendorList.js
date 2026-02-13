import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TablePagination, TextField, Button, IconButton, Chip, InputAdornment, Tooltip, Paper, 
  Typography, useMediaQuery, useTheme 
} from '@mui/material';
import { Add, Search, Edit, AccountBalance, Block, CheckCircle } from '@mui/icons-material';
import vendorService from '../../services/vendorService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const VendorList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => { fetchVendors(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getVendors({ page: pagination.page + 1, limit: pagination.limit, search });
      setVendors(response.data);
      setPagination(prev => ({ ...prev, total: response.pagination.total }));
    } catch (error) { toast.error('Failed to load vendors'); } finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); setPagination(prev => ({ ...prev, page: 0 })); fetchVendors(); };
  
  const handleToggleActive = async (vendor) => {
    try {
      await vendorService.updateVendor(vendor._id, { isActive: !vendor.isActive });
      toast.success(`Vendor ${vendor.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchVendors();
    } catch (error) {
      toast.error('Failed to update vendor status');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <Box>
      <PageHeader 
        title="Vendors" 
        subtitle="Manage your supplier accounts" 
        action={
          <Button 
            variant="contained" 
            startIcon={!isMobile && <Add />} 
            onClick={() => navigate('/vendors/new')}
            size={isMobile ? "medium" : "large"}
          >
            {isMobile ? <Add /> : 'Add Vendor'}
          </Button>
        } 
      />
      
      {/* Search Card */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1 }}>
            <TextField 
              placeholder="Search vendors..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              sx={{ flexGrow: 1 }} 
              size="small"
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} 
            />
            <Button variant="outlined" type="submit" sx={{ minWidth: 'auto', px: { xs: 1.5, sm: 2 } }}>
              <Search />
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        {loading ? <Loading /> : (
          <>
            {/* Desktop Table View */}
            {!isMobile && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Code</TableCell>
                      <TableCell>Business Name</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell align="right">Balance Due</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vendors.map(vendor => (
                      <TableRow key={vendor._id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{vendor.vendorCode}</TableCell>
                        <TableCell>{vendor.businessName}</TableCell>
                        <TableCell>{vendor.contactPerson}</TableCell>
                        <TableCell>{vendor.phone}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={formatCurrency(vendor.currentBalance)} 
                            size="small" 
                            color={vendor.currentBalance > 0 ? 'error' : 'success'} 
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={vendor.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={vendor.isActive ? 'success' : 'default'} 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Edit Vendor">
                            <IconButton size="small" onClick={() => navigate(`/vendors/${vendor._id}/edit`)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Ledger">
                            <IconButton size="small" onClick={() => navigate(`/vendors/${vendor._id}/ledger`)}>
                              <AccountBalance fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={vendor.isActive ? 'Deactivate Vendor' : 'Activate Vendor'}>
                            <IconButton size="small" onClick={() => handleToggleActive(vendor)} color={vendor.isActive ? 'error' : 'success'}>
                              {vendor.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vendors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">No vendors found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Mobile Card View */}
            {isMobile && (
              <Box sx={{ p: 1.5 }}>
                {vendors.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                    No vendors found
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {vendors.map(vendor => (
                      <Paper
                        key={vendor._id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          borderColor: 'divider',
                        }}
                      >
                        {/* Header row */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {vendor.businessName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {vendor.vendorCode}
                            </Typography>
                          </Box>
                          <Chip 
                            label={vendor.isActive ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={vendor.isActive ? 'success' : 'default'} 
                          />
                        </Box>

                        {/* Contact info */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Contact:</Typography>
                          <Typography variant="body2">{vendor.contactPerson || '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Phone:</Typography>
                          <Typography variant="body2">{vendor.phone}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Balance:</Typography>
                          <Chip 
                            label={formatCurrency(vendor.currentBalance)} 
                            size="small" 
                            color={vendor.currentBalance > 0 ? 'error' : 'success'} 
                          />
                        </Box>

                        {/* Action buttons */}
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            gap: 1, 
                            pt: 1, 
                            borderTop: '1px solid', 
                            borderColor: 'divider',
                          }}
                        >
                          <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<Edit />}
                            onClick={() => navigate(`/vendors/${vendor._id}/edit`)}
                            sx={{ flex: 1, minHeight: 44 }}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="small" 
                            variant="outlined" 
                            startIcon={<AccountBalance />}
                            onClick={() => navigate(`/vendors/${vendor._id}/ledger`)}
                            sx={{ flex: 1, minHeight: 44 }}
                          >
                            Ledger
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleActive(vendor)}
                            color={vendor.isActive ? 'error' : 'success'}
                            sx={{ minWidth: 44, minHeight: 44, border: '1px solid', borderColor: 'divider' }}
                          >
                            {vendor.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            <TablePagination 
              component="div" 
              count={pagination.total} 
              page={pagination.page} 
              onPageChange={(e, p) => setPagination(prev => ({ ...prev, page: p }))} 
              rowsPerPage={pagination.limit} 
              onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 0 }))} 
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage={isMobile ? "Rows:" : "Rows per page:"}
              sx={{
                '.MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  justifyContent: { xs: 'center', sm: 'flex-end' },
                  px: { xs: 1, sm: 2 },
                },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            />
          </>
        )}
      </Card>
    </Box>
  );
};

export default VendorList;
