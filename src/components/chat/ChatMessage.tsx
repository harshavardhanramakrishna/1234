
import React from 'react';

interface ChatMessageProps {
  message: string;
  sender: 'user' | 'bot' | 'human' | 'system';
  timestamp: string;
  agentName?: string;
}

export const ChatMessage = ({ message, sender, timestamp, agentName }: ChatMessageProps) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderColor = () => {
    switch (sender) {
      case 'user':
        return 'bg-primary text-white';
      case 'bot':
        return 'bg-gray-100 text-gray-800';
      case 'human':
        return 'bg-green-500 text-white';
      case 'system':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSenderName = () => {
    if (sender === 'bot') return 'Chatbot';
    if (sender === 'human') return agentName || 'Agent';
    return 'System';
  };

  return (
    <div
      className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`rounded-lg px-4 py-2 max-w-[75%] ${getSenderColor()}`}
      >
        {sender !== 'user' && (
          <div className="text-xs font-medium mb-1">
            {getSenderName()}
          </div>
        )}
        <div className="whitespace-pre-wrap">{message}</div>
        <div className="text-xs opacity-75 text-right mt-1">
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
};
