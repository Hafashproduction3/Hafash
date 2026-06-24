
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useStorage } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, X, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Link from 'next/link';

type UploadStep = 'queued' | 'uploading' | 'completed' | 'error';

interface FileItem {
  id: string;
  file: File;
  progress: number;
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

  const startUpload = async () => {
    if (!firestore || !storage || !user || !event) return;
    
    if (files.length === 0) {
      toast({ title: "No files selected" });
      return;
    }

    setIsUploading(true);
    const uploadedItems: any[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        if (fileItem.status === 'completed') continue;

        const fileId = fileItem.id;
        const updateStatus = (status: UploadStep, progress: number = 0, errorMsg?: string) => {
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status, progress, error: errorMsg } : f));
        };

        try {
          updateStatus('uploading', 0);
          
          const storageRef = ref(storage, `galleries/${id}/${fileId}_${fileItem.name}`);
          const uploadTask = uploadBytesResumable(storageRef, fileItem.file);

          await new Promise<void>((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                updateStatus('uploading', progress);
              }, 
              (error) => {
                console.error("UPLOAD_DEBUG: Storage error", error);
                reject(error);
              }, 
              () => {
                resolve();
              }
            );
          });

          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          uploadedItems.push({
            id: fileId,
            url: downloadUrl,
            type: 'image',
            isFavorite: false,
            fileName: fileItem.name
          });
          
          updateStatus('completed', 100);
        } catch (err: any) {
          updateStatus('error', 0, err.message);
          throw err;
        }
      }

      if (uploadedItems.length > 0) {
        const galleryRef = doc(firestore, 'galleries', id);
        updateDoc(galleryRef, { 
          items: arrayUnion(...uploadedItems) 
        }).catch(async (err) => {
           if (err.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
              path: `galleries/${id}`,
              operation: 'update',
              requestResourceData: { items: 'arrayUnion(...)' },
            }));
          }
        });
        
        toast({ title: "Success", description: `${uploadedItems.length} photos delivered.` });
        setFiles([]);
      }
    } catch (err: any) {
      console.error("UPLOAD_DEBUG: Batch failed", err);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message || "An unexpected error occurred during upload.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground italic">Connecting to Studio Cloud...</p>
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
            <h1 className="text-3xl font-headline font-bold">Deliver: {event.title}</h1>
            <p className="text-muted-foreground">Deliver high-resolution masterpieces to your client.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative h-80 border-2 border-dashed border-border/50 rounded-3xl flex flex-col items-center justify-center bg-card/30 group hover:border-primary/50 transition-all">
            <input 
              type="file" 
              multiple 
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="p-6 rounded-full bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <p className="text-lg font-headline font-bold">Drop your high-res photos</p>
            <p className="text-sm text-muted-foreground mt-2">Maximum quality for premium delivery.</p>
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="ghost" className="rounded-full px-8" onClick={() => setFiles([])} disabled={isUploading}>Clear Queue</Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-10 h-12 font-bold shadow-lg shadow-primary/20 min-w-[200px]"
              onClick={startUpload}
              disabled={files.length === 0 || isUploading}
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {isUploading ? 'Processing...' : 'Deliver Now'}
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
                No items selected.
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="bg-background/50 p-4 rounded-2xl border border-border/30 space-y-2 relative group transition-all">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="truncate pr-4">{file.name}</span>
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {file.status === 'uploading' && <span className="text-primary text-xs font-bold">{Math.round(file.progress)}%</span>}
                      {file.status === 'error' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                      {!isUploading && file.status === 'queued' && (
                        <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive">
                           <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Progress value={file.progress} className="h-1.5 bg-border/30" />
                  {file.error && <p className="text-[10px] text-destructive truncate">{file.error}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row gap-6 justify-between items-center">
        <p className="text-sm text-muted-foreground italic max-w-md">
          <Info className="w-4 h-4 inline mr-2 text-primary" />
          Hafash utilizes Google's edge delivery network for blazing fast gallery loads.
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
