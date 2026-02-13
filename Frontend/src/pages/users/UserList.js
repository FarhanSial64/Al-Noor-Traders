import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, IconButton, Chip, InputAdornment, Tooltip } from '@mui/material';
import { Add, Search, Edit, Block, CheckCircle } from '@mui/icons-material';
import userService from '../../services/userService';
import PageHeader from '../../components/common/PageHeader';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const UserList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try { setLoading(true); const response = await userService.getUsers(); setUsers(response.data || []); } catch (error) { toast.error('Failed to load users'); } finally { setLoading(false); }
  };

  const getRoleColor = (role) => ({ distributor: 'error', computer_operator: 'primary', order_booker: 'info', customer: 'default' }[role] || 'default');
  const getRoleLabel = (role) => ({ distributor: 'Distributor', computer_operator: 'Computer Operator', order_booker: 'Order Booker', customer: 'Customer' }[role] || role);

  const handleToggleActive = async (user) => {
    try {
      await userService.updateUser(user._id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <PageHeader title="Users" subtitle="Manage system users" action={<Button variant="contained" startIcon={<Add />} onClick={() => navigate('/users/new')}>Add User</Button>} />
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField placeholder="Search by name, username, or email..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
        </CardContent>
      </Card>

      <Card>
        {loading ? <Loading /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user._id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell><Chip label={getRoleLabel(user.role)} size="small" color={getRoleColor(user.role)} /></TableCell>
                    <TableCell><Chip label={user.isActive ? 'Active' : 'Inactive'} size="small" color={user.isActive ? 'success' : 'default'} /></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit User">
                        <IconButton size="small" onClick={() => navigate(`/users/${user._id}/edit`)}><Edit fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title={user.isActive ? 'Deactivate User' : 'Activate User'}>
                        <IconButton size="small" onClick={() => handleToggleActive(user)} color={user.isActive ? 'error' : 'success'}>
                          {user.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && <TableRow><TableCell colSpan={7} align="center">No users found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
};

export default UserList;
