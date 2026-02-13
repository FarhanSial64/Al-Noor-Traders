import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, Button, Stack } from '@mui/material';
import { Print, Refresh } from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import accountingService from '../../services/accountingService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import ExportButtons from '../../components/common/ExportButtons';
import { columnDefinitions } from '../../utils/exportUtils';
import toast from 'react-hot-toast';

const Payables = () => {
  const printRef = useRef();
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [totalPayable, setTotalPayable] = useState(0);

  useEffect(() => { fetchPayables(); }, []);

  const fetchPayables = async () => {
    try { 
      setLoading(true); 
      const response = await accountingService.getPayables(); 
      setVendors(response.data?.vendors || []);
      setTotalPayable(response.data?.summary?.totalPayables || 0);
    } catch (error) { toast.error('Failed to load payables'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: `Payables_${new Date().toISOString().split('T')[0]}` });

  // Get filtered vendors with balance > 0 for export
  const getExportData = () => vendors.filter(v => v.currentBalance > 0);

  return (
    <Box>
      <PageHeader 
        title="Accounts Payable" 
        subtitle="Vendor outstanding balances"
        action={
          <Stack direction="row" spacing={1}>
            <ExportButtons
              title="Accounts Payable"
              columns={columnDefinitions.payables}
              data={getExportData()}
              filename={`Payables_${new Date().toISOString().split('T')[0]}`}
              summary={{
                'Total Vendors': getExportData().length,
                'Total Payable': formatCurrency(totalPayable)
              }}
            />
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchPayables}>Refresh</Button>
            <Button variant="contained" startIcon={<Print />} onClick={handlePrint}>Print</Button>
          </Stack>
        }
      />
      
      <Box ref={printRef} sx={{ '@media print': { p: 2 } }}>
        <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2, textAlign: 'center', borderBottom: '2px solid #000', pb: 1 } }}>
          <Typography sx={{ fontSize: '18px', fontWeight: 700 }}>AL NOOR TRADERS</Typography>
          <Typography sx={{ fontSize: '14px', fontWeight: 600, mt: 0.5 }}>ACCOUNTS PAYABLE REPORT</Typography>
          <Typography sx={{ fontSize: '10px', mt: 0.5 }}>Generated on: {new Date().toLocaleDateString()}</Typography>
        </Box>
        
        <Card sx={{ mb: 3, bgcolor: 'error.50' }}>
          <CardContent>
            <Typography variant="h5" align="center">Total Payable: <strong>{formatCurrency(totalPayable)}</strong></Typography>
          </CardContent>
        </Card>

        <Card>
        {loading ? <Loading /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell>Vendor Code</TableCell>
                  <TableCell>Vendor Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell align="right">Balance Due</TableCell>
                  <TableCell>Credit Days</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors.filter(v => v.currentBalance > 0).map((vendor, i) => (
                  <TableRow key={vendor._id || i} hover>
                    <TableCell>{vendor.vendorCode}</TableCell>
                    <TableCell>{vendor.businessName}</TableCell>
                    <TableCell>{vendor.phone}</TableCell>
                    <TableCell align="right"><strong>{formatCurrency(vendor.currentBalance)}</strong></TableCell>
                    <TableCell>{vendor.creditDays} days</TableCell>
                    <TableCell><Chip label="Outstanding" size="small" color="warning" /></TableCell>
                  </TableRow>
                ))}
                {vendors.filter(v => v.currentBalance > 0).length === 0 && <TableRow><TableCell colSpan={6} align="center">No outstanding payables</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        </Card>
      </Box>
    </Box>
  );
};

export default Payables;
