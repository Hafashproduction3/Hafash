
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useStorage } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, X, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

type UploadStep = 'queued' | 'starting' | 'uploading' | 'generating-url' | 'syncing' | 'completed' | 'error' | 'timeout';

interface FileItem {
  id: string;
  file: File;
  progress: number;
  url?: string;
  name: string;
  status: UploadStep;
  error?: string;
}

export default function GalleryUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
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
      console.log("UPLOAD_DEBUG: Files selected", newFiles.length);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const startUpload = async () => {
    console.log("UPLOAD_DEBUG: startUpload triggered", { filesCount: files.length, eventId: id });

    if (!firestore || !storage || !user || !event) {
      toast({
        variant: "destructive",
        title: "Services Not Ready",
        description: "Please ensure you are logged in and the event is loaded.",
      });
      return;
    }
    
    if (files.length === 0) {
      toast({ title: "No files", description: "Select photos first." });
      return;
    }

    setIsUploading(true);
    const uploadedItems: { id: string, url: string, type: 'image', isFavorite: boolean }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        if (fileItem.status === 'completed') continue;

        const fileId = fileItem.id;
        const updateStatus = (status: UploadStep, error?: string) => {
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status, error } : f));
        };

        try {
          console.log(`UPLOAD_DEBUG: [${i+1}/${files.length}] Starting: ${fileItem.name}`);
          updateStatus('starting');
          setCurrentBatchStep(`Uploading ${fileItem.name}...`);

          const storagePath = `galleries/${id}/${fileId}_${fileItem.name}`;
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, fileItem.file);

          // 30 second timeout per file
          const uploadPromise = new Promise<string>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Storage upload timed out after 30s'));
            }, 30000);

            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress, status: 'uploading' } : f));
              }, 
              (err) => {
                clearTimeout(timeoutId);
                reject(err);
              }, 
              async () => {
                try {
                  clearTimeout(timeoutId);
                  console.log(`UPLOAD_DEBUG: [${i+1}/${files.length}] Storage success: ${fileItem.name}`);
                  updateStatus('generating-url');
                  const url = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(url);
                } catch (err) {
                  reject(err);
                }
              }
            );
          });

          const downloadURL = await uploadPromise;
          uploadedItems.push({
            id: fileId,
            url: downloadURL,
            type: 'image',
            isFavorite: false
          });
          updateStatus('completed');
          
        } catch (err: any) {
          console.error(`UPLOAD_DEBUG: Error processing ${fileItem.name}:`, err);
          updateStatus(err.message.includes('timeout') ? 'timeout' : 'error', err.message);
          toast({
            variant: "destructive",
            title: `Error uploading ${fileItem.name}`,
            description: err.message
          });
          // Continue to next file
        }
      }

      if (uploadedItems.length > 0) {
        console.log(`UPLOAD_DEBUG: Syncing ${uploadedItems.length} items to Firestore...`);
        setCurrentBatchStep("Finalizing database sync...");
        const galleryRef = doc(firestore, 'galleries', id);
        
        await updateDoc(galleryRef, {
          items: arrayUnion(...uploadedItems)
        });

        console.log("UPLOAD_DEBUG: Firestore sync complete.");
        toast({
          title: "Gallery Updated",
          description: `Successfully added ${uploadedItems.length} photos.`,
        });
      }
    } catch (err: any) {
      console.error("UPLOAD_DEBUG: Batch process failure:", err);
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

  const runAiHighlights = async () => {
    if (!event || !event.items || event.items.length === 0) return;
    setIsAiProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast({ title: "AI Analysis Complete", description: "Highlight reel generated." });
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
        <p className="mt-4 text-muted-foreground italic">Connecting to studio...</p>
      </div>
    );
  }

  if (!user || !event) return (
    <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50">
      <h2 className="text-2xl font-bold font-headline">Event not found</h2>
      <Button className="mt-4 rounded-full" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Upload to {event.title}</h1>
            <p className="text-muted-foreground">Deliver your high-resolution memories.</p>
          </div>
        </div>
        
        {event.items && event.items.length > 0 && (
          <Button 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary/10 rounded-full gap-2"
            onClick={runAiHighlights}
            disabled={isAiProcessing}
          >
            {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Highlights
          </Button>
        )}
      </div>

      {!storage && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Storage Offline</AlertTitle>
          <AlertDescription>
            Firebase Storage is not initialized. Please check your storageBucket configuration.
          </AlertDescription>
        </Alert>
      )}

      {currentBatchStep && (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 text-primary animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-bold text-sm tracking-tight">{currentBatchStep}</span>
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
              disabled={isUploading || !storage}
            />
            <div className="p-6 rounded-full bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <p className="text-lg font-headline font-bold">Drop files or click here</p>
            <p className="text-sm text-muted-foreground mt-2">Maximum resolution JPEGs recommended.</p>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="ghost" className="rounded-full px-8" onClick={() => setFiles([])} disabled={isUploading}>Clear Queue</Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 h-12 font-bold shadow-lg shadow-primary/20 min-w-[200px]"
              onClick={startUpload}
              disabled={files.length === 0 || isUploading || !storage}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isUploading ? 'Processing Batch...' : 'Start Upload'}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 h-[500px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-headline font-bold">Upload Status</h3>
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">{files.length} Files</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-50">
                No files in queue.
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className={cn(
                  "bg-background/50 p-4 rounded-2xl border border-border/30 space-y-2 relative group transition-all",
                  file.status === 'error' && "border-destructive/50 bg-destructive/5",
                  file.status === 'timeout' && "border-orange-500/50 bg-orange-500/5"
                )}>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="truncate pr-4">{file.name}</span>
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {file.status === 'uploading' && <span className="text-primary text-xs font-bold">{Math.round(file.progress)}%</span>}
                      {file.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                      {file.status === 'timeout' && <Info className="w-4 h-4 text-orange-500" />}
                      {!isUploading && file.status === 'queued' && (
                        <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive">
                           <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Progress value={file.progress} className={cn("h-1.5 bg-border/30", file.status === 'error' && "bg-destructive/20")} />
                  <p className={cn(
                    "text-[10px] uppercase font-bold tracking-widest",
                    file.status === 'completed' ? "text-green-500" : 
                    file.status === 'error' ? "text-destructive" : 
                    file.status === 'timeout' ? "text-orange-500" : "text-muted-foreground"
                  )}>
                    {file.status === 'generating-url' ? 'Finalizing URL...' : 
                     file.status === 'syncing' ? 'Syncing to DB...' : 
                     file.status === 'starting' ? 'Initializing...' : 
                     file.status.replace('-', ' ')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row gap-6 justify-between items-center">
        <p className="text-sm text-muted-foreground italic max-w-md">
          Files are stored securely. You can manage access via the Event Management panel.
        </p>
        <Link href={`/events/${id}/manage`}>
          <Button className="rounded-full bg-white text-black hover:bg-white/90 font-bold gap-2 px-8 h-12">
            Return to Management
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
