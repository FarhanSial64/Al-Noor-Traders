import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Store,
  ShoppingBag,
  Person,
  Logout,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { logout } from '../store/slices/authSlice';

const CustomerLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <Store sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate('/shop')}
          >
            Al Noor Traders
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Button
            color="inherit"
            startIcon={<Store />}
            onClick={() => navigate('/shop')}
          >
            Shop
          </Button>

          <Button
            color="inherit"
            startIcon={<ShoppingBag />}
            onClick={() => navigate('/shop/orders')}
          >
            My Orders
          </Button>

          <IconButton
            color="inherit"
            onClick={handleMenu}
            sx={{ ml: 2 }}
          >
            <Avatar 
              src={user?.profilePicture} 
              sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
            >
              {user?.fullName?.charAt(0) || 'C'}
            </Avatar>
            <KeyboardArrowDown />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {user?.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { handleClose(); navigate('/shop/profile'); }}>
              <Person sx={{ mr: 1 }} /> Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} /> Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f5f5f5' }}>
        <Outlet />
      </Box>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 3,
          bgcolor: 'grey.900',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Typography variant="body2">
          © {new Date().getFullYear()} Al Noor Traders. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default CustomerLayout;
