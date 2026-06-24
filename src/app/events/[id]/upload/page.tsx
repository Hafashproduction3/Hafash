
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function GalleryUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
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
  
  const [files, setFiles] = useState<{ id: string, name: string, progress: number, url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        progress: 0,
        url: URL.createObjectURL(f),
      }));
      setFiles([...files, ...newFiles]);
    }
  };

  const startUpload = async () => {
    if (!firestore || !event) return;
    setIsUploading(true);
    
    // Simulate upload progress
    for (let i = 0; i < files.length; i++) {
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 100 } : f));
      await new Promise(r => setTimeout(r, 400));
    }
    
    const newItems = files.map(f => ({
      id: f.id,
      url: f.url,
      type: 'image' as const,
      isFavorite: false
    }));

    try {
      const galleryRef = doc(firestore, 'galleries', id);
      await updateDoc(galleryRef, {
        items: arrayUnion(...newItems)
      });
      
      setIsUploading(false);
      setFiles([]);
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${files.length} photos.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message
      });
      setIsUploading(false);
    }
  };

  const runAiHighlights = async () => {
    if (!event || event.items.length === 0) {
      toast({ title: "No images", description: "Upload some photos first." });
      return;
    }
    setIsAiProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast({
        title: "AI Highlights Found",
        description: "Successfully identified cinematic highlights from your gallery (Simulated).",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading event data...</p>
      </div>
    );
  }

  if (!user || !event) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold">Event not found</h2>
      <Button className="mt-4 rounded-full" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Upload to {event.title}</h1>
            <p className="text-muted-foreground">Drag and drop photos or videos.</p>
          </div>
        </div>
        
        {event.items?.length > 0 && (
          <Button 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary/10 rounded-full gap-2"
            onClick={runAiHighlights}
            disabled={isAiProcessing}
          >
            {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Highlight
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative h-80 border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center bg-card/30 group hover:border-primary/50 transition-all">
            <input 
              type="file" 
              multiple 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange}
            />
            <div className="p-6 rounded-full bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <p className="text-lg font-headline font-bold">Click or drop files here</p>
            <p className="text-sm text-muted-foreground mt-2">Maximum 50MB per file. Optimized for JPEGs and MP4s.</p>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="ghost" className="rounded-full px-8" onClick={() => setFiles([])}>Clear All</Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 h-12 font-bold"
              onClick={startUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isUploading ? 'Uploading...' : 'Start Upload'}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 h-[500px] flex flex-col">
          <h3 className="text-xl font-headline font-bold mb-4 flex items-center justify-between">
            Upload Queue
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{files.length} Files</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic">
                No files selected.
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="bg-background/50 p-3 rounded-2xl border border-border/30 space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="truncate pr-4">{file.name}</span>
                    {file.progress === 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <span className="text-primary">{file.progress}%</span>
                    )}
                  </div>
                  <Progress value={file.progress} className="h-1 bg-border/30" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border/50 flex justify-between items-center">
        <p className="text-sm text-muted-foreground italic">
          Tip: You can change the cover photo in the management panel later.
        </p>
        <Link href={`/events/${id}/manage`}>
          <Button className="rounded-full bg-white text-black hover:bg-white/90 font-bold gap-2">
            Finish and Manage Gallery
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
