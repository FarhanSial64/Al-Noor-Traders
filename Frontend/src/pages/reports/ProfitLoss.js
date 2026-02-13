import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableRow, Typography, Button, Grid, Divider, TextField, Paper, Collapse, IconButton, CircularProgress
} from '@mui/material';
import { Print, ExpandMore, ExpandLess, TrendingUp, TrendingDown, Info, Refresh } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { useSelector } from 'react-redux';
import accountingService from '../../services/accountingService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ExportButtons from '../../components/common/ExportButtons';
import { columnDefinitions } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const ProfitLoss = () => {
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [data, setData] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [expandedSections, setExpandedSections] = useState({
    revenue: true,
    cogs: true,
    expenses: true
  });

  useEffect(() => {
    fetchProfitLoss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfitLoss = async () => {
    try {
      setLoading(true);
      const response = await accountingService.getProfitLoss(dateRange);
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load P&L statement');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateProfits = async () => {
    if (!window.confirm('This will recalculate costs and profits for all invoices. Continue?')) return;
    
    try {
      setRecalculating(true);
      const response = await accountingService.recalculateInvoiceProfits();
      toast.success(response.message || 'Profits recalculated successfully');
      fetchProfitLoss();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to recalculate profits');
    } finally {
      setRecalculating(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `ProfitLoss-${dateRange.startDate}-${dateRange.endDate}`
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount || 0);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) return <Loading />;

  // Prepare P&L data for export
  const getExportData = () => {
    if (!data) return [];
    const rows = [];
    // Revenue
    rows.push({ category: 'REVENUE', description: '', amount: '' });
    rows.push({ category: '', description: 'Total Sales', amount: data.revenue?.totalSales || 0 });
    rows.push({ category: '', description: 'Less: Returns', amount: -(data.revenue?.salesReturns || 0) });
    rows.push({ category: '', description: 'Net Revenue', amount: data.revenue?.netRevenue || 0 });
    // COGS
    rows.push({ category: 'COST OF GOODS SOLD', description: '', amount: '' });
    rows.push({ category: '', description: 'Cost of Goods Sold', amount: data.cogs?.totalCogs || 0 });
    // Gross Profit
    rows.push({ category: 'GROSS PROFIT', description: '', amount: data.grossProfit || 0 });
    // Expenses
    rows.push({ category: 'OPERATING EXPENSES', description: '', amount: '' });
    (data.expenses?.categories || []).forEach(exp => {
      rows.push({ category: '', description: exp.category, amount: exp.total || 0 });
    });
    rows.push({ category: '', description: 'Total Operating Expenses', amount: data.expenses?.totalExpenses || 0 });
    // Net Profit
    rows.push({ category: 'NET PROFIT', description: '', amount: data.netProfit || 0 });
    return rows;
  };

  return (
    <Box>
      <PageHeader
        title="Profit & Loss Statement"
        subtitle="Detailed income and expense breakdown"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ExportButtons
              title="Profit & Loss Statement"
              subtitle={`${dateRange.startDate} to ${dateRange.endDate}`}
              columns={columnDefinitions.profitLoss}
              data={getExportData()}
              filename={`ProfitLoss_${dateRange.startDate}_${dateRange.endDate}`}
              summary={{
                'Net Revenue': formatCurrency(data?.revenue?.netRevenue),
                'Gross Profit': formatCurrency(data?.grossProfit),
                'Net Profit': formatCurrency(data?.netProfit)
              }}
            />
            {user?.role === 'distributor' && (
              <Button 
                variant="outlined" 
                color="warning"
                startIcon={recalculating ? <CircularProgress size={16} /> : <Refresh />}
                onClick={handleRecalculateProfits}
                disabled={recalculating}
              >
                Recalculate
              </Button>
            )}
            <Button variant="outlined" startIcon={<Print />} onClick={handlePrint}>
              Print Report
            </Button>
          </Box>
        }
      />

      {/* Date Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="From Date"
                size="small"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                type="date"
                label="To Date"
                size="small"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="contained" onClick={fetchProfitLoss}>
                Generate
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.50', borderLeft: '4px solid', borderColor: 'info.main' }}>
              <Typography variant="body2" color="text.secondary">Net Sales</Typography>
              <Typography variant="h5" fontWeight={700} color="info.dark">
                {formatCurrency(data.revenue?.netSales)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.revenue?.orderCount} orders
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50', borderLeft: '4px solid', borderColor: 'warning.main' }}>
              <Typography variant="body2" color="text.secondary">Cost of Sales</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.dark">
                {formatCurrency(data.costOfGoodsSold?.cogs)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.50', borderLeft: '4px solid', borderColor: 'secondary.main' }}>
              <Typography variant="body2" color="text.secondary">Gross Profit</Typography>
              <Typography variant="h5" fontWeight={700} color="secondary.dark">
                {formatCurrency(data.grossProfit?.amount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.grossProfit?.margin}% margin
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{
              p: 2,
              textAlign: 'center',
              bgcolor: data.netProfit?.isProfit ? 'success.50' : 'error.50',
              borderLeft: '4px solid',
              borderColor: data.netProfit?.isProfit ? 'success.main' : 'error.main'
            }}>
              <Typography variant="body2" color="text.secondary">
                {data.netProfit?.isProfit ? 'Net Profit' : 'Net Loss'}
              </Typography>
              <Typography variant="h5" fontWeight={700} color={data.netProfit?.isProfit ? 'success.dark' : 'error.dark'}>
                {formatCurrency(Math.abs(data.netProfit?.amount))}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data.netProfit?.margin}% margin
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Detailed P&L Statement */}
      <Card ref={printRef}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>AL NOOR TRADERS</Typography>
            <Typography variant="h6" color="text.secondary">Profit & Loss Statement</Typography>
            <Typography variant="body2" color="text.secondary">
              For the period {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {data && (
            <TableContainer>
              <Table>
                <TableBody>
                  {/* ===== REVENUE SECTION ===== */}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" fontWeight={700} color="success.dark">
                          REVENUE
                        </Typography>
                        <IconButton size="small" onClick={() => toggleSection('revenue')}>
                          {expandedSections.revenue ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  {expandedSections.revenue && (
                    <>
                      <TableRow>
                        <TableCell sx={{ pl: 4 }}>Gross Sales</TableCell>
                        <TableCell align="right" sx={{ width: 150 }}>
                          {formatCurrency(data.revenue?.grossSales)}
                        </TableCell>
                        <TableCell sx={{ width: 150 }}></TableCell>
                      </TableRow>
                      {data.revenue?.discounts > 0 && (
                        <TableRow>
                          <TableCell sx={{ pl: 4 }}>Less: Sales Discounts</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>
                            ({formatCurrency(data.revenue?.discounts)})
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                      <TableRow sx={{ bgcolor: 'success.50' }}>
                        <TableCell sx={{ pl: 4 }}><strong>Net Sales Revenue</strong></TableCell>
                        <TableCell></TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrency(data.revenue?.netSales)}</strong>
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* ===== COST OF GOODS SOLD ===== */}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
                          COST OF GOODS SOLD
                        </Typography>
                        <IconButton size="small" onClick={() => toggleSection('cogs')}>
                          {expandedSections.cogs ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {expandedSections.cogs && (
                    <>
                      <TableRow>
                        <TableCell sx={{ pl: 4 }}>
                          Cost of Products Sold
                          <Typography variant="caption" display="block" color="text.secondary">
                            {data.costOfGoodsSold?.cogsNote}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(data.costOfGoodsSold?.cogs)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow sx={{ bgcolor: 'warning.50' }}>
                        <TableCell sx={{ pl: 4 }}><strong>Total Cost of Goods Sold</strong></TableCell>
                        <TableCell></TableCell>
                        <TableCell align="right">
                          <strong>({formatCurrency(data.costOfGoodsSold?.cogs)})</strong>
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* ===== GROSS PROFIT ===== */}
                  <TableRow sx={{ bgcolor: 'secondary.100' }}>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight={700}>
                        GROSS PROFIT
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight={700}>
                        {formatCurrency(data.grossProfit?.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({data.grossProfit?.margin}% of sales)
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* ===== OPERATING EXPENSES ===== */}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle1" fontWeight={700} color="error.dark">
                          OPERATING EXPENSES
                        </Typography>
                        <IconButton size="small" onClick={() => toggleSection('expenses')}>
                          {expandedSections.expenses ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {expandedSections.expenses && (
                    <>
                      {data.operatingExpenses?.items?.length > 0 ? (
                        data.operatingExpenses.items.map((expense, index) => (
                          <TableRow key={index}>
                            <TableCell sx={{ pl: 4 }}>
                              {expense.category}
                              <Typography variant="caption" display="block" color="text.secondary">
                                ({expense.count} transaction{expense.count > 1 ? 's' : ''})
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(expense.amount)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell sx={{ pl: 4 }} colSpan={3}>
                            <Typography color="text.secondary" variant="body2">
                              No operating expenses recorded for this period
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow sx={{ bgcolor: 'error.50' }}>
                        <TableCell sx={{ pl: 4 }}><strong>Total Operating Expenses</strong></TableCell>
                        <TableCell></TableCell>
                        <TableCell align="right">
                          <strong>({formatCurrency(data.operatingExpenses?.total)})</strong>
                        </TableCell>
                      </TableRow>
                    </>
                  )}

                  {/* ===== OPERATING PROFIT ===== */}
                  <TableRow sx={{ bgcolor: 'grey.200' }}>
                    <TableCell>
                      <Typography variant="subtitle1" fontWeight={700}>
                        OPERATING PROFIT
                      </Typography>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight={700}>
                        {formatCurrency(data.operatingProfit?.amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {/* ===== NET PROFIT/LOSS ===== */}
                  <TableRow sx={{
                    bgcolor: data.netProfit?.isProfit ? 'success.200' : 'error.200'
                  }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {data.netProfit?.isProfit ? (
                          <TrendingUp color="success" />
                        ) : (
                          <TrendingDown color="error" />
                        )}
                        <Typography variant="h6" fontWeight={700}>
                          {data.netProfit?.isProfit ? 'NET PROFIT' : 'NET LOSS'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        color={data.netProfit?.isProfit ? 'success.dark' : 'error.dark'}
                      >
                        {formatCurrency(Math.abs(data.netProfit?.amount))}
                      </Typography>
                      <Typography variant="caption">
                        ({data.netProfit?.margin}% of net sales)
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Calculation Breakdown */}
          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Info fontSize="small" color="primary" />
              How We Calculate
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Gross Profit</strong> = Net Sales - Cost of Goods Sold
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                  = {formatCurrency(data?.revenue?.netSales)} - {formatCurrency(data?.costOfGoodsSold?.cogs)} = {formatCurrency(data?.grossProfit?.amount)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Net Profit</strong> = Gross Profit - Operating Expenses
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ pl: 2 }}>
                  = {formatCurrency(data?.grossProfit?.amount)} - {formatCurrency(data?.operatingExpenses?.total)} = {formatCurrency(data?.netProfit?.amount)}
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Statistics */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Period Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Orders Delivered</Typography>
                <Typography variant="h6" fontWeight={600}>{data?.revenue?.orderCount || 0}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Items Sold</Typography>
                <Typography variant="h6" fontWeight={600}>{data?.revenue?.itemsSold || 0}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Gross Margin</Typography>
                <Typography variant="h6" fontWeight={600}>{data?.grossProfit?.margin || 0}%</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">Net Margin</Typography>
                <Typography variant="h6" fontWeight={600}>{data?.netProfit?.margin || 0}%</Typography>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfitLoss;
