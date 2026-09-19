"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useUser, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { 
  Upload, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, 
  X, AlertTriangle, Activity, ShieldCheck, HardDrive, FileIcon,
  RefreshCw, Clock, Zap, Play, Pause, Lock, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { calculateUsageGb, HAFASH_PLANS, type PlanId, DEFAULT_PLAN, isOwnerEmail } from '@/lib/plans';
import { HafashLoader } from '@/components/ui/hafash-loader';
import { requestUploadUrl, completeUpload } from '@/app/actions/storage';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';

type UploadStepStatus = 'queued' | 'compressing' | 'uploading' | 'syncing' | 'completed' | 'error' | 'paused' | 'cancelled';

interface FileItem {
  id: string;
  file: File;
  compressedFile?: File;
  progress: number;
  name: string;
  size: number;
  compressedSize?: number;
  status: UploadStepStatus;
  error?: string;
  currentStep: string;
  speed: number;
  eta: number;
  previewUrl?: string;
  retryCount: number;
}

const PARALLEL_LIMIT = 2;
const MAX_RETRIES = 3;

// 🎨 Compression Settings — Wedding Quality Preserved
const COMPRESSION_OPTIONS = {
  maxSizeMB: 5,              // Max 5 MB
  maxWidthOrHeight: 4000,    // 4000px (print-ready)
  useWebWorker: true,
  initialQuality: 0.92,      // 92% (visually same as 100%)
  fileType: 'image/jpeg',
};

// 💾 localStorage key
const getResumeKey = (galleryId: string) => `hafash_upload_${galleryId}`;

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
  const [resumedCount, setResumedCount] = useState(0);
  const [uploadedNames, setUploadedNames] = useState<Set<string>>(new Set());
  
  const pauseRef = useRef(false);
  const cancelRef = useRef(false);

  const isOwner = useMemo(() => isOwnerEmail(user?.email), [user?.email]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !id) return;
    try {
      const saved = localStorage.getItem(getResumeKey(id));
      if (saved) {
        const data = JSON.parse(saved);
        const names = new Set<string>(data.uploadedNames || []);
        setUploadedNames(names);
        setResumedCount(names.size);
      }
    } catch (e) {
      console.warn('[RESUME] Failed', e);
    }
  }, [id]);

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
    if (isOwner) {
      return {
        id: 'business' as PlanId,
        name: 'Owner (Unlimited)',
        storageGb: 999999,
        zipLimitGb: 999999,
        price: 'Rs. 0',
        priceAmount: 0,
        features: ['Unlimited Storage'],
        priorityLevel: 999,
        priorityLabel: 'Owner',
      };
    }
    const planId = (profile?.planId as PlanId) || 'none';
    return HAFASH_PLANS[planId] || DEFAULT_PLAN;
  }, [profile?.planId, isOwner]);

  const isSubscriptionActive = useMemo(() => {
    if (isOwner) return true;
    if (!profile?.planId || currentPlan.id === 'none') return false;
    const raw = profile?.planExpiryDate;
    if (!raw) return false;
    const expiry = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw);
    return expiry.getTime() > Date.now();
  }, [isOwner, profile?.planId, profile?.planExpiryDate, currentPlan.id]);

  const currentUsageGb = useMemo(() => calculateUsageGb(galleries), [galleries]);

  const updateFileStatus = (fileId: string, updates: Partial<FileItem>) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
  };

  const saveProgress = (names: Set<string>) => {
    if (typeof window === 'undefined' || !id) return;
    try {
      localStorage.setItem(getResumeKey(id), JSON.stringify({
        uploadedNames: Array.from(names),
        timestamp: Date.now(),
      }));
    } catch (e) {}
  };

  const clearResumeState = () => {
    if (typeof window === 'undefined' || !id) return;
    try {
      localStorage.removeItem(getResumeKey(id));
      setResumedCount(0);
      setUploadedNames(new Set());
    } catch {}
  };

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
          status: uploadedNames.has(f.name) ? 'completed' : 'queued',
          currentStep: uploadedNames.has(f.name) ? 'Already Uploaded' : 'In Queue',
          speed: 0,
          eta: 0,
          retryCount: 0,
          previewUrl: isImage ? URL.createObjectURL(f) : undefined
        };
      });

      setFiles(prev => [...prev, ...newItems]);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handlePause = () => {
    pauseRef.current = true;
    setIsPaused(true);
    toast({ title: "⏸ Paused", description: "Resume karne ke liye button dabayein." });
  };

  const handleResume = () => {
    pauseRef.current = false;
    setIsPaused(false);
    toast({ title: "▶️ Resumed", description: "Wahi se continue." });
    startUpload();
  };

  // 🎨 Compression helper
  const compressFile = async (item: FileItem): Promise<File> => {
    if (!item.file.type.startsWith('image/')) return item.file;
    // Agar already 5 MB se chhota hai toh skip
    if (item.file.size < 5 * 1024 * 1024) return item.file;

    try {
      const compressed = await imageCompression(item.file, COMPRESSION_OPTIONS);
      console.log(
        `[COMPRESS] ${item.name}: ${(item.file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB`
      );
      return compressed;
    } catch (err) {
      console.warn(`[COMPRESS] Failed for ${item.name} — using original`);
      return item.file;
    }
  };

  const startUpload = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    setIsDone(false);
    pauseRef.current = false;
    cancelRef.current = false;

    const alreadyUploaded = new Set(uploadedNames);
    const tracker = new Set(uploadedNames);

    const filesToUpload = files.filter(
      (f) => f.status !== "completed" && !alreadyUploaded.has(f.name)
    );

    setFiles(prev => prev.map(f => 
      alreadyUploaded.has(f.name) && f.status !== 'completed'
        ? { ...f, status: 'completed', progress: 100, currentStep: 'Already Uploaded' }
        : f
    ));

    if (filesToUpload.length === 0) {
      toast({ title: "✅ All Done", description: "All photos uploaded." });
      setIsUploading(false);
      setIsDone(true);
      return;
    }

    console.log(`[UPLOAD] ${filesToUpload.length} to upload`);

    let currentIndex = 0;

    const uploadSingleFile = async (item: FileItem, attempt = 1) => {
      if (pauseRef.current) {
        updateFileStatus(item.id, { status: 'paused', currentStep: 'Paused' });
        return;
      }
      if (cancelRef.current) {
        updateFileStatus(item.id, { status: 'cancelled', currentStep: 'Cancelled' });
        return;
      }

      try {
        // 1. Compress
        let fileToUpload = item.compressedFile || item.file;
        
        if (!item.compressedFile && item.file.type.startsWith('image/')) {
          updateFileStatus(item.id, {
            status: 'compressing',
            currentStep: 'Optimizing quality...',
          });
          fileToUpload = await compressFile(item);
          
          setFiles(prev => prev.map(f => 
            f.id === item.id ? { ...f, compressedFile: fileToUpload, compressedSize: fileToUpload.size } : f
          ));
        }

        if (pauseRef.current) {
          updateFileStatus(item.id, { status: 'paused', currentStep: 'Paused' });
          return;
        }

        // 2. Get presign URL
        updateFileStatus(item.id, {
          status: 'uploading',
          currentStep: 'Requesting Access...',
        });

        const result = await requestUploadUrl({
          userId: user!.uid,
          galleryId: id,
          fileName: item.name,
          contentType: fileToUpload.type || 'application/octet-stream',
          fileSize: fileToUpload.size,
        });

        if (!result.success || !result.uploadUrl) {
          throw new Error(result.error || "Failed to authorize.");
        }

        if (pauseRef.current) {
          updateFileStatus(item.id, { status: 'paused', currentStep: 'Paused' });
          return;
        }

        updateFileStatus(item.id, { currentStep: "Uploading..." });

        // 3. Upload
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const startTime = Date.now();
          let lastLoaded = 0;
          let lastTime = startTime;

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const now = Date.now();
              const timeDiff = (now - lastTime) / 1000;
              if (timeDiff > 0.5) {
                const speed = (e.loaded - lastLoaded) / timeDiff;
                const eta = speed > 0 ? (e.total - e.loaded) / speed : 0;
                lastLoaded = e.loaded;
                lastTime = now;
                const progress = Math.round((e.loaded / e.total) * 100);
                updateFileStatus(item.id, { progress, speed, eta });
              }
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2: ${xhr.status}`));
          });

          xhr.addEventListener('error', () => reject(new Error("Network error")));
          xhr.timeout = 600000;
          xhr.addEventListener('timeout', () => reject(new Error("Timeout")));
          
          xhr.open("PUT", result.uploadUrl);
          xhr.setRequestHeader("Content-Type", fileToUpload.type || "application/octet-stream");
          xhr.send(fileToUpload);
        });

        // 4. Save metadata
        completeUpload({
          userId: user!.uid,
          galleryId: id,
          task: {
            id: item.id,
            key: result.key!,
            file: {
              name: item.name,
              size: fileToUpload.size,
              type: fileToUpload.type,
            },
          },
        }).catch((err) => console.error(`[SYNC_BG]`, err));

        updateFileStatus(item.id, {
          status: "completed",
          progress: 100,
          currentStep: "✅ Uploaded",
        });
        console.log(`[UPLOAD] Success: ${item.name}`);

        tracker.add(item.name);
        setUploadedNames(new Set(tracker));
        saveProgress(tracker);

      } catch (err: any) {
        console.error(`[UPLOAD] Error ${item.name}:`, err);

        if (pauseRef.current || cancelRef.current) {
          updateFileStatus(item.id, { status: 'paused', currentStep: 'Paused' });
          return;
        }

        if (attempt < MAX_RETRIES) {
          updateFileStatus(item.id, {
            currentStep: `Retry ${attempt + 1}/${MAX_RETRIES}...`,
          });
          await new Promise(r => setTimeout(r, 3000));
          return uploadSingleFile(item, attempt + 1);
        }

        updateFileStatus(item.id, {
          status: "error",
          error: err.message,
          currentStep: "Failed",
          retryCount: attempt,
        });
      }
    };

    const worker = async () => {
      while (true) {
        if (pauseRef.current || cancelRef.current) return;
        const idx = currentIndex++;
        if (idx >= filesToUpload.length) return;
        await uploadSingleFile(filesToUpload[idx]);
      }
    };

    const workers = Array.from(
      { length: Math.min(PARALLEL_LIMIT, filesToUpload.length) },
      () => worker()
    );

    await Promise.all(workers);

    setIsUploading(false);
    
    if (pauseRef.current) {
      toast({ title: "⏸ Paused", description: "Resume karne ke liye 'Resume' click karein." });
      return;
    }

    if (cancelRef.current) {
      toast({ title: "Cancelled", description: "Progress saved." });
      return;
    }

    setIsDone(true);
    toast({
      title: "🎉 Upload Complete!",
      description: `${filesToUpload.length} photos uploaded.`,
    });
    clearResumeState();
  };

  const retryFailed = () => {
    setFiles(prev => prev.map(f => 
      f.status === 'error'
        ? { ...f, status: 'queued', progress: 0, error: undefined, currentStep: 'Re-queued', retryCount: 0 }
        : f
    ));
  };

  const stats = useMemo(() => {
    const totalFiles = files.length;
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const failedFiles = files.filter(f => f.status === 'error').length;
    const remainingFiles = totalFiles - completedFiles - failedFiles;
    const totalSize = files.reduce((acc, f) => acc + (f.compressedSize || f.size), 0);
    const uploadedBytes = files.reduce((acc, f) => acc + ((f.compressedSize || f.size) * (f.progress / 100)), 0);
    const avgProgress = totalSize > 0 ? (uploadedBytes / totalSize) * 100 : 0;
    const isComplete = completedFiles === totalFiles && totalFiles > 0;
    const originalSize = files.reduce((acc, f) => acc + f.size, 0);
    
    return {
      totalFiles,
      completedFiles,
      failedFiles,
      remainingFiles,
      avgProgress,
      isComplete,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1) + " MB",
      uploadedSize: (uploadedBytes / (1024 * 1024)).toFixed(1) + " MB",
      originalSize: (originalSize / (1024 * 1024 * 1024)).toFixed(2) + " GB",
      savedSize: ((originalSize - totalSize) / (1024 * 1024 * 1024)).toFixed(2) + " GB",
    };
  }, [files]);

  if (authLoading || dataLoading) {
    return <HafashLoader text="Preparing Your Luxury Assets..." />;
  }

  if (!user || !event) return null;

  const pendingSizeGb = files.reduce((acc, f) => acc + (f.status === 'queued' ? (f.compressedSize || f.size) : 0), 0) / (1024 * 1024 * 1024);
  const isOverLimit = !isSubscriptionActive || (!isOwner && (currentUsageGb + pendingSizeGb) > currentPlan.storageGb);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-primary/10" onClick={() => router.push(`/events/${id}/manage`)}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Smart Delivery Hub</span>
              {isOwner && (
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] uppercase tracking-widest ml-2">
                  👑 Owner
                </Badge>
              )}
            </div>
            <h1 className="text-4xl font-headline font-bold">{event.title}</h1>
          </div>
        </div>
      </div>

      {resumedCount > 0 && !isUploading && !isDone && (
        <Alert className="rounded-2xl border-primary/30 bg-primary/5">
          <RefreshCw className="h-5 w-5 text-primary" />
          <AlertTitle className="font-bold text-primary">Resume Available</AlertTitle>
          <AlertDescription className="text-sm">
            {resumedCount} photos pehle upload ho chuki hain. 🎯
          </AlertDescription>
        </Alert>
      )}

      {isPaused && (
        <Alert className="rounded-2xl border-orange-500/30 bg-orange-500/5">
          <Pause className="h-5 w-5 text-orange-500" />
          <AlertTitle className="font-bold text-orange-500">Upload Paused</AlertTitle>
          <AlertDescription className="text-sm">
            {stats.completedFiles} photos done. Resume karne ke liye "Resume" click karein.
          </AlertDescription>
        </Alert>
      )}

      {isDone && stats.isComplete && (
        <Alert className="rounded-2xl border-green-500/30 bg-green-500/5">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle className="font-bold text-green-500">Upload Complete — Ready to Share</AlertTitle>
          <AlertDescription className="text-sm">
            Sab {stats.totalFiles} photos upload ho gayi. ✅
          </AlertDescription>
        </Alert>
      )}

      {isOverLimit && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Storage Limit</AlertTitle>
          <AlertDescription>Upgrade your plan to continue.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <div className={cn(
            "relative h-96 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all",
            isOverLimit ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card/30 hover:border-primary/50 cursor-pointer"
          )}>
            <input 
              type="file" 
              multiple 
              accept="image/*,video/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-20" 
              onChange={handleFileChange}
              disabled={isUploading || isOverLimit}
            />
            <div className="p-8 rounded-full mb-6 bg-primary/10 ring-8 ring-primary/5">
              <Upload className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-headline font-bold">Deliver Masterpieces</p>
              <p className="text-sm text-muted-foreground italic">Smart compression • Print-ready quality</p>
            </div>
            
            <div className="absolute bottom-8 flex items-center gap-3 px-6 py-2 rounded-full bg-background/50 backdrop-blur-md border">
               <ShieldCheck className="w-3 h-3 text-primary" />
               <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">4000px • 92% Quality • 3x Faster</span>
            </div>
          </div>

          {files.length > 0 && (
            <div className="p-6 bg-card/40 border rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upload Progress</p>
                  <p className="text-3xl font-headline font-bold text-primary">{Math.round(stats.avgProgress)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ready</p>
                  <p className="text-lg font-bold">{stats.completedFiles} / {stats.totalFiles}</p>
                </div>
              </div>
              <Progress value={stats.avgProgress} className="h-2" />
              
              <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                <span>Transfer: {stats.uploadedSize} / {stats.totalSize}</span>
                <span>Remaining: {stats.remainingFiles} files</span>
              </div>
              
              {stats.savedSize !== "0.00 GB" && (
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">
                  ✓ Saved {stats.savedSize} via smart compression
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 flex-wrap">
               {files.length > 0 && !isDone && !isUploading && (
                 <Button variant="ghost" className="rounded-full text-muted-foreground hover:text-destructive" onClick={() => { setFiles([]); clearResumeState(); }}>
                   Purge Queue
                 </Button>
               )}
               {stats.failedFiles > 0 && !isUploading && (
                 <Button 
                   variant="outline" 
                   className="rounded-full border-destructive/30 text-destructive gap-2"
                   onClick={retryFailed}
                 >
                   <RefreshCw className="w-4 h-4" />
                   Retry ({stats.failedFiles})
                 </Button>
               )}
            </div>
            
            <div className="flex gap-3 w-full sm:w-auto">
              {isUploading && !isPaused && (
                <Button
                  variant="outline"
                  className="rounded-2xl h-14 px-6 border-orange-500/30 text-orange-500 hover:bg-orange-500/10 font-bold gap-2"
                  onClick={handlePause}
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}

              {isPaused && (
                <Button
                  className="rounded-2xl h-14 px-6 bg-green-500 hover:bg-green-600 text-white font-bold gap-2"
                  onClick={handleResume}
                >
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              )}
              
              {!isPaused && (
                <Button 
                  className={cn(
                    "rounded-2xl px-10 h-14 font-bold flex-1 sm:flex-none min-w-[220px] text-lg gap-2",
                    (isOverLimit || isUploading || stats.isComplete) 
                      ? "bg-muted cursor-not-allowed text-muted-foreground" 
                      : "bg-primary hover:bg-primary/90"
                  )}
                  onClick={startUpload}
                  disabled={files.length === 0 || isUploading || isOverLimit || stats.isComplete}
                >
                  {isUploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Uploading...</>
                  ) : stats.isComplete ? (
                    <><CheckCircle2 className="w-5 h-5" />All Uploaded</>
                  ) : resumedCount > 0 ? (
                    <><RefreshCw className="w-5 h-5" />Resume ({resumedCount} done)</>
                  ) : (
                    <><Sparkles className="w-5 h-5" />Begin Upload</>
                  )}
                </Button>
              )}

              {stats.isComplete && (
                <Link href={`/events/${id}/manage`}>
                  <Button className="rounded-2xl h-14 px-8 bg-green-500 hover:bg-green-600 text-white font-bold gap-2">
                    <Share2 className="w-5 h-5" />
                    Share Gallery
                  </Button>
                </Link>
              )}

              {!stats.isComplete && files.length > 0 && !isUploading && (
                <Button disabled className="rounded-2xl h-14 px-8 gap-2">
                  <Lock className="w-4 h-4" />
                  Upload first
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card/40 border rounded-[2.5rem] p-8 h-[650px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-headline font-bold flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" /> Active Pipeline
            </h3>
            <Badge className="bg-primary/20 text-primary">{files.length} ASSETS</Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic opacity-30 text-center px-10">
                <FileIcon className="w-12 h-12 mb-4 opacity-10" />
                Waiting for selection...
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className={cn(
                  "bg-background/40 p-4 rounded-2xl border relative overflow-hidden",
                  file.status === 'error' ? 'border-destructive/30' : 
                  file.status === 'paused' ? 'border-orange-500/30' :
                  file.status === 'completed' ? 'border-green-500/20' : 'border-border/30'
                )}>
                  <div className="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-500" style={{ width: `${file.progress}%` }} />
                  
                  <div className="flex gap-4 items-center">
                    <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                      {file.previewUrl ? (
                        <img src={file.previewUrl} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <FileIcon className="w-5 h-5 text-primary/40" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <p className="text-xs font-bold truncate pr-2">{file.name}</p>
                         {file.status === 'completed' ? (
                           <CheckCircle2 className="w-4 h-4 text-green-500" />
                         ) : (file.status === 'uploading' || file.status === 'compressing') ? (
                           <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                         ) : file.status === 'paused' ? (
                           <Pause className="w-3.5 h-3.5 text-orange-500" />
                         ) : file.status === 'error' ? (
                           <AlertTriangle className="w-4 h-4 text-destructive" />
                         ) : (
                           <span className="text-[8px] font-bold text-muted-foreground">QUEUED</span>
                         )}
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase",
                        file.status === 'error' ? 'text-destructive' : 
                        file.status === 'paused' ? 'text-orange-500' :
                        file.status === 'completed' ? 'text-green-500' : 'text-primary'
                      )}>
                        {file.currentStep}
                      </span>
                      {file.compressedSize && file.compressedSize < file.size && (
                        <p className="text-[8px] text-green-500 font-bold mt-0.5">
                          ✓ {Math.round((1 - file.compressedSize / file.size) * 100)}% smaller
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {file.error && (
                    <p className="mt-2 text-[9px] text-destructive font-bold uppercase bg-destructive/10 p-2 rounded">
                      {file.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-8 pt-8 border-t flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
             <span>Remaining</span>
             <span className="font-mono">{stats.remainingFiles} files</span>
          </div>
        </div>
      </div>
    </div>
  );
}