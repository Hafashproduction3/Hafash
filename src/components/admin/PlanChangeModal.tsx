"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import { updateUserPlan, updateUserCustomStorage, updateUserFeatureOverrides } from "@/app/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, CreditCard, HardDrive, ShieldAlert } from "lucide-react";
import { HAFASH_PLANS } from "@/lib/plans";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
}

export function PlanChangeModal({ isOpen, onClose, user, onSuccess }: PlanChangeModalProps) {
  const { user: adminUser } = useUser(); 
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [selectedPlan, setSelectedPlan] = useState("none");
  const [duration, setDuration] = useState("30");
  const [paymentRef, setPaymentRef] = useState("");
  
  const [customStorage, setCustomStorage] = useState<string>('');
  const [savingStorage, setSavingStorage] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedPlan(user.planId || "none");
      setPaymentRef("");
      setCustomStorage(user.customStorageLimitGb ? String(user.customStorageLimitGb) : '');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSavePlan = async () => {
    if (!adminUser) return;
    setLoading(true);
    const durationDays = duration === 'lifetime' ? 'lifetime' : parseInt(duration);
    const res = await updateUserPlan(adminUser.uid, user.userId || user.id, selectedPlan, durationDays as any, paymentRef);
    
    if (res.success) {
      toast({ title: "Plan Updated", description: "User plan has been updated." });
      onSuccess();
      onClose();
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
    setLoading(false);
  };

  const handleSaveCustomStorage = async () => {
    if (!adminUser) return;
    setSavingStorage(true);
    const val = customStorage ? parseInt(customStorage) : null;
    const res = await updateUserCustomStorage(adminUser.uid, user.userId || user.id, val);
    
    if (res.success) {
      toast({ title: "Storage Updated", description: val ? `${val}GB limit set.` : "Default plan storage restored." });
      onSuccess();
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
    setSavingStorage(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-card border border-border/50 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-headline font-bold text-white">Manage User</h2>
            <p className="text-xs text-muted-foreground mt-1">{user.studioName || user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Custom Storage */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-primary mb-1">
              <HardDrive className="w-4 h-4" />
              <Label className="text-xs font-bold uppercase tracking-widest">Owner Custom Storage Limit (GB)</Label>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="E.g., 500"
                value={customStorage}
                onChange={(e) => setCustomStorage(e.target.value)}
                className="bg-background border-border/50"
              />
              <Button type="button" onClick={handleSaveCustomStorage} disabled={savingStorage} className="bg-primary text-black font-bold">
                {savingStorage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic">Reset karne ke liye khali chhod kar Set dabayein.</p>
          </div>

          <div className="border-t border-white/10 pt-4"></div>

          {/* Plan Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Assign Subscription Plan
            </Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="h-12 bg-background border-border/50">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Plan (Inactive)</SelectItem>
                {Object.values(HAFASH_PLANS).map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {plan.storageGb}GB ({plan.price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan !== 'none' && (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-primary">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-12 bg-background border-border/50">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">1 Month (30 Days)</SelectItem>
                  <SelectItem value="90">3 Months (90 Days)</SelectItem>
                  <SelectItem value="365">1 Year (365 Days)</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Feature Toggles */}
          <div className="p-4 bg-background border border-border/50 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-primary mb-2">
              <ShieldAlert className="w-4 h-4" />
              <Label className="text-xs font-bold uppercase tracking-widest">Manual Feature Overrides</Label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {[
                { key: 'allowDownload', label: 'Allow Downloads' },
                { key: 'allowPasswordProtection', label: 'Password Protection' },
                { key: 'allowCustomBranding', label: 'Custom Branding' },
                { key: 'allowVideoUpload', label: 'Video Uploads' },
              ].map((feat) => {
                const currentVal = user.featureOverrides?.[feat.key];
                return (
                  <div key={feat.key} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-xs font-bold text-white">{feat.label}</span>
                    <Select 
                      value={currentVal === undefined ? 'default' : (currentVal ? 'on' : 'off')}
                      onValueChange={async (val) => {
                        if (!adminUser) return;
                        const boolVal = val === 'default' ? null : (val === 'on');
                        const res = await updateUserFeatureOverrides(adminUser.uid, user.userId || user.id, feat.key, boolVal);
                        if (res.success) {
                          toast({ title: "Feature Updated", description: `${feat.label} set to ${val}` });
                          onSuccess();
                        } else {
                          toast({ variant: "destructive", title: "Error", description: res.error });
                        }
                      }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
  <SelectItem value="default">Default (Plan)</SelectItem>
  <SelectItem value="on">Force ON</SelectItem>
  <SelectItem value="off">Force OFF</SelectItem>
</SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Ref */}
          {selectedPlan !== 'none' && (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-primary">Payment Reference (Optional)</Label>
              <Input placeholder="E.g., Bank Transfer #1234" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="bg-background border-border/50 h-12" />
            </div>
          )}

        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 h-12 rounded-xl border-border/50">
            Cancel
          </Button>
          <Button onClick={handleSavePlan} disabled={loading || selectedPlan === "none"} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Plan"}
          </Button>
        </div>

      </div>
    </div>
  );
}