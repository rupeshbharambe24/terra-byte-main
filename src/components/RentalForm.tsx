import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, MapPin, Settings } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  type: string;
  capacity: string;
  rentPrice: string;
  image: string;
  owner_id: string; // Added owner_id for backend integration
  owner_name: string;
}

interface RentalFormProps {
  equipment: Equipment;
  onRentalSuccess?: () => void; // Optional callback for successful rental
}

const RentalForm: React.FC<RentalFormProps> = ({ equipment, onRentalSuccess }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
    farmAddress: '',
    city: '',
    state: '',
    pincode: '',
    startDate: '',
    endDate: '',
    startTime: '08:00',
    endTime: '17:00',
    purpose: '',
    operatorRequired: false,
    transportRequired: false,
    specialRequirements: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.startDate || !formData.endDate) {
        throw new Error('Please select both start and end dates');
      }

      // Calculate rental details
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      if (endDateTime <= startDateTime) {
        throw new Error('End date must be after start date');
      }

      const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      const dailyRate = parseFloat(equipment.rentPrice.replace('₹', '').replace('/day', '').replace(',', ''));
      let totalAmount = Math.ceil(durationHours / 24) * dailyRate;

      if (formData.operatorRequired) totalAmount += Math.ceil(durationHours / 24) * 500;
      if (formData.transportRequired) totalAmount += 1000;

    const rentalData = {
      equipment: {
        id: equipment.id,
        name: equipment.name,
        type: equipment.type,
        rentPrice: dailyRate,
        owner_id: equipment.owner_id
      },
      // Required fields
      customerName: formData.customerName,
      phone: formData.phone,
      farmAddress: formData.farmAddress,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      startDate: formData.startDate,
      endDate: formData.endDate,
      purpose: formData.purpose,
      // Optional fields
      email: formData.email,
      startTime: formData.startTime,
      endTime: formData.endTime,
      operatorRequired: formData.operatorRequired,
      transportRequired: formData.transportRequired,
      specialRequirements: formData.specialRequirements,
      // Calculated fields
      duration_hours: durationHours,
      total_amount: totalAmount
    };

      console.log('Final rental data being sent:', rentalData);

      const response = await fetch('http://localhost:5000/api/equipment/rent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rentalData),
      });

      // Clone the response to read it multiple times if needed
      const responseClone = response.clone();
      
      try {
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `Request failed with status ${response.status}`);
        }

        console.log('Rental response:', data);
        
        toast({
          title: 'Booking Confirmed',
          description: `Your booking for ${equipment.name} has been confirmed. Rental ID: ${data.rental_id}`,
          variant: 'default',
        });

        // Reset form
        setFormData({
          customerName: '',
          phone: '',
          email: '',
          farmAddress: '',
          city: '',
          state: '',
          pincode: '',
          startDate: '',
          endDate: '',
          startTime: '08:00',
          endTime: '17:00',
          purpose: '',
          operatorRequired: false,
          transportRequired: false,
          specialRequirements: ''
        });
        
        setIsOpen(false);
        
        if (onRentalSuccess) {
          onRentalSuccess();
        }
      } catch (error) {
        // If JSON parsing fails, try reading as text
        const errorText = await responseClone.text();
        console.error('Failed to parse JSON:', errorText);
        
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Rental submission error:', error);
      toast({
        title: 'Booking Failed',
        description: error instanceof Error ? 
          (error.message.length > 100 ? `${error.message.substring(0, 100)}...` : error.message) 
          : 'Failed to book equipment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateDuration = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const calculateTotal = () => {
    const days = calculateDuration();
    if (days === 0) return 0;
    
    const dailyRate = parseFloat(equipment.rentPrice.replace('₹', '').replace('/day', '').replace(',', ''));
    let total = days * dailyRate;
    
    if (formData.operatorRequired) {
      total += days * 500;
    }
    if (formData.transportRequired) {
      total += 1000;
    }
    
    return total;
  };

  const validatePhone = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 10);
  };

  const validatePincode = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 6);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
          <Settings className="w-4 h-4 mr-2" />
          Rent Now
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Equipment Rental</span>
          </DialogTitle>
          <DialogDescription>
            Book {equipment.name} from {equipment.owner_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Equipment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rental Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-2xl">{equipment.image}</div>
                <div className="flex-1">
                  <h4 className="font-medium">{equipment.name}</h4>
                  <p className="text-sm text-gray-500">Type: {equipment.type}</p>
                  <p className="text-sm text-gray-500">Capacity: {equipment.capacity}</p>
                  <p className="text-sm text-gray-500">{equipment.rentPrice}</p>
                </div>
              </div>
              {(formData.startDate && formData.endDate) && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex justify-between">
                    <span>Duration: {calculateDuration()} days</span>
                    <span className="font-semibold">Total: ₹{calculateTotal().toLocaleString()}</span>
                  </div>
                  {formData.operatorRequired && (
                    <div className="flex justify-between text-sm mt-1">
                      <span>Operator fee:</span>
                      <span>₹{(calculateDuration() * 500).toLocaleString()}</span>
                    </div>
                  )}
                  {formData.transportRequired && (
                    <div className="flex justify-between text-sm mt-1">
                      <span>Transport fee:</span>
                      <span>₹1,000</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: validatePhone(e.target.value)})}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="farmAddress">Farm/Work Location Address *</Label>
                <Textarea
                  id="farmAddress"
                  required
                  value={formData.farmAddress}
                  onChange={(e) => setFormData({...formData, farmAddress: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select 
                    value={formData.state} 
                    onValueChange={(value) => setFormData({...formData, state: value})}
                    required
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uttar-pradesh">Uttar Pradesh</SelectItem>
                      <SelectItem value="maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="punjab">Punjab</SelectItem>
                      <SelectItem value="haryana">Haryana</SelectItem>
                      <SelectItem value="gujarat">Gujarat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: validatePincode(e.target.value)})}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Period */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Rental Period *</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    required
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Preferred Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Preferred End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="purpose">Purpose of Use *</Label>
                <Select 
                  value={formData.purpose} 
                  onValueChange={(value) => setFormData({...formData, purpose: value})}
                  required
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plowing">Field Plowing</SelectItem>
                    <SelectItem value="sowing">Seed Sowing</SelectItem>
                    <SelectItem value="harvesting">Harvesting</SelectItem>
                    <SelectItem value="spraying">Pesticide Spraying</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="operatorRequired"
                  checked={formData.operatorRequired}
                  onChange={(e) => setFormData({...formData, operatorRequired: e.target.checked})}
                  disabled={isSubmitting}
                  className="h-4 w-4"
                />
                <Label htmlFor="operatorRequired">Operator Required (+₹500/day)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="transportRequired"
                  checked={formData.transportRequired}
                  onChange={(e) => setFormData({...formData, transportRequired: e.target.checked})}
                  disabled={isSubmitting}
                  className="h-4 w-4"
                />
                <Label htmlFor="transportRequired">Transportation Required (+₹1000)</Label>
              </div>
              <div>
                <Label htmlFor="specialRequirements">Special Requirements</Label>
                <Textarea
                  id="specialRequirements"
                  placeholder="Any special requirements or instructions..."
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData({...formData, specialRequirements: e.target.value})}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)} 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting || !formData.startDate || !formData.endDate}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Book Equipment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RentalForm;