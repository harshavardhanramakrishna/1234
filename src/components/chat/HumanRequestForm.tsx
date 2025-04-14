
import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HumanRequestFormProps {
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  issue: string;
  setIssue: (issue: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const HumanRequestForm = ({
  userName,
  setUserName,
  userEmail,
  setUserEmail,
  issue,
  setIssue,
  onSubmit,
  onCancel
}: HumanRequestFormProps) => {
  return (
    <div className="p-4 border-t">
      <Card className="p-4">
        <h2 className="text-lg font-bold mb-2">Request Human Assistance</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="hr-name" className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="hr-name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="hr-email" className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="hr-email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="hr-issue" className="block text-sm font-medium mb-1">
              What do you need help with? <span className="text-red-500">*</span>
            </label>
            <Input
              id="hr-issue"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              required
            />
          </div>
          <div className="flex space-x-2">
            <Button type="submit" className="flex-1">
              Submit Request
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
