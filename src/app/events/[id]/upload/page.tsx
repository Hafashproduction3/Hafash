"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useCollection } from '@/firebase';
import { doc, updateDoc, arrayUnion, collection, query, where } from 'firebase/firestore';
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, X, Info, AlertTriangle, Activity, ShieldCheck, HardDrive, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { UploadEngine, type UploadTask } from '@/lib/storage/upload-engine';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type UploadStepStatus = 'queued' | 'uploading' | 'completed' | 'error' | 'cancelled' | 'paused';

interface FileItem {
  id: string;
  file: File;
  progress: number;
  name: string;
  status: UploadStepStatus;
  error?: string;
  currentStep: string;
  speed?: string;
  eta?: string;
}

export default function GalleryUploadPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const firestore = useFirestore();
  const { user, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const engineRef = useRef<UploadEngine | null>(null);

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

  const profileRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const galleriesQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'galleries'), where('userId', '==', user.uid));
  }, [firestore, user?.uid]);
  const { data: galleries } = useCollection(galleriesQuery);

  const currentPlan = useMemo(() => {
    const planId = (profile?.planId as PlanId) || 'starter';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId]);

  const currentUsageGb = useMemo(() => calculateUsageGb(galleries), [galleries]);

  const syncMetadata = useCallback(async (task: UploadTask) => {
    if (!firestore || !id) return;
    
    const assetUrl = `https://firebasestorage.googleapis.com/v0/b/hafash-pk.firebasestorage.app/o/${encodeURIComponent(task.key!)}?alt=media`;
    
    const uploadedItem = {
      id: task.id,
      url: assetUrl,
      masterUrl: assetUrl,
      type: 'image',
      isFavorite: false,
      fileName: task.file.name,
      fileSize: task.file.size,
      storageKey: task.key,
      createdAt: new Date().toISOString()
    };

    const galleryRef = doc(firestore, 'galleries', id);
    try {
      await updateDoc(galleryRef, { 
        items: arrayUnion(uploadedItem),
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("METADATA_SYNC_FAILURE:", err.message);
    }
  }, [id, firestore]);

  const handleTaskUpdate = useCallback((task: UploadTask) => {
    setFiles(prev => prev.map(f => {
      if (f.id === task.id) {
        const speedMb = (task.speed / (1024 * 1024)).toFixed(1);
        const etaMin = Math.floor(task.eta / 60);
        const etaSec = Math.round(task.eta % 60);

        let step = 'Pending...';
        if (task.status === 'uploading') step = `Syncing: ${speedMb} MB/s`;
        if (task.status === 'completed') step = 'Delivered to Cloud';
        if (task.status === 'error') step = 'Sync Failed';
        if (task.status === 'paused') step = 'Paused';

        return {
          ...f,
          progress: task.progress,
          status: task.status as UploadStepStatus,
          error: task.error,
          currentStep: step,
          speed: `${speedMb} MB/s`,
          eta: task.eta > 0 ? `${etaMin}m ${etaSec}s` : 'Calculating...'
        };
      }
      return f;
    }));

    if (task.status === 'completed' && task.key) {
      syncMetadata(task);
    }
  }, [syncMetadata]);

  const onAllUploadsComplete = useCallback(() => {
    setIsUploading(false);
    setIsDone(true);
    toast({ title: "Portfolio Delivered", description: "All masterpieces have been synchronized with the studio vault." });
  }, [toast]);

  useEffect(() => {
    if (user && id && !engineRef.current) {
      engineRef.current = new UploadEngine({
        userId: user.uid,
        galleryId: id,
        onUpdate: handleTaskUpdate,
        onComplete: onAllUploadsComplete
      });
    }
  }, [user, id, handleTaskUpdate, onAllUploadsComplete]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsDone(false);
      const selectedFiles = Array.from(e.target.files);
      
      const newItems: FileItem[] = selectedFiles.map(f => ({
        id: Math.random().toString(36).substring(2, 11),
        file: f,
        name: f.name,
        progress: 0,
        status: 'queued',
        currentStep: 'In Queue'
      }));

      setFiles(prev => [...prev, ...newItems]);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (engineRef.current) engineRef.current.cancelTask(fileId);
  };

  const startUpload = async () => {
    if (!engineRef.current || files.length === 0) return;

    const pendingSizeGb = files.reduce((acc, f) => acc + (f.status === 'queued' ? f.file.size : 0), 0) / (1024 * 1024 * 1024);
    if ((currentUsageGb + pendingSizeGb) > currentPlan.storageGb) {
      toast({
        variant: "destructive",
        title: "Vault Capacity Exceeded",
        description: "This delivery exceeds your studio storage limit."
      });
      return;
    }

    setIsUploading(true);
    setIsPaused(false);
    const queuedFiles = files.filter(f => f.status === 'queued').map(f => f.file);
    engineRef.current.addFiles(queuedFiles);
  };

  const togglePause = () => {
    if (!engineRef.current) return;
    if (isPaused) {
      engineRef.current.resumeQueue();
      setIsPaused(false);
    } else {
      engineRef.current.pauseQueue();
      setIsPaused(true);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <HafashLoader text="Preparing Your Luxury Assets..." />
    );
  }

  if (!user || !event) return null;

  const pendingSizeGb = files.reduce((acc, f) => acc + (f.status === 'queued' ? f.file.size : 0), 0) / (1024 * 1024 * 1024);
  const isOverLimit = (currentUsageGb + pendingSizeGb) > currentPlan.storageGb;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-headline font-bold">Deliver: {event.title}</h1>
            <p className="text-muted-foreground">High-resolution delivery telemetry.</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 bg-card border border-border/50 px-4 py-2 rounded-xl">
          <HardDrive className="w-4 h-4 text-primary" />
          <div className="text-[10px] font-bold uppercase tracking-widest">
            <span className="text-muted-foreground">Quota: </span>
            <span className={isOverLimit ? "text-destructive" : "text-primary"}>
              {(currentUsageGb + pendingSizeGb).toFixed(2)} / {currentPlan.storageGb} GB
            </span>
          </div>
        </div>
      </div>

      {isOverLimit && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/50 bg-destructive/5 animate-pulse">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Storage Limit Exceeded</AlertTitle>
          <AlertDescription className="text-sm">
            This upload would put you over your {currentPlan.storageGb}GB limit. Please remove some files or 
            <Link href="/storage" className="ml-1 underline font-bold">upgrade your plan</Link>.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className={cn(
            "relative h-80 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all",
            isOverLimit ? "border-destructive/30 bg-destructive/5 cursor-not-allowed" : "border-border/50 bg-card/30 group hover:border-primary/50 cursor-pointer"
          )}>
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*"
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" 
              onChange={handleFileChange}
              disabled={isUploading || isOverLimit}
            />
            <div className={cn(
              "p-6 rounded-full mb-4 transition-transform",
              isOverLimit ? "bg-destructive/10" : "bg-primary/10 group-hover:scale-110"
            )}>
              <Upload className={cn("w-10 h-10", isOverLimit ? "text-destructive" : "text-primary")} />
            </div>
            <p className="text-lg font-headline font-bold">
              {isOverLimit ? "Limit Reached" : "Select Assets"}
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-mono italic">Direct-to-Cloud Channel Active.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-4">
            {!isDone && (
              <Button variant="ghost" className="rounded-full px-8 h-12" onClick={() => setFiles([])} disabled={isUploading}>Clear Queue</Button>
            )}
            
            <div className="flex gap-3 w-full sm:w-auto">
              {isUploading && (
                <Button variant="outline" className="rounded-full h-12 w-12 p-0 border-primary/30 text-primary" onClick={togglePause}>
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </Button>
              )}

              <Button 
                className={cn(
                  "rounded-full px-10 h-12 font-bold shadow-lg flex-1 sm:flex-none min-w-[200px]",
                  isOverLimit ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                )}
                onClick={startUpload}
                disabled={files.length === 0 || (isUploading && !isPaused) || isOverLimit}
              >
                {isUploading && !isPaused ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isUploading && !isPaused ? 'Synchronizing...' : isDone ? 'Deliver More' : isPaused ? 'Resume Sync' : 'Begin Delivery'}
              </Button>

              {isDone && (
                <Link href={`/events/${id}/manage`} className="flex-1 sm:flex-none">
                  <Button className="w-full rounded-full font-bold gap-2 px-10 h-12 bg-white text-black hover:bg-gray-100 shadow-xl animate-in fade-in slide-in-from-left-4 duration-500">
                    Continue to Event
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-3xl p-6 h-[500px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-headline font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Active Pipeline
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold tracking-widest">{files.length} ASSETS</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-50">
                Waiting for studio selection...
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className={cn(
                  "bg-background/50 p-4 rounded-2xl border transition-all",
                  file.status === 'error' ? 'border-destructive/50' : 'border-border/30'
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="truncate pr-4">
                      <p className="text-sm font-bold truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={cn(
                          "text-[10px] font-mono",
                          file.status === 'error' ? 'text-destructive' : 'text-primary'
                        )}>
                          {file.currentStep}
                        </p>
                        {file.eta && file.status === 'uploading' && (
                          <span className="text-[9px] text-muted-foreground font-bold uppercase">ETA: {file.eta}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {file.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {file.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                      {file.status === 'error' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                      {file.status === 'paused' && <Pause className="w-3 h-3 text-amber-500" />}
                      {!isUploading && file.status === 'queued' && (
                        <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive">
                           <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <Progress value={file.progress} className={`h-1 rounded-full bg-border/30`} />
                  
                  {file.error && (
                    <p className="mt-2 text-[9px] text-destructive font-bold uppercase leading-tight">
                      {file.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row gap-6 justify-between items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground italic">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Encrypted Direct-to-Storage Pipeline Active</span>
        </div>
      </div>
    </div>
  );
}
