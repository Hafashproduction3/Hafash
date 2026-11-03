"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { updateUserPlan } from '@/app/actions/admin-users';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PlanChangeModal({ 
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
  const [selectedPlan, setSelectedPlan] = useState(user?.planId || 'none');
  const [duration, setDuration] = useState(30);
  const [paymentRef, setPaymentRef] = useState(""); // 👈 Naya state
  const { toast } = useToast();
  const { user: adminUser } = useUser();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!adminUser) return;
    setLoading(true);

    const res = await updateUserPlan(
      adminUser.uid, 
      user.userId, 
      selectedPlan, 
      selectedPlan === 'none' ? 0 : duration,
      paymentRef // 👈 Reference pass kiya
    );
    
    setLoading(false);
    if (res.success) {
      toast({ title: "Success", description: "User plan updated successfully." });
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
        
        <h2 className="text-2xl font-headline font-bold mb-1">Manage Plan</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Updating plan for {user.email || user.studioName || user.photographerName || 'User'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Select Plan</label>
            <select 
              value={selectedPlan} 
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full h-12 rounded-xl bg-background border border-border/50 px-4 text-white"
            >
              <option value="none">None (Deactivate)</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {selectedPlan !== 'none' && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Duration</label>
                <select 
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-12 rounded-xl bg-background border border-border/50 px-4 text-white"
                >
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              {/* 👇 NAYA INPUT BOX 👇 */}
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Payment Reference (Optional)</Label>
                <Input 
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="E.g., Easypaisa TID, Bank Ref, Cash Note..."
                  className="h-12 rounded-xl bg-background border border-border/50 text-white"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Record payment details for your own accounting.</p>
              </div>
            </>
          )}

          <Button 
            className="w-full h-12 mt-4 bg-primary text-primary-foreground font-bold rounded-xl"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {selectedPlan === 'none' ? 'Deactivate User' : 'Update Plan'}
          </Button>
        </div>
      </div>
    </div>
  );
}