import React from 'react';
import { Box, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';

const PageHeader = ({ title, subtitle, backUrl, action }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: action ? 'column' : 'row', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-start' },
        mb: { xs: 2, sm: 3 },
        gap: { xs: 1.5, sm: 2 },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {backUrl && (
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(backUrl)}
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              mb: 0.5, 
              ml: -1,
              minHeight: 44, // Touch-friendly on all devices
            }}
          >
            Back
          </Button>
        )}
        <Typography 
          variant={isMobile ? 'h5' : 'h4'} 
          fontWeight={600}
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography 
            color="text.secondary" 
            sx={{ 
              mt: 0.5,
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && (
        <Box 
          sx={{ 
            display: 'flex',
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            '& > *': {
              width: { xs: '100%', sm: 'auto' },
            },
            '& .MuiButton-root': {
              width: { xs: '100%', sm: 'auto' },
            },
          }}
        >
          {action}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
