import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { Plus, MapPin, Phone, Mail, Edit, Trash2 } from 'lucide-react';

interface KVKCenter {
  id: string;
  name: string;
  address: string;
  district: string;
  state: string;
  pincode: string;
  contact: string;
  email: string;
  latitude: number;
  longitude: number;
  specializations: string[];
  status: 'active' | 'inactive';
}

const KVKManagement: React.FC = () => {
  const [kvkCenters, setKvkCenters] = useState<KVKCenter[]>([
    {
      id: '1',
      name: 'KVK Pune',
      address: 'Agricultural College Campus, Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
      contact: '+91 20 2569 1234',
      email: 'kvkpune@gmail.com',
      latitude: 18.5204,
      longitude: 73.8567,
      specializations: ['Crop Production', 'Soil Management', 'Organic Farming'],
      status: 'active'
    },
    {
      id: '2',
      name: 'KVK Nashik',
      address: 'MPKV Campus, Rahuri, Nashik',
      district: 'Nashik',
      state: 'Maharashtra',
      pincode: '413722',
      contact: '+91 2426 243 100',
      email: 'kvknashik@rediffmail.com',
      latitude: 19.9975,
      longitude: 73.7898,
      specializations: ['Horticulture', 'Irrigation', 'Pest Management'],
      status: 'active'
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKVK, setEditingKVK] = useState<KVKCenter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    district: '',
    state: '',
    pincode: '',
    contact: '',
    email: '',
    latitude: '',
    longitude: '',
    specializations: '',
    status: 'active' as 'active' | 'inactive'
  });

  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address || !formData.contact) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newKVK: KVKCenter = {
      id: editingKVK?.id || Date.now().toString(),
      name: formData.name,
      address: formData.address,
      district: formData.district,
      state: formData.state,
      pincode: formData.pincode,
      contact: formData.contact,
      email: formData.email,
      latitude: parseFloat(formData.latitude) || 0,
      longitude: parseFloat(formData.longitude) || 0,
      specializations: formData.specializations.split(',').map(s => s.trim()).filter(s => s),
      status: formData.status
    };

    if (editingKVK) {
      setKvkCenters(prev => prev.map(kvk => kvk.id === editingKVK.id ? newKVK : kvk));
      toast({
        title: "KVK Updated",
        description: "KVK center has been updated successfully",
      });
    } else {
      setKvkCenters(prev => [...prev, newKVK]);
      toast({
        title: "KVK Added",
        description: "New KVK center has been added successfully",
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      district: '',
      state: '',
      pincode: '',
      contact: '',
      email: '',
      latitude: '',
      longitude: '',
      specializations: '',
      status: 'active'
    });
    setEditingKVK(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (kvk: KVKCenter) => {
    setEditingKVK(kvk);
    setFormData({
      name: kvk.name,
      address: kvk.address,
      district: kvk.district,
      state: kvk.state,
      pincode: kvk.pincode,
      contact: kvk.contact,
      email: kvk.email,
      latitude: kvk.latitude.toString(),
      longitude: kvk.longitude.toString(),
      specializations: kvk.specializations.join(', '),
      status: kvk.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setKvkCenters(prev => prev.filter(kvk => kvk.id !== id));
    toast({
      title: "KVK Deleted",
      description: "KVK center has been deleted successfully",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  KVK Center Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage Krishi Vigyan Kendra centers and their information.
                </p>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add KVK Center
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingKVK ? 'Edit' : 'Add'} KVK Center</DialogTitle>
                    <DialogDescription>
                      {editingKVK ? 'Update' : 'Add'} KVK center information and location details.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Center Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="KVK Center Name"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="district">District *</Label>
                        <Input
                          id="district"
                          value={formData.district}
                          onChange={(e) => handleInputChange('district', e.target.value)}
                          placeholder="District"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Full address"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={formData.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          placeholder="State"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="pincode">Pincode</Label>
                        <Input
                          id="pincode"
                          value={formData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          placeholder="Pincode"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact">Contact Number *</Label>
                        <Input
                          id="contact"
                          value={formData.contact}
                          onChange={(e) => handleInputChange('contact', e.target.value)}
                          placeholder="+91 XXXXXXXXXX"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          value={formData.latitude}
                          onChange={(e) => handleInputChange('latitude', e.target.value)}
                          placeholder="18.5204"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          value={formData.longitude}
                          onChange={(e) => handleInputChange('longitude', e.target.value)}
                          placeholder="73.8567"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="specializations">Specializations</Label>
                      <Input
                        id="specializations"
                        value={formData.specializations}
                        onChange={(e) => handleInputChange('specializations', e.target.value)}
                        placeholder="Crop Production, Soil Management, Organic Farming (comma separated)"
                      />
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        {editingKVK ? 'Update' : 'Add'} KVK Center
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* KVK Centers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {kvkCenters.map((kvk) => (
              <Card key={kvk.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{kvk.name}</CardTitle>
                      <CardDescription className="flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {kvk.district}, {kvk.state}
                      </CardDescription>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      kvk.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {kvk.status}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{kvk.address}</p>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{kvk.contact}</span>
                  </div>
                  
                  {kvk.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{kvk.email}</span>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    {kvk.specializations.map((spec, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-xs rounded"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(kvk)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(kvk.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default KVKManagement;