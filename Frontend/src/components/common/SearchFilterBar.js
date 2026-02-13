import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Typography,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Search,
  FilterList,
  ExpandMore,
  ExpandLess,
  Clear,
  CalendarMonth,
} from '@mui/icons-material';

/**
 * Professional SearchFilterBar Component
 * 
 * @param {Object} props
 * @param {string} props.searchValue - Current search value
 * @param {function} props.onSearchChange - Handler for search value change
 * @param {function} props.onSearch - Handler for search submit
 * @param {string} props.searchPlaceholder - Placeholder text for search
 * @param {string} props.startDate - Start date filter value
 * @param {string} props.endDate - End date filter value
 * @param {function} props.onStartDateChange - Handler for start date change
 * @param {function} props.onEndDateChange - Handler for end date change
 * @param {Array} props.filters - Additional filter configs [{name, label, value, options: [{value, label}]}]
 * @param {function} props.onFilterChange - Handler for filter change (name, value)
 * @param {function} props.onClearFilters - Handler to clear all filters
 * @param {boolean} props.showDateFilters - Whether to show date filters (default: true)
 * @param {boolean} props.hasActiveFilters - Whether there are active filters
 * @param {boolean} props.hideSearch - Whether to hide the search bar (default: false)
 */
const SearchFilterBar = ({
  searchValue = '',
  onSearchChange,
  onSearch,
  searchPlaceholder = 'Search...',
  startDate = '',
  endDate = '',
  onStartDateChange,
  onEndDateChange,
  filters = [],
  onFilterChange,
  onClearFilters,
  showDateFilters = true,
  hasActiveFilters = false,
  hideSearch = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch();
  };

  const activeFilterCount = [
    startDate,
    endDate,
    ...filters.map(f => f.value)
  ].filter(Boolean).length;

  return (
    <Paper 
      elevation={0}
      sx={{ 
        mb: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: theme.palette.background.paper,
      }}
    >
      {/* Main Search Bar */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Search Input - conditionally shown */}
          {!hideSearch && (
            <TextField
              fullWidth
              value={searchValue}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: theme.palette.background.paper,
                  borderRadius: 1.5,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: theme.palette.background.paper,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '&.Mui-focused': {
                    bgcolor: theme.palette.background.paper,
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                      borderWidth: 1,
                    },
                  },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchValue && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => onSearchChange && onSearchChange('')}
                      sx={{ p: 0.5 }}
                    >
                      <Clear sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          {/* Search Button - hidden when search is hidden */}
          {!hideSearch && (
            <Button
              type="submit"
              variant="contained"
              sx={{
                minWidth: { xs: 44, sm: 100 },
                height: 40,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                },
              }}
            >
              {isSmallMobile ? <Search /> : 'Search'}
            </Button>
          )}

          {/* Filter Toggle Button */}
          {(showDateFilters || filters.length > 0) && (
            <Button
              variant={showFilters ? 'contained' : 'outlined'}
              color={showFilters ? 'primary' : 'inherit'}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                minWidth: { xs: 44, sm: 'auto' },
                height: 40,
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 500,
                px: { xs: 1, sm: 2 },
                borderColor: showFilters ? 'primary.main' : alpha(theme.palette.divider, 0.8),
                color: showFilters ? 'white' : 'text.secondary',
                bgcolor: showFilters ? 'primary.main' : 'transparent',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: showFilters ? 'primary.dark' : alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <FilterList sx={{ fontSize: 20 }} />
              {!isSmallMobile && (
                <Typography variant="body2" sx={{ ml: 0.5, fontWeight: 500 }}>
                  Filters
                </Typography>
              )}
              {activeFilterCount > 0 && (
                <Chip
                  label={activeFilterCount}
                  size="small"
                  color="primary"
                  sx={{
                    ml: 0.5,
                    height: 18,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    '& .MuiChip-label': { px: 0.75 },
                    bgcolor: showFilters ? 'white' : 'primary.main',
                    color: showFilters ? 'primary.main' : 'white',
                  }}
                />
              )}
              {showFilters ? (
                <ExpandLess sx={{ fontSize: 18, ml: 0.25 }} />
              ) : (
                <ExpandMore sx={{ fontSize: 18, ml: 0.25 }} />
              )}
            </Button>
          )}
        </Box>
      </Box>

      {/* Expandable Filters Section */}
      <Collapse in={showFilters}>
        <Divider />
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            bgcolor: alpha(theme.palette.grey[100], 0.5),
          }}
        >
          {/* Filter Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <FilterList sx={{ fontSize: 16 }} />
              Filter Options
            </Typography>
            {hasActiveFilters && onClearFilters && (
              <Button
                size="small"
                onClick={onClearFilters}
                startIcon={<Clear sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: 'none',
                  color: 'error.main',
                  fontSize: '0.75rem',
                  py: 0.25,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                  },
                }}
              >
                Clear All
              </Button>
            )}
          </Box>

          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {/* Date Filters */}
            {showDateFilters && (
              <>
                <Grid item xs={6} sm={4} md={3} lg={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="From Date"
                    value={startDate}
                    onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: isMobile ? null : (
                        <InputAdornment position="start">
                          <CalendarMonth sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: theme.palette.background.paper,
                        borderRadius: 1.5,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={3} lg={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="To Date"
                    value={endDate}
                    onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: isMobile ? null : (
                        <InputAdornment position="start">
                          <CalendarMonth sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: theme.palette.background.paper,
                        borderRadius: 1.5,
                      },
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Custom Filters */}
            {filters.map((filter) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={filter.name}>
                <FormControl 
                  fullWidth 
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: theme.palette.background.paper,
                      borderRadius: 1.5,
                    },
                  }}
                >
                  <InputLabel>{filter.label}</InputLabel>
                  <Select
                    value={filter.value || ''}
                    label={filter.label}
                    onChange={(e) => onFilterChange && onFilterChange(filter.name, e.target.value)}
                  >
                    {filter.options.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
          </Grid>

          {/* Apply Filters Button for Mobile */}
          {isMobile && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  if (onSearch) onSearch();
                  setShowFilters(false);
                }}
                sx={{
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                }}
              >
                Apply Filters
              </Button>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default SearchFilterBar;
