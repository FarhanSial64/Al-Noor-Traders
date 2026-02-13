import React from 'react';
import { Card, CardContent, Typography, Box, useTheme, useMediaQuery } from '@mui/material';

const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: { sm: 'translateY(-2px)' },
          boxShadow: { sm: '0 4px 12px rgba(0,0,0,0.15)' },
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'center' : 'flex-start',
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              color="text.secondary" 
              variant="body2" 
              gutterBottom
              sx={{ 
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {title}
            </Typography>
            <Typography 
              fontWeight={700} 
              color={`${color}.main`}
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  display: 'block',
                  mt: 0.5,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                backgroundColor: `${color}.light`,
                borderRadius: { xs: 1.5, sm: 2 },
                p: { xs: 0.75, sm: 1 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {React.cloneElement(icon, { 
                sx: { 
                  color: `${color}.main`, 
                  fontSize: { xs: 24, sm: 28 },
                } 
              })}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
