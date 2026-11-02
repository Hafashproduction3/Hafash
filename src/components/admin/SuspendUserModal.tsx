"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { toggleUserSuspension } from '@/app/actions/admin-security';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

export function SuspendUserModal({ 
  isOpen, 
  onClose, 
  user,
  onSuccess 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: any;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const { user: adminUser } = useUser();

  const isSuspending = !user?.isSuspended;

  if (!isOpen) return null;

  const handleAction = async () => {
    if (!adminUser) return;
    if (isSuspending && !reason.trim()) {
      toast({ variant: "destructive", title: "Reason Required", description: "Please enter a reason for suspension." });
      return;
    }

    setLoading(true);
    const res = await toggleUserSuspension(adminUser.uid, user.userId || user.id, isSuspending, reason);
    
    setLoading(false);
    if (res.success) {
      toast({ title: "Success", description: isSuspending ? "User has been suspended." : "User has been restored." });
      onSuccess();
      onClose();
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border/50 p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-white">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${isSuspending ? 'bg-destructive/20 text-destructive' : 'bg-green-500/20 text-green-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-headline font-bold">{isSuspending ? 'Suspend User' : 'Restore User'}</h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4 mt-6">
          {isSuspending ? (
            <>
              <p className="text-sm text-muted-foreground">
                Yeh user platform par nayi gallery nahi bana payega aur na hi upload kar payega.
              </p>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-destructive mb-2 block">Reason for Suspension</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g., Uploading inappropriate content, suspicious activity..."
                  className="w-full h-24 p-3 rounded-xl bg-background border border-border/50 text-sm focus:border-destructive outline-none resize-none"
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Kya aap waqai is user ka account restore karna chahte hain? Uske saare privileges wapas mil jayenge.
            </p>
          )}

          <Button 
            className={`w-full h-12 mt-4 font-bold rounded-xl ${isSuspending ? 'bg-destructive hover:bg-destructive/90 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {isSuspending ? 'Suspend Account' : 'Restore Account'}
          </Button>
        </div>
      </div>
    </div>
  );
}