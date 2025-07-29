
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Search, Eye, Package, Truck } from 'lucide-react';

const VendorOrders: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const orders = [
    {
      id: 'ORD-001',
      farmer: 'Rajesh Kumar',
      product: 'Organic Fertilizer NPK 10-10-10',
      quantity: 2,
      amount: '₹5,000',
      status: 'pending',
      date: '2024-01-15',
      address: 'Village Rampur, District Meerut, UP'
    },
    {
      id: 'ORD-002',
      farmer: 'Priya Sharma',
      product: 'Wheat Seeds - Premium Quality',
      quantity: 10,
      amount: '₹1,200',
      status: 'processing',
      date: '2024-01-14',
      address: 'Kisan Nagar, Ludhiana, Punjab'
    },
    {
      id: 'ORD-003',
      farmer: 'Suresh Patel',
      product: 'Bio Pesticide - Neem Based',
      quantity: 5,
      amount: '₹4,250',
      status: 'shipped',
      date: '2024-01-13',
      address: 'Gram Panchayat Kheda, Gujarat'
    },
    {
      id: 'ORD-004',
      farmer: 'Anita Devi',
      product: 'Drip Irrigation Kit',
      quantity: 1,
      amount: '₹15,000',
      status: 'delivered',
      date: '2024-01-12',
      address: 'Farmer Colony, Jaipur, Rajasthan'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800">Shipped</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getActionButton = (status: string, orderId: string) => {
    switch (status) {
      case 'pending':
        return (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Package className="w-4 h-4 mr-1" />
            Process
          </Button>
        );
      case 'processing':
        return (
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Truck className="w-4 h-4 mr-1" />
            Ship
          </Button>
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

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Order Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track and manage customer orders and dispatches.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</h3>
              <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Processing</h3>
              <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'processing').length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivered</h3>
              <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'delivered').length}</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.farmer}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{order.address}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.product}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell className="font-medium">{order.amount}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>
                      {getActionButton(order.status, order.id)}
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

export default VendorOrders;
