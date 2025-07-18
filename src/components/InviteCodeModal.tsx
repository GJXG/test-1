import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const InviteCodeModal: React.FC<InviteCodeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    if (inviteCode.trim() === 'DraMa.i') {
      // 验证成功，保存到localStorage
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (userInfo.userId) {
        localStorage.setItem(`inviteCodeVerified_${userInfo.userId}`, 'true');
      }
      setIsLoading(false);
      onSuccess();
    } else {
      setError('Invalid invite code. Please try again.');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Enter Invite Code
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Input
              id="inviteCode"
              type="text"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className={`${error ? 'border-red-500' : ''}`}
              disabled={isLoading}
            />
            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6B4EFF] hover:bg-[#5A3FE6]"
              disabled={isLoading || !inviteCode.trim()}
            >
              {isLoading ? 'Verifying...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteCodeModal; 