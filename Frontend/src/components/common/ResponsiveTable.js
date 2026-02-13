import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
  useMediaQuery,
  Skeleton,
} from '@mui/material';

/**
 * ResponsiveTable - A table that converts to card view on mobile
 * 
 * Props:
 * - columns: Array of { id, label, align, minWidth, mobileLabel, mobileOrder, hideOnMobile }
 * - data: Array of row data objects
 * - renderRow: (row, index) => TableRow component for desktop
 * - renderCard: (row, index) => Card component for mobile
 * - loading: boolean
 * - emptyMessage: string
 * - stickyHeader: boolean
 */
const ResponsiveTable = ({
  columns = [],
  data = [],
  renderRow,
  renderCard,
  loading = false,
  emptyMessage = 'No data found',
  stickyHeader = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Loading skeleton
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton 
            key={i} 
            variant="rectangular" 
            height={isMobile ? 100 : 52} 
            sx={{ mb: 1, borderRadius: 1 }} 
          />
        ))}
      </Box>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Box 
        sx={{ 
          py: 6, 
          px: 2, 
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography>{emptyMessage}</Typography>
      </Box>
    );
  }

  // Mobile Card View
  if (isMobile && renderCard) {
    return (
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {data.map((row, index) => renderCard(row, index))}
      </Box>
    );
  }

  // Desktop Table View
  return (
    <TableContainer>
      <Table stickyHeader={stickyHeader} size="medium">
        <TableHead>
          <TableRow>
            {columns
              .filter(col => !col.hideOnMobile || !isMobile)
              .map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ minWidth: column.minWidth }}
                  sx={{
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => renderRow(row, index))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * MobileCard - Reusable card component for mobile table rows
 */
export const MobileCard = ({ 
  children, 
  onClick,
  highlighted = false,
}) => {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2,
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease-in-out',
        borderColor: highlighted ? 'primary.main' : 'divider',
        '&:active': onClick ? { 
          bgcolor: 'action.selected',
          transform: 'scale(0.99)',
        } : {},
      }}
    >
      {children}
    </Paper>
  );
};

/**
 * MobileCardRow - A row within a mobile card
 */
export const MobileCardRow = ({ 
  label, 
  value, 
  valueColor,
  bold = false,
}) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        py: 0.5,
      }}
    >
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ fontSize: '0.85rem' }}
      >
        {label}
      </Typography>
      <Typography 
        variant="body2" 
        fontWeight={bold ? 600 : 400}
        color={valueColor || 'text.primary'}
        sx={{ fontSize: '0.85rem' }}
      >
        {value}
      </Typography>
    </Box>
  );
};

/**
 * MobileCardHeader - Header section of a mobile card
 */
export const MobileCardHeader = ({ 
  title, 
  subtitle, 
  badge,
  actions,
}) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" fontWeight={600} noWrap>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {badge}
        {actions}
      </Box>
    </Box>
  );
};

/**
 * MobileCardActions - Action buttons section for mobile cards
 */
export const MobileCardActions = ({ children }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        gap: 1, 
        pt: 1.5, 
        mt: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveTable;
