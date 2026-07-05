
"use client";

import { useFirestore, useDoc, useUser } from '@/firebase';
import { useParams, useRouter } from 'next/navigation';
import { 
  Download, 
  FileText, 
  Check, 
  X, 
  Loader2, 
  ArrowLeft, 
  ImageIcon, 
  User, 
  Calendar,
  Grid,
  CheckCircle2,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function AlbumSelectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const eventRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'galleries', id);
  }, [firestore, id]);

  const { data: event, loading: dataLoading } = useDoc(eventRef);

  const selectedItems = useMemo(() => {
    if (!event || !Array.isArray(event.items)) return [];
    return event.items.filter((item: any) => item.isFavorite);
  }, [event?.items]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === selectedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectedItems.map((i: any) => i.id)));
    }
  };

  const handleDownload = async () => {
    if (selectedIds.size === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setProgress("Preparing package...");
    
    try {
      const zip = new JSZip();
      const itemsToDownload = selectedItems.filter((i: any) => selectedIds.has(i.id));
      
      for (let i = 0; i < itemsToDownload.length; i++) {
        const item = itemsToDownload[i];
        setProgress(`Fetching asset ${i + 1}/${itemsToDownload.length}`);
        
        const url = item.masterUrl || item.url;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${item.fileName}`);
        const blob = await res.blob();
        
        const fileName = item.fileName || `selection-${item.id}.jpg`;
        zip.file(fileName, blob);
      }
      
      setProgress("Generating ZIP...");
      const content = await zip.generateAsync({ type: 'blob' });
      const zipName = `${event?.title || 'selections'}-package.zip`;
      saveAs(content, zipName);
      
      toast({ title: "Success", description: "Batch download started." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Download Failed", description: error.message });
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  const handleExportCSV = () => {
    if (selectedItems.length === 0) return;
    
    const itemsToExport = selectedIds.size > 0 
      ? selectedItems.filter((i: any) => selectedIds.has(i.id))
      : selectedItems;

    const headers = ["ID", "Filename", "URL", "Master URL"];
    const rows = itemsToExport.map((i: any) => [
      i.id,
      i.fileName || "N/A",
      i.url,
      i.masterUrl || "N/A"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `${event?.title || 'album'}-selections.csv`;
    saveAs(blob, fileName);
    
    toast({ title: "CSV Exported", description: `Data for ${itemsToExport.length} assets ready.` });
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Loading Selections...</p>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/50 pb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Selection Management</span>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-headline font-bold">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-6 mt-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-primary" /> {event.clientName}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> {event.date}</span>
              <span className="flex items-center gap-1.5 text-primary"><CheckCircle2 className="w-3 h-3" /> {selectedItems.length} Total Favorites</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Button 
            variant="outline" 
            className="rounded-xl font-bold gap-2 h-12 border-border/50 hover:bg-primary/5 hover:text-primary"
            onClick={handleExportCSV}
          >
            <FileText className="w-4 h-4" /> Export CSV
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold gap-2 h-12 px-6 shadow-lg shadow-primary/20"
            onClick={handleDownload}
            disabled={selectedIds.size === 0 || isProcessing}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isProcessing ? progress : `Download Selected (${selectedIds.size})`}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-bold uppercase tracking-widest gap-2"
            onClick={selectAll}
          >
            {selectedIds.size === selectedItems.length ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
            {selectedIds.size === selectedItems.length ? "Deselect All" : "Select All"}
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {selectedIds.size} / {selectedItems.length} Selected
          </span>
        </div>
        <div className="bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50 flex items-center gap-2">
          <Grid className="w-3 h-3 text-muted-foreground" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Selection View</span>
        </div>
      </div>

      {selectedItems.length === 0 ? (
        <div className="text-center py-40 border-2 border-dashed border-border/20 rounded-[3rem] bg-card/10">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground italic font-headline text-xl">No favorites have been selected for this event yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {selectedItems.map((item: any) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div 
                key={item.id} 
                className={cn(
                  "bg-card border rounded-2xl overflow-hidden group cursor-pointer transition-all relative",
                  isSelected ? "border-primary ring-2 ring-primary/20 shadow-xl" : "border-border/50 hover:border-primary/50"
                )}
                onClick={() => toggleSelect(item.id)}
              >
                <div className="aspect-[4/5] relative overflow-hidden bg-background">
                  <img 
                    src={item.url} 
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-700",
                      isSelected ? "scale-105" : "group-hover:scale-105"
                    )} 
                    alt="Selection" 
                  />
                  <div className={cn(
                    "absolute top-3 left-3 h-6 w-6 rounded-full flex items-center justify-center transition-all shadow-lg border-2",
                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-black/20 text-transparent border-white/40 group-hover:border-white"
                  )}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4 bg-card/80 backdrop-blur-md">
                   <p className="text-[9px] font-mono text-muted-foreground truncate" title={item.fileName}>
                     {item.fileName || `Asset: ${item.id}`}
                   </p>
                   <p className="text-[10px] font-bold text-primary mt-1 uppercase tracking-tighter">
                     Selected Asset
                   </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Support */}
      <div className="max-w-4xl mx-auto text-center mt-20 px-6 py-12 border-t border-border/20">
        <p className="text-muted-foreground text-[10px] uppercase tracking-[0.5em] font-bold">
          End-to-End Asset Integrity Guaranteed by Hafash
        </p>
      </div>
    </div>
  );
}
