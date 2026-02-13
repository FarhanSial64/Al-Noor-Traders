import React, { useState, useEffect } from 'react';
import { Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Chip, Typography, Paper, useTheme, useMediaQuery } from '@mui/material';
import inventoryService from '../../services/inventoryService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import SearchFilterBar from '../../components/common/SearchFilterBar';
import ExportButtons from '../../components/common/ExportButtons';
import { columnDefinitions } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const StockMovements = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState({ page: 0, limit: 50, total: 0 });
  const [filters, setFilters] = useState({ type: '', startDate: '', endDate: '' });

  useEffect(() => { fetchMovements(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, filters.type]);

  const fetchMovements = async () => {
    try { 
      setLoading(true); 
      const response = await inventoryService.getAllMovements({ 
        page: pagination.page + 1, 
        limit: pagination.limit,
        transactionType: filters.type || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }); 
      setMovements(response.data || []); 
      setPagination(prev => ({ ...prev, total: response.pagination?.total || 0 })); 
    } catch (error) { toast.error('Failed to load movements'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);
  const getTypeColor = (type) => ({ 
    purchase: 'success', 
    sale: 'error', 
    adjustment_in: 'info', 
    adjustment_out: 'warning', 
    adjustment: 'secondary',
    edit_in: 'info',
    edit_out: 'primary',
    order_edit: 'primary',
    return: 'secondary' 
  }[type] || 'default');

  const MobileCard = ({ m }) => (
    <Paper sx={{ p: 2, mb: 1.5 }} elevation={1}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">{new Date(m.transactionDate).toLocaleDateString()}</Typography>
          <Typography variant="subtitle2" fontWeight="600">{m.productCode}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>{m.productName}</Typography>
        </Box>
        <Chip label={m.transactionType?.replace('_', ' ')} size="small" color={getTypeColor(m.transactionType)} />
      </Box>
      <Box sx={{ display: 'flex', gap: 3, mb: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Qty</Typography>
          <Typography variant="h6" fontWeight="700" sx={{ color: m.quantity < 0 ? 'error.main' : 'success.main' }}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Unit Cost</Typography>
          <Typography variant="body1">{formatCurrency(m.unitCost)}</Typography>
        </Box>
      </Box>
      {m.referenceNumber && <Typography variant="caption" color="text.secondary">Ref: {m.referenceNumber}</Typography>}
    </Paper>
  );

  return (
    <Box>
      <PageHeader 
        title="Stock Movements" 
        subtitle="Inventory transaction history" 
        action={
          <ExportButtons
            title="Stock Movements Report"
            subtitle={filters.startDate && filters.endDate ? `${filters.startDate} to ${filters.endDate}` : 'All Time'}
            columns={columnDefinitions.stockMovements}
            data={movements}
            filename={`Stock_Movements_${new Date().toISOString().split('T')[0]}`}
            summary={{
              'Total Movements': movements.length
            }}
            orientation="landscape"
          />
        }
      />
      
      {/* Professional Filters */}
      <SearchFilterBar
        searchValue=""
        onSearchChange={() => {}}
        onSearch={fetchMovements}
        searchPlaceholder=""
        hideSearch={true}
        startDate={filters.startDate}
        endDate={filters.endDate}
        onStartDateChange={(value) => setFilters(prev => ({ ...prev, startDate: value }))}
        onEndDateChange={(value) => setFilters(prev => ({ ...prev, endDate: value }))}
        showDateFilters={true}
        filters={[
          {
            name: 'type',
            label: 'Movement Type',
            value: filters.type,
            options: [
              { value: '', label: 'All' },
              { value: 'purchase', label: 'Purchase' },
              { value: 'sale', label: 'Sale' },
              { value: 'adjustment_in', label: 'Adjustment In' },
              { value: 'adjustment_out', label: 'Adjustment Out' },
              { value: 'adjustment', label: 'Adjustment (Set)' },
              { value: 'edit_in', label: 'Edit In' },
              { value: 'edit_out', label: 'Edit Out' },
              { value: 'return', label: 'Return' }
            ]
          }
        ]}
        onFilterChange={(name, value) => setFilters(prev => ({ ...prev, type: value }))}
        hasActiveFilters={!!(filters.type || filters.startDate || filters.endDate)}
        onClearFilters={() => { setFilters({ type: '', startDate: '', endDate: '' }); setTimeout(fetchMovements, 0); }}
      />

      {/* Content */}
      <Card>
        {loading ? <Loading /> : (
          <>
            {isMobile ? (
              <Box sx={{ p: 1.5 }}>
                {movements.length === 0 ? (
                  <Typography align="center" color="text.secondary" sx={{ py: 4 }}>No movements found</Typography>
                ) : (
                  movements.map((m, index) => <MobileCard key={m._id || index} m={m} />)
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit Cost</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movements.map((m, index) => (
                      <TableRow key={m._id || index} hover>
                        <TableCell>{new Date(m.transactionDate).toLocaleDateString()}</TableCell>
                        <TableCell>{m.productCode} - {m.productName}</TableCell>
                        <TableCell><Chip label={m.transactionType?.replace('_', ' ')} size="small" color={getTypeColor(m.transactionType)} /></TableCell>
                        <TableCell align="right" sx={{ color: m.quantity < 0 ? 'error.main' : 'success.main', fontWeight: 500 }}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(m.unitCost)}</TableCell>
                        <TableCell>{m.referenceNumber || '-'}</TableCell>
                        <TableCell>{m.description || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {movements.length === 0 && <TableRow><TableCell colSpan={7} align="center">No movements found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <TablePagination 
              component="div" 
              count={pagination.total} 
              page={pagination.page} 
              onPageChange={(e, p) => setPagination(prev => ({ ...prev, page: p }))} 
              rowsPerPage={pagination.limit} 
              onRowsPerPageChange={(e) => setPagination(prev => ({ ...prev, limit: parseInt(e.target.value), page: 0 }))} 
              rowsPerPageOptions={isMobile ? [25, 50] : [25, 50, 100]}
              labelRowsPerPage={isMobile ? '' : 'Rows:'}
              sx={{ '.MuiTablePagination-selectLabel': { display: isMobile ? 'none' : 'block' } }}
            />
          </>
        )}
      </Card>
    </Box>
  );
};

export default StockMovements;
