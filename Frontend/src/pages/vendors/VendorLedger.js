import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Chip } from '@mui/material';
import vendorService from '../../services/vendorService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const VendorLedger = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [ledger, setLedger] = useState([]);

  useEffect(() => { fetchData(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchData = async () => {
    try { setLoading(true); const [vendorRes, ledgerRes] = await Promise.all([vendorService.getVendor(id), vendorService.getVendorLedger(id)]); setVendor(vendorRes.data); setLedger(ledgerRes.data?.entries || []); } catch (error) { toast.error('Failed to load ledger'); } finally { setLoading(false); }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(amount || 0);

  if (loading) return <Loading />;

  return (
    <Box>
      <PageHeader title={`Vendor Ledger: ${vendor?.businessName}`} backUrl="/vendors" />
      <Card sx={{ mb: 3 }}><CardContent><Grid container spacing={2}><Grid item xs={12} md={3}><Typography variant="body2" color="text.secondary">Vendor Code</Typography><Typography fontWeight={500}>{vendor?.vendorCode}</Typography></Grid><Grid item xs={12} md={3}><Typography variant="body2" color="text.secondary">Contact</Typography><Typography fontWeight={500}>{vendor?.contactPerson}</Typography></Grid><Grid item xs={12} md={3}><Typography variant="body2" color="text.secondary">Phone</Typography><Typography fontWeight={500}>{vendor?.phone}</Typography></Grid><Grid item xs={12} md={3}><Typography variant="body2" color="text.secondary">Current Balance</Typography><Chip label={formatCurrency(vendor?.currentBalance)} color={vendor?.currentBalance > 0 ? 'error' : 'success'} size="small" /></Grid></Grid></CardContent></Card>
      <Card><CardContent><Typography variant="h6" gutterBottom>Ledger Entries</Typography>
        <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Date</TableCell><TableCell>Reference</TableCell><TableCell>Description</TableCell><TableCell align="right">Debit</TableCell><TableCell align="right">Credit</TableCell><TableCell align="right">Balance</TableCell></TableRow></TableHead>
          <TableBody>{ledger.map((entry, i) => (<TableRow key={entry._id || i}><TableCell>{new Date(entry.entryDate).toLocaleDateString()}</TableCell><TableCell>{entry.referenceNumber || '-'}</TableCell><TableCell>{entry.description}</TableCell><TableCell align="right">{entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : '-'}</TableCell><TableCell align="right">{entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : '-'}</TableCell><TableCell align="right">{formatCurrency(entry.runningBalance)}</TableCell></TableRow>))}
            {ledger.length === 0 && <TableRow><TableCell colSpan={6} align="center">No ledger entries</TableCell></TableRow>}
          </TableBody></Table></TableContainer>
      </CardContent></Card>
    </Box>
  );
};

export default VendorLedger;
