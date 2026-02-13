import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Warning } from '@mui/icons-material';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  isLoading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: {
          m: { xs: 2, sm: 3 },
          width: { xs: 'calc(100% - 32px)', sm: 'auto' },
          borderRadius: { xs: 2, sm: 2 },
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          fontSize: { xs: '1.1rem', sm: '1.25rem' },
          py: { xs: 1.5, sm: 2 },
        }}
      >
        <Warning color="warning" sx={{ fontSize: { xs: 24, sm: 28 } }} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ py: { xs: 1, sm: 2 } }}>
        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions 
        sx={{ 
          p: { xs: 1.5, sm: 2 },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: { xs: 1, sm: 1 },
        }}
      >
        <Button 
          onClick={onClose} 
          disabled={isLoading}
          fullWidth={isMobile}
          sx={{ minHeight: { xs: 44, sm: 'auto' } }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          disabled={isLoading}
          fullWidth={isMobile}
          sx={{ minHeight: { xs: 44, sm: 'auto' } }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
