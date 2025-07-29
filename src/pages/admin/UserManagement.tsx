
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Search, UserPlus, Edit, Trash2, Ban, CheckCircle } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const users = [
    {
      id: 'U001',
      name: 'Rajesh Kumar',
      email: 'rajesh@farmer.com',
      role: 'farmer',
      status: 'active',
      joinDate: '2024-01-15',
      lastLogin: '2024-05-25',
      location: 'Punjab, India'
    },
    {
      id: 'U002',
      name: 'Dr. Priya Sharma',
      email: 'priya@expert.com',
      role: 'expert',
      status: 'active',
      joinDate: '2024-02-20',
      lastLogin: '2024-05-26',
      location: 'Delhi, India'
    },
    {
      id: 'U003',
      name: 'AgriSeeds Co.',
      email: 'info@agriseeds.com',
      role: 'agri_vendor',
      status: 'pending',
      joinDate: '2024-05-20',
      lastLogin: '2024-05-24',
      location: 'Maharashtra, India'
    },
    {
      id: 'U004',
      name: 'TechFarm Equipment',
      email: 'contact@techfarm.com',
      role: 'hardware_vendor',
      status: 'suspended',
      joinDate: '2024-03-10',
      lastLogin: '2024-05-15',
      location: 'Gujarat, India'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      farmer: 'bg-blue-100 text-blue-800',
      expert: 'bg-purple-100 text-purple-800',
      agri_vendor: 'bg-orange-100 text-orange-800',
      hardware_vendor: 'bg-teal-100 text-teal-800',
      admin: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={roleColors[role as keyof typeof roleColors]}>{role.replace('_', ' ')}</Badge>;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const stats = [
    { label: 'Total Users', value: '1,245', change: '+12%', icon: '👥' },
    { label: 'Active Users', value: '1,156', change: '+8%', icon: '✅' },
    { label: 'Pending Approval', value: '23', change: '-5%', icon: '⏳' },
    { label: 'Suspended', value: '66', change: '+2%', icon: '🚫' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage all platform users and their permissions.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                    <div className="text-2xl">{stat.icon}</div>
                  </div>
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    {stat.change} from last month
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="all">All Roles</option>
                <option value="farmer">Farmer</option>
                <option value="expert">Expert</option>
                <option value="agri_vendor">Agri Vendor</option>
                <option value="hardware_vendor">Hardware Vendor</option>
              </select>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{user.joinDate}</TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                      <TableCell>{user.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          {user.status === 'active' ? (
                            <Button variant="outline" size="sm" className="text-red-600">
                              <Ban className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="text-green-600">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default UserManagement;
