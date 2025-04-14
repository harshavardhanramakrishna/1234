import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/use-chat-websocket';

interface MessageRendererProps {
  message: Message;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  const getSenderColor = (sender: Message['sender']) => {
    switch (sender) {
      case 'user': return 'text-blue-600';
      case 'bot': return 'text-green-600';
      case 'human': return 'text-purple-600';
      case 'system': return 'text-gray-600';
      default: return 'text-black';
    }
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'code':
        return (
          <pre className="bg-gray-100 p-2 rounded-md overflow-x-auto">
            <code>{message.message.replace(/```/g, '')}</code>
          </pre>
        );
      case 'error':
        return (
          <div className="bg-red-100 text-red-800 p-2 rounded-md">
            {message.message}
          </div>
        );
      default:
        return <p>{message.message}</p>;
    }
  };

  return (
    <div className={cn(
      'mb-2 p-2 rounded-md',
      getSenderColor(message.sender)
    )}>
      {message.agentName && (
        <div className="text-xs text-gray-500 mb-1">
          {message.agentName}
        </div>
      )}
      {renderMessageContent()}
      <div className="text-xs text-gray-400 mt-1">
        {new Date(message.timestamp).toLocaleString()}
      </div>
    </div>
  );
};
