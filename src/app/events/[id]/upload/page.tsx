"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, X, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

type UploadStep = 'queued' | 'simulating' | 'syncing' | 'completed' | 'error';

interface FileItem {
  id: string;
  file: File;
  progress: number;
  name: string;
  status: UploadStep;
}

export default function GalleryUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentBatchStep, setCurrentBatchStep] = useState<string>('');

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileItem[] = Array.from(e.target.files).map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        name: f.name,
        progress: 0,
        status: 'queued'
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const startMockUpload = async () => {
    if (!firestore || !user || !event) return;
    
    if (files.length === 0) {
      toast({ title: "No files selected" });
      return;
    }

    setIsUploading(true);
    const mockItems: any[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        if (fileItem.status === 'completed') continue;

        const fileId = fileItem.id;
        const updateStatus = (status: UploadStep, progress: number = 0) => {
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status, progress } : f));
        };

        setCurrentBatchStep(`Processing ${fileItem.name}...`);
        updateStatus('simulating', 0);

        // Simulate upload progress
        await new Promise(r => setTimeout(r, 800));
        updateStatus('simulating', 100);

        // Create a realistic placeholder based on the file ID to keep it consistent
        mockItems.push({
          id: fileId,
          url: `https://picsum.photos/seed/${fileId}/1200/800`,
          type: 'image',
          isFavorite: false,
          fileName: fileItem.name
        });
        
        updateStatus('completed', 100);
      }

      if (mockItems.length > 0) {
        setCurrentBatchStep("Syncing to Studio Cloud...");
        const galleryRef = doc(firestore, 'galleries', id);
        
        await updateDoc(galleryRef, {
          items: arrayUnion(...mockItems)
        });

        toast({
          title: "Gallery Updated",
          description: `Successfully simulated ${mockItems.length} photo uploads.`,
        });
      }
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `galleries/${id}`,
          operation: 'update',
          requestResourceData: { items: 'arrayUnion(...)' },
        }));
      }
    } finally {
      setIsUploading(false);
      setCurrentBatchStep('');
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Initializing demo environment...</p>
      </div>
    );
  }

  if (!user || !event) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Upload to {event.title}</h1>
            <p className="text-muted-foreground">MVP Demo Mode: Simulating high-res uploads.</p>
          </div>
        </div>
      </div>

      <Alert className="bg-primary/10 border-primary/20 text-primary rounded-2xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>MVP Testing Mode Active</AlertTitle>
        <AlertDescription>
          Firebase Storage is currently unconfigured. We are using ultra-high resolution demo assets to showcase the client gallery experience.
        </AlertDescription>
      </Alert>

      {currentBatchStep && (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 text-primary animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-bold text-sm tracking-tight uppercase">{currentBatchStep}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative h-80 border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center bg-card/30 group hover:border-primary/50 transition-all">
            <input 
              type="file" 
              multiple 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="p-6 rounded-full bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <p className="text-lg font-headline font-bold">Drop files or click to add</p>
            <p className="text-sm text-muted-foreground mt-2">Simulated upload for visual testing.</p>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="ghost" className="rounded-full px-8" onClick={() => setFiles([])} disabled={isUploading}>Clear Queue</Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 h-12 font-bold shadow-lg shadow-primary/20 min-w-[200px]"
              onClick={startMockUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isUploading ? 'Syncing...' : 'Simulate Upload'}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 h-[500px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-headline font-bold">Queue</h3>
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">{files.length} Files</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-50">
                No files in queue.
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="bg-background/50 p-4 rounded-2xl border border-border/30 space-y-2 relative group transition-all">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="truncate pr-4">{file.name}</span>
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {file.status === 'simulating' && <span className="text-primary text-xs font-bold">{Math.round(file.progress)}%</span>}
                      {!isUploading && file.status === 'queued' && (
                        <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive">
                           <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Progress value={file.progress} className="h-1.5 bg-border/30" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row gap-6 justify-between items-center">
        <p className="text-sm text-muted-foreground italic max-w-md">
          <Info className="w-4 h-4 inline mr-2 text-primary" />
          Mock mode creates persistent links in your Firestore database using high-quality demo seeds.
        </p>
        <Link href={`/events/${id}/manage`}>
          <Button variant="outline" className="rounded-full font-bold gap-2 px-8 h-12 border-primary text-primary hover:bg-primary/5">
            Return to Management
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
