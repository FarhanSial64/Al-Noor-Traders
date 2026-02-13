import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, Button, Stack } from '@mui/material';
import { Print, Refresh } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import accountingService from '../../services/accountingService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const Receivables = () => {
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [totalReceivable, setTotalReceivable] = useState(0);

  useEffect(() => { fetchReceivables(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReceivables = async () => {
    try { 
      setLoading(true); 
      const response = await accountingService.getReceivables(); 
      setCustomers(response.data?.customers || []);
      setTotalReceivable(response.data?.summary?.totalReceivables || 0);
    } catch (error) { toast.error('Failed to load receivables'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Receivables_${new Date().toISOString().split('T')[0]}` });

  return (
    <Box>
      <PageHeader 
        title="Accounts Receivable" 
        subtitle="Customer outstanding balances"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchReceivables}>Refresh</Button>
            <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>Print</Button>
          </Stack>
        }
      />
      
      <Box ref={printRef} sx={{ '@media print': { p: 2 } }}>
        <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2, textAlign: 'center', borderBottom: '2px solid #000', pb: 1 } }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>AL NOOR TRADERS</Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600, mt: 0.5 }}>ACCOUNTS RECEIVABLE REPORT</Typography>
          <Typography sx={{ fontSize: '10px', mt: 0.5 }}>Generated on: {new Date().toLocaleDateString()}</Typography>
        </Box>
        
        <Card sx={{ mb: 3, bgcolor: 'warning.50' }}>
          <CardContent>
            <Typography variant="h5" align="center">Total Receivable: <strong>{formatCurrency(totalReceivable)}</strong></Typography>
          </CardContent>
        </Card>

        <Card>
        {loading ? <Loading /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>Customer Code</TableCell>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell align="right">Balance Due</TableCell>
                  <TableCell align="right">Credit Limit</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.filter(c => c.currentBalance > 0).map((customer, i) => (
                  <TableRow key={customer._id || i} hover>
                    <TableCell>{customer.customerCode}</TableCell>
                    <TableCell>{customer.businessName}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell align="right"><strong>{formatCurrency(customer.currentBalance)}</strong></TableCell>
                    <TableCell align="right">{formatCurrency(customer.creditLimit)}</TableCell>
                    <TableCell>
                      {customer.currentBalance > customer.creditLimit ? 
                        <Chip label="Over Limit" size="small" color="error" /> : 
                        <Chip label="Normal" size="small" color="success" />}
                    </TableCell>
                  </TableRow>
                ))}
                {customers.filter(c => c.currentBalance > 0).length === 0 && <TableRow><TableCell colSpan={6} align="center">No outstanding receivables</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        </Card>
      </Box>
    </Box>
  );
};

export default Receivables;
