import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  SwipeableDrawer,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  People,
  LocalShipping,
  ShoppingCart,
  Payment,
  Assessment,
  Settings,
  ExpandLess,
  ExpandMore,
  Category,
  Store,
  Logout,
  Person,
  ManageAccounts,
  Business,
  ReceiptLong,
  Summarize,
  ShoppingBasket,
  ListAlt,
  LocalAtm,
  AttachMoney,
  AccountBalanceWallet,
  MoneyOff,
  TrendingUp,
  BarChart,
  LockReset,
  ChevronLeft,
  MoreHoriz,
  Close,
} from '@mui/icons-material';
import { logout } from '../store/slices/authSlice';
import userService from '../services/userService';

// Responsive drawer width
const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [pendingResetCount, setPendingResetCount] = useState(0);
  const [bottomNavValue, setBottomNavValue] = useState(0);

  // Fetch pending password reset requests count for distributors
  useEffect(() => {
    const fetchPendingResetCount = async () => {
      if (user?.role === 'distributor') {
        try {
          const response = await userService.getPasswordResetRequestsCount();
          setPendingResetCount(response.data?.count || 0);
        } catch (error) {
          console.error('Failed to fetch password reset requests count:', error);
        }
      }
    };

    fetchPendingResetCount();
    const interval = setInterval(fetchPendingResetCount, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Update bottom nav value based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) setBottomNavValue(0);
    else if (path.startsWith('/orders')) setBottomNavValue(1);
    else if (path.startsWith('/customers')) setBottomNavValue(2);
    else if (path.startsWith('/receipts') || path.startsWith('/payments')) setBottomNavValue(3);
    else setBottomNavValue(4);
  }, [location.pathname]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleDrawerCollapse = useCallback(() => {
    setDrawerCollapsed(prev => !prev);
  }, []);

  const handleMenuClick = useCallback((menu) => {
    setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  }, []);

  const handleNavigation = useCallback((path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [navigate, isMobile]);

  const handleProfileMenuOpen = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleProfileMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleProfileNavigation = useCallback((path) => {
    setAnchorEl(null);
    setTimeout(() => {
      navigate(path);
    }, 0);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    setAnchorEl(null);
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);

  const handleBottomNavChange = useCallback((event, newValue) => {
    setBottomNavValue(newValue);
    const routes = ['/dashboard', '/orders', '/customers', '/receipts', null];
    if (routes[newValue]) {
      navigate(routes[newValue]);
    } else {
      setMobileOpen(true);
    }
  }, [navigate]);

  const isActiveRoute = useCallback((path) => {
    if (location.pathname === path) return true;
    if (path !== '/products' && path !== '/inventory' && path !== '/reports' && path !== '/users') {
      return location.pathname.startsWith(path + '/');
    }
    return false;
  }, [location.pathname]);

  const getRoleLabel = (role) => {
    const labels = {
      distributor: 'Distributor',
      computer_operator: 'Computer Operator',
      order_booker: 'Order Booker',
      customer: 'Customer',
    };
    return labels[role] || role;
  };

  // Memoized menu items based on role
  const menuItems = useMemo(() => {
    const role = user?.role;
    const items = [];

    // Dashboard - All users
    items.push({
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
    });

    // Products - Distributor, KPO, Order Booker
    if (['distributor', 'computer_operator', 'order_booker'].includes(role)) {
      if (role === 'order_booker') {
        items.push({
          text: 'Products',
          icon: <Inventory />,
          path: '/products',
        });
      } else {
        items.push({
          text: 'Products',
          icon: <Inventory />,
          children: [
            { text: 'All Products', path: '/products' },
            { text: 'Categories', path: '/products/categories' },
            { text: 'Brands', path: '/products/brands' },
          ],
        });
      }
    }

    // Customers - Distributor, KPO, Order Booker
    if (['distributor', 'computer_operator', 'order_booker'].includes(role)) {
      items.push({
        text: 'Customers',
        icon: <People />,
        path: '/customers',
      });
    }

    // Vendors - Distributor, KPO only
    if (['distributor', 'computer_operator'].includes(role)) {
      items.push({
        text: 'Vendors',
        icon: <LocalShipping />,
        path: '/vendors',
      });
    }

    // Orders - All except customer
    items.push({
      text: 'Orders',
      icon: <ShoppingCart />,
      path: '/orders',
    });

    // Purchases - Distributor, KPO only
    if (['distributor', 'computer_operator'].includes(role)) {
      items.push({
        text: 'Purchases',
        icon: <Store />,
        path: '/purchases',
      });
    }

    // Payments - Distributor, KPO, Order Booker
    if (['distributor', 'computer_operator'].includes(role)) {
      items.push({
        text: 'Payments',
        icon: <Payment />,
        children: [
          { text: 'Receipts', path: '/receipts' },
          { text: 'Payments', path: '/payments' },
        ],
      });
    } else if (role === 'order_booker') {
      items.push({
        text: 'Receipts',
        icon: <Payment />,
        path: '/receipts',
      });
    }

    // Expenses - Distributor, KPO only
    if (['distributor', 'computer_operator'].includes(role)) {
      items.push({
        text: 'Expenses',
        icon: <MoneyOff />,
        path: '/expenses',
      });
    }

    // Inventory - Distributor, KPO only
    if (['distributor', 'computer_operator'].includes(role)) {
      items.push({
        text: 'Inventory',
        icon: <Category />,
        children: [
          { text: 'Stock', path: '/inventory' },
          { text: 'Movements', path: '/inventory/movements' },
          { text: 'Adjustment', path: '/inventory/adjustment' },
        ],
      });
    }

    // Reports - Distributor, KPO
    if (['distributor', 'computer_operator'].includes(role)) {
      const reportItems = [
        { text: 'Sales Report', path: '/reports/sales', icon: <ReceiptLong fontSize="small" /> },
        { text: 'Sale Summary', path: '/reports/sale-summary', icon: <Summarize fontSize="small" /> },
        { text: 'Purchase Report', path: '/reports/purchases', icon: <ShoppingBasket fontSize="small" /> },
        { text: 'Purchase Summary', path: '/reports/purchase-summary', icon: <ListAlt fontSize="small" /> },
        { text: 'Product Pricing', path: '/reports/product-pricing', icon: <AttachMoney fontSize="small" /> },
        { text: 'Load Form', path: '/reports/load-form', icon: <LocalShipping fontSize="small" /> },
        { text: 'Cash Book', path: '/reports/cash-book', icon: <LocalAtm fontSize="small" /> },
        { text: 'Receivables', path: '/reports/receivables', icon: <AccountBalanceWallet fontSize="small" /> },
        { text: 'Payables', path: '/reports/payables', icon: <MoneyOff fontSize="small" /> },
      ];

      if (role === 'distributor') {
        reportItems.unshift({ text: 'Profit & Loss', path: '/reports/profit-loss', icon: <TrendingUp fontSize="small" /> });
        reportItems.unshift({ text: 'Trial Balance', path: '/reports/trial-balance', icon: <BarChart fontSize="small" /> });
      }

      items.push({
        text: 'Reports',
        icon: <Assessment />,
        children: reportItems,
      });
    }

    // Reports - Order Booker
    if (role === 'order_booker') {
      items.push({
        text: 'My Reports',
        icon: <Assessment />,
        children: [
          { text: 'My Sales', path: '/reports/my-sales', icon: <ReceiptLong fontSize="small" /> },
          { text: 'My Collections', path: '/reports/my-collections', icon: <AccountBalanceWallet fontSize="small" /> },
          { text: 'Product Pricing', path: '/reports/product-pricing', icon: <AttachMoney fontSize="small" /> },
        ],
      });
    }

    // My Profile - Order Booker & Computer Operator
    if (['order_booker', 'computer_operator'].includes(role)) {
      items.push({
        text: 'My Profile',
        icon: <Person />,
        path: '/profile',
      });
    }

    // Users - Distributor only
    if (role === 'distributor') {
      items.push({
        text: 'User Management',
        icon: pendingResetCount > 0 ? (
          <Badge badgeContent={pendingResetCount} color="error" max={99}>
            <ManageAccounts />
          </Badge>
        ) : (
          <ManageAccounts />
        ),
        children: [
          { text: 'All Users', path: '/users' },
          { text: 'Add New User', path: '/users/new' },
          { 
            text: pendingResetCount > 0 ? `Reset Requests (${pendingResetCount})` : 'Reset Requests',
            path: '/users/password-reset-requests',
            icon: <LockReset fontSize="small" />,
          },
        ],
      });

      items.push({
        text: 'Settings',
        icon: <Settings />,
        children: [
          { text: 'Business Profile', path: '/settings/profile' },
        ],
      });
    }

    return items;
  }, [user?.role, pendingResetCount]);

  // Drawer content
  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: drawerCollapsed && !isMobile ? 'center' : 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          minHeight: 64,
        }}
      >
        {(!drawerCollapsed || isMobile) && (
          <Typography 
            variant="h6" 
            fontWeight={700} 
            color="primary"
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.1rem' },
              whiteSpace: 'nowrap',
            }}
          >
            AL NOOR TRADERS
          </Typography>
        )}
        {isMobile ? (
          <IconButton onClick={handleDrawerToggle} size="small">
            <Close />
          </IconButton>
        ) : (
          <IconButton onClick={handleDrawerCollapse} size="small">
            <ChevronLeft sx={{ transform: drawerCollapsed ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </IconButton>
        )}
      </Box>

      {/* Navigation List */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List component="nav" disablePadding>
          {menuItems.map((item) => (
            <React.Fragment key={item.text}>
              {item.children ? (
                <>
                  <Tooltip title={drawerCollapsed && !isMobile ? item.text : ''} placement="right" arrow>
                    <ListItemButton
                      onClick={() => drawerCollapsed && !isMobile ? setDrawerCollapsed(false) : handleMenuClick(item.text)}
                      sx={{
                        borderRadius: 1,
                        mx: 1,
                        my: 0.5,
                        minHeight: 48,
                        justifyContent: drawerCollapsed && !isMobile ? 'center' : 'flex-start',
                        px: drawerCollapsed && !isMobile ? 1 : 2,
                      }}
                    >
                      <ListItemIcon 
                        sx={{ 
                          minWidth: drawerCollapsed && !isMobile ? 0 : 40,
                          justifyContent: 'center',
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      {(!drawerCollapsed || isMobile) && (
                        <>
                          <ListItemText 
                            primary={item.text}
                            primaryTypographyProps={{ fontSize: '0.95rem' }}
                          />
                          {openMenus[item.text] ? <ExpandLess /> : <ExpandMore />}
                        </>
                      )}
                    </ListItemButton>
                  </Tooltip>
                  {(!drawerCollapsed || isMobile) && (
                    <Collapse in={openMenus[item.text]} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.children.map((child) => (
                          <ListItemButton
                            key={child.path}
                            onClick={() => handleNavigation(child.path)}
                            sx={{
                              pl: child.icon ? 4 : 6,
                              pr: 2,
                              py: 1,
                              borderRadius: 1,
                              mx: 1,
                              my: 0.25,
                              minHeight: 44,
                              backgroundColor: isActiveRoute(child.path) ? 'primary.main' : 'transparent',
                              color: isActiveRoute(child.path) ? 'white' : 'inherit',
                              '&:hover': {
                                backgroundColor: isActiveRoute(child.path) ? 'primary.dark' : 'action.hover',
                              },
                              transition: 'all 0.15s ease-in-out',
                            }}
                          >
                            {child.icon && (
                              <ListItemIcon
                                sx={{
                                  minWidth: 32,
                                  color: isActiveRoute(child.path) ? 'white' : 'text.secondary',
                                }}
                              >
                                {child.icon}
                              </ListItemIcon>
                            )}
                            <ListItemText 
                              primary={child.text}
                              primaryTypographyProps={{ fontSize: '0.9rem' }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Collapse>
                  )}
                </>
              ) : (
                <Tooltip title={drawerCollapsed && !isMobile ? item.text : ''} placement="right" arrow>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      my: 0.5,
                      minHeight: 48,
                      justifyContent: drawerCollapsed && !isMobile ? 'center' : 'flex-start',
                      px: drawerCollapsed && !isMobile ? 1 : 2,
                      backgroundColor: isActiveRoute(item.path) ? 'primary.main' : 'transparent',
                      color: isActiveRoute(item.path) ? 'white' : 'inherit',
                      '&:hover': {
                        backgroundColor: isActiveRoute(item.path) ? 'primary.dark' : 'action.hover',
                      },
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: drawerCollapsed && !isMobile ? 0 : 40,
                        justifyContent: 'center',
                        color: isActiveRoute(item.path) ? 'white' : 'inherit',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {(!drawerCollapsed || isMobile) && (
                      <ListItemText 
                        primary={item.text}
                        primaryTypographyProps={{ fontSize: '0.95rem' }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>

      {/* User info at bottom (only in full drawer) */}
      {(!drawerCollapsed || isMobile) && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar 
              src={user?.profilePicture}
              sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
            >
              {user?.fullName?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {user?.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {getRoleLabel(user?.role)}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );

  const currentDrawerWidth = drawerCollapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          transition: 'width 0.2s, margin-left 0.2s',
          backgroundColor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="open navigation menu"
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 500,
            }}
          >
            {isSmallMobile ? 'DMS' : 'Distribution Management System'}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={500}>
                {user?.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getRoleLabel(user?.role)}
              </Typography>
            </Box>
            <IconButton 
              onClick={handleProfileMenuOpen}
              sx={{ p: { xs: 0.5, sm: 1 } }}
              aria-label="profile menu"
            >
              <Avatar 
                src={user?.profilePicture} 
                sx={{ 
                  width: { xs: 32, sm: 36 }, 
                  height: { xs: 32, sm: 36 }, 
                  bgcolor: 'primary.main' 
                }}
              >
                {user?.fullName?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              disableScrollLock
              PaperProps={{
                sx: { minWidth: 200, mt: 1 },
              }}
            >
              <MenuItem disabled sx={{ opacity: '1 !important' }}>
                <Person sx={{ mr: 1, color: 'text.secondary' }} /> 
                <Typography variant="body2">{user?.fullName}</Typography>
              </MenuItem>
              <Divider />
              {user?.role === 'distributor' && (
                <MenuItem onClick={() => handleProfileNavigation('/settings/profile')}>
                  <Business sx={{ mr: 1, color: 'text.secondary' }} /> Profile & Settings
                </MenuItem>
              )}
              {['order_booker', 'computer_operator'].includes(user?.role) && (
                <MenuItem onClick={() => handleProfileNavigation('/profile')}>
                  <Person sx={{ mr: 1, color: 'text.secondary' }} /> My Profile
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <Logout sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{ 
          width: { md: currentDrawerWidth }, 
          flexShrink: { md: 0 },
          transition: 'width 0.2s',
        }}
      >
        {/* Mobile Drawer */}
        <SwipeableDrawer
          variant="temporary"
          open={mobileOpen}
          onOpen={() => setMobileOpen(true)}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: Math.min(DRAWER_WIDTH, window.innerWidth * 0.85),
            },
          }}
        >
          {drawerContent}
        </SwipeableDrawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentDrawerWidth,
              transition: 'width 0.2s',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          transition: 'width 0.2s',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />
        
        {/* Page content */}
        <Box 
          sx={{ 
            flex: 1,
            p: { xs: 1.5, sm: 2, md: 3 },
            pb: { xs: 10, md: 3 }, // Extra padding for bottom nav on mobile
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            zIndex: theme.zIndex.appBar,
            borderTop: '1px solid',
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
          }} 
          elevation={8}
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={handleBottomNavChange}
            showLabels
            sx={{
              height: 60,
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                py: 1,
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.7rem',
                mt: 0.5,
                '&.Mui-selected': {
                  fontSize: '0.75rem',
                },
              },
            }}
          >
            <BottomNavigationAction 
              label="Dashboard" 
              icon={<Dashboard />} 
            />
            <BottomNavigationAction 
              label="Orders" 
              icon={<ShoppingCart />} 
            />
            <BottomNavigationAction 
              label="Customers" 
              icon={<People />} 
            />
            <BottomNavigationAction 
              label="Payments" 
              icon={<Payment />} 
            />
            <BottomNavigationAction 
              label="More" 
              icon={<MoreHoriz />} 
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default MainLayout;
