import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';

const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        py: { xs: 2, sm: 4 },
        px: { xs: 1.5, sm: 2 },
      }}
    >
      <Container maxWidth="sm" disableGutters sx={{ mx: 'auto' }}>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 2.5, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: { xs: 2, sm: 3 },
            width: '100%',
          }}
        >
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              mb: 1,
              fontSize: { xs: '1.5rem', sm: '2.125rem' },
              textAlign: 'center',
            }}
          >
            AL NOOR TRADERS
          </Typography>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ 
              mb: { xs: 3, sm: 4 },
              fontSize: { xs: '0.875rem', sm: '1rem' },
              textAlign: 'center',
            }}
          >
            Distribution Management System
          </Typography>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthLayout;
