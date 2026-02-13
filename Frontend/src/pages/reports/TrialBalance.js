import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, Divider } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import accountingService from '../../services/accountingService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const TrialBalance = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ accounts: [], totalDebit: 0, totalCredit: 0 });

  useEffect(() => { fetchTrialBalance(); }, []);

  const fetchTrialBalance = async () => {
    try { setLoading(true); const response = await accountingService.getTrialBalance(); setData(response.data || { accounts: [], totalDebit: 0, totalCredit: 0 }); } catch (error) { toast.error('Failed to load trial balance'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <Box>
      <PageHeader title="Trial Balance" subtitle="Summary of all account balances" action={<Button startIcon={<Refresh />} onClick={fetchTrialBalance}>Refresh</Button>} />
      <Card>
        {loading ? <Loading /> : (
          <CardContent>
            <Typography variant="h6" align="center" gutterBottom>AL NOOR TRADERS</Typography>
            <Typography variant="subtitle1" align="center" gutterBottom>Trial Balance</Typography>
            <Typography variant="body2" align="center" color="text.secondary" gutterBottom>As of {new Date().toLocaleDateString()}</Typography>
            <Divider sx={{ my: 2 }} />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>Account Code</TableCell>
                    <TableCell>Account Name</TableCell>
                    <TableCell align="right">Debit (PKR)</TableCell>
                    <TableCell align="right">Credit (PKR)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.accounts?.map((account, index) => (
                    <TableRow key={account._id || index} hover>
                      <TableCell>{account.accountCode}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell align="right">{account.debit > 0 ? formatCurrency(account.debit) : '-'}</TableCell>
                      <TableCell align="right">{account.credit > 0 ? formatCurrency(account.credit) : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {data.accounts?.length === 0 && <TableRow><TableCell colSpan={4} align="center">No data</TableCell></TableRow>}
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={2}><strong>TOTAL</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(data.totalDebit)}</strong></TableCell>
                    <TableCell align="right"><strong>{formatCurrency(data.totalCredit)}</strong></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            {Math.abs(data.totalDebit - data.totalCredit) < 1 ? (
              <Typography variant="body2" color="success.main" align="center" sx={{ mt: 2 }}>✓ Trial Balance is balanced</Typography>
            ) : (
              <Typography variant="body2" color="error.main" align="center" sx={{ mt: 2 }}>⚠ Difference: {formatCurrency(Math.abs(data.totalDebit - data.totalCredit))}</Typography>
            )}
          </CardContent>
        )}
      </Card>
    </Box>
  );
};

export default TrialBalance;
