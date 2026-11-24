
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Search, Plus, MapPin, Users, BookOpen, Phone, Mail } from 'lucide-react';

const KVKIntegration: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const kvkCenters = [
    {
      id: 'KVK001',
      name: 'KVK Punjab Agricultural University',
      location: 'Ludhiana, Punjab',
      district: 'Ludhiana',
      state: 'Punjab',
      status: 'active',
      established: '1975',
      farmers: 2340,
      programs: 45,
      contact: '+91-161-2401960',
      email: 'kvk.ludhiana@pau.edu'
    },
    {
      id: 'KVK002',
      name: 'KVK Anand Agricultural University',
      location: 'Anand, Gujarat',
      district: 'Anand',
      state: 'Gujarat',
      status: 'active',
      established: '1978',
      farmers: 1890,
      programs: 38,
      contact: '+91-2692-261317',
      email: 'kvk.anand@aau.in'
    },
    {
      id: 'KVK003',
      name: 'KVK Tamil Nadu Agricultural University',
      location: 'Coimbatore, Tamil Nadu',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      status: 'pending',
      established: '1980',
      farmers: 1650,
      programs: 32,
      contact: '+91-422-6611200',
      email: 'kvk.coimbatore@tnau.ac.in'
    },
    {
      id: 'KVK004',
      name: 'KVK University of Agricultural Sciences',
      location: 'Bangalore, Karnataka',
      district: 'Bangalore Rural',
      state: 'Karnataka',
      status: 'active',
      established: '1982',
      farmers: 2150,
      programs: 41,
      contact: '+91-80-23330153',
      email: 'kvk.bangalore@uas.ac.in'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const filteredCenters = kvkCenters.filter(center =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total KVK Centers', value: '150', icon: MapPin, color: 'text-blue-600' },
    { label: 'Active Partnerships', value: '142', icon: Users, color: 'text-green-600' },
    { label: 'Training Programs', value: '1,250', icon: BookOpen, color: 'text-purple-600' },
    { label: 'Farmers Reached', value: '45,680', icon: Users, color: 'text-orange-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              KVK Integration
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage partnerships with Krishi Vigyan Kendras across India.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      </div>
                      <Icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Search and Add */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search KVK centers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add KVK Center
            </Button>
          </div>

          {/* KVK Centers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {filteredCenters.map((center) => (
              <Card key={center.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{center.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {center.location}
                      </CardDescription>
                    </div>
                    {getStatusBadge(center.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Established</p>
                        <p className="font-medium">{center.established}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">State</p>
                        <p className="font-medium">{center.state}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Farmers</p>
                          <p className="font-medium">{center.farmers.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Programs</p>
                          <p className="font-medium">{center.programs}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{center.contact}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{center.email}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-6">
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      Sync Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle>State-wise Distribution</CardTitle>
              <CardDescription>KVK centers by state</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>State</TableHead>
                    <TableHead>Total Centers</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Farmers Reached</TableHead>
                    <TableHead>Programs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Punjab</TableCell>
                    <TableCell>22</TableCell>
                    <TableCell>21</TableCell>
                    <TableCell>12,450</TableCell>
                    <TableCell>145</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Gujarat</TableCell>
                    <TableCell>18</TableCell>
                    <TableCell>17</TableCell>
                    <TableCell>9,870</TableCell>
                    <TableCell>112</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Karnataka</TableCell>
                    <TableCell>25</TableCell>
                    <TableCell>24</TableCell>
                    <TableCell>11,230</TableCell>
                    <TableCell>167</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Tamil Nadu</TableCell>
                    <TableCell>20</TableCell>
                    <TableCell>19</TableCell>
                    <TableCell>8,960</TableCell>
                    <TableCell>134</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default KVKIntegration;
