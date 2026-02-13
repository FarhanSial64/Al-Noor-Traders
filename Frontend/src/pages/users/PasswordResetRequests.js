import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Avatar,
  Stack,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Refresh,
  LockReset,
  Person,
  Email,
  AccessTime,
} from '@mui/icons-material';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import userService from '../../services/userService';

const PasswordResetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Dialog states
  const [approveDialog, setApproveDialog] = useState({ open: false, request: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, request: null });
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getPasswordResetRequests({
        page: page + 1,
        limit: rowsPerPage,
      });
      // Backend returns { success: true, data: [...] }
      setRequests(response.data || []);
      setTotalCount(response.data?.length || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async () => {
    if (!approveDialog.request) return;

    try {
      setProcessing(true);
      await userService.processPasswordResetRequest(approveDialog.request._id, {
        action: 'approve',
      });
      toast.success('Request approved! Temporary password sent to user via email.');
      setApproveDialog({ open: false, request: null });
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.request) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      await userService.processPasswordResetRequest(rejectDialog.request._id, {
        action: 'reject',
        rejectionReason: rejectionReason.trim(),
      });
      toast.success('Request rejected');
      setRejectDialog({ open: false, request: null });
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { color: 'warning', label: 'Pending' },
      approved: { color: 'success', label: 'Approved' },
      rejected: { color: 'error', label: 'Rejected' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Chip size="small" color={config.color} label={config.label} />;
  };

  const getRoleChip = (role) => {
    const roleLabels = {
      order_booker: 'Order Booker',
      computer_operator: 'Computer Operator',
    };
    return (
      <Chip
        size="small"
        variant="outlined"
        label={roleLabels[role] || role}
      />
    );
  };

  if (loading && requests.length === 0) {
    return <Loading />;
  }

  return (
    <Box>
      <PageHeader
        title="Password Reset Requests"
        subtitle="Manage password reset requests from users"
        action={
          <Button
            startIcon={<Refresh />}
            onClick={fetchRequests}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      <Paper sx={{ mt: 2 }}>
        {requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <LockReset sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No Password Reset Requests
            </Typography>
            <Typography variant="body2" color="text.secondary">
              There are no pending password reset requests at this time.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Requested At</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request._id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar
                            src={request.user?.profilePicture}
                            sx={{ width: 36, height: 36 }}
                          >
                            {request.user?.fullName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {request.user?.fullName || 'Unknown User'}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Email fontSize="inherit" sx={{ fontSize: 12, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {request.user?.email || '-'}
                              </Typography>
                            </Stack>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {getRoleChip(request.user?.role)}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={request.reason}
                        >
                          {request.reason || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <AccessTime fontSize="small" color="action" />
                          <Typography variant="body2">
                            {format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {getStatusChip(request.status)}
                        {request.status === 'rejected' && request.rejectionReason && (
                          <Tooltip title={`Reason: ${request.rejectionReason}`}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.5, cursor: 'help' }}
                            >
                              View reason
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {request.status === 'pending' ? (
                          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                            <Tooltip title="Approve & Send Password">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => setApproveDialog({ open: true, request })}
                              >
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject Request">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setRejectDialog({ open: true, request })}
                              >
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Processed
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </>
        )}
      </Paper>

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={approveDialog.open}
        onClose={() => !processing && setApproveDialog({ open: false, request: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Approve Password Reset</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            A temporary password will be generated and sent to the user's email address.
          </Alert>
          {approveDialog.request && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Are you sure you want to approve the password reset request for:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Person fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Name:</strong> {approveDialog.request.user?.fullName}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Email fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Email:</strong> {approveDialog.request.user?.email}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setApproveDialog({ open: false, request: null })}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {processing ? 'Processing...' : 'Approve & Send Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => !processing && setRejectDialog({ open: false, request: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Password Reset Request</DialogTitle>
        <DialogContent>
          {rejectDialog.request && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                You are rejecting the password reset request from{' '}
                <strong>{rejectDialog.request.user?.fullName}</strong>
              </Typography>
              <TextField
                fullWidth
                label="Rejection Reason"
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this request..."
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRejectDialog({ open: false, request: null });
              setRejectionReason('');
            }}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={processing || !rejectionReason.trim()}
            startIcon={processing ? <CircularProgress size={16} /> : <Cancel />}
          >
            {processing ? 'Processing...' : 'Reject Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PasswordResetRequests;
