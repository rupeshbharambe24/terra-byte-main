
import React from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatbotToggleProps {
  onClick: () => void;
}

const ChatbotToggle: React.FC<ChatbotToggleProps> = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 z-40"
      size="icon"
    >
      <Bot className="w-8 h-8 text-white" />
    </Button>
  );
};

export default ChatbotToggle;