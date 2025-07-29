
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Plus, Search, Edit, Calendar, Settings } from 'lucide-react';

const HardwareEquipment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const equipment = [
    {
      id: 'EQ001',
      name: 'John Deere 5075E Tractor',
      type: 'Tractor',
      model: '2023',
      capacity: '75 HP',
      rentPrice: '₹1,500/day',
      status: 'available',
      location: 'Warehouse A',
      nextBooking: 'Dec 28, 2024',
      totalBookings: 45,
      image: '🚜'
    },
    {
      id: 'EQ002',
      name: 'Case IH 2000 Harvester',
      type: 'Harvester',
      model: '2022',
      capacity: '200 HP',
      rentPrice: '₹4,000/day',
      status: 'rented',
      location: 'Field Site B',
      nextBooking: 'Jan 5, 2025',
      totalBookings: 32,
      image: '🌾'
    },
    {
      id: 'EQ003',
      name: 'Field King Sprayer',
      type: 'Sprayer',
      model: '2023',
      capacity: '500L Tank',
      rentPrice: '₹600/day',
      status: 'maintenance',
      location: 'Service Center',
      nextBooking: 'Dec 30, 2024',
      totalBookings: 67,
      image: '💧'
    },
    {
      id: 'EQ004',
      name: 'Lemken Plough',
      type: 'Plough',
      model: '2023',
      capacity: '3 Furrow',
      rentPrice: '₹800/day',
      status: 'available',
      location: 'Warehouse A',
      nextBooking: 'Available',
      totalBookings: 28,
      image: '⚙️'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'rented':
        return <Badge className="bg-blue-100 text-blue-800">Rented</Badge>;
      case 'maintenance':
        return <Badge className="bg-orange-100 text-orange-800">Maintenance</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Equipment Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your agricultural equipment inventory and availability.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Equipment</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{equipment.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Available</h3>
              <p className="text-2xl font-bold text-green-600">{equipment.filter(e => e.status === 'available').length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rented</h3>
              <p className="text-2xl font-bold text-blue-600">{equipment.filter(e => e.status === 'rented').length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Maintenance</h3>
              <p className="text-2xl font-bold text-orange-600">{equipment.filter(e => e.status === 'maintenance').length}</p>
            </div>
          </div>

          {/* Actions and Search */}
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </div>

          {/* Equipment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquipment.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">{item.image}</div>
                  {getStatusBadge(item.status)}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {item.name}
                </h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-white">{item.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Model:</span>
                    <span className="text-gray-900 dark:text-white">{item.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Capacity:</span>
                    <span className="text-gray-900 dark:text-white">{item.capacity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Rent Price:</span>
                    <span className="font-medium text-purple-600">{item.rentPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Location:</span>
                    <span className="text-gray-900 dark:text-white">{item.location}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Next Booking:</span>
                    <span className="text-gray-900 dark:text-white">{item.nextBooking}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total Bookings:</span>
                    <span className="text-gray-900 dark:text-white">{item.totalBookings}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default HardwareEquipment;
