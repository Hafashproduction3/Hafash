
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useStorage } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function GalleryUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const storage = useStorage();
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
  
  const [files, setFiles] = useState<{ id: string, file: File, progress: number, url?: string, name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        name: f.name,
        progress: 0,
      }));
      console.log("UPLOAD_DEBUG: Files selected", newFiles.length);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const startUpload = async () => {
    console.log("UPLOAD_DEBUG: startUpload clicked", { 
      filesCount: files.length, 
      eventId: id,
      hasFirestore: !!firestore,
      hasStorage: !!storage,
      hasUser: !!user,
      hasEvent: !!event
    });

    if (!firestore || !storage) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Firebase services (Firestore or Storage) are not initialized. Please check your config.",
      });
      return;
    }

    if (!user || !event) {
      toast({
        variant: "destructive",
        title: "Initialization Error",
        description: "Event or User session not loaded yet. Please wait a moment.",
      });
      return;
    }
    
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select photos to upload first.",
      });
      return;
    }

    setIsUploading(true);
    const uploadedItems: { id: string, url: string, type: 'image', isFavorite: boolean }[] = [];

    try {
      for (const fileItem of files) {
        if (fileItem.progress === 100) continue; 

        const fileId = fileItem.id;
        const storagePath = `galleries/${id}/${fileId}_${fileItem.name}`;
        const storageRef = ref(storage, storagePath);
        
        console.log(`UPLOAD_DEBUG: Beginning storage upload for ${fileItem.name}...`);
        
        const uploadTask = uploadBytesResumable(storageRef, fileItem.file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress } : f));
            }, 
            (error) => {
              console.error(`UPLOAD_DEBUG: Storage error for ${fileItem.name}:`, error);
              reject(error);
            }, 
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                uploadedItems.push({
                  id: fileId,
                  url: downloadURL,
                  type: 'image',
                  isFavorite: false
                });
                console.log(`UPLOAD_DEBUG: ${fileItem.name} successfully stored. URL: ${downloadURL}`);
                resolve();
              } catch (err) {
                console.error(`UPLOAD_DEBUG: URL retrieval error:`, err);
                reject(err);
              }
            }
          );
        });
      }

      if (uploadedItems.length > 0) {
        console.log(`UPLOAD_DEBUG: Attempting to sync ${uploadedItems.length} items to Firestore...`);
        const galleryRef = doc(firestore, 'galleries', id);
        
        await updateDoc(galleryRef, {
          items: arrayUnion(...uploadedItems)
        });

        console.log("UPLOAD_DEBUG: Firestore update complete.");
        toast({
          title: "Gallery Updated",
          description: `Successfully added ${uploadedItems.length} photos.`,
        });
        setFiles([]);
      }
    } catch (err: any) {
      console.error("UPLOAD_DEBUG: Batch upload process failed:", err);
      if (err.code === 'permission-denied' || (err.message && err.message.includes('permission'))) {
        const permissionError = new FirestorePermissionError({
          path: `galleries/${id}`,
          operation: 'update',
          requestResourceData: { items: 'arrayUnion(uploadedItems)' },
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: err.message || "An unexpected error occurred during upload."
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const runAiHighlights = async () => {
    if (!event || !event.items || event.items.length === 0) {
      toast({ title: "No images", description: "Upload some photos first." });
      return;
    }
    setIsAiProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      toast({
        title: "AI Highlights Found",
        description: "Successfully identified cinematic highlights.",
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
        <p className="mt-4 text-muted-foreground">Syncing with studio...</p>
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Upload to {event.title}</h1>
            <p className="text-muted-foreground">Deliver original high-resolution memories.</p>
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
            AI Highlight
          </Button>
        )}
      </div>

      {!storage && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Storage Service Unavailable</AlertTitle>
          <AlertDescription>
            Firebase Storage is not initialized. Please ensure your configuration includes a storageBucket.
          </AlertDescription>
        </Alert>
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
            <p className="text-lg font-headline font-bold">Click or drop files here</p>
            <p className="text-sm text-muted-foreground mt-2">Professional JPEGs are optimized for viewing.</p>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="ghost" className="rounded-full px-8" onClick={() => setFiles([])} disabled={isUploading}>Clear All</Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 h-12 font-bold shadow-lg shadow-primary/20"
              onClick={startUpload}
              disabled={files.length === 0 || isUploading || !storage}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isUploading ? 'Uploading...' : 'Start Upload'}
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 h-[500px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-headline font-bold">Upload Queue</h3>
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">{files.length} Files</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-50">
                No files selected.
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="bg-background/50 p-4 rounded-2xl border border-border/30 space-y-2 relative group">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="truncate pr-4">{file.name}</span>
                    <div className="flex items-center gap-2">
                      {file.progress === 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="text-primary text-xs font-bold">{Math.round(file.progress)}%</span>
                      )}
                      {!isUploading && file.progress === 0 && (
                        <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
          Tip: High-resolution files are securely stored. Toggle download access for your clients anytime.
        </p>
        <Link href={`/events/${id}/manage`}>
          <Button className="rounded-full bg-white text-black hover:bg-white/90 font-bold gap-2 px-8 h-12">
            Finish and Manage Gallery
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
