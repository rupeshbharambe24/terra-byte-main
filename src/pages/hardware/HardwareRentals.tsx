
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Search, Check, X, Eye, Phone } from 'lucide-react';

const HardwareRentals: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const rentals = [
    {
      id: 'RNT-001',
      farmer: 'Rajesh Kumar',
      phone: '+91 98765 43210',
      equipment: 'John Deere 5075E Tractor',
      startDate: '2024-01-20',
      endDate: '2024-01-23',
      duration: '3 days',
      amount: '₹4,500',
      status: 'pending',
      location: 'Village Rampur, Meerut',
      purpose: 'Field preparation for wheat sowing'
    },
    {
      id: 'RNT-002',
      farmer: 'Priya Sharma',
      phone: '+91 98765 43211',
      equipment: 'Case IH 2000 Harvester',
      startDate: '2024-01-18',
      endDate: '2024-01-20',
      duration: '2 days',
      amount: '₹8,000',
      status: 'active',
      location: 'Kisan Nagar, Ludhiana',
      purpose: 'Rice harvesting'
    },
    {
      id: 'RNT-003',
      farmer: 'Suresh Patel',
      phone: '+91 98765 43212',
      equipment: 'Field King Sprayer',
      startDate: '2024-01-15',
      endDate: '2024-01-16',
      duration: '1 day',
      amount: '₹600',
      status: 'completed',
      location: 'Gram Panchayat Kheda',
      purpose: 'Pesticide spraying'
    },
    {
      id: 'RNT-004',
      farmer: 'Anita Devi',
      phone: '+91 98765 43213',
      equipment: 'Lemken Plough',
      startDate: '2024-01-25',
      endDate: '2024-01-26',
      duration: '1 day',
      amount: '₹800',
      status: 'rejected',
      location: 'Farmer Colony, Jaipur',
      purpose: 'Land preparation'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getActionButtons = (status: string, rentalId: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex space-x-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-1" />
              Accept
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        );
      default:
        return (
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        );
    }
  };

  const filteredRentals = rentals.filter(rental =>
    rental.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.equipment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Rental Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage equipment rental requests and track active rentals.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{rentals.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</h3>
              <p className="text-2xl font-bold text-yellow-600">{rentals.filter(r => r.status === 'pending').length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Rentals</h3>
              <p className="text-2xl font-bold text-green-600">{rentals.filter(r => r.status === 'active').length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">This Month Revenue</h3>
              <p className="text-2xl font-bold text-purple-600">₹13,900</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search rentals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Rentals Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rental ID</TableHead>
                  <TableHead>Farmer Details</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRentals.map((rental) => (
                  <TableRow key={rental.id}>
                    <TableCell className="font-medium">{rental.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{rental.farmer}</p>
                        <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="w-3 h-3" />
                          <span>{rental.phone}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{rental.location}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rental.equipment}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {rental.startDate} to {rental.endDate}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{rental.duration}</TableCell>
                    <TableCell className="font-medium">{rental.amount}</TableCell>
                    <TableCell>{getStatusBadge(rental.status)}</TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-32 truncate">
                        {rental.purpose}
                      </p>
                    </TableCell>
                    <TableCell>
                      {getActionButtons(rental.status, rental.id)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HardwareRentals;
