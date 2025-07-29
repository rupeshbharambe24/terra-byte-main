
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { CheckCircle, XCircle, Eye, Clock, FileText } from 'lucide-react';

const VendorApprovals: React.FC = () => {
  const [filter, setFilter] = useState('pending');

  const applications = [
    {
      id: 'VA001',
      vendorName: 'Green Valley Seeds',
      email: 'contact@greenvalley.com',
      type: 'agri_vendor',
      status: 'pending',
      submitDate: '2024-05-20',
      businessType: 'Seeds & Fertilizers',
      location: 'Punjab, India',
      documents: 4,
      experience: '8 years'
    },
    {
      id: 'VA002',
      vendorName: 'TechFarm Solutions',
      email: 'info@techfarm.com',
      type: 'hardware_vendor',
      status: 'pending',
      submitDate: '2024-05-18',
      businessType: 'Farm Equipment',
      location: 'Gujarat, India',
      documents: 6,
      experience: '12 years'
    },
    {
      id: 'VA003',
      vendorName: 'Organic Harvest Co.',
      email: 'support@organicharvest.com',
      type: 'agri_vendor',
      status: 'approved',
      submitDate: '2024-05-15',
      businessType: 'Organic Products',
      location: 'Kerala, India',
      documents: 5,
      experience: '6 years'
    },
    {
      id: 'VA004',
      vendorName: 'Smart Irrigation Ltd.',
      email: 'hello@smartirrigation.com',
      type: 'hardware_vendor',
      status: 'rejected',
      submitDate: '2024-05-10',
      businessType: 'Irrigation Systems',
      location: 'Maharashtra, India',
      documents: 3,
      experience: '3 years'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'agri_vendor' ? 
      <Badge className="bg-blue-100 text-blue-800">Agri Vendor</Badge> :
      <Badge className="bg-purple-100 text-purple-800">Hardware Vendor</Badge>;
  };

  const filteredApplications = applications.filter(app => 
    filter === 'all' || app.status === filter
  );

  const stats = [
    { label: 'Pending Review', value: '12', icon: Clock, color: 'text-yellow-600' },
    { label: 'Approved', value: '156', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Rejected', value: '23', icon: XCircle, color: 'text-red-600' },
    { label: 'Total Applications', value: '191', icon: FileText, color: 'text-blue-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Vendor Approvals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Review and approve vendor applications for the platform.
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

          {/* Filter Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Applications Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredApplications.map((application) => (
              <Card key={application.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{application.vendorName}</CardTitle>
                      <CardDescription>{application.email}</CardDescription>
                    </div>
                    {getStatusBadge(application.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
                      {getTypeBadge(application.type)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Business:</span>
                      <span className="text-sm">{application.businessType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
                      <span className="text-sm">{application.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Experience:</span>
                      <span className="text-sm">{application.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Documents:</span>
                      <span className="text-sm">{application.documents} files</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Submitted:</span>
                      <span className="text-sm">{application.submitDate}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 mt-6">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                    {application.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
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

export default VendorApprovals;
