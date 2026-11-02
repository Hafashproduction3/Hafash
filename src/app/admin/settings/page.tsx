"use client";

import { useState, useEffect } from "react";
import { useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { Save, Loader2, Megaphone, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateGlobalSettings } from "@/app/actions/admin-settings";

export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);

  const settingsRef = firestore ? doc(firestore, "settings", "global") : null;
  const { data: settingsData, loading: dataLoading } = useDoc(settingsRef);

  // Data load hone par states set karein
  useEffect(() => {
    if (settingsData) {
      setMaintenanceMode(settingsData.maintenanceMode || false);
      setAnnouncement(settingsData.announcement || "");
      setAnnouncementActive(settingsData.announcementActive || false);
    }
    if (!dataLoading) setLoading(false);
  }, [settingsData, dataLoading]);

  const handleSave = async () => {
    setSaving(true);
    const res = await updateGlobalSettings({
      maintenanceMode,
      announcement,
      announcementActive,
    });

    if (res.success) {
      toast({ title: "Settings Saved", description: "Global settings have been updated." });
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error });
    }
    setSaving(false);
  };

  if (loading || dataLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-headline font-bold text-white mb-1">Platform Settings</h1>
        <p className="text-muted-foreground text-sm">Control global features and announcements.</p>
      </div>

      <div className="space-y-6">
        {/* Announcement Card */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-white">Global Announcement</h3>
              <p className="text-xs text-muted-foreground">Show a banner at the top of every user's dashboard.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="announcementActive"
                checked={announcementActive}
                onChange={(e) => setAnnouncementActive(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
              <label htmlFor="announcementActive" className="font-bold text-sm cursor-pointer">
                Enable Announcement
              </label>
            </div>

            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="E.g., Hafash v2.0 is now live! Check out the new features."
              className="w-full h-24 p-4 rounded-xl bg-background border border-border/50 text-sm focus:border-primary outline-none resize-none"
            />
          </div>
        </div>

        {/* Maintenance Mode Card */}
        <div className="bg-card border border-destructive/30 rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-destructive text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-widest">Danger Zone</div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Wrench className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-white">Maintenance Mode</h3>
              <p className="text-xs text-muted-foreground">Block access to all non-admin users.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="maintenanceMode"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="w-5 h-5 accent-destructive cursor-pointer"
            />
            <label htmlFor="maintenanceMode" className="font-bold text-sm cursor-pointer text-destructive">
              Enable Maintenance Mode
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            className="h-12 px-8 bg-primary text-primary-foreground font-bold rounded-xl gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}