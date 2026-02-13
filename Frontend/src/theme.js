import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Custom breakpoints for mobile-first design
const breakpoints = {
  values: {
    xs: 0,      // Mobile phones (0-640px)
    sm: 640,    // Large phones / Small tablets (641-768px)
    md: 768,    // Tablets (769-1024px)
    lg: 1024,   // Desktop (1025-1280px)
    xl: 1280,   // Large desktop (1281px+)
  },
};

let theme = createTheme({
  breakpoints,
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#fff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    // Responsive font sizes
    h1: {
      fontWeight: 500,
      fontSize: '2rem',
      '@media (min-width:640px)': { fontSize: '2.5rem' },
      '@media (min-width:1024px)': { fontSize: '3rem' },
    },
    h2: {
      fontWeight: 500,
      fontSize: '1.75rem',
      '@media (min-width:640px)': { fontSize: '2rem' },
      '@media (min-width:1024px)': { fontSize: '2.5rem' },
    },
    h3: {
      fontWeight: 500,
      fontSize: '1.5rem',
      '@media (min-width:640px)': { fontSize: '1.75rem' },
      '@media (min-width:1024px)': { fontSize: '2rem' },
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.25rem',
      '@media (min-width:640px)': { fontSize: '1.5rem' },
      '@media (min-width:1024px)': { fontSize: '1.75rem' },
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.1rem',
      '@media (min-width:640px)': { fontSize: '1.25rem' },
      '@media (min-width:1024px)': { fontSize: '1.5rem' },
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      '@media (min-width:640px)': { fontSize: '1.1rem' },
      '@media (min-width:1024px)': { fontSize: '1.25rem' },
    },
    body1: {
      fontSize: '0.95rem',
      '@media (min-width:640px)': { fontSize: '1rem' },
    },
    body2: {
      fontSize: '0.85rem',
      '@media (min-width:640px)': { fontSize: '0.875rem' },
    },
  },
  shape: {
    borderRadius: 8,
  },
  // Custom spacing for responsive design
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
        },
        body: {
          overflowX: 'hidden',
        },
        '*': {
          WebkitTapHighlightColor: 'transparent',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 44, // Touch-friendly (44px minimum)
          transition: 'all 0.2s ease-in-out',
          '@media (max-width:640px)': {
            minHeight: 48,
            fontSize: '0.95rem',
          },
        },
        sizeSmall: {
          minHeight: 44, // Same as root for proper touch targets
          '@media (max-width:640px)': {
            minHeight: 44,
          },
        },
        sizeLarge: {
          minHeight: 52,
          '@media (max-width:640px)': {
            minHeight: 56,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44, // Touch target
          minHeight: 44, // Touch target
          padding: 10,
          '@media (max-width:640px)': {
            padding: 12, // Larger touch target on mobile
          },
        },
        sizeSmall: {
          minWidth: 44, // Maintain touch target even for small
          minHeight: 44,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.2s ease-in-out',
          borderRadius: 12,
          '@media (max-width:640px)': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '@media (max-width:640px)': {
            padding: 12,
          },
          '&:last-child': {
            paddingBottom: 16,
            '@media (max-width:640px)': {
              paddingBottom: 12,
            },
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            minHeight: 44,
            transition: 'all 0.2s ease-in-out',
            '@media (max-width:640px)': {
              minHeight: 48,
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1976d2',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
        input: {
          padding: '12px 14px',
          '@media (max-width:640px)': {
            padding: '14px 12px',
            fontSize: '16px', // Prevents iOS zoom on focus
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '@media (max-width:640px)': {
            fontSize: '0.95rem',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          '@media (max-width:640px)': {
            padding: '8px 12px',
            fontSize: '0.85rem',
          },
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#f5f5f5',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': {
            height: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 3,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          height: 28,
          '@media (max-width:640px)': {
            height: 24,
            fontSize: '0.75rem',
          },
        },
        sizeSmall: {
          height: 24,
          '@media (max-width:640px)': {
            height: 22,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          margin: 16,
          maxHeight: 'calc(100% - 32px)',
          '@media (max-width:640px)': {
            margin: 8,
            maxHeight: 'calc(100% - 16px)',
            width: 'calc(100% - 16px)',
            maxWidth: 'none !important',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          '@media (max-width:640px)': {
            padding: '12px 16px',
            fontSize: '1.1rem',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          '@media (max-width:640px)': {
            padding: '12px 16px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 16px',
          gap: 8,
          '@media (max-width:640px)': {
            padding: '12px 16px',
            flexDirection: 'column-reverse',
            '& > :not(:first-of-type)': {
              marginLeft: 0,
              marginBottom: 8,
            },
            '& > *': {
              width: '100%',
            },
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        inputRoot: {
          '@media (max-width:640px)': {
            paddingRight: '48px !important',
          },
        },
        option: {
          minHeight: 44,
          '@media (max-width:640px)': {
            minHeight: 48,
            padding: '12px 16px',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          '@media (max-width:640px)': {
            maxWidth: 'calc(100vw - 32px)',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 44,
          '@media (max-width:640px)': {
            minHeight: 48,
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          '@media (max-width:640px)': {
            maxWidth: '85vw',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 48,
          textTransform: 'none',
          '@media (max-width:640px)': {
            minHeight: 44,
            minWidth: 'auto',
            padding: '8px 12px',
            fontSize: '0.85rem',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          '@media (max-width:640px)': {
            minHeight: 44,
          },
        },
        scrollButtons: {
          '@media (max-width:640px)': {
            width: 32,
          },
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterTouchDelay: 0,
        leaveTouchDelay: 1500,
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: {
          '@media (max-width:640px)': {
            '& .MuiPaginationItem-root': {
              minWidth: 32,
              height: 32,
              margin: '0 2px',
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          '@media (max-width:640px)': {
            fontSize: '0.85rem',
            padding: '8px 12px',
          },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '@media (max-width:640px)': {
            left: 8,
            right: 8,
            bottom: 8,
          },
        },
      },
    },
  },
});

// Apply responsive font sizes
theme = responsiveFontSizes(theme);

export default theme;
