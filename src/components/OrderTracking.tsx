
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Truck, Clock, CheckCircle, XCircle, Search, Phone, MapPin } from 'lucide-react';

interface Order {
  id: string;
  type: 'purchase' | 'rental';
  itemName: string;
  vendor: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'active' | 'completed';
  orderDate: Date;
  estimatedDelivery?: Date;
  trackingNumber?: string;
  customerName: string;
  address: string;
}

const OrderTracking: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const orders: Order[] = [
    {
      id: 'ORD-001',
      type: 'purchase',
      itemName: 'Premium Wheat Seeds',
      vendor: 'AgriSeeds Co.',
      amount: 1200,
      status: 'shipped',
      orderDate: new Date('2024-01-20'),
      estimatedDelivery: new Date('2024-01-25'),
      trackingNumber: 'TRK123456789',
      customerName: 'Rajesh Kumar',
      address: 'Village Rampur, Meerut, UP'
    },
    {
      id: 'RNT-001',
      type: 'rental',
      itemName: 'John Deere 5075E Tractor',
      vendor: 'Farm Equipment Co.',
      amount: 4500,
      status: 'active',
      orderDate: new Date('2024-01-18'),
      customerName: 'Priya Sharma',
      address: 'Kisan Nagar, Ludhiana, Punjab'
    },
    {
      id: 'ORD-002',
      type: 'purchase',
      itemName: 'Organic NPK Fertilizer',
      vendor: 'Green Grow',
      amount: 850,
      status: 'delivered',
      orderDate: new Date('2024-01-15'),
      estimatedDelivery: new Date('2024-01-20'),
      trackingNumber: 'TRK987654321',
      customerName: 'Suresh Patel',
      address: 'Gram Panchayat Kheda, Gujarat'
    }
  ];

  const getStatusBadge = (status: string, type: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      shipped: { color: 'bg-purple-100 text-purple-800', icon: Truck },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
      active: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTrackingSteps = (status: string, type: string) => {
    if (type === 'rental') {
      return [
        { step: 'Booking Confirmed', completed: ['confirmed', 'active', 'completed'].includes(status) },
        { step: 'Equipment Prepared', completed: ['active', 'completed'].includes(status) },
        { step: 'Equipment Delivered', completed: ['active', 'completed'].includes(status) },
        { step: 'Rental Active', completed: ['active', 'completed'].includes(status) },
        { step: 'Equipment Returned', completed: status === 'completed' }
      ];
    } else {
      return [
        { step: 'Order Placed', completed: true },
        { step: 'Order Confirmed', completed: ['confirmed', 'shipped', 'delivered'].includes(status) },
        { step: 'Shipped', completed: ['shipped', 'delivered'].includes(status) },
        { step: 'Out for Delivery', completed: status === 'delivered' },
        { step: 'Delivered', completed: status === 'delivered' }
      ];
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || order.type === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="fixed top-20 right-6 z-50 bg-white dark:bg-gray-800 shadow-lg border-green-500"
        >
          <Package className="w-4 h-4 mr-2" />
          Track Orders
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Order & Rental Tracking</span>
          </DialogTitle>
          <DialogDescription>
            Track all your purchases and equipment rentals
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by order ID or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="purchase">Purchases</TabsTrigger>
              <TabsTrigger value="rental">Rentals</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center space-x-2">
                          {order.type === 'rental' ? <Truck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                          <span>{order.id}</span>
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          {order.type === 'rental' ? 'Equipment Rental' : 'Product Purchase'}
                        </p>
                      </div>
                      {getStatusBadge(order.status, order.type)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Order Details */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Order Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Item:</span>
                            <span className="font-medium">{order.itemName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Vendor:</span>
                            <span>{order.vendor}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Amount:</span>
                            <span className="font-medium">₹{order.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Order Date:</span>
                            <span>{order.orderDate.toLocaleDateString()}</span>
                          </div>
                          {order.estimatedDelivery && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Est. Delivery:</span>
                              <span>{order.estimatedDelivery.toLocaleDateString()}</span>
                            </div>
                          )}
                          {order.trackingNumber && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Tracking:</span>
                              <span className="font-mono text-xs">{order.trackingNumber}</span>
                            </div>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="pt-3 border-t">
                          <h5 className="font-medium mb-2">Delivery Details</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span>{order.customerName}</span>
                            </div>
                            <div className="text-gray-500 ml-5">
                              {order.address}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tracking Progress */}
                      <div className="space-y-3">
                        <h4 className="font-medium">Tracking Progress</h4>
                        <div className="space-y-3">
                          {getTrackingSteps(order.status, order.type).map((step, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${
                                step.completed 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`} />
                              <span className={`text-sm ${
                                step.completed 
                                  ? 'text-gray-900 dark:text-white font-medium' 
                                  : 'text-gray-500'
                              }`}>
                                {step.step}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 space-y-2">
                          {order.trackingNumber && (
                            <Button variant="outline" size="sm" className="w-full">
                              <Truck className="w-4 h-4 mr-2" />
                              Track Package
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="w-full">
                            <Phone className="w-4 h-4 mr-2" />
                            Contact {order.type === 'rental' ? 'Equipment' : 'Vendor'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No orders found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No orders match your search criteria.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTracking;