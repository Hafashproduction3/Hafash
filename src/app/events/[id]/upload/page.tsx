"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Sparkles, 
  X, 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  HardDrive, 
  Pause, 
  Play,
  FileIcon,
  ImageIcon,
  RefreshCw,
  Clock,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN } from '@/lib/plans';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { UploadEngine, type UploadTask } from '@/lib/storage/upload-engine';
import { completeUpload } from '@/app/actions/storage';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type UploadStepStatus = 'queued' | 'uploading' | 'syncing' | 'completed' | 'error' | 'cancelled' | 'paused';

interface FileItem {
  id: string;
  file: File;
  progress: number;
  name: string;
  size: number;
  status: UploadStepStatus;
  error?: string;
  currentStep: string;
  speed: number;
  eta: number;
  previewUrl?: string;
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

  // CALLBACK STABILITY REFS
  const handleTaskUpdateRef = useRef<(task: UploadTask) => void>(() => {});
  const onAllUploadsCompleteRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // ENGINE LIFECYCLE MANAGEMENT
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.abortAll();
      }
      // Cleanup preview URLs
      files.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, []);

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
    if (!user || !id || !task.key) return;
    
    setFiles(prev => prev.map(f => f.id === task.id ? { 
      ...f, 
      status: 'syncing', 
      currentStep: "Syncing Metadata..." 
    } : f));

    const result = await completeUpload({
      userId: user.uid,
      galleryId: id,
      task: {
        id: task.id,
        key: task.key,
        file: {
          name: task.file.name,
          size: task.file.size,
          type: task.file.type
        }
      }
    });

    if (!result.success) {
      setFiles(prev => prev.map(f => f.id === task.id ? { 
        ...f, 
        status: 'error', 
        error: result.error || "Metadata synchronization failed.",
        currentStep: "Sync Failed" 
      } : f));
    } else {
      setFiles(prev => prev.map(f => f.id === task.id ? {
        ...f,
        status: 'completed',
        currentStep: "Asset Verified",
        progress: 100
      } : f));
    }
  }, [id, user]);

  const handleTaskUpdate = useCallback((task: UploadTask) => {
    setFiles(prev => prev.map(f => {
      if (f.id === task.id) {
        let step = 'In Queue';
        let status: UploadStepStatus = task.status as UploadStepStatus;

        if (task.status === 'uploading') step = 'Transferring...';
        if (task.status === 'completed') {
           step = 'Finalizing...';
           status = 'syncing'; // Transition to sync phase locally
        }
        if (task.status === 'error') step = 'Upload Failed';
        if (task.status === 'paused') step = 'Paused';

        return {
          ...f,
          progress: task.progress,
          status: status,
          error: task.error,
          currentStep: step,
          speed: task.speed,
          eta: task.eta
        };
      }
      return f;
    }));

    if (task.status === 'completed' && task.key) {
      syncMetadata(task);
    }
  }, [syncMetadata]);

  const onAllUploadsComplete = useCallback(() => {
    // We check if everything is really done including metadata
    const checkAllDone = () => {
      setFiles(current => {
        const allDone = current.every(f => f.status === 'completed' || f.status === 'error' || f.status === 'cancelled');
        if (allDone) {
          setIsUploading(false);
          setIsDone(true);
          toast({ title: "Portfolio Delivered", description: "All masterpieces have been synchronized with the studio vault." });
        }
        return current;
      });
    };
    
    // Slight delay to allow final metadata syncs to start
    setTimeout(checkAllDone, 1000);
  }, [toast]);

  // UPDATE REFS ON EVERY RENDER
  useEffect(() => {
    handleTaskUpdateRef.current = handleTaskUpdate;
    onAllUploadsCompleteRef.current = onAllUploadsComplete;
  }, [handleTaskUpdate, onAllUploadsComplete]);

  useEffect(() => {
    if (user && id && !engineRef.current) {
      engineRef.current = new UploadEngine({
        userId: user.uid,
        galleryId: id,
        onUpdate: (task) => handleTaskUpdateRef.current(task),
        onComplete: () => onAllUploadsCompleteRef.current()
      });
    }
  }, [user, id]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsDone(false);
      const selectedFiles = Array.from(e.target.files);
      
      const newItems: FileItem[] = selectedFiles.map(f => {
        const isImage = f.type.startsWith('image/');
        return {
          id: Math.random().toString(36).substring(2, 11),
          file: f,
          name: f.name,
          size: f.size,
          progress: 0,
          status: 'queued',
          currentStep: 'In Queue',
          speed: 0,
          eta: 0,
          previewUrl: isImage ? URL.createObjectURL(f) : undefined
        };
      });

      setFiles(prev => [...prev, ...newItems]);
    }
  };

  const removeFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (engineRef.current) engineRef.current.cancelTask(fileId);
  };

  const startUpload = async () => {
    if (!engineRef.current || files.length === 0) return;

    setIsUploading(true);
    setIsPaused(false);
    const queuedFiles = files.filter(f => f.status === 'queued').map(f => f.file);
    if (queuedFiles.length > 0) {
      engineRef.current.addFiles(queuedFiles);
    } else if (isPaused) {
      engineRef.current.resumeQueue();
    }
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

  const retryFile = (fileId: string) => {
    const item = files.find(f => f.id === fileId);
    if (!item || !engineRef.current) return;
    
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'queued', error: undefined, progress: 0 } : f));
    engineRef.current.addFiles([item.file]);
  };

  // OVERALL STATS
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const uploadingFiles = files.filter(f => f.status === 'uploading').length;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const uploadedBytes = files.reduce((acc, f) => acc + (f.size * (f.progress / 100)), 0);
    const avgProgress = totalFiles > 0 ? (uploadedBytes / totalSize) * 100 : 0;
    const totalSpeed = files.reduce((acc, f) => acc + f.speed, 0);
    
    return {
      totalFiles,
      completedFiles,
      uploadingFiles,
      avgProgress,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1) + " MB",
      uploadedSize: (uploadedBytes / (1024 * 1024)).toFixed(1) + " MB",
      totalSpeed: (totalSpeed / (1024 * 1024)).toFixed(1) + " MB/s"
    };
  }, [files]);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/10 transition-colors" onClick={() => router.push(`/events/${id}/manage`)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Direct Delivery Hub</span>
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{event.category}</span>
            </div>
            <h1 className="text-4xl font-headline font-bold">{event.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col items-end gap-1 px-6 py-2 border-r border-border/50">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Studio Quota</span>
              <div className="flex items-center gap-2">
                 <HardDrive className={cn("w-3.5 h-3.5", isOverLimit ? "text-destructive" : "text-primary")} />
                 <span className={cn("text-xs font-bold font-mono", isOverLimit ? "text-destructive" : "text-foreground")}>
                   {(currentUsageGb + pendingSizeGb).toFixed(2)} / {currentPlan.storageGb} GB
                 </span>
              </div>
           </div>
           <Link href={`/gallery/${event.slug || event.id}`} target="_blank">
             <Button variant="outline" className="rounded-xl border-border/50 font-bold gap-2">
               Public View <ArrowRight className="w-4 h-4" />
             </Button>
           </Link>
        </div>
      </div>

      {isOverLimit && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/50 bg-destructive/5 animate-in slide-in-from-top-4">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Storage Limit Exceeded</AlertTitle>
          <AlertDescription className="text-sm">
            This batch would exceed your {currentPlan.storageGb}GB limit. Remove assets or 
            <Link href="/storage" className="ml-1 underline font-bold">upgrade your studio tier</Link>.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Dropzone */}
          <div className={cn(
            "relative h-96 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all duration-500 shadow-2xl",
            isOverLimit ? "border-destructive/30 bg-destructive/5 cursor-not-allowed" : "border-border/50 bg-card/30 group hover:border-primary/50 cursor-pointer"
          )}>
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*"
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed z-20" 
              onChange={handleFileChange}
              disabled={isUploading || isOverLimit}
            />
            <div className={cn(
              "p-8 rounded-full mb-6 transition-all duration-500 ring-8",
              isOverLimit ? "bg-destructive/10 ring-destructive/5" : "bg-primary/10 ring-primary/5 group-hover:scale-110"
            )}>
              <Upload className={cn("w-12 h-12", isOverLimit ? "text-destructive" : "text-primary")} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-headline font-bold">
                {isOverLimit ? "Limit Reached" : "Deliver Masterpieces"}
              </p>
              <p className="text-sm text-muted-foreground font-medium italic">Drop photos here or click to browse the vault.</p>
            </div>
            
            {/* Status Floating Badge */}
            <div className="absolute bottom-8 flex items-center gap-3 px-6 py-2 rounded-full bg-background/50 backdrop-blur-md border border-border/50">
               <Zap className="w-3 h-3 text-primary animate-pulse" />
               <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Direct-to-Cloud Channel Active</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-2">
            <div className="flex items-center gap-4">
               {files.length > 0 && !isDone && !isUploading && (
                 <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive px-6" onClick={() => setFiles([])}>
                   Purge Queue
                 </Button>
               )}
               {isUploading && (
                 <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
                   <Activity className="w-4 h-4 text-primary animate-pulse" />
                   <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{stats.totalSpeed}</span>
                 </div>
               )}
            </div>
            
            <div className="flex gap-4 w-full sm:w-auto">
              {isUploading && (
                <Button variant="outline" className="rounded-2xl h-14 w-14 p-0 border-primary/30 text-primary hover:bg-primary/10 transition-all shadow-xl" onClick={togglePause}>
                  {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                </Button>
              )}

              <Button 
                className={cn(
                  "rounded-2xl px-12 h-14 font-bold shadow-2xl flex-1 sm:flex-none min-w-[240px] text-lg transition-all",
                  isOverLimit ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:scale-[1.02]"
                )}
                onClick={startUpload}
                disabled={files.length === 0 || (isUploading && !isPaused) || isOverLimit}
              >
                {isUploading && !isPaused ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : isDone ? <RefreshCw className="w-5 h-5 mr-3" /> : <Sparkles className="w-6 h-6 mr-3" />}
                {isUploading && !isPaused ? 'Synchronizing...' : isDone ? 'Deliver More' : isPaused ? 'Resume Sync' : 'Begin Cloud Delivery'}
              </Button>

              {isDone && (
                <Link href={`/events/${id}/manage`} className="flex-1 sm:flex-none">
                  <Button className="w-full rounded-2xl font-bold gap-3 px-10 h-14 bg-white text-black hover:bg-gray-100 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-500">
                    Continue to Event
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Pipeline */}
        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-[2.5rem] p-8 h-[650px] flex flex-col shadow-2xl luxury-card-hover overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-headline font-bold flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" /> Active Pipeline
            </h3>
            <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-[10px] font-bold tracking-widest">{files.length} ASSETS</Badge>
          </div>
          
          {files.length > 0 && isUploading && (
            <div className="mb-6 p-5 bg-background/50 rounded-2xl border border-border/30 space-y-4 animate-in fade-in zoom-in-95 duration-500">
               <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Overall Progress</p>
                    <p className="text-2xl font-headline font-bold text-primary">{Math.round(stats.avgProgress)}%</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="text-xs font-bold uppercase tracking-tighter">
                      {stats.completedFiles} / {stats.totalFiles} Ready
                    </p>
                  </div>
               </div>
               <Progress value={stats.avgProgress} className="h-1.5 bg-primary/10" indicatorClassName="bg-primary" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-30 text-center px-10">
                <FileIcon className="w-12 h-12 mb-4 mx-auto opacity-10" />
                Waiting for studio asset selection...
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className={cn(
                  "bg-background/40 p-4 rounded-2xl border transition-all relative overflow-hidden group",
                  file.status === 'error' ? 'border-destructive/30 bg-destructive/5' : 
                  file.status === 'completed' ? 'border-green-500/20 bg-green-500/5' : 'border-border/30'
                )}>
                  {/* Item Loader Progress Bar Background */}
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500" 
                    style={{ width: `${file.progress}%` }}
                  />
                  
                  <div className="flex gap-4 items-center">
                    <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/30 shadow-inner">
                      {file.previewUrl ? (
                        <img src={file.previewUrl} className="h-full w-full object-cover" alt="Thumb" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/5">
                          <FileIcon className="w-5 h-5 text-primary/40" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <p className="text-xs font-bold truncate pr-2" title={file.name}>{file.name}</p>
                         {file.status === 'completed' ? (
                           <CheckCircle2 className="w-4 h-4 text-green-500" />
                         ) : file.status === 'uploading' ? (
                           <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                         ) : file.status === 'error' ? (
                           <AlertTriangle className="w-4 h-4 text-destructive" />
                         ) : file.status === 'paused' ? (
                           <Pause className="w-3.5 h-3.5 text-amber-500" />
                         ) : (
                           <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Queued</span>
                         )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-3">
                           <span className={cn(
                             "text-[9px] font-bold uppercase tracking-tighter",
                             file.status === 'error' ? 'text-destructive' : 
                             file.status === 'completed' ? 'text-green-500' : 'text-primary'
                           )}>
                             {file.currentStep}
                           </span>
                           {file.status === 'uploading' && file.speed > 0 && (
                             <span className="text-[8px] font-mono text-muted-foreground">
                               {(file.speed / (1024 * 1024)).toFixed(1)}MB/s
                             </span>
                           )}
                        </div>
                        <div className="flex items-center gap-2">
                           {!isUploading && file.status === 'queued' && (
                             <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                               <X className="w-3.5 h-3.5" />
                             </button>
                           )}
                           {file.status === 'error' && (
                             <button onClick={() => retryFile(file.id)} className="text-primary hover:text-primary/80 transition-colors">
                               <RefreshCw className="w-3.5 h-3.5" />
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {file.error && (
                    <p className="mt-2 text-[9px] text-destructive font-bold uppercase leading-tight bg-destructive/10 p-2 rounded-lg">
                      {file.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t border-border/20 flex flex-col gap-4">
             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> Remaining Batch</span>
                <span className="font-mono">{files.length - stats.completedFiles} files</span>
             </div>
             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-2"><HardDrive className="w-3 h-3" /> Total Transfer</span>
                <span className="font-mono text-primary">{stats.uploadedSize} / {stats.totalSize}</span>
             </div>
          </div>
        </div>
      </div>

      <footer className="pt-12 border-t border-border/50 flex flex-col md:flex-row gap-8 justify-between items-center opacity-60">
        <div className="flex items-center gap-4 text-xs text-muted-foreground italic font-medium">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span>Encrypted Direct-to-Vault Delivery Pipeline • Global CDN Enabled</span>
        </div>
        <div className="flex items-center gap-6">
           <img src="/hafash-logo.png" className="h-8 w-auto grayscale brightness-200" alt="Hafash" />
        </div>
      </footer>
    </div>
  );
}