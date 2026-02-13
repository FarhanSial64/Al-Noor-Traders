import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, Grid, TextField } from '@mui/material';
import accountingService from '../../services/accountingService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ExportButtons from '../../components/common/ExportButtons';
import { columnDefinitions } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const CashBook = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ entries: [], openingBalance: 0, closingBalance: 0, totalReceipts: 0, totalPayments: 0 });
  const [dateRange, setDateRange] = useState({ startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] });

  useEffect(() => { fetchCashBook(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCashBook = async () => {
    try { 
      setLoading(true); 
      const response = await accountingService.getCashBook(dateRange); 
      const entries = Array.isArray(response.data) ? response.data : (response.data?.entries || []);
      const summary = response.summary || {};
      setData({ 
        entries, 
        openingBalance: summary.openingBalance || 0, 
        closingBalance: summary.closingBalance || (summary.openingBalance || 0) + (summary.totalCashIn || 0) - (summary.totalCashOut || 0), 
        totalReceipts: summary.totalCashIn || 0, 
        totalPayments: summary.totalCashOut || 0 
      }); 
    } catch (error) { toast.error('Failed to load cash book'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  // Prepare data for export
  const getExportData = () => data.entries || [];

  return (
    <Box>
      <PageHeader 
        title="Cash Book" 
        subtitle="Daily cash transactions" 
        action={
          <ExportButtons
            title="Cash Book"
            subtitle={`${dateRange.startDate} to ${dateRange.endDate}`}
            columns={columnDefinitions.cashBook}
            data={getExportData()}
            filename={`CashBook_${dateRange.startDate}_${dateRange.endDate}`}
            summary={{
              'Opening Balance': formatCurrency(data.openingBalance),
              'Total Receipts': formatCurrency(data.totalReceipts),
              'Total Payments': formatCurrency(data.totalPayments),
              'Closing Balance': formatCurrency(data.closingBalance)
            }}
          />
        }
      />
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}><TextField fullWidth type="date" label="From Date" size="small" value={dateRange.startDate} onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} md={3}><TextField fullWidth type="date" label="To Date" size="small" value={dateRange.endDate} onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={fetchCashBook}>Generate</Button></Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">Opening Balance</Typography><Typography variant="h6">{formatCurrency(data.openingBalance)}</Typography></CardContent></Card></Grid>
        <Grid item xs={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">Total Receipts</Typography><Typography variant="h6" color="success.main">{formatCurrency(data.totalReceipts)}</Typography></CardContent></Card></Grid>
        <Grid item xs={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">Total Payments</Typography><Typography variant="h6" color="error.main">{formatCurrency(data.totalPayments)}</Typography></CardContent></Card></Grid>
        <Grid item xs={6} md={3}><Card><CardContent><Typography variant="body2" color="text.secondary">Closing Balance</Typography><Typography variant="h6" color="primary.main">{formatCurrency(data.closingBalance)}</Typography></CardContent></Card></Grid>
      </Grid>

      <Card>
        {loading ? <Loading /> : (
          <CardContent>
            <Typography variant="h6" gutterBottom>Cash Transactions</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align="right">Receipt (Dr)</TableCell>
                    <TableCell align="right">Payment (Cr)</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell colSpan={5}><strong>Opening Balance</strong></TableCell><TableCell align="right"><strong>{formatCurrency(data.openingBalance)}</strong></TableCell></TableRow>
                  {data.entries?.map((entry, i) => (
                    <TableRow key={entry._id || i} hover>
                      <TableCell>{new Date(entry.entryDate).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.referenceNumber || '-'}</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>{entry.cashIn > 0 ? formatCurrency(entry.cashIn) : '-'}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>{entry.cashOut > 0 ? formatCurrency(entry.cashOut) : '-'}</TableCell>
                      <TableCell align="right">{formatCurrency(entry.runningBalance)}</TableCell>
                    </TableRow>
                  ))}
                  {data.entries?.length === 0 && <TableRow><TableCell colSpan={6} align="center">No transactions</TableCell></TableRow>}
                  <TableRow sx={{ bgcolor: 'grey.100' }}><TableCell colSpan={5}><strong>Closing Balance</strong></TableCell><TableCell align="right"><strong>{formatCurrency(data.closingBalance)}</strong></TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}
      </Card>
    </Box>
  );
};

export default CashBook;
