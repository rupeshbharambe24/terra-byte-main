
import React, { useState, useEffect } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, Clock, Calendar, Video, MessageSquare, Navigation, Search } from 'lucide-react';
import KVKMap from '../../components/KVKMap';

interface KVK {
  id: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  district: string;
  state: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  specializations: string[];
  distance?: number;
}

interface ConsultationForm {
  name: string;
  phone: string;
  email: string;
  preferredDate: string;
  timeSlot: string;
  consultationType: 'video' | 'audio' | 'in-person';
  topic: string;
  description: string;
  kvkId: string;
}

const mockKVKs: KVK[] = [
  {
    id: '1',
    name: 'KVK Pune',
    address: 'Agricultural College Campus, Pune, Maharashtra - 411005',
    contact: '+91 20 2569 1234',
    email: 'kvkpune@gmail.com',
    district: 'Pune',
    state: 'Maharashtra',
    coordinates: { lat: 18.5204, lng: 73.8567 },
    specializations: ['Crop Production', 'Soil Management', 'Organic Farming']
  },
  {
    id: '2',
    name: 'KVK Nashik',
    address: 'MPKV Campus, Rahuri, Nashik, Maharashtra - 413722',
    contact: '+91 2426 243 100',
    email: 'kvknashik@rediffmail.com',
    district: 'Nashik',
    state: 'Maharashtra',
    coordinates: { lat: 19.9975, lng: 73.7898 },
    specializations: ['Horticulture', 'Irrigation', 'Pest Management']
  },
  {
    id: '3',
    name: 'KVK Kolhapur',
    address: 'College of Agriculture, Kolhapur, Maharashtra - 416004',
    contact: '+91 231 2638 444',
    email: 'kvkkolhapur@yahoo.com',
    district: 'Kolhapur',
    state: 'Maharashtra',
    coordinates: { lat: 16.7050, lng: 74.2433 },
    specializations: ['Sugarcane', 'Dairy Farming', 'Agricultural Engineering']
  }
];

const timeSlots = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM'
];

const consultationTopics = [
  'Crop Selection & Planning',
  'Soil Testing & Management',
  'Pest & Disease Control',
  'Irrigation Techniques',
  'Organic Farming',
  'Government Schemes',
  'Market Information',
  'Technology Adoption',
  'Other'
];

const KVKConsultation: React.FC = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [kvks, setKvks] = useState<KVK[]>(mockKVKs);
  const [selectedKVK, setSelectedKVK] = useState<string>('');
  const [consultationForm, setConsultationForm] = useState<ConsultationForm>({
    name: '',
    phone: '',
    email: '',
    preferredDate: '',
    timeSlot: '',
    consultationType: 'video',
    topic: '',
    description: '',
    kvkId: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          calculateDistances(location);
        },
        (error) => {
          console.log('Location access denied:', error);
          // Default to Pune coordinates if location access is denied
          setUserLocation({ lat: 18.5204, lng: 73.8567 });
        }
      );
    }
  }, []);

  const calculateDistances = (userLoc: { lat: number; lng: number }) => {
    const updatedKVKs = mockKVKs.map(kvk => {
      const distance = getDistance(userLoc, kvk.coordinates);
      return { ...kvk, distance };
    }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
    
    setKvks(updatedKVKs);
  };

  const getDistance = (pos1: { lat: number; lng: number }, pos2: { lat: number; lng: number }) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLon = (pos2.lng - pos1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleFormChange = (field: keyof ConsultationForm, value: string) => {
    setConsultationForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConsultationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consultationForm.name || !consultationForm.phone || !consultationForm.preferredDate || 
        !consultationForm.timeSlot || !consultationForm.topic) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Consultation Booked!",
      description: "Your consultation request has been submitted. The KVK will contact you soon.",
    });

    // Reset form
    setConsultationForm({
      name: '',
      phone: '',
      email: '',
      preferredDate: '',
      timeSlot: '',
      consultationType: 'video',
      topic: '',
      description: '',
      kvkId: ''
    });
  };

  const openDirections = (kvk: KVK) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${kvk.coordinates.lat},${kvk.coordinates.lng}`;
    window.open(url, '_blank');
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleKVKSelect = (kvkId: string) => {
    setSelectedKVK(kvkId);
    setConsultationForm(prev => ({ ...prev, kvkId }));
    // Scroll to consultation form
    document.getElementById('consultation-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              🧭 Find Nearest KVK & Expert Consultation
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Locate Krishi Vigyan Kendras near you and book expert consultations
            </p>
          </div>

          <Tabs defaultValue="map-view" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="map-view" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="kvk-list" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                KVK Directory
              </TabsTrigger>
              <TabsTrigger value="consultation" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Book Consultation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="map-view" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>KVK Locations Near You</CardTitle>
                  <CardDescription>
                    Interactive map showing nearby Krishi Vigyan Kendras
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <KVKMap 
                    kvks={kvks.map(kvk => ({
                      id: kvk.id,
                      name: kvk.name,
                      coordinates: kvk.coordinates,
                      distance: kvk.distance
                    }))}
                    userLocation={userLocation}
                    onKVKSelect={handleKVKSelect}
                  />
                </CardContent>
              </Card>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kvks.slice(0, 3).map((kvk) => (
                  <Card key={kvk.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleKVKSelect(kvk.id)}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{kvk.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{kvk.district}, {kvk.state}</p>
                      {kvk.distance && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          {kvk.distance.toFixed(1)} km away
                        </p>
                      )}
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDirections(kvk); }}>
                          <Navigation className="w-3 h-3 mr-1" />
                          Directions
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleKVKSelect(kvk.id); }}>
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="kvk-list" className="space-y-6">
              {/* KVK List */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {kvks.map((kvk) => (
                  <Card key={kvk.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {kvk.name}
                        {kvk.distance && (
                          <span className="text-sm font-normal text-green-600 dark:text-green-400">
                            {kvk.distance.toFixed(1)} km
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>{kvk.district}, {kvk.state}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1 text-gray-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {kvk.address}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <a 
                          href={`tel:${kvk.contact}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {kvk.contact}
                        </a>
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm mb-2">Specializations:</h4>
                        <div className="flex flex-wrap gap-1">
                          {kvk.specializations.map((spec, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 text-xs rounded"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDirections(kvk)}
                          className="flex-1"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Directions
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedKVK(kvk.id);
                            setConsultationForm(prev => ({ ...prev, kvkId: kvk.id }));
                          }}
                          className="flex-1"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="consultation" className="space-y-6">
              <Card id="consultation-form">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Book Expert Consultation
                  </CardTitle>
                  <CardDescription>
                    Schedule a consultation with agricultural experts
                    {selectedKVK && (
                      <span className="block mt-1 text-green-600 dark:text-green-400">
                        Selected: {kvks.find(k => k.id === selectedKVK)?.name}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <form onSubmit={handleConsultationSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={consultationForm.name}
                          onChange={(e) => handleFormChange('name', e.target.value)}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={consultationForm.phone}
                          onChange={(e) => handleFormChange('phone', e.target.value)}
                          placeholder="Enter your phone number"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={consultationForm.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div>
                      <Label htmlFor="kvk">Select KVK *</Label>
                      <Select value={consultationForm.kvkId} onValueChange={(value) => handleFormChange('kvkId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a KVK" />
                        </SelectTrigger>
                        <SelectContent>
                          {kvks.map((kvk) => (
                            <SelectItem key={kvk.id} value={kvk.id}>
                              {kvk.name} {kvk.distance && `(${kvk.distance.toFixed(1)} km)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="date">Preferred Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={consultationForm.preferredDate}
                          onChange={(e) => handleFormChange('preferredDate', e.target.value)}
                          min={getTodayDate()}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="timeSlot">Time Slot *</Label>
                        <Select value={consultationForm.timeSlot} onValueChange={(value) => handleFormChange('timeSlot', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="consultationType">Consultation Type</Label>
                        <Select value={consultationForm.consultationType} onValueChange={(value) => handleFormChange('consultationType', value as 'video' | 'audio' | 'in-person')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Video Call</SelectItem>
                            <SelectItem value="audio">Audio Call</SelectItem>
                            <SelectItem value="in-person">In-Person</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="topic">Consultation Topic *</Label>
                      <Select value={consultationForm.topic} onValueChange={(value) => handleFormChange('topic', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select consultation topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {consultationTopics.map((topic) => (
                            <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Additional Details</Label>
                      <Textarea
                        id="description"
                        value={consultationForm.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        placeholder="Describe your specific questions or concerns..."
                        rows={4}
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Consultation
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default KVKConsultation;