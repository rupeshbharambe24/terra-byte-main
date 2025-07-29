
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Plus,
  Search,
  Filter,
  ThumbsUp,
  Reply,
  Eye,
  Clock
} from 'lucide-react';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import ForumChat from '../../components/ForumChat';

const Forums: React.FC = () => {
  const [selectedForum, setSelectedForum] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const stats = [
    { label: 'Discussions', value: '1,245', icon: MessageSquare, color: 'text-blue-500' },
    { label: 'Active Users', value: '876', icon: Users, color: 'text-green-500' },
    { label: 'Most Popular', value: 'Crop Rotation', icon: TrendingUp, color: 'text-orange-500' },
    { label: 'New Posts Today', value: '56', icon: Plus, color: 'text-purple-500' },
  ];

  const categories = [
    { id: 'all', name: 'All Categories', count: 245 },
    { id: 'crop-management', name: 'Crop Management', count: 89 },
    { id: 'pest-control', name: 'Pest Control', count: 67 },
    { id: 'irrigation', name: 'Irrigation', count: 45 },
    { id: 'soil-health', name: 'Soil Health', count: 34 },
    { id: 'equipment', name: 'Equipment', count: 28 }
  ];

  const forums = [
    {
      id: '1',
      title: 'Organic Pest Control Methods',
      description: 'Discussion about natural and organic ways to control pests without harmful chemicals.',
      category: 'pest-control',
      posts: 156,
      lastActivity: '2 hours ago',
      participants: 23,
      isActive: true,
      tags: ['organic', 'pest-control', 'natural']
    },
    {
      id: '2',
      title: 'Best Practices for Soil Health',
      description: 'Share your tips and techniques for maintaining healthy soil and improving crop yields.',
      category: 'soil-health',
      posts: 89,
      lastActivity: '5 hours ago',
      participants: 18,
      isActive: false,
      tags: ['soil-health', 'organic', 'farming']
    },
    {
      id: '3',
      title: 'Efficient Irrigation Techniques',
      description: 'Discuss different irrigation methods and their effectiveness in various conditions.',
      category: 'irrigation',
      posts: 123,
      lastActivity: '1 day ago',
      participants: 32,
      isActive: true,
      tags: ['irrigation', 'water-management', 'efficiency']
    },
    {
      id: '4',
      title: 'Choosing the Right Equipment',
      description: 'A guide to selecting the best equipment for your farm and specific needs.',
      category: 'equipment',
      posts: 67,
      lastActivity: '3 days ago',
      participants: 12,
      isActive: false,
      tags: ['equipment', 'machinery', 'farming']
    },
    {
      id: '5',
      title: 'Innovative Crop Management Strategies',
      description: 'Explore new and innovative strategies for managing crops and maximizing yields.',
      category: 'crop-management',
      posts: 212,
      lastActivity: '4 days ago',
      participants: 45,
      isActive: true,
      tags: ['crop-management', 'innovation', 'yield']
    },
    {
      id: '6',
      title: 'Dealing with Climate Change',
      description: 'Share your experiences and strategies for dealing with the effects of climate change on agriculture.',
      category: 'crop-management',
      posts: 98,
      lastActivity: '1 week ago',
      participants: 28,
      isActive: false,
      tags: ['climate-change', 'sustainability', 'farming']
    },
  ];

  const filteredForums = forums.filter(forum => {
    const matchesSearch = forum.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         forum.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || forum.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (selectedForum) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        
        <div className="flex">
          <Sidebar />
          
          <main className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forum Discussion</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Participating in: {forums.find(f => f.id === selectedForum)?.title}
                </p>
              </div>
              <Button 
                onClick={() => setSelectedForum(null)}
                variant="outline"
              >
                Back to Forums
              </Button>
            </div>
            
            <div className="max-w-4xl">
              <ForumChat forumId={selectedForum} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Community Forums</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Connect with farmers, share knowledge, and get expert advice
              </p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              New Discussion
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  {stat.icon && <stat.icon className={`w-4 h-4 ${stat.color}`} />}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search forums..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <div className="relative">
              <Button variant="outline" className="w-full sm:w-auto flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Category: {categories.find(cat => cat.id === selectedCategory)?.name}
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
                size="sm"
              >
                {category.name} <Badge className="ml-2">{category.count}</Badge>
              </Button>
            ))}
          </div>

          {/* Forums List */}
          <div className="grid gap-4">
            {filteredForums.map(forum => (
              <Card key={forum.id} onClick={() => setSelectedForum(forum.id)} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div>
                      <CardTitle className="text-lg font-semibold">{forum.title}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{forum.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {forum.posts} posts
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {forum.participants} participants
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Last activity: {forum.lastActivity}
                    </div>
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

export default Forums;