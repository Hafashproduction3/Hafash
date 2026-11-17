"use client";

import { useState } from 'react';
import { 
  Dialog, DialogContent, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  X, Crown, Loader2, Calendar, CreditCard, HardDrive, Globe, CheckCircle2 
} from 'lucide-react';
import { updateUserPlan, updateUserCustomStorage } from '@/app/actions/admin-users';
import { updateSubdomain } from '@/app/actions/subdomain';
import { HAFASH_PLANS } from '@/lib/plans';

export function PlanChangeModal({ isOpen, onClose, user, onSuccess }: any) {
  const { toast } = useToast();
  
  const [selectedPlan, setSelectedPlan] = useState(user?.planId || 'starter');
  const [duration, setDuration] = useState<number | 'lifetime'>(30);
  const [customStorage, setCustomStorage] = useState<number | ''>(user?.customStorageLimitGb || '');
  const [newSubdomain, setNewSubdomain] = useState(user?.subdomain || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingSubdomain, setIsUpdatingSubdomain] = useState(false);

  const handleSavePlan = async () => {
    setIsLoading(true);
    try {
      // ✅ User ID dono tarah se check karein
      const targetUserId = user.userId || user.id;
      
      const res = await updateUserPlan(
        'admin', // Admin UID (placeholder)
        targetUserId,
        selectedPlan,
        duration,
        'manual_admin_change'
      );
      
      if (res.success) {
        toast({ title: "Success", description: "Plan updated successfully!" });
        onSuccess();
        onClose();
      } else {
        toast({ variant: "destructive", title: "Failed", description: res.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomStorage = async () => {
    setIsLoading(true);
    try {
      const targetUserId = user.userId || user.id;
      
      const res = await updateUserCustomStorage(
        'admin',
        targetUserId,
        customStorage === '' ? null : Number(customStorage)
      );
      
      if (res.success) {
        toast({ title: "Success", description: "Custom storage updated!" });
        onSuccess();
      } else {
        toast({ variant: "destructive", title: "Failed", description: res.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubdomainUpdate = async () => {
    if (!newSubdomain || newSubdomain === user?.subdomain) {
      toast({ title: "No Changes", description: "Subdomain same hai ya khali hai." });
      return;
    }
    
    setIsUpdatingSubdomain(true);
    try {
      // ✅ User ID dono tarah se check karein
      const targetUserId = user.userId || user.id;
      
      const res = await updateSubdomain(targetUserId, newSubdomain);
      if (res.success) {
        toast({ title: "Success", description: "Subdomain updated successfully!" });
        onSuccess();
      } else {
        toast({ variant: "destructive", title: "Failed", description: res.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsUpdatingSubdomain(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111] border border-white/10 rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl [&>button]:hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#161616]">
          <div>
            <DialogTitle className="text-xl font-headline font-bold text-white">
              Manage User Account
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.studioName || user?.email}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* ✅ 1. Plan Update */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <Crown className="w-3 h-3 text-primary" /> Subscription Plan
            </Label>
            <select 
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-background border border-white/10 text-sm focus:border-primary outline-none"
            >
              {Object.values(HAFASH_PLANS).map((plan: any) => (
                <option key={plan.id} value={plan.id}>{plan.name} (Rs. {plan.price})</option>
              ))}
              <option value="none">None (Deactivate)</option>
            </select>

            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2 mt-2">
              <Calendar className="w-3 h-3 text-primary" /> Duration
            </Label>
            <div className="flex gap-2">
              {[30, 90, 365, 'lifetime'].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d as any)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    duration === d ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {d === 'lifetime' ? 'Lifetime' : `${d} Days`}
                </button>
              ))}
            </div>

            <Button 
              onClick={handleSavePlan} 
              disabled={isLoading}
              className="w-full h-11 bg-primary text-primary-foreground font-bold rounded-lg mt-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save Plan
            </Button>
          </div>

          <div className="h-px bg-white/10" />

          {/* ✅ 2. Custom Storage */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <HardDrive className="w-3 h-3 text-primary" /> Custom Storage Limit
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  type="number"
                  value={customStorage}
                  onChange={(e) => setCustomStorage(e.target.value === '' ? '' : Number(e.target.value))}
                  className="h-10 bg-[#161616] border-white/10 pr-12"
                  placeholder="Leave empty for default"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                  GB
                </span>
              </div>
              <Button 
                onClick={handleSaveCustomStorage}
                disabled={isLoading}
                variant="outline"
                className="h-10 border-white/10 font-bold px-4"
              >
                Set
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Default limit: {HAFASH_PLANS[selectedPlan as keyof typeof HAFASH_PLANS]?.storageGb || 0} GB
            </p>
          </div>

          <div className="h-px bg-white/10" />

          {/* ✅ 3. Subdomain Update */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2">
              <Globe className="w-3 h-3 text-primary" /> Subdomain
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  value={newSubdomain}
                  onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="h-10 bg-[#161616] border-white/10 pr-20"
                  placeholder="e.g. ahmedwedding"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                  .hafash.pk
                </span>
              </div>
              <Button 
                onClick={handleSubdomainUpdate}
                disabled={isUpdatingSubdomain || !newSubdomain}
                className="h-10 bg-primary text-primary-foreground font-bold px-4"
              >
                {isUpdatingSubdomain ? "Updating..." : "Update"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Sirf chote letters (a-z), numbers (0-9) aur dash (-) allow hain.
            </p>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}