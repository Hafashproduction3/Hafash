"use client";

import { useParams, useRouter } from 'next/navigation';
import { 
  Download, 
  Loader2, 
  ShieldCheck, 
  BookOpen, 
  Camera, 
  ArrowLeft,
  Lock,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { resolveAlbumByToken } from '@/app/actions/album';

export default function AlbumDesignerViewPage() {
  const params = useParams();
  const token = params?.token as string;
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeGallery, setActiveGallery] = useState<any>(null);
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    async function resolve() {
      if (!token) return;
      setSearching(true);
      try {
        const result = await resolveAlbumByToken(token);
        setActiveGallery(result);
      } catch (err) {
        console.error("ALBUM_DEBUG: Resolution error:", err);
      } finally {
        setSearching(false);
      }
    }
    resolve();
  }, [token]);

  const selectedItems = useMemo(() => {
    return (activeGallery?.items || []).filter((item: any) => item.isFavorite);
  }, [activeGallery?.items]);

  const handleDownloadOriginal = async (item: any) => {
    // In demo mode, original is simulated or mapped to url.
    // In production R2, this would request a signed URL.
    const downloadUrl = item.masterUrl || item.url;
    const filename = item.fileName || `${activeGallery?.title || 'hafash'}-master-${item.id}.jpg`;

    try {
      toast({ title: "Fetching Asset", description: "Directing download for original high-resolution master file." });
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      window.open(downloadUrl, '_blank');
    }
  };

  if (searching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-primary font-bold italic tracking-widest uppercase text-xs">Accessing Secure Workspace...</p>
      </div>
    );
  }

  if (!activeGallery || !activeGallery.albumLinkEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        {/* DEBUG PANEL START */}
        <div className="mb-12 p-6 bg-card border border-primary/20 rounded-2xl text-left font-mono text-xs max-w-2xl w-full mx-auto">
          <h2 className="text-primary font-bold mb-4 uppercase tracking-widest text-sm">Debug Resolution Telemetry</h2>
          <div className="space-y-1">
            <p><span className="text-muted-foreground">Token from URL:</span> {token}</p>
            <p><span className="text-muted-foreground">searching state:</span> {String(searching)}</p>
            <p><span className="text-muted-foreground">typeof activeGallery:</span> {typeof activeGallery}</p>
            <p><span className="text-muted-foreground">activeGallery === null:</span> {String(activeGallery === null)}</p>
            
            {activeGallery === null ? (
              <p className="text-destructive font-bold mt-2">activeGallery is NULL</p>
            ) : (
              <div className="mt-2 space-y-1">
                <p><span className="text-muted-foreground">activeGallery.id:</span> {activeGallery.id}</p>
                <p><span className="text-muted-foreground">activeGallery.albumLinkEnabled:</span> {String(activeGallery.albumLinkEnabled)}</p>
                <p><span className="text-muted-foreground">activeGallery.title:</span> {activeGallery.title}</p>
                <p><span className="text-muted-foreground">activeGallery.albumStatus:</span> {activeGallery.albumStatus}</p>
                <p><span className="text-muted-foreground">activeGallery.items?.length:</span> {activeGallery.items?.length}</p>
              </div>
            )}
          </div>
        </div>
        {/* DEBUG PANEL END */}

        {/* RAW JSON DEBUG Section */}
        <div className="mb-8 p-4 bg-muted/20 border rounded-xl text-left max-w-2xl w-full mx-auto overflow-auto max-h-[400px]">
           <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-50">Raw Server Response:</p>
           <pre className="text-[10px] font-mono whitespace-pre-wrap">
             {JSON.stringify(activeGallery, null, 2)}
           </pre>
        </div>

        <div className="bg-destructive/10 p-6 rounded-full mb-8">
          <Lock className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-headline font-bold mb-4 uppercase tracking-tighter">Access Restricted</h1>
        <p className="text-muted-foreground max-w-md mb-8">This album designer link is currently inactive or the security token has expired. Please contact the photographer for a valid workspace link.</p>
        <Link href="/"><Button className="rounded-full px-10 bg-primary text-primary-foreground">Hafash Home</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 selection:bg-primary selection:text-primary-foreground">
      {/* Designer Workspace Header */}
      <div className="bg-card border-b border-border/50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-primary">Designer Workspace</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-headline font-bold tracking-tight">
              {activeGallery.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> {activeGallery.clientName}</span>
              <span className="flex items-center gap-2 text-primary font-bold">{selectedItems.length} Selection Masterpieces</span>
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Original File Access Active</span>
            </div>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <Button 
              className="flex-1 md:flex-none h-14 px-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold gap-3 shadow-xl shadow-primary/20"
              onClick={() => {
                toast({ title: "Coming Soon", description: "Batch downloading of high-resolution master assets is in development." });
              }}
            >
              <Download className="w-5 h-5" /> Download Full Selection
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Workspace */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {selectedItems.map((item: any) => (
            <div 
              key={item.id} 
              className="bg-card border border-border/30 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all shadow-lg"
            >
              <div className="aspect-[4/5] relative overflow-hidden bg-background">
                <img src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Selected Item" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button 
                    size="icon" 
                    className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl scale-75 group-hover:scale-100 transition-transform"
                    onClick={() => handleDownloadOriginal(item)}
                   >
                     <Download className="w-6 h-6" />
                   </Button>
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Asset: {item.id}</p>
                  <p className="text-xs font-bold text-primary">High-Resolution Master</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-lg gap-2 text-[10px] font-bold uppercase tracking-tighter"
                  onClick={() => handleDownloadOriginal(item)}
                >
                  Download <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {selectedItems.length === 0 && (
          <div className="text-center py-40 border-2 border-dashed border-border/30 rounded-[3rem]">
            <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-6 opacity-20" />
            <p className="text-xl text-muted-foreground italic font-headline">No favorites have been synchronized for this selection.</p>
          </div>
        )}
      </div>

      {/* Footer Support */}
      <div className="max-w-4xl mx-auto text-center mt-20 px-6 py-12 border-t border-border/20">
        <div className="flex items-center justify-center gap-2 mb-6 text-primary">
          <img src="/hafash-logo.png" alt="Hafash" className="h-12 w-auto" />
          <span className="text-xl font-headline font-bold italic">Hafash Studio Flow</span>
        </div>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
          This secure designer workspace ensures you have direct access to the client's final selections in their original high-resolution format. For technical support or asset clarification, please contact the photographer directly.
        </p>
        <div className="mt-12 text-[10px] uppercase tracking-[0.5em] text-muted-foreground/30 font-bold">
          End-to-End Asset Integrity Guaranteed by Hafash
        </div>
      </div>
    </div>
  );
}
