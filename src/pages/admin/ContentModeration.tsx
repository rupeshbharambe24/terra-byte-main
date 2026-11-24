
import React, { useState } from 'react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Eye, Flag, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';

const ContentModeration: React.FC = () => {
  const [filter, setFilter] = useState('pending');

  const reports = [
    {
      id: 'R001',
      type: 'forum_post',
      content: 'Discussion about pesticide usage in wheat farming...',
      reporter: 'farmer_123',
      reportedUser: 'expert_sharma',
      reason: 'Misinformation',
      status: 'pending',
      reportDate: '2024-05-25',
      priority: 'high'
    },
    {
      id: 'R002',
      type: 'product_review',
      content: 'This fertilizer is completely useless, waste of money...',
      reporter: 'vendor_seeds',
      reportedUser: 'farmer_raj',
      reason: 'Spam/Abuse',
      status: 'resolved',
      reportDate: '2024-05-24',
      priority: 'medium'
    },
    {
      id: 'R003',
      type: 'forum_comment',
      content: 'You should try this illegal pesticide, very effective...',
      reporter: 'expert_priya',
      reportedUser: 'anonymous_user',
      reason: 'Illegal Content',
      status: 'pending',
      reportDate: '2024-05-23',
      priority: 'critical'
    },
    {
      id: 'R004',
      type: 'marketplace_listing',
      content: 'Premium quality seeds at lowest price...',
      reporter: 'farmer_kumar',
      reportedUser: 'vendor_green',
      reason: 'False Advertising',
      status: 'under_review',
      reportDate: '2024-05-22',
      priority: 'low'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case 'dismissed':
        return <Badge className="bg-gray-100 text-gray-800">Dismissed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{priority}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'forum_post':
      case 'forum_comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'product_review':
        return <Flag className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredReports = reports.filter(report => 
    filter === 'all' || report.status === filter
  );

  const stats = [
    { label: 'Pending Reports', value: '15', icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Under Review', value: '8', icon: Eye, color: 'text-blue-600' },
    { label: 'Resolved Today', value: '23', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Critical Issues', value: '3', icon: Flag, color: 'text-red-600' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Content Moderation
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Moderate forums and user-generated content across the platform.
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
            {['all', 'pending', 'under_review', 'resolved', 'dismissed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
              </button>
            ))}
          </div>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <CardTitle>Content Reports</CardTitle>
              <CardDescription>Review and moderate reported content</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Reported User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(report.type)}
                          <span className="text-sm">{report.type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">{report.content}</div>
                      </TableCell>
                      <TableCell>{report.reporter}</TableCell>
                      <TableCell>{report.reportedUser}</TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell>{getPriorityBadge(report.priority)}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>{report.reportDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {report.status === 'pending' && (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

export default ContentModeration;
