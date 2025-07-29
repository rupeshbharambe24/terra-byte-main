
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Message {
  id: string;
  sender: {
    name: string;
    role: 'farmer' | 'expert' | 'admin';
    avatar: string;
  };
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ForumChatProps {
  forumId: string;
}

const ForumChat: React.FC<ForumChatProps> = ({ forumId }) => {
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock forum data based on forumId
  const getForumData = (id: string) => {
    const forumTitles: { [key: string]: string } = {
      '1': 'Organic Pest Control Methods',
      '2': 'Best Practices for Soil Health',
      '3': 'Efficient Irrigation Techniques',
      '4': 'Choosing the Right Equipment',
      '5': 'Innovative Crop Management Strategies',
      '6': 'Dealing with Climate Change',
    };
    return forumTitles[id] || 'Forum Discussion';
  };

  const topicTitle = getForumData(forumId);

  // Initialize with some mock messages
  useEffect(() => {
    const mockMessages: Message[] = [
      {
        id: '1',
        sender: { name: 'John Farmer', role: 'farmer', avatar: '' },
        content: 'Has anyone tried neem oil for aphid control? I\'m looking for organic solutions.',
        timestamp: new Date(Date.now() - 3600000),
        isOwn: false
      },
      {
        id: '2',
        sender: { name: 'Dr. Sarah Expert', role: 'expert', avatar: '' },
        content: 'Neem oil is excellent! Mix 2 tablespoons per gallon of water. Apply in early morning or evening to avoid leaf burn.',
        timestamp: new Date(Date.now() - 3000000),
        isOwn: false
      },
      {
        id: '3',
        sender: { name: 'You', role: 'farmer', avatar: '' },
        content: 'Thanks for the tip! How often should I apply it?',
        timestamp: new Date(Date.now() - 1800000),
        isOwn: true
      }
    ];
    setMessages(mockMessages);
  }, [forumId]);

  const onSendMessage = (message: string) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: { name: 'You', role: 'farmer', avatar: '' },
      content: message,
      timestamp: new Date(),
      isOwn: true
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'expert': return 'text-blue-600 dark:text-blue-400';
      case 'admin': return 'text-purple-600 dark:text-purple-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'expert': return '🎓';
      case 'admin': return '👑';
      default: return '🌾';
    }
  };

  return (
    <Card className="flex flex-col w-full max-w-4xl mx-auto" style={{ height: '600px' }}>
      <CardHeader className="border-b flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">{topicTitle}</span>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area - Fixed height with scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${message.isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className={getRoleColor(message.sender.role)}>
                    {getRoleBadge(message.sender.role)}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`rounded-lg p-3 break-words ${
                  message.isOwn 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}>
                  {!message.isOwn && (
                    <div className="flex items-center space-x-1 mb-1">
                      <span className={`text-xs font-medium ${getRoleColor(message.sender.role)}`}>
                        {message.sender.name}
                      </span>
                      <span className="text-xs opacity-75">
                        {message.sender.role}
                      </span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <div className={`text-xs mt-1 ${message.isOwn ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area - Fixed at bottom */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Smile className="w-4 h-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button 
              onClick={handleSend}
              disabled={!newMessage.trim()}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForumChat;