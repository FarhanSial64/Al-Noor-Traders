import React from 'react';
import { Chip } from '@mui/material';

const statusColors = {
  // Order statuses
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  delivered: 'success',
  invoiced: 'success',
  cancelled: 'error',
  
  // Payment statuses
  paid: 'success',
  partial: 'warning',
  unpaid: 'error',
  
  // Purchase statuses
  received: 'success',
  partial_received: 'warning',
  
  // General
  active: 'success',
  inactive: 'error',
  yes: 'success',
  no: 'default',
};

const StatusChip = ({ status, size = 'small' }) => {
  const color = statusColors[status?.toLowerCase()] || 'default';
  
  return (
    <Chip
      label={status?.replace(/_/g, ' ').toUpperCase()}
      color={color}
      size={size}
      sx={{ fontWeight: 500 }}
    />
  );
};

export default StatusChip;
